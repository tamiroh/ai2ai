import { useCallback, useEffect, useReducer, useRef } from "preact/hooks";
import { useAvailability } from "./useAvailability";
import type { AvailabilityResult, AvailabilityState } from "./useAvailability";

export type Status =
    | { kind: "idle" | "preparing" | "resetting" | "running" }
    | { kind: "availability"; value: AvailabilityState }
    | { kind: "downloading"; progress: number }
    | { kind: "error"; error: unknown };

export type UseConversationResult = {
    status: Status;
    running: boolean;
    messages: DisplayMessage[];
    settings: ConversationSettings;
    updateSettings: (patch: Partial<ConversationSettings>) => void;
    toggle: () => void;
    clear: () => void;
};

type Turn = {
    number: number;
    agent: AgentName;
    settings: ConversationSettings;
    prompt: string;
    replaceModels: boolean;
};

type State = {
    settings: ConversationSettings;
    status: Status | null;
    messages: DisplayMessage[];
    history: PromptMessage[];
    phase: "idle" | "preparing" | "generating" | "waiting";
    turn: Turn | null;
    nextTurn: number;
};

type Action =
    | { type: "settings"; patch: Partial<ConversationSettings> }
    | { type: "toggle" }
    | { type: "clear" }
    | { type: "progress"; turn: Turn; progress: number }
    | { type: "unavailable"; turn: Turn; availability: AvailabilityResult }
    | { type: "reset"; turn: Turn }
    | { type: "generating"; turn: Turn }
    | { type: "chunk"; turn: Turn; text: string }
    | { type: "completed"; turn: Turn; text: string }
    | { type: "next"; turn: Turn }
    | { type: "error"; turn: Turn; error: unknown };

const initialStatus: Status = { kind: "idle" };
const initialState: State = {
    settings: {
        topic: "ふたりが、最近ちょっと楽しかったことや気になることを、ゆるく話し続ける。",
        agentA: "穏やかで聞き上手。相手の話に乗りながら、日常の小さな発見を楽しむ。",
        agentB: "明るく好奇心旺盛。少し冗談を交えつつ、会話をあたたかく広げる。",
        delayMs: 1200,
        maxLength: 220,
    },
    status: null,
    messages: [],
    history: [],
    phase: "idle",
    turn: null,
    nextTurn: 1,
};

function reducer(state: State, action: Action): State {
    function beginTurn(): State {
        const agent: AgentName = state.nextTurn % 2 === 1 ? "A" : "B";
        // Freeze the inputs for this turn; settings edits apply when the next turn begins.
        return {
            ...state,
            phase: "preparing",
            status: { kind: "preparing" },
            turn: {
                number: state.nextTurn,
                agent,
                settings: state.settings,
                prompt: buildPrompt(agent, state.settings, state.history),
                replaceModels: state.turn !== null && (
                    state.turn.settings.agentA !== state.settings.agentA ||
                    state.turn.settings.agentB !== state.settings.agentB
                ),
            },
            nextTurn: state.nextTurn + 1,
        };
    }

    function finish(status = initialStatus): State {
        return {
            ...state, phase: "idle", turn: null, status,
            messages: state.messages.map((message) => message.kind === "agent" && message.pending
                ? { ...message, pending: false, text: message.text || (status.kind === "error" ? "生成に失敗しました。" : "停止しました。") }
                : message),
        };
    }

    // A cleared or stopped turn may still resolve after the next one starts.
    if ("turn" in action && action.turn !== state.turn) {
        return state;
    }
    switch (action.type) {
        case "settings":
            return { ...state, settings: { ...state.settings, ...action.patch } };
        case "toggle":
            return state.turn ? finish() : beginTurn();
        case "clear":
            return { ...initialState, settings: state.settings, status: initialStatus };
        case "progress":
            return state.phase === "preparing"
                ? { ...state, status: { kind: "downloading", progress: action.progress } }
                : state;
        case "unavailable":
            return finish({ kind: "availability", value: action.availability });
        case "reset":
            return {
                ...state,
                status: { kind: "resetting" },
                messages: [...state.messages, {
                    id: -action.turn.number, kind: "system",
                    text: `Turn ${action.turn.number - 1}。ふたりは少し深呼吸して、直近の話の余韻から会話を続けます。`,
                }],
            };
        case "generating":
            return {
                ...state, phase: "generating", status: { kind: "running" },
                messages: [...state.messages, {
                    id: action.turn.number, kind: "agent", agent: action.turn.agent,
                    turn: action.turn.number, text: "", pending: true,
                }],
            };
        case "chunk":
        case "completed":
            return {
                ...state,
                phase: action.type === "completed" ? "waiting" : state.phase,
                messages: state.messages.map((message) => message.kind === "agent" && message.id === action.turn.number
                    ? { ...message, text: action.text || (action.type === "completed" ? "(空の応答)" : ""), pending: action.type !== "completed" }
                    : message),
                history: action.type === "completed"
                    ? [...state.history, { agent: action.turn.agent, text: action.text }].slice(-maxRecentMessages)
                    : state.history,
            };
        case "next":
            return beginTurn();
        case "error":
            return finish({ kind: "error", error: action.error });
    }
}

