import { ControlPanel } from "./ControlPanel";
import { ConversationView } from "./ConversationView";
import { useConversation } from "./useConversation";

export function App() {
    const { status, running, turn, messages, settings, updateSettings, toggle, clear } = useConversation();

    return (
        <main className="app">
            <ControlPanel
                status={status}
                running={running}
                settings={settings}
                onSettingsChange={updateSettings}
                onToggle={toggle}
                onClear={clear}
            />
            <ConversationView messages={messages} turn={turn} />
        </main>
    );
}
