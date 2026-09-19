import { useEffect, useState } from "preact/hooks";

export type AvailabilityResult =
    | { kind: Availability | "unsupported" }
    | { kind: "error"; error: unknown };

export type AvailabilityState = AvailabilityResult | { kind: "checking" };

export function useAvailability(options: LanguageModelCreateCoreOptions) {
    const [availability, setAvailability] = useState<AvailabilityState>({ kind: "checking" });

    useEffect(() => {
        let active = true;
        void checkAvailability(options).then((result) => {
            if (active) setAvailability(result);
        });
        return () => {
            active = false;
        };
    }, [options]);

    return availability;
}

async function checkAvailability(options: LanguageModelCreateCoreOptions): Promise<AvailabilityResult> {
    if (!("LanguageModel" in globalThis)) {
        return { kind: "unsupported" };
    }
    try {
        return { kind: await LanguageModel.availability(options) };
    } catch (error) {
        return { kind: "error", error };
    }
}
