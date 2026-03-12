import React, { useState, useMemo } from 'react';
import { Plus, AlertCircle, Clock, DollarSign, Activity, GitCommit, Info, FolderOpen, ArrowLeft, Settings, Table2, BarChart2, Layers, CheckSquare, X } from 'lucide-react';
import ImportExportModal from './ImportExportModal';
import TaskFormModal from './TaskFormModal';
import TaskDetailsModal from './TaskDetailsModal';
import TaskTable from './TaskTable';
import GanttView from './GanttView';
import { getTodayDateString } from '../utils/dateUtils';
import AlertModal from './AlertModal';
import ConfirmModal from './ConfirmModal';
import { calculateProjectMetrics } from '../utils/pertCalculator';
import ProjectSettingsModal from './ProjectSettingsModal';

const parseWbsId = (id) => id.toString().split('.').map((segment) => Number.parseInt(segment, 10) || 0);

const compareWbsIds = (leftId, rightId) => {
    const leftParts = parseWbsId(leftId);
    const rightParts = parseWbsId(rightId);
    const maxLength = Math.max(leftParts.length, rightParts.length);

    for (let index = 0; index < maxLength; index += 1) {
        const leftValue = leftParts[index] ?? -1;
        const rightValue = rightParts[index] ?? -1;

        if (leftValue !== rightValue) {
            return leftValue - rightValue;
        }
    }

    return 0;
};

const getParentTaskId = (taskId) => {
    const segments = taskId.toString().split('.');
    return segments.length > 1 ? segments.slice(0, -1).join('.') : null;
};

const getLastSegment = (taskId) => {
    const segments = parseWbsId(taskId);
    return segments[segments.length - 1] ?? 0;
};

const getWbsDistance = (leftId, rightId) => {
    const leftParts = parseWbsId(leftId);
    const rightParts = parseWbsId(rightId);
    const maxLength = Math.max(leftParts.length, rightParts.length);
    let distance = Math.abs(leftParts.length - rightParts.length) * 4;

    for (let index = 0; index < maxLength; index += 1) {
        distance += Math.abs((leftParts[index] ?? 0) - (rightParts[index] ?? 0));
    }

    return distance;
};

const buildSuccessorMap = (tasks) => {
    const successors = {};

    tasks.forEach((task) => {
        successors[task.id] = [];
    });

    tasks.forEach((task) => {
        (task.dependencies || []).forEach((dependencyId) => {
            if (successors[dependencyId]) {
                successors[dependencyId].push(task.id);
            }
        });
    });

    return successors;
};

const hasPath = (successors, startId, targetId) => {
    if (!successors[startId]) return false;

    const visited = new Set();
    const stack = [...successors[startId]];

    while (stack.length > 0) {
        const taskId = stack.pop();
        if (taskId === targetId) return true;
        if (visited.has(taskId)) continue;
        visited.add(taskId);
        stack.push(...(successors[taskId] || []));
    }

    return false;
};

const scoreDependencyCandidate = (candidate, currentTask, scopedTasks, metricsById) => {
    if (!currentTask?.id) return -Infinity;

    let score = 0;
    const currentId = currentTask.id;
    const currentParentId = getParentTaskId(currentId);
    const candidateParentId = getParentTaskId(candidate.id);
    const currentMetric = metricsById[currentId];
    const candidateMetric = metricsById[candidate.id];

    if (compareWbsIds(candidate.id, currentId) < 0) {
        score += 24;
    } else {
        score -= 12;
    }

    if (candidateParentId && candidateParentId === currentParentId) {
        score += 90;

        if (getLastSegment(candidate.id) === getLastSegment(currentId) - 1) {
            score += 170;
        }
    }

    if (currentParentId && getLastSegment(currentId) === 1) {
        const currentPhase = Number.parseInt(currentParentId, 10);
        const previousPhaseId = Number.isNaN(currentPhase) ? null : String(currentPhase - 1);

        if (previousPhaseId && previousPhaseId !== '0') {
            const previousPhaseTasks = scopedTasks
                .filter((task) => getParentTaskId(task.id) === previousPhaseId)
                .sort((left, right) => compareWbsIds(left.id, right.id));
            const previousPhaseLastTask = previousPhaseTasks[previousPhaseTasks.length - 1];

            if (previousPhaseLastTask?.id === candidate.id) {
                score += 150;
            }
        }
    }

    if (!currentParentId && getLastSegment(candidate.id) === getLastSegment(currentId) - 1) {
        score += 140;
    }

    score += Math.max(0, 30 - getWbsDistance(candidate.id, currentId) * 4);

    if (currentMetric && candidateMetric) {
        score += Math.max(0, 40 - Math.abs(candidateMetric.ef - currentMetric.es) * 8);
    }

    return score;
};

