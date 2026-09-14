import { t } from '../../i18n';

type Item = { id: string | number };

/**
 * Screen-reader text for every drag-and-drop list in the app.
 *
 * dnd-kit ships English instructions and announcements of its own, which are
 * the one part of the interface a translation pass cannot reach by rewriting
 * our own strings — so they are supplied here and spread into each DndContext.
 *
 * Keys are written as single double-quoted literals on purpose: that is what
 * `bun run i18n:report` and the coverage test scan for.
 */
export const dndAccessibility = () => ({
    screenReaderInstructions: {
        draggable: t("To pick up an item, press the space bar. While dragging, use the arrow keys to move it. Press space again to drop it, or escape to cancel."),
    },
    announcements: {
        onDragStart: ({ active }: { active: Item }) =>
            t("Picked up item {id}.", { id: String(active.id) }),
        onDragOver: ({ active, over }: { active: Item; over: Item | null }) =>
            over
                ? t("Item {id} is over position {target}.", { id: String(active.id), target: String(over.id) })
                : t("Item {id} is no longer over a drop position.", { id: String(active.id) }),
        onDragEnd: ({ active, over }: { active: Item; over: Item | null }) =>
            over
                ? t("Item {id} was dropped at position {target}.", { id: String(active.id), target: String(over.id) })
                : t("Item {id} was dropped.", { id: String(active.id) }),
        onDragCancel: ({ active }: { active: Item }) =>
            t("Dragging of item {id} was cancelled.", { id: String(active.id) }),
    },
});
