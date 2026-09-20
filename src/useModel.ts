import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import { useAvailability } from "./useAvailability";
import type { AvailabilityState } from "./useAvailability";

export type AiParticipant = "A" | "B";

export type Model = Pick<LanguageModel, "prompt" | "contextUsage" | "contextWindow"> & {
    reset: () => void;
};

type ModelState = { instance: LanguageModel | null; epoch: number };

type UseModelResult = { model: Model | null; availability: AvailabilityState };

type UseModelOptions = {
    modelOptions: Omit<LanguageModelCreateOptions, "signal">;
    callbacks: {
        onJoined: () => void;
        onError: (error: unknown) => void;
    };
};

export function useModel({ modelOptions, callbacks: { onJoined, onError } }: UseModelOptions): UseModelResult {
    const availability = useAvailability(modelOptions);
    const enabled =
        availability.kind === "available" ||
        availability.kind === "downloadable" ||
        availability.kind === "downloading";
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
        });
        creation
            .then((created) => {
                controller.signal.throwIfAborted();
                if (epoch === 0) {
                    onJoined();
                }
                setInstance(created);
            })
            .catch((error) => {
                if (!controller.signal.aborted) {
                    onError(error);
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
    }, [modelOptions, onJoined, onError, enabled, epoch, setInstance]);

    const model = useMemo<Model | null>(
        () =>
            instance && {
                prompt: (...args) => instance.prompt(...args),
                get contextUsage() {
                    return instance.contextUsage;
                },
                get contextWindow() {
                    return instance.contextWindow;
                },
                reset,
            },
        [instance, reset],
    );

    return { model, availability };
}
