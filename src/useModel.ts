import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import { useAvailability } from "./useAvailability";
import type { AvailabilityState } from "./useAvailability";

export type Model = Pick<LanguageModel, "prompt" | "contextUsage" | "contextWindow"> & {
    reset: () => void;
};

type ModelState = { instance: LanguageModel | null; epoch: number };

type UseModelResult = { model: Model | null; availability: AvailabilityState };

type UseModelOptions = {
    modelOptions: Omit<LanguageModelCreateOptions, "signal">;
    onCreated: () => void;
    onError: (error: unknown) => void;
};

export function useModel({ modelOptions, onCreated, onError }: UseModelOptions): UseModelResult {
    const { expectedInputs, expectedOutputs } = modelOptions;
    const availability = useAvailability(
        useMemo(() => ({ expectedInputs, expectedOutputs }), [expectedInputs, expectedOutputs]),
    );
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
                onCreated();
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
    }, [modelOptions, onCreated, onError, enabled, epoch, setInstance]);

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
