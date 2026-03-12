export const TASK_SCHEMA = {
    id: null,
    name: '',
    resource: '',
    optimistic: 0,
    realistic: 0,
    pessimistic: 0,
    fixedCost: 0,
    dailyCost: 0,
    dependencies: [],
    fixedStartDate: null,
    fixedEndDate: null,
    description: null,
    substeps: [],
};

const PROJECT_SCHEMA = {
    name: 'Projet PERT Importé',
    startDate: '',
    ignoreWeekends: true,
    holidays: [],
    tasks: [],
};

function compareVersions(v1, v2) {
    if (!v1 || typeof v1 !== 'string') return -1;
    if (!v2 || typeof v2 !== 'string') return 1;

    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let index = 0; index < Math.max(parts1.length, parts2.length); index += 1) {
        const part1 = parts1[index] || 0;
        const part2 = parts2[index] || 0;

        if (part1 > part2) return 1;
        if (part1 < part2) return -1;
    }

    return 0;
}

function cloneSchemaValue(value) {
    if (Array.isArray(value)) {
        return [...value];
    }

    if (typeof value === 'object' && value !== null) {
        return { ...value };
    }

    return value;
}

function normalizeTask(task = {}) {
    const cleanTask = {};

    Object.keys(TASK_SCHEMA).forEach((key) => {
        const value = task[key];

        if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
                cleanTask[key] = value.map((item) =>
                    typeof item === 'object' && item !== null ? { ...item } : item
                );
            } else if (typeof value === 'object') {
                cleanTask[key] = { ...value };
            } else {
                cleanTask[key] = value;
            }
            return;
        }

        cleanTask[key] = cloneSchemaValue(TASK_SCHEMA[key]);
    });

    return cleanTask;
}

export function processRetroCompatibility(data, currentAppVersion) {
    const fileVersion = data.appVersion || '1.0.0';
    const compareResult = compareVersions(fileVersion, currentAppVersion);

    let warningMessage = null;
    let status = 'success';

    const rawProject = data.project && typeof data.project === 'object'
        ? data.project
        : {
            name: data.projectName,
            startDate: data.startDate,
            ignoreWeekends: data.ignoreWeekends,
            holidays: data.holidays,
            tasks: data.tasks,
        };

    const processedTasks = (rawProject.tasks || []).map(normalizeTask);
    const normalizedProject = {
        name: rawProject.name || PROJECT_SCHEMA.name,
        startDate: typeof rawProject.startDate === 'string' ? rawProject.startDate : PROJECT_SCHEMA.startDate,
        ignoreWeekends: rawProject.ignoreWeekends ?? PROJECT_SCHEMA.ignoreWeekends,
        holidays: Array.isArray(rawProject.holidays) ? [...new Set(rawProject.holidays)].sort() : [...PROJECT_SCHEMA.holidays],
        tasks: processedTasks,
    };

    if (compareResult < 0) {
        status = 'warning';
        warningMessage = `Ce fichier a été créé avec une ancienne version (${fileVersion}). Il a été mis à niveau pour être compatible avec votre version actuelle (${currentAppVersion}).`;
    } else if (compareResult > 0) {
        status = 'warning';
        warningMessage = `Ce fichier a été créé avec une version plus récente (${fileVersion}). Les fonctionnalités non supportées par votre version actuelle (${currentAppVersion}) ont été ignorées.`;
    }

    return {
        project: normalizedProject,
        tasks: processedTasks,
        projectName: normalizedProject.name,
        warningMessage,
        status,
        originalVersion: fileVersion,
    };
}
