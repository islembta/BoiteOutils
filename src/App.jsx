import React, { useEffect, useState, useRef } from 'react';
import { Activity, Plus, Calendar, BarChart2, Trash2, Upload, User, X, Settings } from 'lucide-react';
import ProjectView from './components/ProjectView';
import { getFrenchHolidays, getTodayDateString, diffDays, formatUIDateLong, offsetToEndDate } from './utils/dateUtils';
import { calculateProjectMetrics } from './utils/pertCalculator';
import ConfirmModal from './components/ConfirmModal';
import { processRetroCompatibility } from './utils/retroCompatibility';
import ImportExportModal from './components/ImportExportModal';
import GlobalSettingsModal from './components/GlobalSettingsModal';

const PROJECTS_STORAGE_KEY = 'pert_projects_v2';
const RESOURCES_STORAGE_KEY = 'pert_global_resources_v1';
const APP_VERSION = __APP_VERSION__;

export default function App() {
    const [projects, setProjects] = useState([]);
    const [currentProjectId, setCurrentProjectId] = useState(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [globalResources, setGlobalResources] = useState([]);
    const [newGlobalResource, setNewGlobalResource] = useState('');
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        onConfirm: null,
        title: '',
        message: '',
    });
    const handleHomeImport = (importedProject) => {
        const newProject = {
            id: `proj-${Date.now()}`,
            name: importedProject.name || 'Projet Importé',
            startDate: importedProject.startDate || getTodayDateString(),
            ignoreWeekends: importedProject.ignoreWeekends ?? true,
            holidays: importedProject.holidays || getFrenchHolidays(new Date().getFullYear()),
            createdAt: new Date().toISOString(),
            tasks: importedProject.tasks || [],
        };

        setProjects((currentProjects) => [...currentProjects, newProject]);
        setCurrentProjectId(newProject.id);
        setIsImportModalOpen(false);
    };

    useEffect(() => {
        try {
            const savedProjects = localStorage.getItem(PROJECTS_STORAGE_KEY);
            const savedResources = localStorage.getItem(RESOURCES_STORAGE_KEY);
            
            if (savedResources) {
                setGlobalResources(JSON.parse(savedResources));
            }
            
            if (savedProjects) {
                setProjects(JSON.parse(savedProjects));
                return;
            }

            const oldTasks = localStorage.getItem('pert_tasks_v1');
            const oldTitle = localStorage.getItem('pert_project_title_v1') || 'Projet Migré';
            const oldStartDate = localStorage.getItem('pert_project_start_date_v1') || getTodayDateString();
            const defaultHolidays = getFrenchHolidays(new Date().getFullYear());

            if (oldTasks) {
                const parsedTasks = JSON.parse(oldTasks);
                const migratedProject = {
                    id: `proj-${Date.now()}`,
                    name: oldTitle,
                    startDate: oldStartDate,
                    ignoreWeekends: true,
                    holidays: defaultHolidays,
                    createdAt: new Date().toISOString(),
                    tasks: parsedTasks,
                };

                setProjects([migratedProject]);
                localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify([migratedProject]));
            }
        } catch (error) {
            console.error('Impossible de charger les projets sauvegardés.', error);
            setProjects([]);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
        }
    }, [projects, isLoaded]);

    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(RESOURCES_STORAGE_KEY, JSON.stringify(globalResources));
        }
    }, [globalResources, isLoaded]);

    const handleCreateProjectClick = () => {
        setNewProjectName(`Nouveau Projet ${projects.length + 1}`);
        setIsProjectModalOpen(true);
    };

    const handleCreateProjectConfirm = (event) => {
        event.preventDefault();

        const defaultHolidays = getFrenchHolidays(new Date().getFullYear());
        const newProject = {
            id: `proj-${Date.now()}`,
            name: newProjectName.trim() || `Nouveau Projet ${projects.length + 1}`,
            startDate: getTodayDateString(),
            ignoreWeekends: true,
            holidays: defaultHolidays,
            createdAt: new Date().toISOString(),
            resources: [...globalResources],
            tasks: [],
        };

        setProjects((currentProjects) => [...currentProjects, newProject]);
        setCurrentProjectId(newProject.id);
        setIsProjectModalOpen(false);
    };

    const handleDeleteProject = (projectId, event) => {
        event.stopPropagation();
        setConfirmModal({
            isOpen: true,
            title: 'Supprimer le projet',
            message: 'Voulez-vous supprimer ce projet définitivement ?',
            isDanger: true,
            confirmText: 'Supprimer',
            onConfirm: () => {
                setProjects((currentProjects) => currentProjects.filter((project) => project.id !== projectId));
            },
        });
    };

    const handleAddGlobalResource = () => {
        if (newGlobalResource.trim() && !globalResources.includes(newGlobalResource.trim())) {
            setGlobalResources([...globalResources, newGlobalResource.trim()]);
            setNewGlobalResource('');
        }
    };

    const handleRemoveGlobalResource = (res) => {
        setGlobalResources(globalResources.filter(r => r !== res));
    };

    if (!isLoaded) {
        return <div className="p-8">Chargement...</div>;
    }

    const currentProject = projects.find((project) => project.id === currentProjectId);

    if (currentProject) {
        return (
            <ProjectView
                project={currentProject}
                onUpdateProject={(updatedProject) => {
                    setProjects((currentProjects) =>
                        currentProjects.map((project) => (project.id === updatedProject.id ? updatedProject : project))
                    );
                }}
                onBack={() => setCurrentProjectId(null)}
                APP_VERSION={APP_VERSION}
            />
        );
    }

    const enrichedProjects = projects.map((project) => {
        const metrics = calculateProjectMetrics(project.tasks, project.startDate, project.ignoreWeekends, project.holidays);
        const endDate = project.startDate && metrics.duration > 0
            ? offsetToEndDate(project.startDate, metrics.duration, project.ignoreWeekends, project.holidays)
            : null;

        return {
            ...project,
            duration: metrics.duration,
            endDate,
            metrics,
        };
    });

    let globalMinDate = null;
    let globalMaxDate = null;

    enrichedProjects.forEach((project) => {
        if (!project.startDate) return;
        if (!globalMinDate || project.startDate < globalMinDate) globalMinDate = project.startDate;
        if (!project.endDate) return;
        if (!globalMaxDate || project.endDate > globalMaxDate) globalMaxDate = project.endDate;
    });

    const globalSpan = globalMinDate && globalMaxDate ? (diffDays(globalMaxDate, globalMinDate) + 1) || 1 : 1;
    const resourceTasks = [];
    enrichedProjects.forEach(p => {
        (p.metrics?.tasks || []).forEach(t => {
            if (t.isParent || !t.computedStartDate || !t.computedEndDate) return;
            resourceTasks.push({
                ...t,
                projectName: p.name,
                resourceName: t.resource?.trim() || 'Non assignée'
            });
        });
    });

    const resourcesMap = {};
    resourceTasks.forEach(t => {
        if (!resourcesMap[t.resourceName]) Object.defineProperty(resourcesMap, t.resourceName, { value: [], enumerable: true, writable: true });
        resourcesMap[t.resourceName].push(t);
    });

    const resourceEntries = Object.entries(resourcesMap).sort(([nameA], [nameB]) => {
        if (nameA === 'Non assignée') return 1;
        if (nameB === 'Non assignée') return -1;
        return nameA.localeCompare(nameB);
    });

    resourceEntries.forEach(([_, tasks]) => {
        tasks.sort((a, b) => a.computedStartDate.localeCompare(b.computedStartDate));
        const levels = [];
        tasks.forEach(t => {
            let placed = false;
            for (let i = 0; i < levels.length; i++) {
                if (levels[i] < t.computedStartDate) {
                    t.overlapLevel = i;
                    levels[i] = t.computedEndDate;
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                t.overlapLevel = levels.length;
                levels.push(t.computedEndDate);
            }
        });
        tasks.maxLevel = levels.length;
    });

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
            <div className="max-w-5xl mx-auto space-y-8">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-indigo-900 flex items-center gap-3">
                            <Activity className="w-8 h-8 text-indigo-600" /> Boite à Outils Projets
                        </h1>
                        <p className="text-slate-500 mt-1">Gérez vos estimations de temps et de coûts multi-projets</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsSettingsModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium rounded-lg shadow-sm transition-colors"
                            title="Paramètres de l'application"
                        >
                            <Settings className="w-5 h-5 text-slate-500" />
                        </button>
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-indigo-600 border border-indigo-200 font-medium rounded-lg shadow-sm transition-colors"
                        >
                            <Upload className="w-5 h-5" /> Importer un projet
                        </button>
                        <button
                            onClick={handleCreateProjectClick}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors"
                        >
                            <Plus className="w-5 h-5" /> Nouveau Projet
                        </button>
                    </div>
                </header>

                {projects.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 bg-white border border-slate-200 rounded-xl border-dashed">
                        Aucun projet pour le moment. Créez-en un pour commencer.
                    </div>
                ) : (
                    <div className="space-y-6">

                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <BarChart2 className="w-5 h-5 text-indigo-500" /> Planning Global des Projets
                            </h2>

                            {globalMinDate && globalMaxDate ? (
                                <div className="relative pt-6 pb-2">
                                    <div className="absolute top-0 left-0 text-xs font-semibold text-slate-400">
                                        {formatUIDateLong(globalMinDate)}
                                    </div>
                                    <div className="absolute top-0 right-0 text-xs font-semibold text-slate-400">
                                        {formatUIDateLong(globalMaxDate)}
                                    </div>

                                    <div className="space-y-4">
                                        {enrichedProjects.map((project) => {
                                            if (!project.startDate || !project.endDate) return null;

                                            const leftPercent = Math.max(
                                                0,
                                                (diffDays(project.startDate, globalMinDate) / globalSpan) * 100
                                            );
                                            const widthPercent = Math.max(
                                                1,
                                                ((diffDays(project.endDate, project.startDate) + 1) / globalSpan) * 100
                                            );

                                            return (
                                                <div
                                                    key={`gantt-${project.id}`}
                                                    className="relative h-10 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors group"
                                                    onClick={() => setCurrentProjectId(project.id)}
                                                >
                                                    <div
                                                        className="absolute left-0 top-0 bottom-0 border-l border-slate-200"
                                                        style={{ width: '100%' }}
                                                    />

                                                    <div
                                                        className="absolute top-1.5 bottom-1.5 bg-indigo-500 rounded-md shadow-sm group-hover:bg-indigo-600 transition-colors"
                                                        style={{ left: `${leftPercent}%`, width: `${widthPercent}%`, minWidth: '4px' }}
                                                    />

                                                    <div className="absolute inset-0 flex items-center px-4 pointer-events-none">
                                                        <span className="text-xs font-bold text-slate-700 bg-white/80 px-2 rounded backdrop-blur-sm z-10 shadow-sm truncate max-w-full">
                                                            {project.name} ({Math.ceil(project.duration)}j)
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500">Dates non définies ou projets vides.</p>
                            )}
                        </div>
                        {resourceEntries.length > 0 && (
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-indigo-500" /> Suivi d'utilisation des Ressources
                                </h2>
                                
                                {globalMinDate && globalMaxDate ? (
                                    <div className="relative pt-6 pb-2">
                                        <div className="absolute top-0 left-0 text-xs font-semibold text-slate-400">
                                            {formatUIDateLong(globalMinDate)}
                                        </div>
                                        <div className="absolute top-0 right-0 text-xs font-semibold text-slate-400">
                                            {formatUIDateLong(globalMaxDate)}
                                        </div>

                                        <div className="space-y-4 border-t border-slate-100 pt-4">
                                            {resourceEntries.map(([resName, tasks]) => {
                                                const rowHeight = Math.max(1, tasks.maxLevel) * 32 + 8;
                                                return (
                                                    <div key={resName} className="flex flex-col gap-2">
                                                        <h3 className="text-sm font-bold text-slate-700">{resName}</h3>
                                                        <div 
                                                            className="relative bg-slate-50 rounded-lg border border-slate-100 overflow-hidden" 
                                                            style={{ height: `${rowHeight}px` }}
                                                        >
                                                            <div className="absolute left-0 top-0 bottom-0 border-l border-slate-200" style={{ width: '100%' }} />

                                                            {tasks.map((task, i) => {
                                                                const leftPercent = Math.max(0, (diffDays(task.computedStartDate, globalMinDate) / globalSpan) * 100);
                                                                const widthPercent = Math.max(0.5, ((diffDays(task.computedEndDate, task.computedStartDate) + 1) / globalSpan) * 100);
                                                                const isUnassigned = resName === 'Non assignée';

                                                                return (
                                                                    <div
                                                                        key={`${task.projectId}-${task.id}-${i}`}
                                                                        className={`absolute rounded-md shadow-sm border text-[10px] font-semibold flex items-center px-1.5 overflow-hidden whitespace-nowrap text-white ${isUnassigned ? 'bg-slate-400 border-slate-500' : 'bg-emerald-500 border-emerald-600'}`}
                                                                        style={{
                                                                            left: `${leftPercent}%`,
                                                                            width: `${widthPercent}%`,
                                                                            top: `${4 + task.overlapLevel * 32}px`,
                                                                            height: '26px',
                                                                            minWidth: '4px'
                                                                        }}
                                                                        title={`${task.name} (${task.projectName})`}
                                                                    >
                                                                        {task.name}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500">Dates non définies ou projets vides.</p>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {enrichedProjects.map((project) => (
                                <div
                                    key={project.id}
                                    onClick={() => setCurrentProjectId(project.id)}
                                    className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group flex flex-col justify-between h-52"
                                >
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-2">
                                            {project.name}
                                        </h3>
                                        <div className="text-sm text-slate-500 mt-3 space-y-1">
                                            <p className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4" /> Début: {project.startDate ? formatUIDateLong(project.startDate) : 'N/A'}
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <span className="w-4 h-4 flex items-center justify-center font-bold text-xs opacity-70">&rarr;</span>
                                                Fin: {project.endDate ? formatUIDateLong(project.endDate) : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
                                        <button
                                            className="text-xs font-medium text-slate-400 hover:text-rose-600 transition-colors"
                                            onClick={(event) => handleDeleteProject(project.id, event)}
                                        >
                                            <Trash2 className="w-4 h-4 inline mr-1" /> Supprimer
                                        </button>
                                        <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                            Ouvrir &rarr;
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {isProjectModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsProjectModalOpen(false)} />
                    <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col animate-fade-in">
                        <form onSubmit={handleCreateProjectConfirm}>
                            <div className="px-6 py-5 border-b border-slate-100">
                                <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">Créer un nouveau projet</h2>
                            </div>
                            <div className="p-6">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Nom du projet</label>
                                <input
                                    type="text"
                                    autoFocus
                                    value={newProjectName}
                                    onChange={(event) => setNewProjectName(event.target.value)}
                                    className="w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm p-3 border outline-none font-medium"
                                />
                            </div>
                            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl">
                                <button
                                    type="button"
                                    onClick={() => setIsProjectModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    Créer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                isDanger={confirmModal.isDanger}
                confirmText={confirmModal.confirmText}
            />

            <ImportExportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleHomeImport}
                appVersion={APP_VERSION}
                mode="import"
            />

            <GlobalSettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
                globalResources={globalResources}
                newGlobalResource={newGlobalResource}
                setNewGlobalResource={setNewGlobalResource}
                onAddResource={handleAddGlobalResource}
                onRemoveResource={handleRemoveGlobalResource}
            />
        </div>
    );
}
