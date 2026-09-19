import { useEffect, useState } from "preact/hooks";

export type AvailabilityResult =
    | { kind: Availability | "unsupported" }
    | { kind: "error"; error: unknown };

export type AvailabilityState = AvailabilityResult | { kind: "checking" };

export function useAvailability(options: LanguageModelCreateCoreOptions) {
    const [availability, setAvailability] = useState<AvailabilityState>({ kind: "checking" });

    useEffect(() => {
        let active = true;
        async function check() {
            const result = await checkAvailability(options);
            if (active) setAvailability(result);
        }
        void check();
        return () => {
            active = false;
        };
    }, [options]);

    return availability;
}

export async function checkAvailability(options: LanguageModelCreateCoreOptions): Promise<AvailabilityResult> {
    if (!("LanguageModel" in globalThis)) {
        return { kind: "unsupported" };
    }
    try {
        return { kind: await LanguageModel.availability(options) };
    } catch (error) {
        return { kind: "error", error };
    }
}
