// ============================================================
// Picking a config file
// ============================================================

/**
 * What the file picker will let you choose.
 *
 * `.json` alone is not enough on Android: the picker turns `accept` into a
 * MIME filter, and whether a file called `config.json` is offered depends on
 * what the device decided its type was — `application/json` on one, plain text
 * on another, `application/octet-stream` when it came out of a download. A
 * config sitting right there in Downloads, greyed out and unselectable, is a
 * worse outcome than a picker that also lists a few text files.
 *
 * So: the extension for desktop, and every type a JSON file plausibly carries.
 */
export const CONFIG_FILE_ACCEPT =
    '.json,.txt,application/json,text/json,text/plain,application/octet-stream';
