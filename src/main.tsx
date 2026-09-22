import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";
import { useLang } from "./i18n";
import { warmCyrillicSubsets } from "./utils/fonts";
import { watchInstallPrompt } from "./core/pwa/install-prompt";

/**
 * Remounts the app when the language changes.
 *
 * `t()` is a plain function rather than a hook, so nothing subscribes to the
 * language on its own. Keying the tree on it is what makes a switch take effect
 * everywhere at once — including inside memoised children and text that was
 * computed in state — at the cost of resetting open modals, which is the right
 * trade for an action a user performs approximately once.
 */
const I18nRoot = () => {
    const lang = useLang();
    return <App key={lang} />;
};

warmCyrillicSubsets();

// The browser fires its install offer once, early; nothing would catch it
// by the time Settings is opened.
watchInstallPrompt();

/**
 * Ask the browser to keep this origin's storage.
 *
 * Everything the editor remembers lives in IndexedDB, and browsers evict that
 * under pressure — Safari after seven days without a visit. Chrome and Firefox
 * grant this for an installed or frequently-used site; Safari refuses it
 * outright, which is why Settings has an export for the whole store rather
 * than only this.
 */
navigator.storage?.persist?.().catch(() => {});

const rootElement = document.getElementById("app");
if (rootElement) {
    const root = createRoot(rootElement);
    root.render(<I18nRoot />);
} else {
    console.error("Root element #app not found");
}
