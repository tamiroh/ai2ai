import { css } from "@emotion/css";
import { colors } from "./theme";

type MessageBySystemProps = {
    text: string;
};

const styles = css({
    alignSelf: "center",
    maxWidth: "min(620px, 100%)",
    borderRadius: "12px",
    padding: "5px 14px",
    background: `color-mix(in srgb, ${colors.ink} 45%, transparent)`,
    color: colors.panel,
    fontSize: "12px",
    lineHeight: 1.5,
    textAlign: "center",
});

export function MessageBySystem({ text }: MessageBySystemProps) {
    return <li className={styles}>{text}</li>;
}
