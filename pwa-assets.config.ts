import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

/**
 * Icons for the installed app, generated from the same favicon the site uses.
 *
 * Two of the three need an opaque background. iOS does not composite a
 * transparent apple-touch-icon onto anything sensible, and a maskable icon is
 * cropped to whatever shape the launcher wants — a transparent one shows the
 * launcher's own fill through the corners. Both get the app's own ground
 * (`slate-950`) so the icon reads as this app and not as a white square.
 *
 * The plain `pwa-*.png` icons stay transparent: they are used where the
 * surface underneath is already the right colour.
 */
const background = '#020617';

export default defineConfig({
    headLinkOptions: { preset: '2023' },
    preset: {
        ...minimal2023Preset,
        maskable: {
            ...minimal2023Preset.maskable,
            resizeOptions: { ...minimal2023Preset.maskable.resizeOptions, background },
        },
        apple: {
            ...minimal2023Preset.apple,
            resizeOptions: { ...minimal2023Preset.apple.resizeOptions, background },
        },
    },
    images: ['public/favicon.svg'],
});
