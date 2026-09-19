import { produce } from "immer";
import { useCallback, useEffect, useReducer } from "preact/hooks";
import { useAvailability } from "./useAvailability";
import { modelOptions, useModels } from "./useModels";
import { sleep } from "./utils";
import type { AvailabilityState } from "./useAvailability";
import type { AiParticipant, ModelEvent, ModelSet } from "./useModels";

export type Participant = AiParticipant | "human";

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

type PromptMessage = {
    speaker: Participant;
    text: string;
};

type Turn = {
    number: number;
    participant: AiParticipant;
    settings: ConversationSettings;
    prompt: string;
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
    | ModelEvent
    | { type: "generating"; turn: Turn }
    | { type: "completed"; turn: Turn; text: string }
    | { type: "next"; turn: Turn }
    | { type: "error"; turn: Turn; error: unknown };

const maxRecentMessages = 8;

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
            `あなたは ${participant} です。`,
            `最大 ${state.settings.maxLength} 文字。`,
            "自然な雑談として、気軽で親しみやすい口調を保ってください。",
            "2〜4文で、相手の質問に答えることを優先してください。",
            "相手が出していない技術・AI・データ分析の話題を新しく始めないでください。",
            "直近の会話に未完了の話題がある場合は、その話題を続けてください。",
            ...(recentHistory.some((message) => message.speaker === "human")
                ? [
                    "参加者は A、B、人間のユーザーの 3 人です。",
                    "発言の冒頭に「Bさん、」「ユーザーさん、」のように宛名を付け、誰に向けた言葉かをはっきりさせてください。「あなた」だけで呼ばないでください。",
                    "直近の発言が他の参加者宛てなら、その人の代わりに答えず、感想や一言を添える程度にしてください。あなた宛て、または全員宛てなら、まず答えてください。",
                ]
                : []),
            "急に新しい近況を始めず、相手の最後の発言に直接返してください。",
            "直近の会話:",
            recentMessages || "まだ会話は始まっていません。",
        ].join("\n\n"),
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
                    draft.turn = createTurn(draft, draft.turn.number);
                }
                break;
            case "modelsFailed":
                finish({ kind: "error", error: action.error });
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
    const availability = useAvailability(modelOptions);
    const { turn, settings } = state;
    const isUnavailable = availability.kind === "unsupported" || availability.kind === "unavailable" || availability.kind === "error";
    const models = useModels(dispatch, availability.kind !== "checking" && !isUnavailable, {
        A: settings.participantA,
        B: settings.participantB,
    });

    const runTurn = useCallback(async (currentTurn: Turn, models: ModelSet, controller: AbortController): Promise<void> => {
        const { signal } = controller;
        try {
            dispatch({ type: "generating", turn: currentTurn });
            const output = await models.prompt(currentTurn.participant, currentTurn.prompt, signal);
            dispatch({ type: "completed", turn: currentTurn, text: output.trim() });
            await sleep(currentTurn.settings.delayMs, signal);
            models.resetIfNeeded(currentTurn.number);
            dispatch({ type: "next", turn: currentTurn });
        } catch (error) {
            if (!signal.aborted) {
                controller.abort();
                dispatch({ type: "error", turn: currentTurn, error });
            }
        }
    }, []);

    useEffect(() => {
        if (!turn || !models) {
            return;
        }
        const controller = new AbortController();
        void runTurn(turn, models, controller);
        return () => controller.abort();
    }, [turn, models, runTurn]);

    const sendHumanMessage = useCallback((text: string) => {
        dispatch({ type: "human", text });
    }, []);

    return {
        status: isUnavailable || !state.status ? { kind: "availability", value: availability } : state.status,
        messages: state.messages,
        typingName: state.phase === "generating" && state.turn ? state.turn.participant : null,
        sendHumanMessage,
    };
}
