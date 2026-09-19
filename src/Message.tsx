import { css } from "../styled-system/css";
import type { DisplayMessage } from "./useConversation";

type MessageProps = {
    message: DisplayMessage;
};

const itemStyles = css({
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    width: "min(760px, 88%)",
    "@media (max-width: 860px)": {
        width: "100%",
    },
});

const avatarStyles = css({
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    color: "panel",
    fontSize: "15px",
    fontWeight: 800,
});

const avatarAStyles = css({ background: "agentA" });

const avatarBStyles = css({ background: "agentB" });

const bodyStyles = css({
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    minWidth: 0,
});

const humanItemStyles = css({
    alignSelf: "flex-end",
    width: "min(620px, 88%)",
    "@media (max-width: 860px)": {
        width: "100%",
    },
});

const humanBubbleStyles = css({
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

const nameStyles = css({
    padding: "0 4px",
    color: "muted",
    fontSize: "12px",
    fontWeight: 800,
});

const bubbleStyles = css({
    position: "relative",
    borderRadius: "16px",
    padding: "14px 16px",
    background: "panel",
    _before: {
        content: "''",
        position: "absolute",
        top: "16px",
        left: "-5px",
        width: "12px",
        height: "12px",
        background: "inherit",
        transform: "rotate(45deg)",
    },
});

const systemStyles = css({
    alignSelf: "center",
    width: "min(620px, 100%)",
    borderWidth: "1px",
    borderStyle: "dashed",
    borderColor: "line",
    borderRadius: "8px",
    padding: "14px 16px",
    color: "muted",
});

const textStyles = css({
    margin: 0,
    whiteSpace: "pre-wrap",
    lineHeight: 1.65,
});

const textCenteredStyles = css({ textAlign: "center" });

export function Message({ message }: MessageProps) {
    if (message.kind === "system") {
        return (
            <li className={systemStyles}>
                <p className={`${textStyles} ${textCenteredStyles}`}>{message.text}</p>
            </li>
        );
    }

    if (message.kind === "human") {
        return (
            <li className={humanItemStyles}>
                <div className={humanBubbleStyles}>
                    <p className={textStyles}>{message.text}</p>
                </div>
            </li>
        );
    }

    return (
        <li className={itemStyles}>
            <div className={`${avatarStyles} ${message.agent === "A" ? avatarAStyles : avatarBStyles}`} aria-hidden="true">
                {message.agent}
            </div>
            <div className={bodyStyles}>
                <div className={nameStyles}>Agent {message.agent}</div>
                <div className={bubbleStyles}>
                    <p className={textStyles}>{message.text}</p>
                </div>
            </div>
        </li>
    );
}
