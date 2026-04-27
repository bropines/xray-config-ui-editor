import React from 'react';
import { Button, cn } from './Button';
import { Icon } from './Icon';

interface ModalProps {
    title: string;
    onClose: () => void;
    onSave?: () => void;
    children: React.ReactNode;
    extraButtons?: React.ReactNode;
    className?: string;
    allowFullScreen?: boolean;
}

export const Modal = ({ 
    title, 
    onClose, 
    onSave, 
    children, 
    extraButtons = null, 
    className = "",
    allowFullScreen = true 
}: ModalProps) => {
  const [isFullScreen, setIsFullScreen] = React.useState(false);

  return (
    <div className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300",
        isFullScreen ? 'p-0 is-modal-fullscreen' : 'p-2 md:p-6'
    )}>
      <div className={cn(
        "bg-slate-900 border border-slate-700/50 w-full flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300 overflow-hidden",
        isFullScreen ? 'h-full md:rounded-none' : 'h-full md:h-auto md:max-h-[92vh] md:rounded-3xl',
        !isFullScreen && (className.includes('max-w-') ? '' : 'max-w-[95vw] xl:max-w-[80vw] 2xl:max-w-[1500px]'),
        className
      )}>
        
        {/* Modal Header */}
        <div className="flex justify-between items-center p-5 md:p-6 border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 hidden sm:block">
                <Icon name="PencilSimple" weight="fill" className="text-xl"/>
            </div>
            <h3 className="text-xl md:text-2xl font-black text-white flex items-center gap-2 truncate tracking-tight uppercase">
                {title}
            </h3>
            {allowFullScreen && (
                <button 
                onClick={() => setIsFullScreen(!isFullScreen)} 
                title={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                className="text-slate-600 hover:text-indigo-400 p-2 hover:bg-slate-800 rounded-xl transition-all hidden md:flex items-center justify-center"
                >
                <Icon name={isFullScreen ? "CornersIn" : "CornersOut"} weight="bold" className="text-lg" />
                </button>
            )}
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-500 hover:text-white p-2.5 hover:bg-rose-500/10 hover:text-rose-400 rounded-xl transition-all shrink-0 active:scale-90"
          >
              <Icon name="X" weight="bold" className="text-2xl" />
          </button>
        </div>

        {/* Modal Content */}
        <div className={cn(
            "flex-1 relative flex flex-col min-h-0 custom-scroll",
            isFullScreen ? 'p-2 md:p-4' : 'p-5 md:p-8',
            className.includes('overflow-hidden') ? 'overflow-hidden' : 'overflow-y-auto'
        )}>
          {children}
        </div>

        {/* Modal Footer */}
        <div className="p-5 md:p-6 border-t border-slate-800/80 flex flex-col-reverse md:flex-row justify-between items-center bg-slate-900 md:rounded-b-3xl shrink-0 gap-4 md:gap-0">
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 hide-scrollbar scroll-smooth">
              {extraButtons}
          </div>
          <div className="flex gap-4 w-full md:w-auto">
              <Button variant="outline" size="md" onClick={onClose} className="flex-1 md:flex-none px-8">Cancel</Button>
              {onSave && onSave !== onClose && (
                <Button variant="success" size="md" onClick={onSave} icon="FloppyDisk" iconWeight="bold" className="flex-1 md:flex-none px-10">
                    Save Changes
                </Button>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};
