import React from 'react';
import { iconBody } from './icon-map.generated';
import { clsx } from 'clsx';

/**
 * Renders an icon by name.
 *
 * The markup is generated at build time rather than imported as components —
 * see scripts/generate-icon-map.ts. Resolving a component from a string meant
 * importing the whole icon set, which nothing can tree-shake; importing only
 * the used ones still shipped their six-weight switches and the context
 * machinery around them. What actually reaches the DOM is a couple of paths,
 * so that is what ships.
 *
 * The `__html` is path data this repo generated from a package at build time,
 * never anything a user typed.
 */
interface IconProps {
    name: string;
    className?: string;
    weight?: any;
    /**
     * Explicit pixel size. Eight call sites already passed this and were
     * silently ignored, drawing at the inherited 1em instead — the prop is
     * real now rather than a lie the types happened to allow.
     */
    size?: number;
}

export const Icon = ({ name, className = "", weight = "regular", size }: IconProps) => {
    // Преобразуем kebab-case в PascalCase (pencil-simple -> PencilSimple)
    // И обрабатываем случай, если имя уже в PascalCase
    const componentName = name.includes('-')
        ? name.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('')
        : name.charAt(0).toUpperCase() + name.slice(1);

    const body = iconBody(componentName, weight);

    if (!body) {
        // Fallback если иконка не найдена
        return <span className={clsx("text-red-500 font-bold text-xs", className)}>?</span>;
    }

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 256 256"
            width={size ?? '1em'}
            height={size ?? '1em'}
            fill="currentColor"
            className={clsx("inline-block shrink-0", className)}
            dangerouslySetInnerHTML={{ __html: body }}
        />
    );
};
