import React, { useEffect, useRef, useState } from 'react';
import {
    X, Download, Upload, FileJson, CheckCircle,
    AlertTriangle, Info, FolderOpen, ArrowDownToLine, ArrowUpFromLine
} from 'lucide-react';
import { processRetroCompatibility } from '../utils/retroCompatibility';

export default function ImportExportModal({ isOpen, onClose, project, onImport, appVersion }) {
    const [projectName, setProjectName] = useState(project?.name || 'Mon Projet PERT');
    const [importStatus, setImportStatus] = useState(null);
    const [importMessage, setImportMessage] = useState('');
    const [preview, setPreview] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setProjectName(project?.name || 'Mon Projet PERT');
        }
    }, [isOpen, project]);

    if (!isOpen) return null;

    const exportProject = {
        name: projectName.trim() || project?.name || 'Projet PERT',
        startDate: project?.startDate || '',
        ignoreWeekends: project?.ignoreWeekends ?? true,
        holidays: project?.holidays || [],
        tasks: project?.tasks || [],
    };

    const handleExport = () => {
        const payload = {
            appVersion,
            exportDate: new Date().toISOString(),
            project: exportProject,
            // Champs conservés pour compatibilité descendante.
            projectName: exportProject.name,
            startDate: exportProject.startDate,
            ignoreWeekends: exportProject.ignoreWeekends,
            holidays: exportProject.holidays,
            taskCount: exportProject.tasks.length,
            tasks: exportProject.tasks,
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const safeName = exportProject.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

        link.href = url;
        link.download = `${safeName}_v${appVersion}_${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImportStatus(null);
        setImportMessage('');
        setPreview(null);

        const reader = new FileReader();
        reader.onload = (loadEvent) => {
            try {
                const data = JSON.parse(loadEvent.target.result);
                const processResult = processRetroCompatibility(data, appVersion);

                if (!Array.isArray(processResult.project?.tasks)) {
                    setImportStatus('error');
                    setImportMessage('Fichier invalide : impossible de retrouver les tâches du projet.');
                    return;
                }

                setPreview({
                    appVersion: data.appVersion,
                    exportDate: data.exportDate,
                    project: processResult.project,
                });

                if (processResult.status === 'warning') {
                    setImportStatus('warning');
                    setImportMessage(processResult.warningMessage);
                } else {
                    setImportStatus('success');
                    setImportMessage('Fichier valide et compatible.');
                }
            } catch {
                setImportStatus('error');
                setImportMessage("Impossible de lire le fichier. Assurez-vous que c'est un JSON valide.");
                setPreview(null);
            }
        };

        reader.readAsText(file);
    };

    const handleConfirmImport = () => {
        if (!preview?.project) return;

        onImport(preview.project);
        setImportStatus(null);
        setImportMessage('');
        setPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        onClose();
    };

    const handleClose = () => {
        setImportStatus(null);
        setImportMessage('');
        setPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        onClose();
    };

    const StatusBadge = () => {
        if (!importStatus) return null;

        const configs = {
            success: { icon: CheckCircle, bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', iconColor: 'text-emerald-500' },
            warning: { icon: AlertTriangle, bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', iconColor: 'text-amber-500' },
            error: { icon: AlertTriangle, bg: 'bg-red-50 border-red-200', text: 'text-red-700', iconColor: 'text-red-500' },
        };
        const config = configs[importStatus];
        const Icon = config.icon;

        return (
            <div className={`flex items-start gap-3 p-3 rounded-lg border ${config.bg} mt-3`}>
                <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${config.iconColor}`} />
                <p className={`text-sm ${config.text}`}>{importMessage}</p>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={handleClose}
            />

            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
                <div className="bg-gradient-to-r from-indigo-700 to-indigo-500 px-6 py-5 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <FileJson className="w-6 h-6" /> Gestion de Projet
                        </h2>
                        <p className="text-indigo-200 text-sm mt-0.5">Import &amp; Export - Application v{appVersion}</p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-full text-indigo-200 hover:text-white hover:bg-indigo-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto">
                    <section className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-slate-700 font-bold text-base border-b border-slate-100 pb-2">
                            <ArrowDownToLine className="w-5 h-5 text-indigo-500" />
                            Exporter le projet
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Nom du projet
                            </label>
                            <input
                                type="text"
                                value={projectName}
                                onChange={(event) => setProjectName(event.target.value)}
                                placeholder="Mon Projet PERT"
                                className="w-full rounded-lg border border-slate-300 shadow-sm p-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                        </div>

                        <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 text-xs text-slate-500 space-y-1 font-mono">
                            <div><span className="text-slate-400">appVersion:</span> <span className="text-indigo-600">"{appVersion}"</span></div>
                            <div><span className="text-slate-400">project.name:</span> <span className="text-amber-600">"{exportProject.name}"</span></div>
                            <div><span className="text-slate-400">project.startDate:</span> <span className="text-emerald-600">"{exportProject.startDate || '-'}"</span></div>
                            <div><span className="text-slate-400">project.ignoreWeekends:</span> <span className="text-rose-600">{String(exportProject.ignoreWeekends)}</span></div>
                            <div><span className="text-slate-400">project.holidays:</span> <span className="text-indigo-600">{exportProject.holidays.length}</span></div>
                            <div><span className="text-slate-400">project.tasks:</span> <span className="text-rose-600">{exportProject.tasks.length}</span></div>
                        </div>

                        <div className="flex items-center gap-2 p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-600">
                            <Info className="w-4 h-4 shrink-0" />
                            Le fichier JSON contient les tâches, les contraintes, la date de départ du projet et les jours fériés.
                        </div>

                        <button
                            onClick={handleExport}
                            disabled={exportProject.tasks.length === 0}
                            className="mt-auto w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-sm transition-colors text-sm"
                        >
                            <Download className="w-4 h-4" />
                            Télécharger le fichier JSON
                        </button>
                    </section>

                    <section className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-slate-700 font-bold text-base border-b border-slate-100 pb-2">
                            <ArrowUpFromLine className="w-5 h-5 text-emerald-500" />
                            Importer un projet
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Fichier JSON exporté
                            </label>
                            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-lg p-6 cursor-pointer transition-colors bg-slate-50 hover:bg-indigo-50 group">
                                <FolderOpen className="w-8 h-8 text-slate-400 group-hover:text-indigo-400 mb-2 transition-colors" />
                                <span className="text-sm text-slate-500 group-hover:text-indigo-600 transition-colors font-medium">
                                    Cliquer pour choisir un fichier
                                </span>
                                <span className="text-xs text-slate-400 mt-1">Format .json uniquement</span>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".json,application/json"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </label>
                        </div>

                        <StatusBadge />

                        {preview && (
                            <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 text-xs text-slate-500 space-y-1 font-mono">
                                <div><span className="text-slate-400">project.name:</span> <span className="text-amber-600">"{preview.project.name}"</span></div>
                                <div><span className="text-slate-400">project.startDate:</span> <span className="text-emerald-600">"{preview.project.startDate || '-'}"</span></div>
                                <div><span className="text-slate-400">project.ignoreWeekends:</span> <span className="text-indigo-600">{String(preview.project.ignoreWeekends)}</span></div>
                                <div><span className="text-slate-400">project.holidays:</span> <span className="text-rose-600">{preview.project.holidays?.length ?? 0}</span></div>
                                <div><span className="text-slate-400">project.tasks:</span> <span className="text-rose-600">{preview.project.tasks?.length ?? 0}</span></div>
                                <div><span className="text-slate-400">exportDate:</span> <span className="text-indigo-600">"{preview.exportDate?.slice(0, 10) || '-'}"</span></div>
                            </div>
                        )}

                        <div className="text-xs text-slate-500 bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                            L'import remplace les paramètres et les tâches du projet courant.
                        </div>

                        <button
                            onClick={handleConfirmImport}
                            disabled={!preview || importStatus === 'error'}
                            className="mt-auto w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-sm transition-colors text-sm"
                        >
                            <Upload className="w-4 h-4" />
                            Charger ce projet
                        </button>
                    </section>
                </div>

                <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-center text-xs text-slate-400">
                    BoiteOutils - Estimateur PERT &amp; Ressources - v{appVersion}
                </div>
            </div>
        </div>
    );
}
