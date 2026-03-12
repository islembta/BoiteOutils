import React from 'react';
import { AlertCircle, X } from 'lucide-react';

export default function AlertModal({ isOpen, onClose, title = "Attention", message }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in border-t-4 border-amber-500">
                <div className="px-6 py-5 flex items-start justify-between border-b bg-amber-50 border-amber-100">
                    <h2 className="text-lg font-bold text-amber-800 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        {title}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-white/50 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 text-slate-700">
                    <p>{message}</p>
                </div>
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors shadow-sm">
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}
