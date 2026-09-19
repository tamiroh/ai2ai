import { css } from "../styled-system/css";
import type { DisplayMessage } from "./useConversation";

type MessageProps = {
    message: DisplayMessage;
};

const itemStyles = css({
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    width: "min(760px, 88%)",
    "@media (max-width: 860px)": {
        width: "100%",
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

const systemMetaStyles = css({
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    marginBottom: "8px",
    fontSize: "12px",
    fontWeight: 800,
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
                <div className={systemMetaStyles}>
                    <span>System</span>
                    <span>Pause</span>
                </div>
                <p className={`${textStyles} ${textCenteredStyles}`}>{message.text}</p>
            </li>
        );
    }

    return (
        <li className={itemStyles}>
            <div className={nameStyles}>Agent {message.agent}</div>
            <div className={bubbleStyles}>
                <p className={textStyles}>{message.text}</p>
            </div>
        </li>
    );
}
