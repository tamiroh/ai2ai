import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import type { Dispatch } from "preact/hooks";

export type AiParticipant = "A" | "B";

export type ModelEvent = { type: "joined"; participant: AiParticipant } | { type: "modelsFailed"; error: unknown };

export const modelOptions: LanguageModelCreateCoreOptions = {
    expectedInputs: [{ type: "text", languages: ["ja", "en"] }],
    expectedOutputs: [{ type: "text", languages: ["ja"] }],
};

const maxTurnsBeforeModelReset = 16;
const maxContextUsageRatio = 0.65;

export type ModelHandle = {
    prompt: (text: string, signal: AbortSignal) => Promise<string>;
    resetIfNeeded: (turnNumber: number) => void;
};

type ModelState = { instance: LanguageModel | null; epoch: number };

export function useModel(
    dispatch: Dispatch<ModelEvent>,
    participant: AiParticipant,
    persona: string,
    enabled: boolean,
): ModelHandle | null {
    const [{ instance, epoch }, setModel] = useState<ModelState>({ instance: null, epoch: 0 });

    const setInstance = useCallback((instance: LanguageModel | null) => {
        setModel((state) => ({ ...state, instance }));
    }, []);

    const reset = useCallback(() => {
        setModel((state) => ({ instance: null, epoch: state.epoch + 1 }));
    }, []);

    useEffect(() => {
        if (!enabled) {
            return;
        }
        const controller = new AbortController();
        const creation = LanguageModel.create({
            ...modelOptions,
            signal: controller.signal,
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
        creation
            .then((created) => {
                controller.signal.throwIfAborted();
                if (epoch === 0) {
                    dispatch({ type: "joined", participant });
                }
                setInstance(created);
            })
            .catch((error) => {
                if (!controller.signal.aborted) {
                    dispatch({ type: "modelsFailed", error });
                }
            });
        return () => {
            controller.abort();
            creation.then(
                (created) => created.destroy(),
                () => {},
            );
            setInstance(null);
        };
    }, [dispatch, participant, persona, enabled, epoch, setInstance]);

    return useMemo<ModelHandle | null>(
        () =>
            instance && {
                prompt: (text, signal) => instance.prompt(text, { signal }),
                resetIfNeeded: (turnNumber) => {
                    const isTurnLimitReached = turnNumber % maxTurnsBeforeModelReset === 0;
                    const isContextNearlyFull =
                        instance.contextWindow > 0 &&
                        instance.contextUsage / instance.contextWindow >= maxContextUsageRatio;
                    if (isTurnLimitReached || isContextNearlyFull) {
                        reset();
                    }
                },
            },
        [instance, reset],
    );
}
