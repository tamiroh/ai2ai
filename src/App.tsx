import { css } from "../styled-system/css";
import { ControlPanel } from "./ControlPanel";
import { ConversationView } from "./ConversationView";
import { useConversation } from "./useConversation";

const appStyles = css({
    display: "grid",
    gridTemplateColumns: "minmax(320px, 420px) minmax(0, 1fr)",
    gap: "24px",
    height: "100vh",
    minHeight: 0,
    padding: "24px",
    "@media (max-width: 860px)": {
        gridTemplateColumns: "1fr",
        gridTemplateRows: "minmax(220px, 46vh) minmax(0, 1fr)",
        padding: "12px",
    },
});

export function App() {
    const { status, running, messages, typingName, settings, updateSettings, toggle, clear } = useConversation();

    return (
        <main className={appStyles}>
            <ControlPanel
                status={status}
                running={running}
                settings={settings}
                onSettingsChange={updateSettings}
                onToggle={toggle}
                onClear={clear}
            />
            <ConversationView messages={messages} typingName={typingName} />
        </main>
    );
}
