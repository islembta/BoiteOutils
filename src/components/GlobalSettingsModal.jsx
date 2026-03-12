import React from 'react';
import { User, Plus, X, Settings } from 'lucide-react';

export default function GlobalSettingsModal({
    isOpen,
    onClose,
    globalResources,
    newGlobalResource,
    setNewGlobalResource,
    onAddResource,
    onRemoveResource
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col animate-fade-in" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                        <Settings className="w-5 h-5 text-indigo-600" /> Paramètres de l'application
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6">
                    <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <User className="w-4 h-4 text-indigo-500" /> Ressources Globales
                    </h3>
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newGlobalResource}
                                onChange={(e) => setNewGlobalResource(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        onAddResource();
                                    }
                                }}
                                placeholder="Nouvelle ressource (ex: Alice, Équipe Alpha...)"
                                className="flex-1 rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm p-2.5 border outline-none"
                            />
                            <button
                                onClick={onAddResource}
                                disabled={!newGlobalResource.trim()}
                                className="px-4 py-2 bg-indigo-100 text-indigo-700 font-medium rounded-lg hover:bg-indigo-200 disabled:opacity-50 transition-colors flex items-center gap-2 shrink-0"
                            >
                                <Plus className="w-4 h-4" /> Ajouter
                            </button>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                            {globalResources.length === 0 ? (
                                <p className="text-sm text-slate-500 italic">Aucune ressource définie.</p>
                            ) : (
                                globalResources.map(res => (
                                    <div key={res} className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full border border-indigo-100 text-sm font-medium">
                                        <span>{res}</span>
                                        <button
                                            onClick={() => onRemoveResource(res)}
                                            className="p-0.5 hover:bg-indigo-200 rounded-full transition-colors text-indigo-500 hover:text-indigo-800"
                                            title="Supprimer cette ressource"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                        <p className="text-xs text-slate-500">Ces ressources seront importées automatiquement à la création d'un nouveau projet.</p>
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
}
