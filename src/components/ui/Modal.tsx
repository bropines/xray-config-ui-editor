import React from 'react';
import { Button } from './Button';
import { Icon } from './Icon';

// Добавили проп className с дефолтным значением пустой строки
export const Modal = ({ title, onClose, onSave, children, extraButtons = null, className = "" }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
    {/* 
        Здесь логика: если className передан, используем его + базовые стили.
        Если нет — используем стандартные "max-w-5xl max-h-[90vh]".
    */}
    <div className={`bg-slate-900 border border-slate-700 rounded-2xl w-full flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 ${className || "max-w-5xl max-h-[90vh]"}`}>
      
      {/* Header */}
      <div className="flex justify-between items-center p-5 border-b border-slate-800 shrink-0">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Icon name="PencilSimple" className="text-indigo-400"/> {title}
        </h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <Icon name="X" className="text-xl" />
        </button>
      </div>

      {/* Content - flex-1 чтобы занимал все место */}
      <div className="p-6 overflow-y-auto custom-scroll flex-1 relative">
        {children}
      </div>

      {/* Footer */}
      <div className="p-5 border-t border-slate-800 flex justify-between items-center bg-slate-900 rounded-b-2xl shrink-0">
        <div className="flex gap-2">{extraButtons}</div>
        <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>Close</Button>
            {/* Если onSave передан как onClose (read-only), можно скрыть кнопку Save или переименовать, но оставим как есть для унификации */}
            {onSave !== onClose && <Button variant="success" onClick={onSave} icon="FloppyDisk">Save</Button>}
        </div>
      </div>
    </div>
  </div>
);