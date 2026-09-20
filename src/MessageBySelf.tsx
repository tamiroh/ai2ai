import { css } from "../styled-system/css";
import type { HumanDisplayMessage } from "./useConversation";

type MessageBySelfProps = {
    message: HumanDisplayMessage;
};

const itemStyles = css({
    alignSelf: "flex-end",
    width: "min(620px, 88%)",
    "@media (max-width: 860px)": {
        width: "100%",
    },
});

const bubbleStyles = css({
    position: "relative",
    borderRadius: "16px",
    padding: "14px 16px",
    background: "humanBubble",
    color: "ink",
    _before: {
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

export function MessageBySelf({ message }: MessageBySelfProps) {
    return (
        <li className={itemStyles}>
            <div className={bubbleStyles}>
                <p className={textStyles}>{message.text}</p>
            </div>
        </li>
    );
}