export function useConversation(): UseConversationResult {
    const [state, dispatch] = useReducer(reducer, initialState);
    const modelsRef = useRef<Models | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const availability = useAvailability(modelOptions);
    const { turn } = state;

    const releaseModels = useCallback(() => {
        destroyModels(modelsRef.current);
        modelsRef.current = null;
    }, []);

    useEffect(() => releaseModels, [releaseModels]);

    const runTurn = useCallback(async (currentTurn: Turn, controller: AbortController): Promise<void> => {
        const { signal } = controller;
        try {
            if (currentTurn.replaceModels) {
                releaseModels();
            }
            if (modelsRef.current && shouldResetModels(modelsRef.current, currentTurn.number - 1)) {
                releaseModels();
                dispatch({ type: "reset", turn: currentTurn });
            }
            if (!modelsRef.current) {
                const models = await createModels(currentTurn.settings, signal, (progress) => {
                    dispatch({ type: "progress", turn: currentTurn, progress });
                });
                if (signal.aborted) {
                    destroyModels(models);
                    return;
                }
                modelsRef.current = models;
            }
            dispatch({ type: "generating", turn: currentTurn });
            console.groupCollapsed(`[AI2AI] prompt turn=${currentTurn.number} agent=${currentTurn.agent}`);
            console.log(currentTurn.prompt);
            console.groupEnd();
            const output = await generateResponse(modelsRef.current[currentTurn.agent], currentTurn.prompt, signal, (text) => {
                dispatch({ type: "chunk", turn: currentTurn, text });
            });
            signal.throwIfAborted();
            dispatch({ type: "completed", turn: currentTurn, text: output.trim() });
            await sleep(currentTurn.settings.delayMs, signal);
            signal.throwIfAborted();
            dispatch({ type: "next", turn: currentTurn });
        } catch (error) {
            if (!signal.aborted) {
                controller.abort();
                releaseModels();
                dispatch({ type: "error", turn: currentTurn, error });
            }
        }
    }, [releaseModels]);

    useEffect(() => {
        if (!turn || availability.kind === "checking") {
            return;
        }
        if (availability.kind === "unsupported" || availability.kind === "unavailable" || availability.kind === "error") {
            dispatch({ type: "unavailable", turn, availability });
            return;
        }
        const controller = new AbortController();
        abortRef.current = controller;
        void runTurn(turn, controller);
        return () => {
            controller.abort();
            if (abortRef.current === controller) {
                abortRef.current = null;
            }
        };
    }, [turn, availability, runTurn]);

    const cancel = useCallback(() => {
        abortRef.current?.abort();
        releaseModels();
    }, [releaseModels]);

    const toggle = useCallback(() => {
        cancel();
        dispatch({ type: "toggle" });
    }, [cancel]);

    const clear = useCallback(() => {
        cancel();
        dispatch({ type: "clear" });
    }, [cancel]);

    const updateSettings = useCallback((patch: Partial<ConversationSettings>) => {
        dispatch({ type: "settings", patch });
    }, []);

    return {
        status: state.status ?? { kind: "availability", value: availability },
        running: state.phase !== "idle",
        messages: state.messages,
        settings: state.settings,
        updateSettings,
        toggle,
        clear,
    };
}

export type AgentName = "A" | "B";

export type ConversationSettings = {
    topic: string;
    agentA: string;
    agentB: string;
    delayMs: number;
    maxLength: number;
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

type Models = Record<AgentName, LanguageModel>;

async function createModels(
    settings: ConversationSettings,
    signal: AbortSignal,
    onProgress: (progress: number) => void,
): Promise<Models> {
    const created = new Set<LanguageModel>();
    const destroy = () => {
        for (const model of created) model.destroy();
        created.clear();
    };
    let failed = false;
    signal.addEventListener("abort", destroy, { once: true });
    const create = async (agentName: AgentName, persona: string): Promise<LanguageModel> => {
        const model = await LanguageModel.create({
            ...modelOptions,
            signal,
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
                    if (!signal.aborted && !failed) {
                        onProgress((event as ProgressEvent).loaded);
                    }
                });
            },
        });
        if (signal.aborted || failed) {
            model.destroy();
            throw new DOMException("Model creation cancelled", "AbortError");
        }
        created.add(model);
        return model;
    };
    try {
        signal.throwIfAborted();
        const [A, B] = await Promise.all([create("A", settings.agentA), create("B", settings.agentB)]);
        signal.throwIfAborted();
        return { A, B };
    } catch (error) {
        failed = true;
        destroy();
        throw error;
    } finally {
        signal.removeEventListener("abort", destroy);
    }
}

function destroyModels(models: Models | null): void {
    if (models) {
        for (const model of Object.values(models)) model.destroy();
    }
}

function buildPrompt(agent: AgentName, currentSettings: ConversationSettings, history: PromptMessage[]): string {
    const otherAgent: AgentName = agent === "A" ? "B" : "A";
    const recentMessages = history
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
}

function shouldResetModels(models: Record<AgentName, LanguageModel>, turn: number): boolean {
    return (turn > 0 && turn % maxTurnsBeforeModelReset === 0) || Object.values(models).some((model) =>
        model.contextWindow > 0 && model.contextUsage / model.contextWindow >= maxContextUsageRatio);
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
        const finish = () => {
            clearTimeout(timer);
            signal.removeEventListener("abort", finish);
            resolve();
        };
        const timer = setTimeout(finish, ms);
        signal.addEventListener("abort", finish, { once: true });
        if (signal.aborted) finish();
    });
}

async function generateResponse(
    model: LanguageModel,
    prompt: string,
    signal: AbortSignal,
    onText: (text: string) => void,
): Promise<string> {
    const reader = model.promptStreaming(prompt, { signal }).getReader();
    let output = "";
    try {
        while (true) {
            const { done, value } = await reader.read();
            signal.throwIfAborted();
            if (done) {
                return output;
            }
            output += value;
            onText(output);
        }
    } finally {
        reader.releaseLock();
    }
}
