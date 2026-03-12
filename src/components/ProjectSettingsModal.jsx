import React, { useState, useEffect } from 'react';
import { X, Calendar, Plus, Trash2 } from 'lucide-react';
import FrDateInput from './FrDateInput';

export default function ProjectSettingsModal({ isOpen, onClose, project, onSave }) {
    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [ignoreWeekends, setIgnoreWeekends] = useState(true);
    const [holidays, setHolidays] = useState([]);
    const [newHoliday, setNewHoliday] = useState('');

    useEffect(() => {
        if (isOpen && project) {
            setName(project.name || '');
            setStartDate(project.startDate || '');
            setIgnoreWeekends(project.ignoreWeekends ?? true);
            setHolidays([...(project.holidays || [])]);
            setNewHoliday('');
        }
    }, [isOpen, project]);

    if (!isOpen) return null;

    const handleAddHoliday = () => {
        if (newHoliday && !holidays.includes(newHoliday)) {
            setHolidays([...holidays, newHoliday].sort());
            setNewHoliday('');
        }
    };

    const handleRemoveHoliday = (hDate) => {
        setHolidays(holidays.filter(h => h !== hDate));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...project,
            name,
            startDate,
            ignoreWeekends,
            holidays
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-xl font-bold text-slate-800">Paramètres du Projet</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Nom du projet */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Nom du projet</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            placeholder="Nom du projet"
                        />
                    </div>

                    {/* Date de début */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Date de début par défaut</label>
                        <FrDateInput
                            value={startDate}
                            onChange={setStartDate}
                            inputClass="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>

                    {/* Ignorer les week-ends */}
                    <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl cursor-pointer border border-slate-200 hover:border-indigo-300 transition-colors">
                        <input
                            type="checkbox"
                            checked={ignoreWeekends}
                            onChange={e => setIgnoreWeekends(e.target.checked)}
                            className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                        <div>
                            <span className="block text-sm font-semibold text-slate-800">Ignorer les week-ends et jours fériés</span>
                            <span className="block text-xs text-slate-500">Les tâches ne seront planifiées que sur les jours ouvrés définis.</span>
                        </div>
                    </label>

                    {/* Jours fériés */}
                    <div className="space-y-3">
                        <label className="block text-sm font-semibold text-slate-700">Jours fériés ({holidays.length})</label>

                        <div className="flex gap-2 items-start">
                            <FrDateInput
                                value={newHoliday}
                                onChange={setNewHoliday}
                                inputClass="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <button
                                type="button"
                                onClick={handleAddHoliday}
                                disabled={!newHoliday}
                                className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 disabled:opacity-50 transition-colors flex items-center gap-2 font-medium text-sm h-[38px] mt-[1px]"
                            >
                                <Plus className="w-4 h-4" /> Ajouter
                            </button>
                        </div>

                        <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                            {holidays.length === 0 ? (
                                <div className="p-4 text-center text-sm text-slate-500">Aucun jour férié défini.</div>
                            ) : (
                                holidays.map(h => (
                                    <div key={h} className="flex justify-between items-center p-3 hover:bg-slate-50">
                                        <div className="flex items-center gap-3">
                                            <Calendar className="w-4 h-4 text-slate-400" />
                                            <span className="text-sm font-medium text-slate-700">
                                                {new Date(h).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveHoliday(h)}
                                            className="text-slate-400 hover:text-rose-500 p-1"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors"
                    >
                        Enregistrer
                    </button>
                </div>
            </div>
        </div>
    );
}
