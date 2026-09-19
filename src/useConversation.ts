import { produce } from "immer";
import { useCallback, useEffect, useReducer, useRef } from "preact/hooks";
import { useAvailability } from "./useAvailability";
import { sleep } from "./utils";
import type { AvailabilityResult, AvailabilityState } from "./useAvailability";

export type Status =
    | { kind: "idle" | "preparing" | "running" }
    | { kind: "availability"; value: AvailabilityState }
    | { kind: "error"; error: unknown };

export type UseConversationResult = {
    status: Status;
    messages: DisplayMessage[];
    typingName: string | null;
    sendHumanMessage: (text: string) => void;
};

type Turn = {
    number: number;
    participant: AiParticipant;
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
    | { type: "start" }
    | { type: "human"; text: string }
    | { type: "unavailable"; turn: Turn; availability: AvailabilityResult }
    | { type: "joining"; turn: Turn }
    | { type: "joined"; turn: Turn; participant: AiParticipant }
    | { type: "generating"; turn: Turn }
    | { type: "completed"; turn: Turn; text: string }
    | { type: "next"; turn: Turn }
    | { type: "error"; turn: Turn; error: unknown };

const initialStatus: Status = { kind: "idle" };
const initialState: State = {
    settings: {
        topic: "ふたりが、最近ちょっと楽しかったことや気になることを、ゆるく話し続ける。",
        participantA: "穏やかで聞き上手。相手の話に乗りながら、日常の小さな発見を楽しむ。",
        participantB: "明るく好奇心旺盛。少し冗談を交えつつ、会話をあたたかく広げる。",
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

// Freeze the inputs for a turn; the prompt is built from the history at this moment.
function createTurn(state: State, number: number): Turn {
    const participant: AiParticipant = number % 2 === 1 ? "A" : "B";
    const recentHistory = state.history.slice(-maxRecentMessages);
    const recentMessages = recentHistory
        .map((message) => `${message.speaker === "human" ? "ユーザー" : message.speaker}: ${message.text}`)
        .join("\n");
    return {
        number,
        participant,
        settings: state.settings,
        prompt: [
            `テーマ: ${state.settings.topic}`,
            `あなたは ${participant} です。次は ${participant === "A" ? "B" : "A"} に返答してください。`,
            `最大 ${state.settings.maxLength} 文字。`,
            "自然な雑談として、気軽で親しみやすい口調を保ってください。",
            "2〜4文で、相手の質問に答えることを優先してください。",
            "相手が出していない技術・AI・データ分析の話題を新しく始めないでください。",
            "直近の会話に未完了の話題がある場合は、その話題を続けてください。",
            ...(recentHistory.at(-1)?.speaker === "human"
                ? ["人間のユーザーが会話に参加しています。ユーザーの直前の発言に、まず答えてください。"]
                : []),
            "急に新しい近況を始めず、相手の最後の発言に直接返してください。",
            "直近の会話:",
            recentMessages || "まだ会話は始まっていません。",
        ].join("\n\n"),
        replaceModels: state.turn !== null && (
            state.turn.settings.participantA !== state.settings.participantA ||
            state.turn.settings.participantB !== state.settings.participantB
        ),
    };
}

function reducer(state: State, action: Action): State {
    // A stopped turn may still resolve after the next one starts.
    if ("turn" in action && action.turn !== state.turn) {
        return state;
    }
    return produce(state, (draft) => {
        function beginTurn() {
            draft.phase = "preparing";
            draft.status = { kind: "preparing" };
            draft.turn = createTurn(draft, draft.nextTurn);
            draft.nextTurn += 1;
        }

        function finish(status = initialStatus) {
            draft.phase = "idle";
            draft.turn = null;
            draft.status = status;
        }

        function appendHistory(message: PromptMessage) {
            draft.history.push(message);
            draft.history.splice(0, draft.history.length - maxRecentMessages);
        }

        function addSystemMessage(text: string) {
            draft.messages.push({ id: `system-${draft.messages.length}`, kind: "system", text });
        }

        switch (action.type) {
            case "start":
                beginTurn();
                break;
            case "human":
                draft.messages.push({ id: `human-${draft.messages.length}`, kind: "human", text: action.text });
                appendHistory({ speaker: "human", text: action.text });
                // A turn still being prepared or generated was built without this message, so redo it.
                if (draft.turn && (draft.phase === "preparing" || draft.phase === "generating")) {
                    draft.turn = { ...createTurn(draft, draft.turn.number), replaceModels: draft.turn.replaceModels };
                }
                break;
            case "unavailable":
                finish({ kind: "availability", value: action.availability });
                break;
            case "joining":
                addSystemMessage("参加者を待っています…");
                break;
            case "joined":
                addSystemMessage(`${action.participant} が参加しました`);
                break;
            case "generating":
                draft.phase = "generating";
                draft.status = { kind: "running" };
                break;
            case "completed":
                draft.phase = "waiting";
                draft.messages.push({
                    id: `ai-${action.turn.number}`, kind: "ai", participant: action.turn.participant,
                    turn: action.turn.number, text: action.text || "(空の応答)",
                });
                appendHistory({ speaker: action.turn.participant, text: action.text });
                break;
            case "next":
                beginTurn();
                break;
            case "error":
                finish({ kind: "error", error: action.error });
                break;
        }
    });
}

export function useConversation(): UseConversationResult {
    const [state, dispatch] = useReducer(reducer, initialState, (state) => reducer(state, { type: "start" }));
    const modelsRef = useRef<Models | null>(null);
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
            const shouldResetModels = modelsRef.current !== null && (
                (currentTurn.number > 1 && (currentTurn.number - 1) % maxTurnsBeforeModelReset === 0) ||
                Object.values(modelsRef.current).some((model) =>
                    model.contextWindow > 0 && model.contextUsage / model.contextWindow >= maxContextUsageRatio)
            );
            if (shouldResetModels) {
                releaseModels();
            }
            if (!modelsRef.current) {
                if (!shouldResetModels) {
                    dispatch({ type: "joining", turn: currentTurn });
                }
                const models = await createModels(currentTurn.settings, signal, (participant) => {
                    if (!shouldResetModels) {
                        dispatch({ type: "joined", turn: currentTurn, participant });
                    }
                });
                if (signal.aborted) {
                    destroyModels(models);
                    return;
                }
                modelsRef.current = models;
            }
            dispatch({ type: "generating", turn: currentTurn });
            const output = await modelsRef.current[currentTurn.participant].prompt(currentTurn.prompt, { signal });
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
        void runTurn(turn, controller);
        return () => controller.abort();
    }, [turn, availability, runTurn]);

    const sendHumanMessage = useCallback((text: string) => {
        dispatch({ type: "human", text });
    }, []);

    return {
        status: state.status ?? { kind: "availability", value: availability },
        messages: state.messages,
        typingName: state.phase === "generating" && state.turn ? state.turn.participant : null,
        sendHumanMessage,
    };
}

export type Participant = "A" | "B" | "human";

export type AiParticipant = Exclude<Participant, "human">;

export type ConversationSettings = {
    topic: string;
    participantA: string;
    participantB: string;
    delayMs: number;
    maxLength: number;
};

export type AiDisplayMessage = {
    id: string;
    kind: "ai";
    participant: AiParticipant;
    text: string;
    turn: number;
};

export type SystemDisplayMessage = {
    id: string;
    kind: "system";
    text: string;
};

export type HumanDisplayMessage = {
    id: string;
    kind: "human";
    text: string;
};

export type DisplayMessage = AiDisplayMessage | SystemDisplayMessage | HumanDisplayMessage;

type PromptMessage = {
    speaker: Participant;
    text: string;
};

const modelOptions: LanguageModelCreateCoreOptions = {
    expectedInputs: [{ type: "text", languages: ["ja", "en"] }],
    expectedOutputs: [{ type: "text", languages: ["ja"] }],
};

const maxRecentMessages = 8;
const maxTurnsBeforeModelReset = 16;
const maxContextUsageRatio = 0.65;

type Models = Record<AiParticipant, LanguageModel>;

async function createModels(
    settings: ConversationSettings,
    signal: AbortSignal,
    onCreated: (participant: AiParticipant) => void,
): Promise<Models> {
    const created = new Set<LanguageModel>();
    const destroy = () => {
        for (const model of created) model.destroy();
        created.clear();
    };
    let failed = false;
    signal.addEventListener("abort", destroy, { once: true });
    const create = async (participant: AiParticipant, persona: string): Promise<LanguageModel> => {
        const model = await LanguageModel.create({
            ...modelOptions,
            signal,
            initialPrompts: [
                {
                    role: "system",
                    content: [
                        "あなたは継続対話に参加する会話相手です。",
                        `あなたの名前は ${participant} です。`,
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
        });
        if (signal.aborted || failed) {
            model.destroy();
            throw new DOMException("Model creation cancelled", "AbortError");
        }
        created.add(model);
        onCreated(participant);
        return model;
    };
    try {
        signal.throwIfAborted();
        const [A, B] = await Promise.all([create("A", settings.participantA), create("B", settings.participantB)]);
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
