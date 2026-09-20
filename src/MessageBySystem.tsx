import { css } from "../styled-system/css";
import { token } from "../styled-system/tokens";
import type { SystemDisplayMessage, SystemEvent } from "./useConversation";

type MessageBySystemProps = {
    message: SystemDisplayMessage;
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

function describeSystemEvent(event: SystemEvent): string {
    switch (event.type) {
        case "joining":
            return "参加者を待っています…";
        case "joined":
            return `${event.participant} が参加しました`;
    }
}

export function MessageBySystem({ message }: MessageBySystemProps) {
    return <li className={styles}>{describeSystemEvent(message.event)}</li>;
}
