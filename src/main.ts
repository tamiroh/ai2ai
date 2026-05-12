import "./styles.css";
import { ConversationController } from "./conversation";
import { createUi } from "./ui";

const ui = createUi();
const conversation = new ConversationController(ui);

ui.onStart(() => {
    void conversation.start();
});
ui.onStop(() => {
    conversation.stop();
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
