import { injectGlobal } from "@emotion/css";
import { colors } from "./theme";

injectGlobal({
    ":root": {
        colorScheme: "light",
        accentColor: colors.accent,
    },
    "*": {
        boxSizing: "border-box",
    },
    body: {
        margin: 0,
        overflow: "hidden",
        minHeight: "100vh",
        background: colors.bg,
        color: colors.ink,
        fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    "button, input, textarea": {
        font: "inherit",
    },
});
