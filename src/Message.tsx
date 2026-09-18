import type { DisplayMessage } from "./useConversation";

type MessageProps = {
    message: DisplayMessage;
};

export function Message({ message }: MessageProps) {
    if (message.kind === "system") {
        return (
            <li className="message system-message">
                <div className="message-meta">
                    <span>System</span>
                    <span>Pause</span>
                </div>
                <p className="message-text">{message.text}</p>
            </li>
        );
    }

    return (
        <li className={`message ${message.agent === "A" ? "agent-a" : "agent-b"}`}>
            <div className="message-meta">
                <span>Agent {message.agent}</span>
                <span>{message.pending ? "生成中" : `Turn ${message.turn}`}</span>
            </div>
            <p className="message-text">{message.text}</p>
        </li>
    );
}
