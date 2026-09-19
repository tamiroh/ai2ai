import { defineConfig, defineGlobalStyles } from "@pandacss/dev";

const globalCss = defineGlobalStyles({
    ":root": {
        colorScheme: "light",
        accentColor: "{colors.accent}",
    },
    "*": {
        boxSizing: "border-box",
    },
    body: {
        margin: 0,
        overflow: "hidden",
        minHeight: "100vh",
        background: "bg",
        color: "ink",
        fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    "button, input, textarea": {
        font: "inherit",
    },
});

export default defineConfig({
    preflight: false,

    include: ["./src/**/*.{ts,tsx}"],
    exclude: [],

    theme: {
        extend: {
            tokens: {
                colors: {
                    bg: { value: "#e8eef6" },
                    panel: { value: "#ffffff" },
                    ink: { value: "#1c2a3d" },
                    muted: { value: "#5b6b82" },
                    line: { value: "#c5cfdd" },
                    accent: { value: "#2f6fdb" },
                    danger: { value: "#b3261e" },
                    agentA: { value: "#2f6fdb" },
                    agentB: { value: "#b45309" },
                    humanBubble: { value: "#b9efb0" },
                    accentStrong: { value: "color-mix(in srgb, {colors.accent} 75%, {colors.ink})" },
                    focusRing: { value: "color-mix(in srgb, {colors.accent} 14%, transparent)" },
                },
                shadows: {
                    panel: { value: "0 22px 70px color-mix(in srgb, {colors.ink} 12%, transparent)" },
                },
            },
            keyframes: {
                spin: {
                    to: { transform: "rotate(360deg)" },
                },
            },
        },
    },

    globalCss,

    outdir: "styled-system",
});
