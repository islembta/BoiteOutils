import { getDateOffset, offsetToStartDate, offsetToEndDate } from './dateUtils';

export const calculateProjectMetrics = (tasks, projectStartDate, ignoreWeekends, holidays = []) => {
    if (!tasks || tasks.length === 0) {
        return { tasks: [], duration: 0, cost: 0, error: null };
    }

    const allTasks = tasks.map((task) => {
        const optimisticRaw = parseFloat(task.optimistic);
        const realisticRaw = parseFloat(task.realistic);
        const pessimisticRaw = parseFloat(task.pessimistic);

        const realistic = !isNaN(realisticRaw) && realisticRaw > 0 ? realisticRaw : 0;
        const optimistic = !isNaN(optimisticRaw) && optimisticRaw > 0 ? optimisticRaw : realistic;
        const pessimistic = !isNaN(pessimisticRaw) && pessimisticRaw > 0 ? pessimisticRaw : realistic;

        return {
            ...task,
            te: realistic === 0 ? 0 : (optimistic + 4 * realistic + pessimistic) / 6,
            variance: Math.pow((pessimistic - optimistic) / 6, 2),
            isParent: !task.id.toString().includes('.'),
        };
    });

    const standardTasks = allTasks.filter((task) => !task.isParent);
    const parentTasks = allTasks.filter((task) => task.isParent);

    const successors = {};
    const predecessors = {};

    standardTasks.forEach((task) => {
        successors[task.id] = [];
        predecessors[task.id] = (task.dependencies || []).filter(
            (dependencyId) => !allTasks.find((candidate) => candidate.id === dependencyId)?.isParent
        );
    });

    parentTasks.forEach((parent) => {
        (parent.dependencies || []).forEach((dependencyPhaseId) => {
            const dependencyPhaseTasks = standardTasks.filter((task) => task.id.startsWith(`${dependencyPhaseId}.`));
            const currentPhaseTasks = standardTasks.filter((task) => task.id.startsWith(`${parent.id}.`));

            currentPhaseTasks.forEach((currentTask) => {
                dependencyPhaseTasks.forEach((dependencyTask) => {
                    if (!predecessors[currentTask.id].includes(dependencyTask.id)) {
                        predecessors[currentTask.id].push(dependencyTask.id);
                    }
                });
            });
        });
    });

    standardTasks.forEach((task) => {
        (predecessors[task.id] || []).forEach((dependencyId) => {
            if (successors[dependencyId]) {
                successors[dependencyId].push(task.id);
            }
        });
    });

    const sorted = [];
    const visited = {};
    const tempVisited = {};
    let hasCycle = false;

    const visit = (taskId) => {
        if (tempVisited[taskId]) {
            hasCycle = true;
        }
        if (visited[taskId] || hasCycle) {
            return;
        }

        tempVisited[taskId] = true;
        (predecessors[taskId] || []).forEach(visit);
        tempVisited[taskId] = false;
        visited[taskId] = true;
        sorted.push(taskId);
    };

    standardTasks.forEach((task) => {
        if (!visited[task.id]) {
            visit(task.id);
        }
    });

    if (hasCycle) {
        return { error: 'Dependance circulaire detectee dans les liaisons logiques.' };
    }

    const esMap = {};
    const efMap = {};
    const resourceIntervals = {};

    sorted.forEach((taskId) => {
        const task = standardTasks.find((candidate) => candidate.id === taskId);
        let earliestStart = 0;

        (predecessors[taskId] || []).forEach((predecessorId) => {
            if (efMap[predecessorId] > earliestStart) {
                earliestStart = efMap[predecessorId];
            }
        });

        if (task.fixedStartDate && projectStartDate) {
            const minStartOffset = getDateOffset(projectStartDate, task.fixedStartDate, ignoreWeekends, holidays);
            if (minStartOffset !== null) {
                earliestStart = Math.max(earliestStart, Math.max(0, minStartOffset));
            }
        }

        let scheduledStart = earliestStart;
        const resource = task.resource?.trim();

        if (resource) {
            if (!resourceIntervals[resource]) {
                resourceIntervals[resource] = [];
            }

            const intervals = resourceIntervals[resource];
            intervals.sort((a, b) => a.start - b.start);

            for (let index = 0; index < intervals.length; index += 1) {
                const interval = intervals[index];
                if (scheduledStart < interval.start) {
                    if (scheduledStart + task.te <= interval.start) {
                        break;
                    }
                    scheduledStart = interval.end;
                } else if (scheduledStart < interval.end) {
                    scheduledStart = interval.end;
                }
            }

            intervals.push({ start: scheduledStart, end: scheduledStart + task.te, taskId: task.id });
        }

        esMap[taskId] = scheduledStart;
        efMap[taskId] = scheduledStart + task.te;
    });

    const projectDuration = standardTasks.length > 0 ? Math.max(0, ...Object.values(efMap)) : 0;
    const augmentedSuccessors = JSON.parse(JSON.stringify(successors));

    Object.values(resourceIntervals).forEach((intervals) => {
        intervals.sort((a, b) => a.start - b.start);
        for (let index = 0; index < intervals.length - 1; index += 1) {
            const currentTaskId = intervals[index].taskId;
            const nextTaskId = intervals[index + 1].taskId;
            if (!augmentedSuccessors[currentTaskId].includes(nextTaskId)) {
                augmentedSuccessors[currentTaskId].push(nextTaskId);
            }
        }
    });

    const lsMap = {};
    const lfMap = {};

    [...sorted].reverse().forEach((taskId) => {
        const task = standardTasks.find((candidate) => candidate.id === taskId);
        let latestFinish = projectDuration;

        if (augmentedSuccessors[taskId]?.length > 0) {
            latestFinish = Math.min(...augmentedSuccessors[taskId].map((successorId) => lsMap[successorId]));
        }

        if (task.fixedEndDate && projectStartDate) {
            const latestAllowedFinishOffset = getDateOffset(projectStartDate, task.fixedEndDate, ignoreWeekends, holidays);
            if (latestAllowedFinishOffset !== null) {
                latestFinish = Math.min(latestFinish, Math.max(0, latestAllowedFinishOffset) + 1);
            }
        }

        lfMap[taskId] = latestFinish;
        lsMap[taskId] = latestFinish - task.te;
    });

    const processedStandardTasks = standardTasks.map((task) => {
        const slack = lsMap[task.id] - esMap[task.id];
        const isCritical = Math.abs(slack) < 0.001 && slack >= 0;

        let constraintError = null;
        if (slack < -0.001) {
            if (task.fixedEndDate) {
                constraintError = `Cette tache ne peut pas finir au plus tard le ${task.fixedEndDate} avec les contraintes actuelles. Duree estimee : ${task.te.toFixed(1)}j.`;
            } else {
                constraintError = 'Contrainte de planning impossible : la tache ne peut pas se terminer a temps.';
            }
        }

        return {
            ...task,
            es: esMap[task.id],
            ef: efMap[task.id],
            ls: lsMap[task.id],
            lf: lfMap[task.id],
            slack: Math.max(0, slack),
            isCritical,
            constraintError,
            computedStartDate: projectStartDate
                ? offsetToStartDate(projectStartDate, esMap[task.id], ignoreWeekends, holidays)
                : null,
            computedEndDate: projectStartDate
                ? offsetToEndDate(projectStartDate, efMap[task.id], ignoreWeekends, holidays)
                : null,
        };
    });

    const processedParentTasks = parentTasks.map((parent) => {
        const children = processedStandardTasks.filter((child) => child.id.startsWith(`${parent.id}.`));

        if (children.length === 0) {
            return {
                ...parent,
                dependencies: parent.dependencies || [],
                es: 0,
                ef: 0,
                ls: 0,
                lf: 0,
                slack: 0,
                isCritical: false,
                constraintError: null,
                te: 0,
                computedStartDate: projectStartDate,
                computedEndDate: projectStartDate,
            };
        }

        const es = Math.min(...children.map((child) => child.es));
        const ef = Math.max(...children.map((child) => child.ef));
        const ls = Math.min(...children.map((child) => child.ls));
        const lf = Math.max(...children.map((child) => child.lf));
        const slack = Math.max(0, ls - es);

        return {
            ...parent,
            dependencies: parent.dependencies || [],
            es,
            ef,
            ls,
            lf,
            te: ef - es,
            slack,
            isCritical: children.some((child) => child.isCritical),
            constraintError: children.some((child) => child.constraintError)
                ? 'Une ou plusieurs taches enfants depassent leurs contraintes de dates.'
                : null,
            computedStartDate: projectStartDate
                ? offsetToStartDate(projectStartDate, es, ignoreWeekends, holidays)
                : null,
            computedEndDate: projectStartDate
                ? offsetToEndDate(projectStartDate, ef, ignoreWeekends, holidays)
                : null,
            fixedCost: children.reduce(
                (sum, child) => sum + (parseFloat(child.fixedCost) || 0) + (parseFloat(child.dailyCost) || 0) * child.te,
                0
            ),
            dailyCost: 0,
        };
    });

    const finalTasks = [...processedParentTasks, ...processedStandardTasks].sort((a, b) =>
        a.id.localeCompare(b.id, undefined, { numeric: true })
    );

    const totalCost = processedStandardTasks.reduce(
        (sum, task) => sum + (parseFloat(task.fixedCost) || 0) + (parseFloat(task.dailyCost) || 0) * task.te,
        0
    );
    const criticalPathVariance = processedStandardTasks
        .filter((task) => task.isCritical)
        .reduce((sum, task) => sum + task.variance, 0);

    return {
        tasks: finalTasks,
        duration: projectDuration,
        cost: totalCost,
        variance: criticalPathVariance,
        stdDev: Math.sqrt(criticalPathVariance),
        error: null,
    };
};
