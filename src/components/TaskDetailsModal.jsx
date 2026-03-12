import React from 'react';
import { X, Info, Clock, DollarSign, Activity, AlertCircle, Calendar, Edit2 } from 'lucide-react';
import { toUIDate } from '../utils/dateUtils';

export default function TaskDetailsModal({ isOpen, onClose, task, onEdit }) {
    if (!isOpen || !task) return null;

    const formatCurrency = (amount) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
    const estimatedCost = parseFloat(task.fixedCost || 0) + (parseFloat(task.dailyCost || 0) * (task.te || 0));
    const isPhase = !task.id.toString().includes('.');
    const hasDateConstraints = !!task.fixedStartDate || !!task.fixedEndDate;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

            <div className={`relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in border-t-4 ${task.constraintError ? 'border-orange-500' : task.isCritical ? 'border-rose-500' : 'border-indigo-500'}`}>
                <div className={`px-6 py-5 flex items-start justify-between border-b ${task.isCritical ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-white px-2 py-0.5 rounded text-xs font-bold border shadow-sm text-slate-700">{task.id}</span>
                            {task.constraintError && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-bold border border-orange-300">Contrainte violée</span>}
                            {task.isCritical && !task.constraintError && <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-xs font-bold border border-rose-200">Chemin Critique</span>}
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">{task.name}</h2>
                        {task.resource && !isPhase && <p className="text-sm text-slate-500 mt-1">Ressource : <strong>{task.resource}</strong></p>}
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-white/50 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[75vh] grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50">
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                            <Info className="w-4 h-4" /> {isPhase ? 'Informations Phase' : 'Données saisies'}
                        </h3>

                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 font-mono text-sm text-slate-700">
                            {!isPhase && (
                                <>
                                    <div className="flex justify-between border-b border-slate-50 pb-2">
                                        <span className="text-slate-400">Temps Optimiste :</span>
                                        <span>{task.optimistic} j</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-2">
                                        <span className="text-slate-400">Temps Probable :</span>
                                        <span>{task.realistic} j</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-2">
                                        <span className="text-slate-400">Temps Pessimiste :</span>
                                        <span>{task.pessimistic} j</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-2">
                                        <span className="text-slate-400">Coût Fixe :</span>
                                        <span>{task.fixedCost ? formatCurrency(task.fixedCost) : '-'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-2">
                                        <span className="text-slate-400">Coût Journalier :</span>
                                        <span>{task.dailyCost ? formatCurrency(task.dailyCost) : '-'} / j</span>
                                    </div>

                                    <div className="pt-1">
                                        <p className="text-slate-400 mb-2">Contraintes calendrier :</p>
                                        {hasDateConstraints ? (
                                            <div className="space-y-2">
                                                {task.fixedStartDate && (
                                                    <div className="flex justify-between border-b border-slate-50 pb-2">
                                                        <span className="text-slate-400">Début au plus tôt :</span>
                                                        <span className="text-amber-600 font-bold">{toUIDate(task.fixedStartDate)}</span>
                                                    </div>
                                                )}
                                                {task.fixedEndDate && (
                                                    <div className="flex justify-between border-b border-slate-50 pb-2">
                                                        <span className="text-slate-400">Fin au plus tard :</span>
                                                        <span className="text-amber-600 font-bold">{toUIDate(task.fixedEndDate)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 italic">Aucune contrainte de date</span>
                                        )}
                                    </div>
                                </>
                            )}

                            <div className="flex flex-col gap-1 pt-1">
                                <span className="text-slate-400">Dépendances Logiques :</span>
                                {task.dependencies?.length > 0 ? (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {task.dependencies.map((dependency) => (
                                            <span key={dependency} className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-bold text-xs">{dependency}</span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-slate-400 italic">Aucune</span>
                                )}
                            </div>

                            {isPhase && (
                                <div className="text-slate-700 text-sm whitespace-pre-wrap p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    {task.description || <span className="text-slate-400 italic">Aucune description fournie pour cette phase.</span>}
                                </div>
                            )}

                            {task.substeps && task.substeps.length > 0 && (
                                <div className="flex flex-col gap-2 pt-3 border-t border-slate-100 mt-2">
                                    <span className="text-slate-400">Sous-étapes (To-Do) :</span>
                                    <ul className="space-y-2">
                                        {task.substeps.map((substep) => (
                                            <li key={substep.id} className="flex items-center gap-2 text-sm">
                                                <div className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${substep.completed ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300'}`}>
                                                    {substep.completed && <svg className="w-3 h-3 text-white" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 7 6 10 11 4" /></svg>}
                                                </div>
                                                <span className={substep.completed ? 'line-through text-slate-400' : 'text-slate-700'}>{substep.title}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        {task.constraintError && (
                            <div className="bg-orange-50 border border-orange-300 rounded-xl p-3 flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-orange-700 font-medium">{task.constraintError}</p>
                            </div>
                        )}

                        <h3 className="text-sm font-bold text-indigo-500 uppercase tracking-wider border-b border-indigo-100 pb-2 flex items-center gap-2">
                            <Activity className="w-4 h-4" /> Planning calculé
                        </h3>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm col-span-2 flex justify-between items-center">
                                <div className="flex items-center gap-2 text-indigo-700 font-semibold"><Clock className="w-4 h-4" /> Durée estimée (TE)</div>
                                <span className="text-xl font-bold text-slate-800">{task.te?.toFixed(2)} j</span>
                            </div>

                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm col-span-2 flex justify-between items-center">
                                <div className="flex items-center gap-2 text-emerald-700 font-semibold"><DollarSign className="w-4 h-4" /> Coût total estimé</div>
                                <span className="text-xl font-bold text-slate-800">{formatCurrency(estimatedCost)}</span>
                            </div>

                            {!isPhase && (
                                <>
                                    <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100/50 flex flex-col items-center justify-center">
                                        <span className="text-xs text-slate-500 font-medium mb-1">Early Start (ES)</span>
                                        <span className="font-mono font-bold text-blue-700">{task.es?.toFixed(2)}</span>
                                    </div>
                                    <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100/50 flex flex-col items-center justify-center">
                                        <span className="text-xs text-slate-500 font-medium mb-1">Early Finish (EF)</span>
                                        <span className="font-mono font-bold text-blue-700">{task.ef?.toFixed(2)}</span>
                                    </div>

                                    <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-100/50 flex flex-col items-center justify-center">
                                        <span className="text-xs text-slate-500 font-medium mb-1">Late Start (LS)</span>
                                        <span className="font-mono font-bold text-purple-700">{task.ls?.toFixed(2)}</span>
                                    </div>
                                    <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-100/50 flex flex-col items-center justify-center">
                                        <span className="text-xs text-slate-500 font-medium mb-1">Late Finish (LF)</span>
                                        <span className="font-mono font-bold text-purple-700">{task.lf?.toFixed(2)}</span>
                                    </div>

                                    <div className={`p-3 rounded-xl border col-span-1 flex flex-col items-center justify-center ${task.slack === 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                                        <span className="text-xs text-slate-500 font-medium mb-1">Marge (Slack)</span>
                                        <span className={`font-mono font-bold ${task.slack === 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{task.slack?.toFixed(2)} j</span>
                                    </div>

                                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm col-span-1 flex flex-col items-center justify-center">
                                        <span className="text-xs text-slate-500 font-medium mb-1">Variance</span>
                                        <span className="font-mono font-bold text-slate-700">{task.variance?.toFixed(3)}</span>
                                    </div>
                                </>
                            )}

                            {task.computedStartDate && task.computedEndDate && (
                                <div className="bg-indigo-50/80 p-3 rounded-xl border border-indigo-100/50 shadow-sm col-span-2 flex justify-between items-center mt-2">
                                    <div className="flex items-center gap-2 text-indigo-800 font-semibold"><Calendar className="w-4 h-4" /> Dates calculées</div>
                                    <span className="text-sm font-bold text-slate-700">
                                        Du {toUIDate(task.computedStartDate)} au {toUIDate(task.computedEndDate)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-white border-t border-slate-100 flex justify-between items-center">
                    {onEdit ? (
                        <button type="button" onClick={() => { onClose(); onEdit(task); }} className="px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors flex items-center gap-2 shadow-sm">
                            <Edit2 className="w-4 h-4" /> Modifier
                        </button>
                    ) : <div />}
                    <button type="button" onClick={onClose} className="px-6 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
}
