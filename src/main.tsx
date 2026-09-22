import { createRoot } from "react-dom/client";
import "./index.css";
import { I18nRoot } from "./I18nRoot";
import { warmCyrillicSubsets } from "./utils/fonts";
import { watchInstallPrompt } from "./core/pwa/install-prompt";
import { ensureManifestLink } from "./core/pwa/manifest-link";
import { watchKeyboardInset } from "./core/layout/keyboard-inset";

warmCyrillicSubsets();

// Safari draws the keyboard over the page instead of resizing it, so a
// full-screen sheet has to be told how much of the screen is left.
watchKeyboardInset();

// The build puts `<link rel="manifest">` in index.html and the deployed file
// carries it, yet on some Android browsers it is gone from the DOM by the time
// scripts run — and the browser then refuses to install. Put it back.
ensureManifestLink();

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
