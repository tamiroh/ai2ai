import { useCallback, useEffect, useRef, useState } from "preact/hooks";

export type AgentName = "A" | "B";
export type StatusKind = "ready" | "busy" | "error";

export type ConversationSettings = {
    topic: string;
    agentA: string;
    agentB: string;
    delayMs: number;
    maxLength: number;
};

export type Status = {
    kind: StatusKind;
    title: string;
    detail: string;
};

export type AgentDisplayMessage = {
    id: number;
    kind: "agent";
    agent: AgentName;
    text: string;
    turn: number;
    pending: boolean;
};

export type SystemDisplayMessage = {
    id: number;
    kind: "system";
    text: string;
};

export type DisplayMessage = AgentDisplayMessage | SystemDisplayMessage;

type PromptMessage = {
    agent: AgentName;
    text: string;
};

const modelOptions: LanguageModelCreateCoreOptions = {
    expectedInputs: [{ type: "text", languages: ["ja", "en"] }],
    expectedOutputs: [{ type: "text", languages: ["ja"] }],
};

const maxRecentMessages = 8;
const maxTurnsBeforeModelReset = 16;
const maxContextUsageRatio = 0.65;

const initialSettings: ConversationSettings = {
    topic: "ふたりが、最近ちょっと楽しかったことや気になることを、ゆるく話し続ける。",
    agentA: "穏やかで聞き上手。相手の話に乗りながら、日常の小さな発見を楽しむ。",
    agentB: "明るく好奇心旺盛。少し冗談を交えつつ、会話をあたたかく広げる。",
    delayMs: 1200,
    maxLength: 220,
};

const initialStatus: Status = { kind: "ready", title: "", detail: "" };

export type UseConversationResult = {
    status: Status;
    running: boolean;
    turn: number;
    messages: DisplayMessage[];
    settings: ConversationSettings;
    updateSettings: (patch: Partial<ConversationSettings>) => void;
    toggle: () => void;
    clear: () => void;
};

