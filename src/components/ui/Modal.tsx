import React from 'react';
import { Button } from './Button';
import { Icon } from './Icon';

export const Modal = ({ title, onClose, onSave, children, extraButtons = null, className = "" }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm md:p-4 animate-in fade-in duration-200">
    <div className={`bg-slate-900 border border-slate-700 w-full flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 
      h-full md:h-auto md:max-h-[90vh] md:rounded-2xl 
      ${className || "max-w-5xl"}`}>
      
      {/* Header */}
      <div className="flex justify-between items-center p-4 md:p-5 border-b border-slate-800 shrink-0">
        <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2 truncate">
            <Icon name="PencilSimple" className="text-indigo-400 shrink-0"/> {title}
        </h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-colors shrink-0">
            <Icon name="X" className="text-xl" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6 overflow-y-auto custom-scroll flex-1 relative">
        {children}
      </div>

      {/* Footer */}
      <div className="p-4 md:p-5 border-t border-slate-800 flex flex-col-reverse md:flex-row justify-between items-center bg-slate-900 md:rounded-b-2xl shrink-0 gap-3 md:gap-0">
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
            {extraButtons}
        </div>
        <div className="flex gap-3 w-full md:w-auto">
            <Button variant="secondary" onClick={onClose} className="flex-1 md:flex-none">Close</Button>
            {onSave !== onClose && <Button variant="success" onClick={onSave} icon="FloppyDisk" className="flex-1 md:flex-none">Save</Button>}
        </div>
      </div>
    </div>
  </div>
);