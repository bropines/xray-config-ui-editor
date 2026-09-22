import { App } from "./App";
import { useLang } from "./i18n";

/**
 * Remounts the app when the language changes.
 *
 * `t()` is a plain function rather than a hook, so nothing subscribes to the
 * language on its own. Keying the tree on it is what makes a switch take
 * effect everywhere at once — including inside memoised children and text
 * that was computed in state — at the cost of resetting open modals, which is
 * the right trade for an action a user performs approximately once.
 *
 * It lives here rather than in main.tsx so that editing it keeps the page's
 * state: Fast Refresh only holds a module that exports components alone, and
 * the entry module exports nothing at all.
 */
export const I18nRoot = () => {
    const lang = useLang();
    return <App key={lang} />;
};