export default function ProjectView({ project, onUpdateProject, onBack, APP_VERSION }) {
    const initialFormState = {
        id: null, name: '', description: '', resource: '',
        optimistic: '', realistic: '', pessimistic: '',
        fixedCost: '', dailyCost: '', dependencies: [],
        fixedStartDate: '', fixedEndDate: '', substeps: []
    };

    const [showImportExport, setShowImportExport] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [selectedTaskDetails, setSelectedTaskDetails] = useState(null);
    const [activeTab, setActiveTab] = useState('table'); // 'table' | 'gantt'
    const [ganttViewMode, setGanttViewMode] = useState('days'); // 'days' | 'calendar'
    const [ganttFocusDate, setGanttFocusDate] = useState(() => getTodayDateString());
    const [ganttSelectedDay, setGanttSelectedDay] = useState(null);
    const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '' });
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, onConfirm: null, title: '', message: '', isDanger: false, confirmText: 'Confirmer' });
    const [fabOpen, setFabOpen] = useState(false);
    const [phaseSelectModal, setPhaseSelectModal] = useState(false);

    const tasks = project.tasks || [];
    const projectTitle = project.name || 'Projet Sans Nom';
    const projectStartDate = project.startDate || getTodayDateString();
    const ignoreWeekends = project.ignoreWeekends ?? true;
    const holidays = project.holidays || [];

    const setTasks = (newTasks) => onUpdateProject({ ...project, tasks: newTasks });

    const [taskForm, setTaskForm] = useState(initialFormState);
    const [isEditing, setIsEditing] = useState(false);

    const metrics = useMemo(
        () => calculateProjectMetrics(tasks, projectStartDate, ignoreWeekends, holidays),
        [tasks, projectStartDate, ignoreWeekends, holidays]
    );

    const handleReset = () => {
        setConfirmModal({
            isOpen: true, title: 'Effacer les tâches',
            message: 'Voulez-vous effacer toutes les tâches de ce projet ?',
            isDanger: true, confirmText: 'Effacer',
            onConfirm: () => { setTasks([]); resetForm(); }
        });
    };

    const handleImport = (importedProject) => {
        if (!importedProject) return;

        onUpdateProject({
            ...project,
            name: importedProject.name || project.name,
            startDate: importedProject.startDate || project.startDate || '',
            ignoreWeekends: importedProject.ignoreWeekends ?? true,
            holidays: importedProject.holidays || [],
            tasks: importedProject.tasks || [],
        });
        resetForm();
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const newId = taskForm.id?.trim();
        if (!newId || !taskForm.name.trim()) return;
        if (!isEditing && tasks.some(t => t.id === newId)) {
            setAlertModal({ isOpen: true, title: 'Identifiant existant', message: 'Cet identifiant WBS existe déjà dans le projet.' });
            return;
        }
        const newTaskData = {
            id: newId, name: taskForm.name, resource: taskForm.resource,
            optimistic: parseFloat(taskForm.optimistic) || 0,
            realistic: parseFloat(taskForm.realistic) || 0,
            pessimistic: parseFloat(taskForm.pessimistic) || 0,
            fixedCost: parseFloat(taskForm.fixedCost) || 0,
            dailyCost: parseFloat(taskForm.dailyCost) || 0,
            dependencies: taskForm.dependencies,
            fixedStartDate: taskForm.fixedStartDate || null,
            fixedEndDate: taskForm.fixedEndDate || null,
            description: taskForm.description || null,
            substeps: taskForm.substeps || []
        };
        if (isEditing) {
            setTasks([...tasks.filter(t => t.id !== taskForm.originalId), newTaskData]);
        } else {
            setTasks([...tasks, newTaskData]);
        }
        resetForm();
        setIsFormModalOpen(false);
    };

    const handleEdit = (task) => {
        setTaskForm({
            ...task, originalId: task.id,
            optimistic: task.optimistic.toString(),
            realistic: task.realistic.toString(),
            pessimistic: task.pessimistic.toString(),
            fixedCost: task.fixedCost.toString(),
            dailyCost: task.dailyCost.toString(),
            fixedStartDate: task.fixedStartDate || '',
            fixedEndDate: task.fixedEndDate || '',
            description: task.description || '',
            substeps: task.substeps || []
        });
        setIsEditing(true);
        setIsFormModalOpen(true);
    };

    const handleDelete = (idToDelete) => {
        if (isEditing && taskForm.id === idToDelete) resetForm();
        setTasks(
            tasks
                .filter(t => t.id !== idToDelete && !t.id.startsWith(idToDelete + '.'))
                .map(t => ({ ...t, dependencies: (t.dependencies || []).filter(d => d !== idToDelete && !d.startsWith(idToDelete + '.')) }))
        );
    };

    const handleAddPhase = () => {
        const phaseIds = tasks.filter(t => !t.id.includes('.')).map(t => parseInt(t.id)).filter(id => !isNaN(id));
        const newId = (phaseIds.length > 0 ? Math.max(...phaseIds) + 1 : 1).toString();
        setTaskForm({ ...initialFormState, id: newId });
        setIsEditing(false);
        setFabOpen(false);
        setIsFormModalOpen(true);
    };

    const handleFabAddTask = () => {
        const phases = tasks.filter(t => !t.id.includes('.'));
        if (phases.length === 0) {
            // Pas de phase : on crée direct une tâche de premier niveau
            handleAddPhase();
            return;
        }
        if (phases.length === 1) {
            // Une seule phase : on l'utilise directement
            setFabOpen(false);
            handleAddChildTask(phases[0].id);
            return;
        }
        setFabOpen(false);
        setPhaseSelectModal(true);
    };

    const handleAddChildTask = (parentId) => {
        const children = tasks.filter(t => t.id.startsWith(parentId + '.') && t.id.split('.').length === parentId.split('.').length + 1);
        const childNums = children.map(t => parseInt(t.id.split('.').pop())).filter(n => !isNaN(n));
        const nextNum = childNums.length > 0 ? Math.max(...childNums) + 1 : 1;
        setTaskForm({ ...initialFormState, id: `${parentId}.${nextNum}` });
        setIsEditing(false);
        setIsFormModalOpen(true);
    };

    const resetForm = () => { setTaskForm(initialFormState); setIsEditing(false); };

    const isPhase = taskForm.id && !taskForm.id.toString().includes('.');
    const dependencyOptions = useMemo(() => {
        const selectedIds = taskForm.dependencies || [];
        const metricsById = Object.fromEntries((metrics.tasks || []).map((task) => [task.id, task]));
        const sourceTasks = metrics.tasks?.length > 0 ? metrics.tasks : tasks;
        const scopedTasks = sourceTasks.filter((task) => {
            if (task.id === taskForm.id) return false;
            return (!task.id.toString().includes('.')) === isPhase;
        });
        const selectedSet = new Set(selectedIds);
        const successors = buildSuccessorMap(sourceTasks.filter((task) => ((!task.id.toString().includes('.')) === isPhase)));
        const selected = selectedIds
            .map((id) => metricsById[id] || tasks.find((task) => task.id === id))
            .filter(Boolean)
            .sort((left, right) => compareWbsIds(left.id, right.id));

        const candidates = scopedTasks
            .filter((task) => {
                if (selectedSet.has(task.id)) return false;
                if (taskForm.id && task.id.startsWith(`${taskForm.id}.`)) return false;
                if (taskForm.id && hasPath(successors, taskForm.id, task.id)) return false;
                return true;
            })
            .map((task) => ({
                ...task,
                suggestionScore: scoreDependencyCandidate(task, taskForm, scopedTasks, metricsById),
            }))
            .sort((left, right) => {
                if (right.suggestionScore !== left.suggestionScore) {
                    return right.suggestionScore - left.suggestionScore;
                }
                return compareWbsIds(left.id, right.id);
            });

        const suggested = candidates.filter((task) => task.suggestionScore >= 70);
        const compatible = candidates.filter((task) => task.suggestionScore < 70);

        return { selected, suggested, compatible };
    }, [taskForm, tasks, metrics.tasks, isPhase]);

    const formatCurrency = (amount) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

    return (
        <>
            <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
                <div className="max-w-7xl mx-auto space-y-8">

                    {/* Header */}
                    <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
                        <div className="flex items-center gap-4">
                            <button onClick={onBack} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors shadow-sm">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-3xl font-bold text-indigo-900">{projectTitle}</h1>
                                <p className="text-slate-500 mt-1">Estimation des temps, coûts et lissage des contraintes de ressources</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap justify-end">
                            <button
                                onClick={() => setIsSettingsModalOpen(true)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-indigo-600 hover:border-indigo-300 transition-colors shadow-sm text-sm font-medium"
                            >
                                <Settings className="w-4 h-4" /> Paramètres
                            </button>
                            <button
                                onClick={() => setShowImportExport(true)}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
                            >
                                <FolderOpen className="w-4 h-4" /> Import/Export
                            </button>
                        </div>
                    </header>

                    {/* Error */}
                    {metrics.error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-center gap-3">
                            <AlertCircle className="w-6 h-6 text-red-500" />
                            <p className="text-red-700 font-medium">{metrics.error}</p>
                        </div>
                    )}

                    {/* KPIs */}
                    {!metrics.error && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
                                <div className="flex items-center gap-3 text-slate-500 mb-2"><Clock className="w-5 h-5 text-blue-500" /><h3 className="font-semibold text-sm uppercase tracking-wider">Durée Estimée</h3></div>
                                <p className="text-3xl font-bold text-slate-800">{metrics.duration.toFixed(2)} <span className="text-lg font-normal text-slate-500">jours</span></p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
                                <div className="flex items-center gap-3 text-slate-500 mb-2"><DollarSign className="w-5 h-5 text-emerald-500" /><h3 className="font-semibold text-sm uppercase tracking-wider">Coût Total</h3></div>
                                <p className="text-3xl font-bold text-slate-800">{formatCurrency(metrics.cost)}</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
                                <div className="flex items-center gap-3 text-slate-500 mb-2"><GitCommit className="w-5 h-5 text-rose-500" /><h3 className="font-semibold text-sm uppercase tracking-wider">Écart-Type</h3></div>
                                <p className="text-3xl font-bold text-slate-800">±{metrics.stdDev?.toFixed(2)} <span className="text-lg font-normal text-slate-500">j</span></p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
                                <div className="flex items-center gap-3 text-slate-500 mb-2"><Info className="w-5 h-5 text-amber-500" /><h3 className="font-semibold text-sm uppercase tracking-wider">Intervalle (95%)</h3></div>
                                <p className="text-xl font-bold text-slate-800 mt-2">{Math.max(0, metrics.duration - 2 * metrics.stdDev).toFixed(1)} à {(metrics.duration + 2 * metrics.stdDev).toFixed(1)} jours</p>
                            </div>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="flex flex-col gap-0">
                        <div className="flex gap-0 border-b border-slate-200 overflow-x-auto">
                            <button
                                onClick={() => setActiveTab('table')}
                                className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition-all whitespace-nowrap ${activeTab === 'table' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}
                            >
                                <Table2 className="w-4 h-4" /> Vue Tableau des Tâches
                            </button>
                            <button
                                onClick={() => setActiveTab('gantt')}
                                className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition-all whitespace-nowrap ${activeTab === 'gantt' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}
                            >
                                <BarChart2 className="w-4 h-4" /> Diagramme de Gantt
                            </button>
                        </div>

                        <div className="pt-6">
                            {activeTab === 'table' && (
                                <TaskTable
                                    tasks={metrics.tasks}
                                    isEditing={isEditing}
                                    editingTaskId={taskForm.id}
                                    ganttViewMode={ganttViewMode}
                                    onShowDetails={setSelectedTaskDetails}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    onAddChild={handleAddChildTask}
                                />
                            )}

                            {activeTab === 'gantt' && !metrics.error && (
                                <GanttView
                                    tasks={metrics.tasks}
                                    duration={metrics.duration}
                                    projectStartDate={projectStartDate}
                                    ganttViewMode={ganttViewMode}
                                    focusDate={ganttFocusDate}
                                    onFocusDateChange={setGanttFocusDate}
                                    selectedDay={ganttSelectedDay}
                                    onSelectedDayChange={setGanttSelectedDay}
                                    onModeChange={setGanttViewMode}
                                    ignoreWeekends={ignoreWeekends}
                                    holidays={holidays}
                                    onShowDetails={setSelectedTaskDetails}
                                    onEdit={handleEdit}
                                />
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* Modals */}
            <TaskFormModal
                isOpen={isFormModalOpen}
                onClose={() => { setIsFormModalOpen(false); if (!isEditing) resetForm(); }}
                taskForm={taskForm}
                setTaskForm={setTaskForm}
                onSubmit={handleSubmit}
                isEditing={isEditing}
                dependencyOptions={dependencyOptions}
            />

            <TaskDetailsModal
                isOpen={!!selectedTaskDetails}
                onClose={() => setSelectedTaskDetails(null)}
                task={selectedTaskDetails}
                onEdit={handleEdit}
            />

            <ImportExportModal
                isOpen={showImportExport}
                onClose={() => setShowImportExport(false)}
                project={project}
                onImport={handleImport}
                appVersion={APP_VERSION}
            />

            <ProjectSettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
                project={project}
                onSave={onUpdateProject}
            />

            {/* FAB overlay pour fermeture en cliquant ailleurs */}
            {fabOpen && (
                <div className="fixed inset-0 z-[39]" onClick={() => setFabOpen(false)} />
            )}

            {/* FAB Expandable */}
            <div className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-[40] flex flex-col items-end gap-3">
                {/* Sub-FABs */}
                <div className={`flex flex-col items-end gap-3 transition-all duration-300 ${fabOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                    {/* Ajouter une Tâche */}
                    <div className="flex items-center gap-3">
                        <span className="bg-slate-800 text-white text-sm font-medium px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">Nouvelle Tâche</span>
                        <button
                            onClick={handleFabAddTask}
                            title="Ajouter une Tâche"
                            className="flex items-center justify-center w-12 h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95"
                        >
                            <CheckSquare className="w-5 h-5" />
                        </button>
                    </div>
                    {/* Ajouter une Phase */}
                    <div className="flex items-center gap-3">
                        <span className="bg-slate-800 text-white text-sm font-medium px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">Nouvelle Phase</span>
                        <button
                            onClick={handleAddPhase}
                            title="Ajouter une Phase"
                            className="flex items-center justify-center w-12 h-12 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95"
                        >
                            <Layers className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Main FAB */}
                <button
                    onClick={() => setFabOpen(v => !v)}
                    title={fabOpen ? 'Fermer' : 'Ajouter…'}
                    className={`flex items-center justify-center gap-3 px-6 py-4 text-white rounded-[20px] shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 active:scale-95 ${fabOpen ? 'bg-slate-600 hover:bg-slate-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                    <Plus className={`w-6 h-6 transition-transform duration-300 ${fabOpen ? 'rotate-45' : ''}`} />
                    <span className="font-semibold text-base pr-1">{fabOpen ? 'Fermer' : 'Ajouter…'}</span>
                </button>
            </div>

            {/* Modal sélection de phase pour nouvelle tâche */}
            {phaseSelectModal && (
                <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setPhaseSelectModal(false)} />
                    <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in border-t-4 border-emerald-500">
                        <div className="px-6 py-5 flex items-center justify-between border-b bg-emerald-50 border-emerald-100">
                            <h2 className="text-lg font-bold text-emerald-800 flex items-center gap-2">
                                <CheckSquare className="w-5 h-5" /> Choisir la Phase
                            </h2>
                            <button onClick={() => setPhaseSelectModal(false)} className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-2">
                            <p className="text-sm text-slate-500 mb-3">Dans quelle phase voulez-vous ajouter la tâche ?</p>
                            {tasks.filter(t => !t.id.includes('.')).map(phase => (
                                <button
                                    key={phase.id}
                                    onClick={() => { setPhaseSelectModal(false); handleAddChildTask(phase.id); }}
                                    className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all group"
                                >
                                    <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 font-bold text-sm flex-shrink-0">{phase.id}</span>
                                    <span className="font-medium text-slate-700 group-hover:text-emerald-700">{phase.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <AlertModal
                isOpen={alertModal.isOpen}
                onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
                title={alertModal.title}
                message={alertModal.message}
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                isDanger={confirmModal.isDanger}
                confirmText={confirmModal.confirmText}
            />
        </>
    );
}
