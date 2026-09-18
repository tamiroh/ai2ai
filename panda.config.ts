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
                    bg: { value: "#f5f2ea" },
                    panel: { value: "#ffffff" },
                    ink: { value: "#202124" },
                    muted: { value: "#64676d" },
                    line: { value: "#d8d2c4" },
                    accent: { value: "#0b6b5c" },
                    danger: { value: "#b3261e" },
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
