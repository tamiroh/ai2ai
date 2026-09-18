import { css } from "../styled-system/css";
import { token } from "../styled-system/tokens";
import type { DisplayMessage } from "./useConversation";

type MessageProps = {
    message: DisplayMessage;
};

const bubbleStyles = css({
    position: "relative",
    width: "min(760px, 88%)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "line",
    borderRadius: "16px",
    padding: "14px 16px",
    background: "panel",
    "@media (max-width: 860px)": {
        width: "100%",
    },
});

const agentAStyles = css({
    _before: {
        content: "''",
        position: "absolute",
        top: "24px",
        left: "-7px",
        width: "12px",
        height: "12px",
        background: "inherit",
        transform: "rotate(45deg)",
        borderBottom: `1px solid ${token("colors.line")}`,
        borderLeft: `1px solid ${token("colors.line")}`,
    },
});

const agentBStyles = css({
    alignSelf: "flex-end",
    _before: {
        content: "''",
        position: "absolute",
        top: "24px",
        right: "-7px",
        width: "12px",
        height: "12px",
        background: "inherit",
        transform: "rotate(45deg)",
        borderTop: `1px solid ${token("colors.line")}`,
        borderRight: `1px solid ${token("colors.line")}`,
    },
});

const systemBubbleStyles = css({
    alignSelf: "center",
    width: "min(620px, 100%)",
    borderRadius: "8px",
    borderStyle: "dashed",
    background: "bg",
    color: "muted",
});

const metaStyles = css({
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "8px",
    color: "muted",
    fontSize: "12px",
    fontWeight: 800,
});

const metaCenteredStyles = css({ justifyContent: "center" });

const textStyles = css({
    margin: 0,
    whiteSpace: "pre-wrap",
    lineHeight: 1.65,
});

const textCenteredStyles = css({ textAlign: "center" });

export function Message({ message }: MessageProps) {
    if (message.kind === "system") {
        return (
            <li className={`${bubbleStyles} ${systemBubbleStyles}`}>
                <div className={`${metaStyles} ${metaCenteredStyles}`}>
                    <span>System</span>
                    <span>Pause</span>
                </div>
                <p className={`${textStyles} ${textCenteredStyles}`}>{message.text}</p>
            </li>
        );
    }

    return (
        <li className={`${bubbleStyles} ${message.agent === "A" ? agentAStyles : agentBStyles}`}>
            <div className={metaStyles}>
                <span>Agent {message.agent}</span>
                <span>{message.pending ? "生成中" : `Turn ${message.turn}`}</span>
            </div>
            <p className={textStyles}>{message.text}</p>
        </li>
    );
}
