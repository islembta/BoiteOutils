import React, { useEffect, useState } from 'react';
import { Plus, Edit2, X, User, Save } from 'lucide-react';
import FrDateInput from './FrDateInput';

export default function TaskFormModal({
    isOpen,
    onClose,
    taskForm,
    setTaskForm,
    onSubmit,
    isEditing,
    dependencyOptions,
    projectResources = [],
}) {
    const [substepPromptState, setSubstepPromptState] = useState({ isOpen: false, value: '' });

    useEffect(() => {
        if (!isOpen) {
            setSubstepPromptState({ isOpen: false, value: '' });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const isPhase = taskForm.id && !taskForm.id.toString().includes('.');
    const selectedDependencies = dependencyOptions?.selected || [];
    const suggestedDependencies = dependencyOptions?.suggested || [];
    const compatibleDependencies = dependencyOptions?.compatible || [];

    const toggleDependency = (dependencyId) => {
        const selected = new Set(taskForm.dependencies || []);

        if (selected.has(dependencyId)) {
            selected.delete(dependencyId);
        } else {
            selected.add(dependencyId);
        }

        setTaskForm({ ...taskForm, dependencies: Array.from(selected) });
    };

    const confirmSubstep = (event) => {
        event.preventDefault();
        const title = substepPromptState.value.trim();

        if (title) {
            setTaskForm({
                ...taskForm,
                substeps: [
                    ...(taskForm.substeps || []),
                    { id: Date.now(), title, completed: false },
                ],
            });
        }

        setSubstepPromptState({ isOpen: false, value: '' });
    };

    const removeSubstep = (substepId) => {
        setTaskForm({
            ...taskForm,
            substeps: (taskForm.substeps || []).filter((substep) => substep.id !== substepId),
        });
    };

    const toggleSubstep = (substepId) => {
        setTaskForm({
            ...taskForm,
            substeps: (taskForm.substeps || []).map((substep) =>
                substep.id === substepId ? { ...substep, completed: !substep.completed } : substep
            ),
        });
    };

    const renderDependencyList = (items, emptyMessage) => {
        if (items.length === 0) {
            return <p className="text-xs text-slate-400 italic">{emptyMessage}</p>;
        }

        return (
            <div className="space-y-2">
                {items.map((task) => {
                    const isSelected = (taskForm.dependencies || []).includes(task.id);

                    return (
                        <button
                            key={task.id}
                            type="button"
                            onClick={() => toggleDependency(task.id)}
                            className={`w-full flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${isSelected
                                    ? 'border-indigo-300 bg-indigo-50 text-indigo-900'
                                    : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50'
                                }`}
                        >
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800">{task.id}</p>
                                <p className="text-xs text-slate-500 truncate">{task.name}</p>
                            </div>
                            <span
                                className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                                    }`}
                            >
                                {isSelected ? 'Retirer' : 'Ajouter'}
                            </span>
                        </button>
                    );
                })}
            </div>
        );
    };

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

                <div className={`relative w-full max-w-xl bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in border-t-4 ${isEditing ? 'border-amber-500' : 'border-indigo-600'}`}>
                    <div className={`px-6 py-5 flex items-center justify-between border-b ${isEditing ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                        <h2 className={`text-xl font-bold flex items-center gap-2 ${isEditing ? 'text-amber-800' : 'text-slate-800'}`}>
                            {isEditing ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5 text-indigo-500" />}
                            {isEditing ? `Éditer la ${isPhase ? 'Phase' : 'Tâche'} ${taskForm.id}` : `Ajouter une nouvelle ${isPhase ? 'Phase' : 'Tâche'}`}
                        </h2>
                        <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto max-h-[75vh]">
                        <form id="task-form" onSubmit={onSubmit} className="space-y-4">
                            <div className="grid grid-cols-4 gap-3">
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">ID (Auto)</label>
                                    <input
                                        readOnly
                                        type="text"
                                        value={taskForm.id || ''}
                                        className="w-full rounded-lg bg-slate-100 text-slate-500 border-slate-300 shadow-sm sm:text-sm p-2.5 border outline-none font-mono cursor-not-allowed"
                                    />
                                </div>
                                <div className="col-span-3">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nom de la {isPhase ? 'Phase' : 'Tâche'}</label>
                                    <input
                                        required
                                        type="text"
                                        value={taskForm.name}
                                        onChange={(event) => setTaskForm({ ...taskForm, name: event.target.value })}
                                        className="w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm p-2.5 border outline-none"
                                        placeholder={isPhase ? 'Ex: Phase initiale' : 'Ex: Déploiement serveur'}
                                    />
                                </div>
                            </div>

                            {isPhase && (
                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Objectif de la phase</label>
                                    <textarea
                                        value={taskForm.description || ''}
                                        onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })}
                                        className="w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm p-3 border outline-none min-h-[100px] bg-slate-50"
                                        placeholder="Expliquez ce que cette phase permettra de faire..."
                                    />
                                </div>
                            )}

                            {!isPhase && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                                            <User className="w-4 h-4 text-slate-400" /> Ressource assignée
                                        </label>
                                        <input
                                            type="text"
                                            list="project-resources-list"
                                            value={taskForm.resource}
                                            onChange={(event) => setTaskForm({ ...taskForm, resource: event.target.value })}
                                            className="w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm p-2.5 border outline-none"
                                            placeholder="Nom de la personne ou équipe"
                                        />
                                        <datalist id="project-resources-list">
                                            {projectResources.map((res) => (
                                                <option key={res} value={res} />
                                            ))}
                                        </datalist>
                                    </div>

                                    <div className="mt-4 mb-2">
                                        <label className="block text-sm font-medium text-slate-700">Estimations de durée (en jours)</label>
                                        <p className="text-xs text-slate-500">Saisissez les durées estimées en nombre de jours pour cette tâche.</p>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 mb-1">Optimiste <span className="text-slate-400 font-normal">(opt.)</span></label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.1"
                                                value={taskForm.optimistic}
                                                onChange={(event) => setTaskForm({ ...taskForm, optimistic: event.target.value })}
                                                className="w-full rounded-lg border-slate-300 shadow-sm p-2.5 border outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                                placeholder="= Probable"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 mb-1">Probable <span className="text-rose-500">*</span></label>
                                            <input
                                                required
                                                type="number"
                                                min="0"
                                                step="0.1"
                                                value={taskForm.realistic}
                                                onChange={(event) => setTaskForm({ ...taskForm, realistic: event.target.value })}
                                                className="w-full rounded-lg border-slate-300 shadow-sm p-2.5 border outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 mb-1">Pessimiste <span className="text-slate-400 font-normal">(opt.)</span></label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.1"
                                                value={taskForm.pessimistic}
                                                onChange={(event) => setTaskForm({ ...taskForm, pessimistic: event.target.value })}
                                                className="w-full rounded-lg border-slate-300 shadow-sm p-2.5 border outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                                placeholder="= Probable"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Coût Fixe (€)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={taskForm.fixedCost}
                                                onChange={(event) => setTaskForm({ ...taskForm, fixedCost: event.target.value })}
                                                className="w-full rounded-lg border-slate-300 shadow-sm p-2.5 border outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Coût / Jour (€)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={taskForm.dailyCost}
                                                onChange={(event) => setTaskForm({ ...taskForm, dailyCost: event.target.value })}
                                                className="w-full rounded-lg border-slate-300 shadow-sm p-2.5 border outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs text-indigo-700">
                                        Les dates ci-dessous sont des contraintes calendaires. Elles bornent le calcul du planning, mais elles ne remplacent pas la durée PERT de la tâche. Les dates réelles de début et de fin sont calculées automatiquement.
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Contrainte de début (opt.)</label>
                                            <FrDateInput
                                                value={taskForm.fixedStartDate || ''}
                                                onChange={(value) => setTaskForm({ ...taskForm, fixedStartDate: value })}
                                                inputClass="w-full"
                                            />
                                            <p className="text-[11px] text-slate-400 mt-1">La tâche ne peut pas commencer avant cette date.</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Contrainte de fin (opt.)</label>
                                            <FrDateInput
                                                value={taskForm.fixedEndDate || ''}
                                                onChange={(value) => setTaskForm({ ...taskForm, fixedEndDate: value })}
                                                inputClass="w-full"
                                            />
                                            <p className="text-[11px] text-slate-400 mt-1">La tâche doit être terminée au plus tard à cette date.</p>
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Dépendances</label>
                                    <p className="text-xs text-slate-500">Cliquez sur une tâche pour l'ajouter ou la retirer des dépendances.</p>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Déjà sélectionnées</p>
                                    {selectedDependencies.length === 0 ? (
                                        <p className="text-xs text-slate-400 italic">Aucune dépendance sélectionnée.</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {selectedDependencies.map((task) => (
                                                <button
                                                    key={task.id}
                                                    type="button"
                                                    onClick={() => toggleDependency(task.id)}
                                                    className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50"
                                                >
                                                    <span>{task.id} - {task.name}</span>
                                                    <X className="w-3 h-3" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-2">Suggestions</p>
                                    {renderDependencyList(suggestedDependencies, 'Aucune suggestion prioritaire pour cette tâche.')}
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-white p-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Tâches compatibles</p>
                                    {renderDependencyList(compatibleDependencies, 'Aucune autre tâche compatible.')}
                                </div>
                            </div>

                            {!isPhase && (
                                <div className="mt-4 border-t pt-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm font-medium text-slate-700">Sous-tâches (To-Do List)</label>
                                        <button
                                            type="button"
                                            onClick={() => setSubstepPromptState({ isOpen: true, value: '' })}
                                            className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded"
                                        >
                                            <Plus className="w-3 h-3" /> Ajouter
                                        </button>
                                    </div>

                                    {taskForm.substeps && taskForm.substeps.length > 0 ? (
                                        <ul className="space-y-2">
                                            {taskForm.substeps.map((substep, index) => (
                                                <li key={substep.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                                                    <input
                                                        type="checkbox"
                                                        checked={substep.completed}
                                                        onChange={() => toggleSubstep(substep.id)}
                                                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                                    />
                                                    <span className={`text-sm flex-1 ${substep.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                                        {taskForm.id}.{index + 1} - {substep.title}
                                                    </span>
                                                    <button type="button" onClick={() => removeSubstep(substep.id)} className="text-slate-400 hover:text-rose-500">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic">Aucune sous-étape définie. Ceci est utile pour diviser le travail d'une tâche.</p>
                                    )}
                                </div>
                            )}
                        </form>
                    </div>

                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-colors">
                            Annuler
                        </button>
                        <button type="submit" form="task-form" className={`flex items-center justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${isEditing ? 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-500' : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'}`}>
                            {isEditing ? <><Save className="w-4 h-4 mr-2" /> Mettre à jour</> : <><Plus className="w-4 h-4 mr-2" /> Ajouter</>}
                        </button>
                    </div>
                </div>
            </div>

            {substepPromptState.isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSubstepPromptState({ isOpen: false, value: '' })} />
                    <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl flex flex-col animate-fade-in">
                        <form onSubmit={confirmSubstep}>
                            <div className="px-6 py-4 border-b border-slate-100">
                                <h3 className="text-lg font-bold text-slate-800">Nouvelle sous-tâche</h3>
                            </div>
                            <div className="p-6">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Nom (To-Do)</label>
                                <input
                                    type="text"
                                    autoFocus
                                    value={substepPromptState.value}
                                    onChange={(event) => setSubstepPromptState({ ...substepPromptState, value: event.target.value })}
                                    className="w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm p-3 border outline-none"
                                />
                            </div>
                            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl">
                                <button type="button" onClick={() => setSubstepPromptState({ isOpen: false, value: '' })} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                                    Annuler
                                </button>
                                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                                    Ajouter
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
