import React from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { Icon } from './Icon';
import { useBackToClose } from '../../hooks/useBackToClose';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { t } from '../../i18n';

/**
 * Where a module's own controls land on a phone.
 *
 * Null on a desktop and outside a Modal, which is the signal to render in
 * place. Holding the node rather than a ref is what makes it a state update:
 * the children that portal into it re-render once it exists.
 */
const BottomSlot = React.createContext<HTMLElement | null>(null);

/**
 * Moves a control to the foot of the sheet on a phone.
 *
 * A Back button belongs at the top of the reading order and the bottom of the
 * screen — the two cannot both be satisfied by where the JSX sits, and these
 * buttons live deep inside panes whose state the shell cannot see. So they
 * stay where they are and render where the thumb is.
 */
export const ModalBottomBar = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const node = React.useContext(BottomSlot);
  if (!node) return <>{children}</>;
  return createPortal(<div className={`contents ${className}`}>{children}</div>, node);
};

export const Modal = ({
  title,
  onClose,
  onSave,
  saveText = t("Save"),
  saveIcon = "FloppyDisk",
  closeText = t("Close"),
  variantSave = "success",
  hideFooter = false,
  children,
  tabs = null,
  extraButtons = null,
  className = "",
  isSecondary = false
}: any) => {
  const [isFullScreen, setIsFullScreen] = React.useState(false);

  // Anything you tap belongs at the bottom of a phone, where a thumb
  // reaches. A tab strip picks what the body shows, so it reads as part of
  // the body on a desktop — and as one more thing to reach for on a phone,
  // where it goes to the foot with the buttons. Rendered in one place either
  // way: two copies would double the DOM and any state inside them.
  const isDesktop = useIsDesktop();

  // State, not a ref: children portal into this node, so they have to
  // re-render once it exists.
  const [bottomSlot, setBottomSlot] = React.useState<HTMLDivElement | null>(null);

  // A full-screen sheet that swallows the system Back gesture turns "out of
  // this" into "out of everything you were doing".
  useBackToClose(true, onClose);

  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const classes = className.split(' ').filter(Boolean);
  const modalWidthClass = classes.find((c: string) => c.startsWith('max-w-')) || 'max-w-[95vw] xl:max-w-[75vw] 2xl:max-w-[1400px]';

  // Height is the shell's business, not each caller's.
  //
  // Callers used to pass their own `h-[90vh] md:h-[88vh]` alongside this
  // component's `h-auto`. Two plain classes, so the stylesheet's order decided
  // the winner — and below `md` that was `h-auto`. The box then sized to its
  // content, every `flex-1 min-h-0` beneath it resolved against an indefinite
  // height, and the editor collapsed to the strip of chrome that happens to be
  // `shrink-0`, with `overflow-hidden` leaving nothing to scroll to the rest.
  // Dropping the caller's heights here is what makes the mobile rule reliable.
  const anyHeight = /^(sm:|md:|lg:|xl:)?(min-|max-)?h-/;
  const mobileHeight = /^(min-|max-)?h-/;
  // Breakpoint-scoped heights are the caller's desktop layout and pass
  // through; an unprefixed one would apply on a phone too, which is the whole
  // bug, so it is dropped rather than silently competing.
  const passThrough = classes.filter((c: string) => !c.startsWith('max-w-') && !mobileHeight.test(c));

  // A phone gets the whole screen: there is no useful "dialog floating over
  // context" at 400px, and `dvh` follows the browser's collapsing toolbar
  // where `vh` does not. A caller that declares its own `md:` height keeps it;
  // only one that declares none gets the shrink-to-content default.
  const sizing = isFullScreen
    ? 'h-[100dvh] md:rounded-none'
    : classes.some((c: string) => anyHeight.test(c))
      ? 'h-[100dvh] md:rounded-2xl'
      : 'h-[100dvh] md:h-auto md:max-h-[92dvh] md:rounded-2xl';

  // The caller may ask desktop not to scroll (it manages its own panes), but
  // on mobile the single column always scrolls — that is the fallback that
  // keeps content reachable when an inner flex chain misbehaves.
  const contentOverflow = className.includes('overflow-hidden')
    ? 'overflow-y-auto md:overflow-hidden'
    : 'overflow-y-auto';

  return createPortal(
    <BottomSlot.Provider value={bottomSlot}>
    <div className={`fixed inset-0 z-[9999] flex items-stretch md:items-center justify-center ${isSecondary ? 'bg-black/50' : 'bg-black/85 backdrop-blur-md'} animate-in fade-in duration-200 ${isFullScreen ? 'p-0 is-modal-fullscreen' : 'p-0 md:p-6'}`}>
      <div className={`bg-slate-900 border-slate-700 md:border w-full flex flex-col shadow-2xl animate-in zoom-in-95 duration-200
        ${sizing}
        ${isFullScreen ? 'max-w-full' : modalWidthClass} ${passThrough.join(' ')}`}>
        
        {/* Header */}
        <div className="flex justify-between items-center gap-2 px-3 py-2 md:p-5 pt-[max(0.5rem,env(safe-area-inset-top))] md:pt-5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2 md:gap-3 min-w-0 relative z-10">
            <h3 className="text-base md:text-xl font-bold text-white flex items-center gap-2 truncate">
                <Icon name="PencilSimple" className="text-indigo-400 shrink-0"/> {title}
            </h3>
            <button 
              onClick={() => setIsFullScreen(!isFullScreen)} 
              title={isFullScreen ? t("Exit Fullscreen") : t("Fullscreen")}
              className="text-slate-500 hover:text-indigo-400 p-1.5 hover:bg-slate-800 rounded-lg transition-all hidden md:block"
            >
              <Icon name={isFullScreen ? "CornersIn" : "CornersOut"} className="text-base" />
            </button>
          </div>
          {/* Two ways out of the same sheet is one too many. The footer's
              Close is the one that stays; this returns when there is no
              footer to hold it. */}
          <button
            onClick={onClose}
            className={`${hideFooter ? 'block' : 'hidden md:block'} text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-colors shrink-0 relative z-10`}
          >
              <Icon name="X" className="text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className={`${isFullScreen ? 'p-1' : 'p-3 md:p-6'} ${contentOverflow} overscroll-contain custom-scroll flex-1 relative flex flex-col min-h-0 @container`}>
          {isDesktop && tabs && <div className="shrink-0 mb-3">{tabs}</div>}
          {children}
        </div>

        {/* Controls a module sends down from inside its body. `empty:hidden`
            keeps the bar out of the layout until something arrives — the
            portal's own children are what stop it matching :empty. */}
        {!isDesktop && (
          <div
            ref={setBottomSlot}
            className={`empty:hidden flex items-center gap-2 px-3 py-2 border-t border-slate-800 bg-slate-900 shrink-0 overflow-x-auto hide-scrollbar ${hideFooter && !tabs ? 'pb-[max(0.5rem,env(safe-area-inset-bottom))]' : ''}`}
          />
        )}

        {/* The tab strip on a phone: its own row at the foot, above the
            buttons. Scrolled rather than wrapped, so it stays one line high,
            and outside the footer so a module that renders no footer still
            gets it. */}
        {!isDesktop && tabs && (
          <div className={`flex items-center gap-2 px-3 py-2 border-t border-slate-800 bg-slate-900 shrink-0 overflow-x-auto hide-scrollbar [&>*]:shrink-0 [&_button]:whitespace-nowrap ${hideFooter ? 'pb-[max(0.5rem,env(safe-area-inset-bottom))]' : ''}`}>
            {tabs}
          </div>
        )}

        {/* Footer */}
        {!hideFooter && (
          <div className="px-3 py-2 md:p-5 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:pb-5 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center bg-slate-900 md:rounded-b-2xl shrink-0 gap-2 md:gap-0 z-20">
            {/* Buttons must keep their intrinsic width for overflow-x-auto to
                mean anything — without shrink-0 they compress and wrap their
                labels instead, doubling the footer height on a phone. */}
            {/* The module's own buttons: their own row above the actions on a
                phone, the left half of the same row on a desktop. Scrolled
                rather than wrapped, so the row stays one line high. */}
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto hide-scrollbar relative z-10 [&>*]:shrink-0 [&_button]:whitespace-nowrap">
                {extraButtons}
            </div>
            <div className="flex gap-3 w-full md:w-auto relative z-10">
                <Button variant="secondary" onClick={onClose} className="flex-1 md:flex-none">{closeText}</Button>
                {onSave && onSave !== onClose && <Button variant={variantSave} onClick={onSave} icon={saveIcon} className="flex-1 md:flex-none">{saveText}</Button>}
            </div>
          </div>
        )}
      </div>
    </div>
    </BottomSlot.Provider>,
    document.body
  );
};
