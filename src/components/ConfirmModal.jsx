import React from 'react';
import { HelpCircle, X, Trash2 } from 'lucide-react';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title = "Confirmation", message, confirmText = "Confirmer", isDanger = false }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative w-full max-w-sm bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in border-t-4 ${isDanger ? 'border-rose-500' : 'border-indigo-500'}`}>
                <div className={`px-6 py-5 flex items-start justify-between border-b ${isDanger ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                    <h2 className={`text-lg font-bold flex items-center gap-2 ${isDanger ? 'text-rose-800' : 'text-slate-800'}`}>
                        {isDanger ? <Trash2 className="w-5 h-5" /> : <HelpCircle className="w-5 h-5 text-indigo-500" />}
                        {title}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-white/50 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 text-slate-700">
                    <p>{message}</p>
                </div>
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-colors">
                        Annuler
                    </button>
                    <button onClick={() => { onConfirm(); onClose(); }} className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm ${isDanger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
