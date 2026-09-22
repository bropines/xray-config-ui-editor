import React from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { Icon } from './Icon';
import { useBackToClose } from '../../hooks/useBackToClose';
import { t } from '../../i18n';

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
  extraButtons = null,
  className = "",
  isSecondary = false
}: any) => {
  const [isFullScreen, setIsFullScreen] = React.useState(false);

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
    <div className={`fixed inset-0 z-[9999] flex items-stretch md:items-center justify-center ${isSecondary ? 'bg-black/50' : 'bg-black/85 backdrop-blur-md'} animate-in fade-in duration-200 ${isFullScreen ? 'p-0 is-modal-fullscreen' : 'p-0 md:p-6'}`}>
      <div className={`bg-slate-900 border-slate-700 md:border w-full flex flex-col shadow-2xl animate-in zoom-in-95 duration-200
        ${sizing}
        ${isFullScreen ? 'max-w-full' : modalWidthClass} ${passThrough.join(' ')}`}>
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 md:p-5 pt-[max(1rem,env(safe-area-inset-top))] md:pt-5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0 relative z-10">
            <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2 truncate">
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
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-colors shrink-0 relative z-10">
              <Icon name="X" className="text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className={`${isFullScreen ? 'p-1' : 'p-3 md:p-6'} ${contentOverflow} overscroll-contain custom-scroll flex-1 relative flex flex-col min-h-0 @container`}>
          {children}
        </div>

        {/* Footer */}
        {!hideFooter && (
          <div className="p-3 md:p-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:pb-5 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center bg-slate-900 md:rounded-b-2xl shrink-0 gap-2 md:gap-0 z-20">
            {/* Buttons must keep their intrinsic width for overflow-x-auto to
                mean anything — without shrink-0 they compress and wrap their
                labels instead, doubling the footer height on a phone. */}
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 hide-scrollbar relative z-10 [&>*]:shrink-0 [&_button]:whitespace-nowrap">
                {extraButtons}
            </div>
            <div className="flex gap-3 w-full md:w-auto relative z-10">
                <Button variant="secondary" onClick={onClose} className="flex-1 md:flex-none">{closeText}</Button>
                {onSave && onSave !== onClose && <Button variant={variantSave} onClick={onSave} icon={saveIcon} className="flex-1 md:flex-none">{saveText}</Button>}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
