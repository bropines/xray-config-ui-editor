import React from 'react';
import { Button } from './Button';
import { Icon } from './Icon';

export const Modal = ({ title, onClose, onSave, children, extraButtons = null }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
      <div className="flex justify-between items-center p-5 border-b border-slate-800">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Icon name="pencil-simple" className="text-indigo-400"/> {title}
        </h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg"><Icon name="x" className="text-xl" /></button>
      </div>
      <div className="p-6 overflow-y-auto custom-scroll flex-1">
        {children}
      </div>
      <div className="p-5 border-t border-slate-800 flex justify-between items-center bg-slate-900 rounded-b-2xl">
        <div className="flex gap-2">{extraButtons}</div>
        <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>Отмена</Button>
            <Button variant="success" onClick={onSave} icon="floppy-disk">Сохранить</Button>
        </div>
      </div>
    </div>
  </div>
);