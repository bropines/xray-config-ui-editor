/**
 * Globals the test DOM installs (see test-setup.ts, loaded by bunfig.toml).
 *
 * Declared here rather than in test-setup.ts because tsconfig only covers
 * `src`, and a `declare global` in an uncovered file reaches nothing.
 */

/** Sets the width `useIsDesktop` reads, and notifies its listeners. */
// `declare var` is the only spelling that reaches the global scope here.
// eslint-disable-next-line no-var
declare var setViewportWidth: (width: number) => void;
