import { css } from "../styled-system/css";
import { ConversationView } from "./ConversationView";
import { useConversation } from "./useConversation";

const appStyles = css({
    display: "grid",
    gridTemplateColumns: "minmax(0, 880px)",
    justifyContent: "center",
    height: "100vh",
    minHeight: 0,
    padding: "24px",
    "@media (max-width: 860px)": {
        padding: "12px",
    },
});

export function App() {
    const { status, messages, typingName, humanName, setHumanName, sendHumanMessage } = useConversation();

    return (
        <main className={appStyles}>
            <ConversationView
                messages={messages}
                typingName={typingName}
                humanName={humanName}
                onSetHumanName={setHumanName}
                onSend={sendHumanMessage}
                status={status}
            />
        </main>
    );
}
