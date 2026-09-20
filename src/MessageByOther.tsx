import { css } from "../styled-system/css";
import { Avatar } from "./Avatar";
import type { AvatarColor } from "./Avatar";
import type { AiDisplayMessage, AiParticipant } from "./useConversation";

type MessageByOtherProps = {
    message: AiDisplayMessage;
};

const participantAvatarColors: Record<AiParticipant, AvatarColor> = {
    A: "teal",
    B: "amber",
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

const bodyStyles = css({
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    minWidth: 0,
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

const textStyles = css({
    margin: 0,
    whiteSpace: "pre-wrap",
    lineHeight: 1.65,
});

export function MessageByOther({ message }: MessageByOtherProps) {
    return (
        <li className={itemStyles}>
            <Avatar color={participantAvatarColors[message.participant]} initial={message.participant} />
            <div className={bodyStyles}>
                <div className={nameStyles}>{message.participant}</div>
                <div className={bubbleStyles}>
                    <p className={textStyles}>{message.text || "(空の応答)"}</p>
                </div>
            </div>
        </li>
    );
}
