import React, { useRef, useState, useEffect, useCallback, useLayoutEffect, useMemo } from 'react';
import {
    Activity, User, ChevronLeft, ChevronRight,
    ZoomIn, ZoomOut, Maximize2, Minimize2,
    Calendar, AlignLeft, SkipBack, SkipForward,
    X, Edit2, Clock, DollarSign
} from 'lucide-react';
import { addDays, addWorkDays, toUIDate, getTodayDateString, getDateOffset } from '../utils/dateUtils';

// Niveaux de zoom : px par jour
const ZOOM_LEVELS = [15, 28, 42, 60, 85, 120, 160, 220];
const DEFAULT_ZOOM_IDX = 3; // 60 px/jour = 100%

// ── Panneau de détails inline (affiché en fullscreen) ─────────────────────────
function InlineTaskPanel({ task, onClose, onEdit }) {
    if (!task) return null;
    const formatCurrency = (v) =>
        new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v ?? 0);
    const estCost = (parseFloat(task.fixedCost) || 0) + (parseFloat(task.dailyCost) || 0) * (task.te || 0);
    
    return (
        <div
            className="absolute inset-0 z-[200] flex items-center justify-center p-4 pointer-events-none"
            style={{ background: 'rgba(15,23,42,0.55)' }}
        >
            <div
                className={`relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto border-t-4 ${task.isCritical ? 'border-rose-500' : 'border-indigo-500'}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`px-5 py-4 flex items-start justify-between border-b ${task.isCritical ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-white px-2 py-0.5 rounded text-xs font-bold border shadow-sm text-slate-700">{task.id}</span>
                            {task.isCritical && <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-xs font-bold border border-rose-200">Chemin Critique</span>}
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">{task.name}</h2>
                        {task.resource && <p className="text-sm text-slate-500 mt-0.5">Ressource : <strong>{task.resource}</strong></p>}
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors ml-2 shrink-0">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 overflow-y-auto max-h-[65vh] grid grid-cols-2 gap-4 text-sm">
                    {/* Durée + coût */}
                    <div className="col-span-2 grid grid-cols-2 gap-3">
                        <div className="bg-indigo-50 rounded-xl p-3 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
                            <div>
                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Durée (TE)</p>
                                <p className="font-bold text-indigo-700">{task.te?.toFixed(2)} j</p>
                            </div>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-3 flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-emerald-500 shrink-0" />
                            <div>
                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Coût Estimé</p>
                                <p className="font-bold text-emerald-700">{formatCurrency(estCost)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Planning calculé */}
                    {task.computedStartDate && task.computedEndDate && (
                        <div className="col-span-2 bg-slate-50 rounded-xl p-3 flex items-center gap-2 border border-slate-200">
                            <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
                            <span className="text-slate-700 font-medium">
                                Planning calculé : du <strong>{toUIDate(task.computedStartDate)}</strong> au <strong>{toUIDate(task.computedEndDate)}</strong>
                            </span>
                        </div>
                    )}

                    {(task.fixedStartDate || task.fixedEndDate) && (
                        <div className="col-span-2 bg-amber-50 rounded-xl p-3 border border-amber-200 text-xs text-amber-800">
                            <p className="font-semibold mb-1">Contraintes calendrier</p>
                            {task.fixedStartDate && <p>Début au plus tôt : <strong>{toUIDate(task.fixedStartDate)}</strong></p>}
                            {task.fixedEndDate && <p>Fin au plus tard : <strong>{toUIDate(task.fixedEndDate)}</strong></p>}
                        </div>
                    )}

                    {/* ES/EF/LS/LF/Slack */}
                    <div className="bg-blue-50 rounded-lg p-2 text-center border border-blue-100">
                        <p className="text-[9px] text-slate-400 font-semibold uppercase">ES</p>
                        <p className="font-mono font-bold text-blue-700">{task.es?.toFixed(2)}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-2 text-center border border-blue-100">
                        <p className="text-[9px] text-slate-400 font-semibold uppercase">EF</p>
                        <p className="font-mono font-bold text-blue-700">{task.ef?.toFixed(2)}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-2 text-center border border-purple-100">
                        <p className="text-[9px] text-slate-400 font-semibold uppercase">LS</p>
                        <p className="font-mono font-bold text-purple-700">{task.ls?.toFixed(2)}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-2 text-center border border-purple-100">
                        <p className="text-[9px] text-slate-400 font-semibold uppercase">LF</p>
                        <p className="font-mono font-bold text-purple-700">{task.lf?.toFixed(2)}</p>
                    </div>
                    <div className={`col-span-2 rounded-lg p-2 text-center border ${task.slack === 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                        <p className="text-[9px] text-slate-400 font-semibold uppercase">Marge (Slack)</p>
                        <p className={`font-mono font-bold ${task.slack === 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{task.slack?.toFixed(2)} j</p>
                    </div>
                    
                    {/* Alerte de violation de contrainte */}
                    {task.constraintError && (
                        <div className="col-span-2 bg-orange-50 border border-orange-300 rounded-xl p-3 flex items-start gap-2">
                            <span className="text-orange-500 text-base shrink-0">⚠️</span>
                            <p className="text-xs text-orange-700 font-medium">{task.constraintError}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-slate-100 bg-white flex justify-between items-center">
                    {onEdit && (
                        <button
                            onClick={() => onEdit(task)}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                            <Edit2 className="w-3.5 h-3.5" /> Modifier
                        </button>
                    )}
                    <button onClick={onClose} className="px-4 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors ml-auto">
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ResourceGanttView({
    tasks,
    duration,
    projectStartDate,
    ganttViewMode,   // 'days' | 'calendar'
    focusDate,
    onFocusDateChange,
    selectedDay: selectedDayProp,
    onSelectedDayChange,
    onModeChange,    // (mode) => void
    ignoreWeekends,
    holidays = [],
    onShowDetails,   // (task) => void 
    onEdit,          // (task) => void
}) {
    const [zoomIdx, setZoomIdx] = useState(DEFAULT_ZOOM_IDX);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [fsTask, setFsTask] = useState(null); 
    const [selectedDay, setSelectedDay] = useState(null);
    const containerRef = useRef(null);
    const zoomViewportRef = useRef(null);
    const previousModeRef = useRef(ganttViewMode);
    const lastReportedFocusRef = useRef(focusDate ?? null);
    const hasRestoredInitialFocusRef = useRef(false);
    const scrollRef = useRef(null);
    const labelScrollRef = useRef(null);

    // ── Fullscreen API ──────────────────────────────────────────────────────
    const toggleFullscreen = useCallback(async () => {
        if (!document.fullscreenElement) {
            try { await containerRef.current?.requestFullscreen(); }
            catch { /* non supporté */ }
        } else {
            await document.exitFullscreen();
        }
    }, []);

    const handleFsEdit = useCallback(async (task) => {
        setFsTask(null);
        if (document.fullscreenElement) {
            try { await document.exitFullscreen(); } catch { }
        }
        onEdit?.(task);
    }, [onEdit]);

    useEffect(() => {
        const handler = () => {
            setIsFullscreen(!!document.fullscreenElement);
            setFsTask(null);
        };
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    useEffect(() => {
        if (selectedDayProp !== undefined) setSelectedDay(selectedDayProp ?? null);
    }, [selectedDayProp]);

    useEffect(() => {
        onSelectedDayChange?.(selectedDay);
    }, [selectedDay, onSelectedDayChange]);

    useEffect(() => {
        lastReportedFocusRef.current = focusDate ?? null;
    }, [focusDate]);

    // ── Synchronisation du scroll vertical labels ↔ corps ──────────────────
    const handleBodyScroll = useCallback(() => {
        if (labelScrollRef.current && scrollRef.current) {
            labelScrollRef.current.scrollTop = scrollRef.current.scrollTop;
        }
    }, []);

    // ── Molette (Wheel) ───────────────────────────────
    const bindWheelHandler = () => {
        const el = scrollRef.current;
        if (!el) return;
        const onWheel = (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                if (e.deltaY < 0) {
                    updateZoom(Math.min(ZOOM_LEVELS.length - 1, zoomIdx + 1));
                } else {
                    updateZoom(Math.max(0, zoomIdx - 1));
                }
                return;
            }
            if (!e.shiftKey && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                e.preventDefault();
                el.scrollLeft += e.deltaY;
            }
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    };

    // ── Dimensions ────────────────────────────────────────────────────────
    const PADDING_DAYS = ganttViewMode === 'calendar' ? 120 : 4;
    const HEADER_H = ganttViewMode === 'calendar' ? 68 : 40;
    const TOP_PAD_H = ganttViewMode === 'calendar' ? 28 : 0;
    const LABEL_W = 176;
    const NUM_COLS = Math.ceil(duration || 1) + PADDING_DAYS * 2;
    const pxPerDay = ZOOM_LEVELS[zoomIdx];
    const totalW = NUM_COLS * pxPerDay;

    // ── GROUPAGE ──
    const resourceMap = useMemo(() => {
        const map = {};
        (tasks || []).forEach(t => {
            if (t.isParent || !t.computedStartDate || !t.computedEndDate) return;
            const resName = t.resource?.trim() || 'Non assignée';
            if (!map[resName]) map[resName] = [];
            map[resName].push({ ...t });
        });

        Object.values(map).forEach(resTasks => {
            resTasks.sort((a, b) => a.computedStartDate.localeCompare(b.computedStartDate));
            const levels = [];
            resTasks.forEach(t => {
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
            resTasks.maxLevel = Math.max(1, levels.length);
        });

        return map;
    }, [tasks]);

    const resourceEntries = useMemo(() => {
        return Object.entries(resourceMap).sort(([nameA], [nameB]) => {
            if (nameA === 'Non assignée') return 1;
            if (nameB === 'Non assignée') return -1;
            return nameA.localeCompare(nameB);
        });
    }, [resourceMap]);

    const rowsLayout = useMemo(() => {
        let currentTop = 0;
        return resourceEntries.map(([resName, resTasks]) => {
            const rowHeight = resTasks.maxLevel * 32 + 16;
            const layout = {
                resName,
                tasks: resTasks,
                top: currentTop,
                height: rowHeight
            };
            currentTop += rowHeight;
            return layout;
        });
    }, [resourceEntries]);

    const bodyHeight = (rowsLayout.length > 0 ? rowsLayout[rowsLayout.length - 1].top + rowsLayout[rowsLayout.length - 1].height : 0) + TOP_PAD_H + 40;

    const updateZoom = useCallback((nextZoomIdx) => {
        if (nextZoomIdx === zoomIdx) return;
        if (scrollRef.current) {
            const viewportWidth = scrollRef.current.clientWidth;
            const centerX = scrollRef.current.scrollLeft + viewportWidth / 2;
            zoomViewportRef.current = {
                centerRatio: totalW > 0 ? centerX / totalW : 0,
            };
        }
        setZoomIdx(nextZoomIdx);
    }, [zoomIdx, totalW]);

    useEffect(() => bindWheelHandler(), [zoomIdx, updateZoom]);

    useLayoutEffect(() => {
        if (!zoomViewportRef.current || !scrollRef.current) return;
        const viewportWidth = scrollRef.current.clientWidth;
        const nextScrollLeft = zoomViewportRef.current.centerRatio * totalW - viewportWidth / 2;
        scrollRef.current.scrollLeft = Math.max(0, nextScrollLeft);
        zoomViewportRef.current = null;
    }, [totalW]);

    const colOffset = useCallback((dateStr) => {
        return getDateOffset(projectStartDate, dateStr, ignoreWeekends, holidays);
    }, [projectStartDate, ignoreWeekends, holidays]);

    const scrollToDate = useCallback((dateStr, smooth = true) => {
        if (!scrollRef.current || !projectStartDate || !dateStr) return;
        const offset = colOffset(dateStr);
        if (offset === null) return;
        const px = ((offset + PADDING_DAYS + 0.5) / NUM_COLS) * totalW;
        scrollRef.current.scrollTo({ left: px - scrollRef.current.offsetWidth / 2, behavior: smooth ? 'smooth' : 'auto' });
    }, [colOffset, PADDING_DAYS, NUM_COLS, totalW, projectStartDate]);

    useLayoutEffect(() => {
        if (hasRestoredInitialFocusRef.current || !scrollRef.current) return;
        hasRestoredInitialFocusRef.current = true;
        const initialFocusDate = focusDate || selectedDay || getTodayDateString();
        scrollToDate(initialFocusDate, false);
    }, [focusDate, selectedDay, scrollToDate]);

    useLayoutEffect(() => {
        if (previousModeRef.current === ganttViewMode) return;
        previousModeRef.current = ganttViewMode;
        const nextFocusDate = focusDate || selectedDay || getTodayDateString();
        scrollToDate(nextFocusDate, false);
    }, [ganttViewMode, focusDate, selectedDay, scrollToDate]);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el || !projectStartDate || !onFocusDateChange || totalW <= 0 || NUM_COLS <= 0) return;
        const syncFocusDate = () => {
            const viewportWidth = el.clientWidth;
            const centerPx = el.scrollLeft + viewportWidth / 2;
            const centerOffset = Math.round((centerPx / totalW) * NUM_COLS - PADDING_DAYS - 0.5);
            const nextFocusDate = ignoreWeekends
                ? addWorkDays(projectStartDate, centerOffset, holidays)
                : addDays(projectStartDate, centerOffset);
            if (nextFocusDate && lastReportedFocusRef.current !== nextFocusDate) {
                lastReportedFocusRef.current = nextFocusDate;
                onFocusDateChange(nextFocusDate);
            }
        };
        syncFocusDate();
        el.addEventListener('scroll', syncFocusDate, { passive: true });
        return () => el.removeEventListener('scroll', syncFocusDate);
    }, [projectStartDate, onFocusDateChange, totalW, NUM_COLS, PADDING_DAYS, ignoreWeekends, holidays]);

    const scrollToToday = useCallback(() => {
        const today = getTodayDateString();
        setSelectedDay(today);
        scrollToDate(today);
    }, [scrollToDate]);

    const addDay = useCallback((dateStr, delta) =>
        ignoreWeekends ? addWorkDays(dateStr, delta, holidays) : addDays(dateStr, delta)
    , [ignoreWeekends, holidays]);

    const navDay = useCallback((delta) => {
        const base = selectedDay || getTodayDateString();
        const next = addDay(base, delta);
        setSelectedDay(next);
        scrollToDate(next);
    }, [selectedDay, addDay, scrollToDate]);

    const navWeek = useCallback((delta) => {
        const base = selectedDay || getTodayDateString();
        const next = ignoreWeekends ? addWorkDays(base, delta * 5, holidays) : addDays(base, delta * 7);
        setSelectedDay(next);
        scrollToDate(next);
    }, [selectedDay, ignoreWeekends, holidays, scrollToDate]);

    const todayOffset = colOffset(getTodayDateString());
    const selectedDayOffset = selectedDay ? colOffset(selectedDay) : null;

    useEffect(() => { return undefined; }, [zoomIdx]);

    const minLabelPx = 55;
    const rawStep = Math.ceil((minLabelPx * NUM_COLS) / Math.max(1, totalW));
    const NICE = [1, 2, 5, 7, 10, 14, 21, 28];
    const tickStep = NICE.find(d => d >= rawStep) || rawStep;

    const months = [];
    if (ganttViewMode === 'calendar' && projectStartDate) {
        let cur = null;
        for (let i = 0; i < NUM_COLS; i++) {
            const di = i - PADDING_DAYS;
            const date = ignoreWeekends ? addWorkDays(projectStartDate, di, holidays) : addDays(projectStartDate, di);
            if (!date) continue;
            const d = new Date(date + 'T00:00:00');
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            if (!cur || cur.key !== key) {
                cur = { key, label: d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }), start: i, count: 1 };
                months.push(cur);
            } else cur.count++;
        }
    }

    const toolBtnCls = (active = false) =>
        `p-1.5 rounded transition-all ${active ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm'}`;
    const segBtnCls = (active) =>
        `flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded transition-all ${active ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:text-indigo-600'}`;

    const renderTick = (i) => {
        if (i % tickStep !== 0 && i !== NUM_COLS) return null;
        const di = i - PADDING_DAYS;
        const isToday = todayOffset !== null && di === todayOffset;
        const isSelected = selectedDayOffset !== null && di === selectedDayOffset;
        const isStart = di === 0;
        let dateLabel = '';
        let dowLabel = '';
        let tickDate = null;
        if (ganttViewMode === 'days') {
            dateLabel = `J ${di}`;
        } else if (projectStartDate) {
            const date = ignoreWeekends ? addWorkDays(projectStartDate, di, holidays) : addDays(projectStartDate, di);
            tickDate = date;
            if (date) {
                const d = new Date(date + 'T00:00:00');
                dateLabel = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
                dowLabel = d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '');
            } else {
                dateLabel = `J${di}`;
            }
        }
        const leftPx = ((i + 0.5) / NUM_COLS) * totalW;
        const colorCls = isSelected
            ? 'text-amber-600'
            : isToday ? 'text-rose-600'
            : isStart ? 'text-indigo-600'
            : 'text-slate-400';
        const clickable = ganttViewMode === 'calendar' && tickDate;
        return (
            <div
                key={i}
                className={`absolute flex flex-col items-center transition-all duration-300 ease-in-out ${clickable ? 'cursor-pointer' : ''}`}
                style={{ left: `${leftPx}px`, transform: 'translateX(-50%)', top: 0, zIndex: 2 }}
                onClick={clickable ? () => setSelectedDay((current) => (current === tickDate ? null : tickDate)) : undefined}
                title={clickable ? (isSelected ? 'Désélectionner ce jour' : 'Sélectionner ce jour') : undefined}
            >
                {isSelected && (
                    <div className="absolute -inset-x-2 inset-y-0 bg-amber-100/80 rounded pointer-events-none" />
                )}
                {ganttViewMode === 'calendar' && dowLabel && (
                    <span className={`relative text-[8px] font-medium whitespace-nowrap uppercase tracking-wide ${colorCls} ${isSelected ? 'font-bold opacity-100' : 'opacity-70'}`}>
                        {dowLabel}
                    </span>
                )}
                <span className={`relative text-[9px] font-semibold whitespace-nowrap ${isToday || isSelected ? 'font-black' : ''} ${colorCls}`}>
                    {dateLabel}
                </span>
                <div className={`w-px mt-0.5 ${
                    isSelected ? 'h-3 bg-amber-500'
                    : isToday ? 'h-3 bg-rose-500'
                    : isStart ? 'h-3 bg-indigo-400'
                    : 'h-2 bg-slate-300'
                }`} />
            </div>
        );
    };

    const handleBarClick = (task) => {
        if (isFullscreen) {
            setFsTask(task);
        } else {
            onShowDetails(task);
        }
    };

    const wrapCls = `flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden ${isFullscreen ? 'fixed inset-0 z-[9999] rounded-none border-0' : ''}`;
    if (!tasks || tasks.length === 0) return null;

    return (
        <div ref={containerRef} className={wrapCls}>
            {/* ══════════════ BARRE D'OUTILS ══════════════ */}
            <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border-b border-slate-200 bg-slate-50 shrink-0">
                <div className="flex items-center gap-1.5 mr-2 select-none">
                    <User className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-xs font-bold text-slate-700 hidden sm:inline">Suivi des Ressources</span>
                </div>
                <div className="w-px h-4 bg-slate-300" />
                <div className="flex items-center bg-slate-200/70 rounded-md p-0.5 gap-0.5">
                    <button onClick={() => onModeChange?.('days')} className={segBtnCls(ganttViewMode === 'days')}>
                        <AlignLeft className="w-3 h-3" />
                        <span className="hidden sm:inline">Jours</span>
                    </button>
                    <button onClick={() => onModeChange?.('calendar')} className={segBtnCls(ganttViewMode === 'calendar')}>
                        <Calendar className="w-3 h-3" />
                        <span className="hidden sm:inline">Calendrier</span>
                    </button>
                </div>
                <div className="w-px h-4 bg-slate-300" />
                <div className="flex items-center bg-slate-200/70 rounded-md p-0.5 gap-0">
                    <button onClick={() => navWeek(-1)} title="-1 semaine" className={toolBtnCls()}>
                        <SkipBack className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => navDay(-1)} title="-1 jour" className={toolBtnCls()}>
                        <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={scrollToToday}
                        title="Aller à aujourd'hui et le sélectionner"
                        className="px-2 py-1 text-[10px] font-bold rounded hover:bg-white hover:text-rose-600 hover:shadow-sm text-slate-500 transition-all border-x border-slate-300/50"
                    >
                        {selectedDay && ganttViewMode === 'calendar'
                            ? new Date(selectedDay + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })
                            : 'Auj.'}
                    </button>
                    <button onClick={() => navDay(1)} title="+1 jour" className={toolBtnCls()}>
                        <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => navWeek(1)} title="+1 semaine" className={toolBtnCls()}>
                        <SkipForward className="w-3.5 h-3.5" />
                    </button>
                    {selectedDay && ganttViewMode === 'calendar' && (
                        <button onClick={() => setSelectedDay(null)} title="Effacer la sélection" className={`${toolBtnCls()} text-amber-500`}>
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>
                <div className="w-px h-4 bg-slate-300" />
                <div className="flex items-center bg-slate-200/70 rounded-md p-0.5 gap-0">
                    <button onClick={() => updateZoom(Math.max(0, zoomIdx - 1))} disabled={zoomIdx === 0} title="Zoom arrière (ou Ctrl+Molette)" className={`${toolBtnCls()} disabled:opacity-30 disabled:cursor-not-allowed`}>
                        <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-bold text-slate-600 w-10 text-center tabular-nums select-none">
                        {Math.round(ZOOM_LEVELS[zoomIdx] / ZOOM_LEVELS[DEFAULT_ZOOM_IDX] * 100)}%
                    </span>
                    <button onClick={() => updateZoom(Math.min(ZOOM_LEVELS.length - 1, zoomIdx + 1))} disabled={zoomIdx === ZOOM_LEVELS.length - 1} title="Zoom avant (ou Ctrl+Molette)" className={`${toolBtnCls()} disabled:opacity-30 disabled:cursor-not-allowed`}>
                        <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                </div>
                <input type="range" min={0} max={ZOOM_LEVELS.length - 1} value={zoomIdx} onChange={e => updateZoom(Number(e.target.value))} className="w-20 h-1.5 accent-indigo-600 cursor-pointer hidden md:block" title="Ajuster le zoom" />
                <div className="flex-1" />
                <button onClick={toggleFullscreen} title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran (Ctrl+Molette pour zoomer)'} className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-all shadow-sm">
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
            </div>

            {/* ══════════════ CORPS ══════════════ */}
            <div className={`flex flex-1 overflow-hidden relative ${isFullscreen ? 'h-[calc(100vh-84px)]' : 'max-h-[70vh]'}`}>
                {/* ─── Colonne noms (sticky gauche) ─── */}
                <div className="shrink-0 border-r border-slate-200 bg-white flex flex-col z-20" style={{ width: `${LABEL_W}px` }}>
                    <div className="shrink-0 bg-slate-50 border-b border-slate-200 flex items-end px-2 pb-1" style={{ height: `${HEADER_H}px` }}>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Ressource</span>
                    </div>
                    <div ref={labelScrollRef} className="overflow-y-hidden flex-1" style={{ overflowY: 'hidden' }}>
                        {TOP_PAD_H > 0 && <div className="shrink-0 border-b border-slate-100 flex items-center px-2" style={{ height: `${TOP_PAD_H}px` }} aria-hidden="true" />}
                        {rowsLayout.map(row => (
                            <div
                                key={`lbl-${row.resName}`}
                                className="flex flex-col justify-center px-3 border-b border-slate-100 hover:bg-slate-50 transition-colors"
                                style={{ height: `${row.height}px` }}
                            >
                                <span className={`text-[12px] font-bold truncate ${row.resName === 'Non assignée' ? 'text-slate-400 italic' : 'text-indigo-700'}`}>
                                    {row.resName}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ─── Zone graphique ─── */}
                <div className="flex-1 overflow-x-auto overflow-y-scroll" ref={scrollRef} onScroll={handleBodyScroll} style={{ scrollbarGutter: 'stable' }}>
                    <div style={{ width: `${totalW}px`, minWidth: `${totalW}px` }}>

                        {/* ── Axe X ── */}
                        {ganttViewMode === 'calendar' ? (
                            <div className="border-b border-slate-200 bg-slate-50 sticky top-0 z-10" style={{ height: `${HEADER_H}px` }}>
                                <div className="relative border-b border-slate-200 transition-all duration-300 ease-in-out" style={{ height: '24px', width: `${totalW}px` }}>
                                    {months.map(m => (
                                        <div key={m.key} className="absolute top-0 h-full flex items-center px-2 border-r border-slate-200 overflow-hidden transition-all duration-300 ease-in-out" style={{ left: `${(m.start / NUM_COLS) * totalW}px`, width: `${(m.count / NUM_COLS) * totalW}px` }}>
                                            <span className="text-[10px] font-bold text-indigo-700 capitalize whitespace-nowrap">{m.label}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="relative transition-all duration-300 ease-in-out" style={{ height: `${HEADER_H - 24}px`, width: `${totalW}px` }}>
                                    {Array.from({ length: NUM_COLS + 1 }).map((_, i) => renderTick(i))}
                                </div>
                            </div>
                        ) : (
                            <div className="relative border-b border-slate-200 bg-slate-50 sticky top-0 z-10 transition-all duration-300 ease-in-out" style={{ height: `${HEADER_H}px`, width: `${totalW}px` }}>
                                {Array.from({ length: NUM_COLS + 1 }).map((_, i) => renderTick(i))}
                            </div>
                        )}

                        {/* ── Corps ── */}
                        <div className="relative transition-all duration-300 ease-in-out" style={{ height: `${bodyHeight}px`, width: `${totalW}px` }}>
                            {/* Grille fond */}
                            <div className="absolute inset-0 pointer-events-none z-0">
                                {Array.from({ length: NUM_COLS }).map((_, i) => {
                                    const di = i - PADDING_DAYS;
                                    let isWE = false;
                                    if (ganttViewMode === 'calendar' && projectStartDate && !ignoreWeekends) {
                                        const date = addDays(projectStartDate, di);
                                        if (date) isWE = [0, 6].includes(new Date(date + 'T12:00:00').getDay());
                                    }
                                    const isToday = todayOffset !== null && di === todayOffset;
                                    const isSelDay = selectedDayOffset !== null && di === selectedDayOffset;
                                    const colW = totalW / NUM_COLS;
                                    return (
                                        <div
                                            key={`g${i}`}
                                            className={`absolute top-0 bottom-0 border-r border-slate-100/80 transition-all duration-300 ease-in-out
                                                ${isWE ? 'bg-slate-100/60' : ''}
                                                ${isToday ? 'bg-rose-50/50' : ''}
                                                ${isSelDay ? 'bg-amber-100/60' : ''}
                                                ${di === 0 ? 'bg-indigo-50/30' : ''}`}
                                            style={{ left: `${i * colW}px`, width: `${colW}px` }}
                                        />
                                    );
                                })}
                            </div>

                            {/* Lignes horizontales séparatrices de ressources */}
                            {rowsLayout.map(row => (
                                <div
                                    key={`hl-${row.resName}`}
                                    className="absolute w-full border-b border-slate-200/80 pointer-events-none transition-all duration-300 ease-in-out"
                                    style={{ top: `${TOP_PAD_H + row.top}px`, height: `${row.height}px` }}
                                />
                            ))}

                            {ganttViewMode === 'calendar' && todayOffset !== null && todayOffset > -PADDING_DAYS && todayOffset < NUM_COLS - PADDING_DAYS && (
                                <div
                                    className="absolute top-0 bottom-0 z-10 pointer-events-none transition-all duration-300 ease-in-out"
                                    style={{ left: `${((todayOffset + PADDING_DAYS + 0.5) / NUM_COLS) * totalW}px`, width: '2px', background: 'linear-gradient(to bottom, #f43f5e, #fda4af88)' }}
                                >
                                    <div className="absolute -top-0 left-2 text-[8px] font-black text-white bg-rose-500 px-1.5 py-1 rounded shadow-sm whitespace-nowrap leading-none tracking-wide transition-all duration-300">
                                        Aujourd'hui
                                    </div>
                                </div>
                            )}

                            {/* Tâches assignées par ressources */}
                            {rowsLayout.map(row => {
                                return row.tasks.map(task => {
                                    const barLeft = ((task.es + PADDING_DAYS) / NUM_COLS) * totalW;
                                    const barWidth = Math.max(4, (task.te / NUM_COLS) * totalW);
                                    
                                    const isActiveOnDay = selectedDay && task.computedStartDate && task.computedEndDate
                                        && selectedDay >= task.computedStartDate && selectedDay <= task.computedEndDate;
                                    
                                    const constraintsTip = !task.isParent && (task.fixedStartDate || task.fixedEndDate)
                                        ? `\nContraintes:${task.fixedStartDate ? `\n- Début: ${toUIDate(task.fixedStartDate)}` : ''}${task.fixedEndDate ? `\n- Fin: ${toUIDate(task.fixedEndDate)}` : ''}`
                                        : '';
                                    const tip = ganttViewMode === 'calendar'
                                        ? `${task.name}\nDu ${toUIDate(task.computedStartDate)} au ${toUIDate(task.computedEndDate)}\nMarge: ${task.slack?.toFixed(1)}j${constraintsTip}`
                                        : `${task.name}\nES: ${task.es?.toFixed(1)} | EF: ${task.ef?.toFixed(1)} | Marge: ${task.slack?.toFixed(1)}j${constraintsTip}`;

                                    const isUnassigned = row.resName === 'Non assignée';
                                    
                                    return (
                                        <div
                                            key={`br-${task.id}`}
                                            className={`absolute cursor-pointer transition-all duration-300 ease-in-out z-10 flex items-center justify-center text-[10px] font-bold text-white rounded shadow-sm hover:brightness-110 hover:shadow-md overflow-hidden whitespace-nowrap
                                                ${isActiveOnDay ? 'ring-2 ring-amber-400 ring-offset-1 brightness-125' : ''}
                                                ${isUnassigned ? 'bg-slate-400 hover:shadow-slate-400/30' : 'bg-emerald-500 hover:shadow-emerald-400/30'}`}
                                            style={{
                                                left: `${barLeft}px`,
                                                width: `${barWidth}px`,
                                                top: `${TOP_PAD_H + row.top + 8 + (task.overlapLevel * 32)}px`,
                                                height: '24px' // Plus compact pour bien empiler
                                            }}
                                            title={tip}
                                            onClick={() => handleBarClick(task)}
                                        >
                                            <span className="truncate px-2">{task.name}</span>
                                        </div>
                                    );
                                });
                            })}
                        </div>
                    </div>
                </div>

                {isFullscreen && fsTask && (
                    <InlineTaskPanel task={fsTask} onClose={() => setFsTask(null)} onEdit={handleFsEdit} />
                )}
            </div>

            {/* ══════════════ LÉGENDE ══════════════ */}
            <div className="flex flex-wrap items-center gap-4 px-4 py-1.5 text-[9px] text-slate-400 border-t border-slate-100 bg-slate-50/80 shrink-0 select-none">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-500" /> Ressource assignée</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-slate-400" /> Non assignée</div>
                {ganttViewMode === 'calendar' && (
                    <div className="flex items-center gap-1"><div className="w-0.5 h-3 bg-rose-500" /> Aujourd'hui</div>
                )}
                <div className="flex items-center gap-1 ml-auto text-slate-300 italic">Ctrl+Molette pour zoomer</div>
            </div>
        </div>
    );
}