export function useConversation(): UseConversationResult {
    const [status, setStatus] = useState<Status>(initialStatus);
    const [running, setRunning] = useState(false);
    const [turn, setTurn] = useState(0);
    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [settings, setSettings] = useState<ConversationSettings>(initialSettings);

    const settingsRef = useRef(settings);
    settingsRef.current = settings;

    const activeRef = useRef(false);
    const runningRef = useRef(false);
    const turnRef = useRef(0);
    const modelsRef = useRef<Record<AgentName, LanguageModel> | null>(null);
    const generationAbortControllerRef = useRef<AbortController | null>(null);
    const promptHistoryRef = useRef<PromptMessage[]>([]);
    const nextIdRef = useRef(0);

    const setStatusValue = useCallback((kind: StatusKind, title: string, detail: string) => {
        setStatus({ kind, title, detail });
    }, []);

    const checkAvailability = useCallback(async (): Promise<Availability> => {
        if (!("LanguageModel" in globalThis)) {
            setStatusValue(
                "error",
                "Prompt API なし",
                "Chrome Prompt API に対応した Chrome で localhost から開いてください。",
            );
            return "unavailable";
        }

        try {
            const availability = await LanguageModel.availability(modelOptions);
            if (availability === "available") {
                setStatusValue("ready", "利用可能", "Gemini Nano のローカルモデルで会話できます。");
            } else if (availability === "downloadable") {
                setStatusValue("ready", "ダウンロード可能", "開始ボタンでモデルの初回ダウンロードを始めます。");
            } else if (availability === "downloading") {
                setStatusValue("busy", "ダウンロード中", "モデルの準備が完了するまで待ってください。");
            } else {
                setStatusValue("error", "利用不可", "この端末または Chrome 設定では Prompt API を使えません。");
            }
            return availability;
        } catch (error) {
            setStatusValue("error", "確認失敗", error instanceof Error ? error.message : String(error));
            return "unavailable";
        }
    }, [setStatusValue]);

    useEffect(() => {
        void checkAvailability();
    }, [checkAvailability]);

    const createModel = useCallback(async (agentName: AgentName, persona: string): Promise<LanguageModel> => {
        return LanguageModel.create({
            ...modelOptions,
            initialPrompts: [
                {
                    role: "system",
                    content: [
                        "あなたは継続対話に参加する会話相手です。",
                        `あなたの名前は Agent ${agentName} です。`,
                        `人格: ${persona}`,
                        "返答は日本語で、短めの自然なおしゃべりにしてください。",
                        "相手の直前の発言をやさしく拾い、感想や小さな質問を添えて会話を続けてください。",
                        "討論や結論づけより、和気あいあいとした雑談の流れを優先してください。",
                        "相手から質問されたら、次の返答ではまず短く答えてください。",
                        "質問で終えるのは2回に1回までにしてください。",
                        "相手が明示的に話題にしない限り、AI、データ、解析、生成モデル、技術ニュースの話は避けてください。",
                        "日常の出来事、食べ物、散歩、音楽、読書、天気、家事、趣味のような身近な話題を中心にしてください。",
                        "絵文字は使わないでください。",
                        "直前の会話と同じ表現や比喩を繰り返さないでください。",
                    ].join("\n"),
                },
            ],
            monitor: (monitor: CreateMonitor) => {
                monitor.addEventListener("downloadprogress", (event) => {
                    const percent = Math.round((event as ProgressEvent).loaded * 100);
                    setStatusValue("busy", "モデルをダウンロード中", `${percent}% 完了`);
                });
            },
        });
    }, [setStatusValue]);

    const destroyModels = useCallback((): void => {
        if (!modelsRef.current) {
            return;
        }
        for (const model of Object.values(modelsRef.current)) {
            model.destroy();
        }
    }, []);

    const ensureModels = useCallback(async (): Promise<Record<AgentName, LanguageModel>> => {
        if (modelsRef.current) {
            return modelsRef.current;
        }

        const availability = await checkAvailability();
        if (availability === "unavailable") {
            throw new Error("Prompt API が利用できません。");
        }

        setStatusValue("busy", "モデル準備中", "2つの AI モデルを準備しています。");
        const currentSettings = settingsRef.current;
        const [agentA, agentB] = await Promise.all([
            createModel("A", currentSettings.agentA),
            createModel("B", currentSettings.agentB),
        ]);
        modelsRef.current = { A: agentA, B: agentB };
        setStatusValue("ready", "会話準備完了", "停止するまで交互に発言し続けます。");
        return modelsRef.current;
    }, [checkAvailability, createModel, setStatusValue]);

    const buildPrompt = useCallback((agent: AgentName, otherAgent: AgentName, currentSettings: ConversationSettings): string => {
        const recentMessages = promptHistoryRef.current
            .slice(-maxRecentMessages)
            .map((message) => `Agent ${message.agent}: ${message.text}`)
            .join("\n");

        return [
            `テーマ: ${currentSettings.topic}`,
            `あなたは Agent ${agent} です。次は Agent ${otherAgent} に返答してください。`,
            `最大 ${currentSettings.maxLength} 文字。`,
            "自然な雑談として、気軽で親しみやすい口調を保ってください。",
            "2〜4文で、相手の質問に答えることを優先してください。",
            "相手が出していない技術・AI・データ分析の話題を新しく始めないでください。",
            "直近の会話に未完了の話題がある場合は、その話題を続けてください。",
            "急に新しい近況を始めず、相手の最後の発言に直接返してください。",
            "直近の会話:",
            recentMessages || "まだ会話は始まっていません。",
        ].join("\n\n");
    }, []);

    const logPrompt = useCallback((agent: AgentName, currentTurn: number, prompt: string): void => {
        console.groupCollapsed(`[AI2AI] prompt turn=${currentTurn} agent=${agent}`);
        console.log(prompt);
        console.groupEnd();
    }, []);

    const trimPromptHistory = useCallback((): void => {
        if (promptHistoryRef.current.length > maxRecentMessages) {
            promptHistoryRef.current = promptHistoryRef.current.slice(-maxRecentMessages);
        }
    }, []);

    const updateMessage = useCallback((id: number, patch: Partial<AgentDisplayMessage>): void => {
        setMessages((prev) =>
            prev.map((message) => (message.kind === "agent" && message.id === id ? { ...message, ...patch } : message)),
        );
    }, []);

    const generateTurn = useCallback(async (agent: AgentName, currentTurn: number, currentSettings: ConversationSettings): Promise<boolean> => {
        const otherAgent: AgentName = agent === "A" ? "B" : "A";
        const model = modelsRef.current![agent];
        const abortController = new AbortController();
        generationAbortControllerRef.current = abortController;

        const id = nextIdRef.current++;
        setMessages((prev) => [
            ...prev,
            { id, kind: "agent", agent, text: "", turn: currentTurn, pending: true },
        ]);

        let output = "";
        try {
            const prompt = buildPrompt(agent, otherAgent, currentSettings);
            logPrompt(agent, currentTurn, prompt);
            const stream = model.promptStreaming(prompt, { signal: abortController.signal });
            const reader = stream.getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                output += value;
                updateMessage(id, { text: output });
            }
        } catch (error) {
            if (abortController.signal.aborted) {
                updateMessage(id, { text: "停止しました。" });
                return false;
            }
            throw error;
        }

        const cleanOutput = output.trim();
        updateMessage(id, { text: cleanOutput || "(空の応答)", pending: false, turn: currentTurn });
        promptHistoryRef.current = [...promptHistoryRef.current, { agent, text: cleanOutput }];
        trimPromptHistory();
        return true;
    }, [buildPrompt, logPrompt, updateMessage, trimPromptHistory]);

    const shouldResetModels = useCallback((currentTurn: number): boolean => {
        if (!modelsRef.current) {
            return false;
        }

        if (currentTurn > 0 && currentTurn % maxTurnsBeforeModelReset === 0) {
            return true;
        }

        return Object.values(modelsRef.current).some((model) => {
            if (model.contextWindow <= 0) {
                return false;
            }
            return model.contextUsage / model.contextWindow >= maxContextUsageRatio;
        });
    }, []);

    const resetModelsIfNeeded = useCallback(async (currentTurn: number): Promise<void> => {
        if (!modelsRef.current || !shouldResetModels(currentTurn)) {
            return;
        }

        setStatusValue("busy", "文脈整理中", "会話が重くならないよう AI モデルを作り直しています。");
        destroyModels();
        setMessages((prev) => [
            ...prev,
            {
                id: nextIdRef.current++,
                kind: "system",
                text: `Turn ${currentTurn}。ふたりは少し深呼吸して、直近の話の余韻から会話を続けます。`,
            },
        ]);
        modelsRef.current = null;
        await ensureModels();
    }, [destroyModels, ensureModels, setStatusValue, shouldResetModels]);

    const start = useCallback(async (): Promise<void> => {
        if (activeRef.current) {
            return;
        }
        activeRef.current = true;
        runningRef.current = true;
        setRunning(true);
        setStatusValue("busy", "モデル準備中", "モデルの準備状況を確認しています。");

        try {
            await ensureModels();
            setStatusValue("ready", "会話中", "停止するまで交互に発言し続けます。");

            while (runningRef.current) {
                const currentSettings = settingsRef.current;
                const agent: AgentName = turnRef.current % 2 === 0 ? "A" : "B";
                turnRef.current += 1;
                setTurn(turnRef.current);
                const completed = await generateTurn(agent, turnRef.current, currentSettings);
                if (!completed || !runningRef.current) {
                    break;
                }
                await resetModelsIfNeeded(turnRef.current);
                await sleep(settingsRef.current.delayMs);
            }
        } catch (error) {
            setStatusValue("error", "実行エラー", error instanceof Error ? error.message : String(error));
        } finally {
            generationAbortControllerRef.current = null;
            runningRef.current = false;
            activeRef.current = false;
            setRunning(false);
            setStatus((prev) => (prev.kind === "error" ? prev : { kind: "ready", title: "", detail: "" }));
        }
    }, [ensureModels, generateTurn, resetModelsIfNeeded, setStatusValue]);

    const stop = useCallback((): void => {
        runningRef.current = false;
        generationAbortControllerRef.current?.abort();
    }, []);

    const toggle = useCallback((): void => {
        if (runningRef.current) {
            stop();
        } else {
            void start();
        }
    }, [start, stop]);

    const clear = useCallback((): void => {
        stop();
        promptHistoryRef.current = [];
        turnRef.current = 0;
        setTurn(0);
        setMessages([]);
        destroyModels();
        modelsRef.current = null;
    }, [destroyModels, stop]);

    const updateSettings = useCallback((patch: Partial<ConversationSettings>): void => {
        setSettings((prev) => ({ ...prev, ...patch }));
    }, []);

    return { status, running, turn, messages, settings, updateSettings, toggle, clear };
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        window.setTimeout(resolve, ms);
    });
}
