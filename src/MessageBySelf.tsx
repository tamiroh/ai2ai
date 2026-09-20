import { css } from "@emotion/css";
import { colors } from "./theme";

type MessageBySelfProps = {
    name: string;
    text: string;
};

const itemStyles = css({
    alignSelf: "flex-end",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    width: "min(620px, 88%)",
    "@media (max-width: 860px)": {
        width: "100%",
    },
});

const nameStyles = css({
    padding: "0 4px",
    color: colors.muted,
    fontSize: "12px",
    fontWeight: 800,
    textAlign: "right",
});

const bubbleStyles = css({
    position: "relative",
    borderRadius: "16px",
    padding: "14px 16px",
    background: colors.humanBubble,
    color: colors.ink,
    "&::before": {
        content: "''",
        position: "absolute",
        top: "16px",
        right: "-5px",
        width: "12px",
        height: "12px",
        background: "inherit",
        transform: "rotate(45deg)",
    },
});

const textStyles = css({
    margin: 0,
    whiteSpace: "pre-wrap",
    lineHeight: 1.65,
});

export function MessageBySelf({ name, text }: MessageBySelfProps) {
    return (
        <li className={itemStyles}>
            <div className={nameStyles}>{name}</div>
            <div className={bubbleStyles}>
                <p className={textStyles}>{text}</p>
            </div>
        </li>
    );
}
