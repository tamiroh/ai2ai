import { css } from "../styled-system/css";
import { token } from "../styled-system/tokens";

type MessageBySystemProps = {
    text: string;
};

const styles = css({
    alignSelf: "center",
    maxWidth: "min(620px, 100%)",
    borderRadius: "12px",
    padding: "5px 14px",
    background: `color-mix(in srgb, ${token("colors.ink")} 45%, transparent)`,
    color: "panel",
    fontSize: "12px",
    lineHeight: 1.5,
    textAlign: "center",
});

export function MessageBySystem({ text }: MessageBySystemProps) {
    return <li className={styles}>{text}</li>;
}
