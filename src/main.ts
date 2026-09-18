import "./styles.css";
import { ConversationController } from "./conversation";
import { createUi } from "./ui";

const ui = createUi();
const conversation = new ConversationController(ui);

ui.onToggle((isRunning) => {
    if (isRunning) {
        conversation.stop();
    } else {
        void conversation.start();
    }
});
ui.onClear(() => {
    conversation.clear();
});
ui.onDelayChange(() => {
    ui.updateDelayLabel();
});

ui.updateDelayLabel();
ui.updateTurnCounter(0);
void conversation.checkAvailability();
