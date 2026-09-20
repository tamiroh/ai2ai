import { produce } from "immer";
import { useCallback, useEffect, useReducer } from "preact/hooks";
import { useAvailability } from "./useAvailability";
import { modelOptions, useModel } from "./useModel";
import { sleep } from "./utils";
import type { AvailabilityState } from "./useAvailability";
import type { AiParticipant, ModelEvent } from "./useModel";

export type Participant = AiParticipant | "human";

export type ConversationSettings = {
    topic: string;
    participantA: string;
    participantB: string;
    maxLength: number;
};

export type AiDisplayMessage = {
    id: string;
    kind: "ai";
    participant: AiParticipant;
    text: string;
    turn: number;
};

export type SystemEvent = { type: "joining" } | { type: "joined"; participant: AiParticipant };

export type SystemDisplayMessage = {
    id: string;
    kind: "system";
    event: SystemEvent;
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
    precedingLength: number;
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
const maxTurnsBeforeModelReset = 16;
const maxContextUsageRatio = 0.65;

const initialStatus: Status = { kind: "idle" };
const initialState: State = {
    settings: {
        topic: "ふたりが、最近ちょっと楽しかったことや気になることを、ゆるく話し続ける。",
        participantA: "穏やかで聞き上手。相手の話に乗りながら、日常の小さな発見を楽しむ。",
        participantB: "明るく好奇心旺盛。少し冗談を交えつつ、会話をあたたかく広げる。",
        maxLength: 220,
    },
    status: null,
    messages: [],
    history: [],
    phase: "idle",
    turn: null,
    nextTurn: 1,
};

// Time spent reading the preceding message before starting to type.
function readingDelayMs(precedingLength: number): number {
    return Math.min(600 + precedingLength * 15, 3000) + Math.random() * 800;
}

// Time spent typing the reply, proportional to its length.
function typingDelayMs(length: number): number {
    return Math.min(Math.max(length * 50, 1000), 6000) * (0.8 + Math.random() * 0.4);
}

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
        precedingLength: recentHistory.at(-1)?.text.length ?? 0,
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

        function addSystemMessage(event: SystemEvent) {
            draft.messages.push({ id: `system-${draft.messages.length}`, kind: "system", event });
        }

        switch (action.type) {
            case "start":
                addSystemMessage({ type: "joining" });
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
            case "joined":
                addSystemMessage({ type: "joined", participant: action.participant });
                break;
            case "generating":
                draft.phase = "generating";
                draft.status = { kind: "running" };
                break;
            case "completed":
                draft.phase = "waiting";
                draft.messages.push({
                    id: `ai-${action.turn.number}`,
                    kind: "ai",
                    participant: action.turn.participant,
                    turn: action.turn.number,
                    text: action.text,
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
    const { turn, settings } = state;
    const availability = useAvailability(modelOptions);
    const isUnavailable =
        availability.kind === "unsupported" || availability.kind === "unavailable" || availability.kind === "error";
    const isModelEnabled = availability.kind !== "checking" && !isUnavailable;
    const modelA = useModel(dispatch, "A", settings.participantA, isModelEnabled);
    const modelB = useModel(dispatch, "B", settings.participantB, isModelEnabled);

    const sendHumanMessage = useCallback((text: string) => {
        dispatch({ type: "human", text });
    }, []);

    useEffect(() => {
        if (!turn || !modelA || !modelB) {
            return;
        }
        const controller = new AbortController();
        const runTurn = async () => {
            try {
                await sleep(readingDelayMs(turn.precedingLength), controller.signal);
                dispatch({ type: "generating", turn });
                const startedAt = Date.now();
                const output = (
                    await (turn.participant === "A" ? modelA : modelB).prompt(turn.prompt, controller.signal)
                ).trim();
                await sleep(typingDelayMs(output.length) - (Date.now() - startedAt), controller.signal);
                dispatch({ type: "completed", turn, text: output });
                const isTurnLimitReached = turn.number % maxTurnsBeforeModelReset === 0;
                for (const model of [modelA, modelB]) {
                    if (isTurnLimitReached || model.getContextUsageRatio() >= maxContextUsageRatio) {
                        model.reset();
                    }
                }
                dispatch({ type: "next", turn });
            } catch (error) {
                if (!controller.signal.aborted) {
                    controller.abort();
                    dispatch({ type: "error", turn, error });
                }
            }
        };
        void runTurn();
        return () => controller.abort();
    }, [turn, modelA, modelB]);

    return {
        status: isUnavailable || !state.status ? { kind: "availability", value: availability } : state.status,
        messages: state.messages,
        typingName: state.phase === "generating" && state.turn ? state.turn.participant : null,
        sendHumanMessage,
    };
}
