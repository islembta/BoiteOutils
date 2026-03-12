import React from 'react';
import { Trash2, Edit2, Info, User, Plus } from 'lucide-react';
import { toUIDate } from '../utils/dateUtils';

const formatCurrency = (amount) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

/**
 * Tableau des tâches PERT avec colonnes : ID, Nom/Ressource, Prédécesseurs,
 * Durée, Marge, Coût, Critique, Actions.
 *
 * Props :
 *   tasks          — tableau de tâches calculées (avec te, slack, isCritical…)
 *   isEditing      — bool indiquant si une tâche est en cours d'édition
 *   editingTaskId  — id de la tâche en cours d'édition (null si aucune)
 *   ganttViewMode  — 'days' | 'calendar'
 *   onShowDetails  — (task) => void — ouvre le modal de détails
 *   onEdit         — (task) => void — ouvre le modal d'édition
 *   onDelete       — (taskId) => void — supprime la tâche
 */
export default function TaskTable({
    tasks,
    isEditing,
    editingTaskId,
    ganttViewMode,
    onShowDetails,
    onEdit,
    onDelete,
    onAddChild
}) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-3 py-3 text-left font-semibold text-slate-600">ID</th>
                            <th className="px-3 py-3 text-left font-semibold text-slate-600">Nom &amp; Ressource</th>
                            <th className="px-3 py-3 text-left font-semibold text-slate-600">Prédécesseurs</th>
                            <th className="px-3 py-3 text-center font-semibold text-slate-600">Durée</th>
                            <th className="px-3 py-3 text-center font-semibold text-slate-600">Marge</th>
                            <th className="px-3 py-3 text-right font-semibold text-slate-600">Coût Est.</th>
                            <th className="px-3 py-3 text-center font-semibold text-slate-600">Critique</th>
                            <th className="px-3 py-3 text-center font-semibold text-slate-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {tasks?.map((task) => {
                            const isCurrentlyEdited = isEditing && editingTaskId === task.id;
                            const estCost = task.fixedCost + (task.dailyCost * task.te);
                            const indentLevel = task.id.split('.').length - 1;

                            return (
                                <tr
                                    key={task.id}
                                    className={`cursor-pointer transition-colors ${task.isParent ? 'bg-indigo-50/20 shadow-sm border-t border-b border-indigo-100/50' : ''} ${task.isCritical && !task.isParent ? 'bg-rose-50/30 hover:bg-rose-100/50' : 'hover:bg-slate-100'} ${isCurrentlyEdited ? 'bg-amber-50/50' : ''}`}
                                    onClick={() => onShowDetails(task)}
                                >
                                    <td className={`px-3 py-3 whitespace-nowrap font-medium ${task.isParent ? 'text-indigo-700 font-bold text-sm' : 'text-slate-900'} w-24`}>{task.id}</td>
                                    <td className="px-3 py-3 w-48">
                                        <div
                                            className={`font-medium ${task.isParent ? 'text-indigo-900 font-bold' : 'text-slate-700'}`}
                                            style={{ paddingLeft: `${indentLevel * 1.5}rem` }}
                                        >
                                            {task.name}
                                        </div>
                                        {task.resource && !task.isParent && (
                                            <div
                                                className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"
                                                style={{ paddingLeft: `${indentLevel * 1.5}rem` }}
                                            >
                                                <User className="w-3 h-3" /> {task.resource}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-3 py-3">
                                        {task.dependencies.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {task.dependencies.map(dep => (
                                                    <span key={dep} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-white text-slate-600 border border-slate-200 shadow-sm">
                                                        {dep}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-slate-300">-</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                        <div className="font-semibold text-indigo-600">{task.te.toFixed(2)} j</div>
                                        {task.computedStartDate && (
                                            <div className="text-[10px] text-slate-500 mt-0.5 whitespace-nowrap">
                                                {toUIDate(task.computedStartDate)} - {toUIDate(task.computedEndDate)}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-3 py-3 text-center text-slate-600">{task.slack.toFixed(1)}</td>
                                    <td className="px-3 py-3 text-right text-slate-700 font-medium">{formatCurrency(estCost)}</td>
                                    <td className="px-3 py-3 text-center">
                                        {task.isCritical
                                            ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800">Oui</span>
                                            : <span className="text-slate-300">-</span>}
                                    </td>
                                    <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                onClick={() => onShowDetails(task)}
                                                className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-md transition-colors"
                                                title="Détails de la tâche"
                                            >
                                                <Info className="w-4 h-4" />
                                            </button>
                                            {task.isParent && (
                                                <button
                                                    onClick={() => onAddChild(task.id)}
                                                    className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-md transition-colors"
                                                    title="Ajouter une section à cette phase"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => onEdit(task)}
                                                className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-md transition-colors"
                                                title="Modifier la tâche"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => onDelete(task.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                                title="Supprimer la tâche"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {(!tasks || tasks.length === 0) && (
                            <tr>
                                <td colSpan="8" className="px-4 py-8 text-center text-slate-500">
                                    Aucune tâche pour le moment. Ajoutez-en une pour commencer.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
