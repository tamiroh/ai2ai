import { css } from "../styled-system/css";
import { token } from "../styled-system/tokens";
import { Avatar } from "./Avatar";
import type { AvatarColor } from "./Avatar";
import type { DisplayMessage, SystemEvent } from "./useConversation";
import type { AiParticipant } from "./useModel";

type MessageProps = {
    message: DisplayMessage;
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
    maxWidth: "min(620px, 100%)",
    borderRadius: "12px",
    padding: "5px 14px",
    background: `color-mix(in srgb, ${token("colors.ink")} 45%, transparent)`,
    color: "panel",
    fontSize: "12px",
    lineHeight: 1.5,
    textAlign: "center",
});

const textStyles = css({
    margin: 0,
    whiteSpace: "pre-wrap",
    lineHeight: 1.65,
});

function describeSystemEvent(event: SystemEvent): string {
    switch (event.type) {
        case "joining":
            return "参加者を待っています…";
        case "joined":
            return `${event.participant} が参加しました`;
    }
}

export function Message({ message }: MessageProps) {
    if (message.kind === "system") {
        return <li className={systemStyles}>{describeSystemEvent(message.event)}</li>;
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
