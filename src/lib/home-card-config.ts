export type HomeCardMetricConfig = {
    id: string;
    group: "totalTop" | "gameHigh";
    label: string;
    enabled: boolean;
};

const STORAGE_KEY = "estonia-home-card-config-v1";

const defaultConfigs: HomeCardMetricConfig[] = [
    { id: "totalTop:appearances", group: "totalTop", label: "Most appearances", enabled: true },
    { id: "totalTop:sets", group: "totalTop", label: "Most sets played", enabled: true },
    { id: "totalTop:points", group: "totalTop", label: "Most points", enabled: true },
    { id: "totalTop:plusMinus", group: "totalTop", label: "Best plus-minus", enabled: true },
    { id: "totalTop:serveTotal", group: "totalTop", label: "Most serves", enabled: true },
    { id: "totalTop:serveAces", group: "totalTop", label: "Most serve aces", enabled: true },
    { id: "totalTop:receptionTotal", group: "totalTop", label: "Most receptions", enabled: true },
    { id: "totalTop:receptionPositivePct", group: "totalTop", label: "Best reception %", enabled: true },
    { id: "totalTop:receptionExcellentPct", group: "totalTop", label: "Best ideal reception %", enabled: true },
    { id: "totalTop:attackTotal", group: "totalTop", label: "Most attacks", enabled: true },
    { id: "totalTop:attackKills", group: "totalTop", label: "Most successful attacks", enabled: true },
    { id: "totalTop:attackKillPct", group: "totalTop", label: "Best attack %", enabled: true },
    { id: "totalTop:attackEfficiency", group: "totalTop", label: "Best attack efficiency", enabled: true },
    { id: "totalTop:blockPoints", group: "totalTop", label: "Most block points", enabled: true },

    { id: "gameHigh:pointsPerGame", group: "gameHigh", label: "Most points in a match", enabled: true },
    { id: "gameHigh:plusMinusBest", group: "gameHigh", label: "Best plus-minus in a match", enabled: true },
    { id: "gameHigh:serveTotal", group: "gameHigh", label: "Most serves in a match", enabled: true },
    { id: "gameHigh:serveAces", group: "gameHigh", label: "Most aces in a match", enabled: true },
    { id: "gameHigh:receptionTotal", group: "gameHigh", label: "Most receptions in a match", enabled: true },
    { id: "gameHigh:receptionPositivePctBest", group: "gameHigh", label: "Best reception % in a match", enabled: true },
    { id: "gameHigh:receptionExcellentPctBest", group: "gameHigh", label: "Best ideal reception % in a match", enabled: true },
    { id: "gameHigh:attackTotal", group: "gameHigh", label: "Most attacks in a match", enabled: true },
    { id: "gameHigh:attackKills", group: "gameHigh", label: "Most successful attacks in a match", enabled: true },
    { id: "gameHigh:attackKillPctBest", group: "gameHigh", label: "Best attack % in a match", enabled: true },
    { id: "gameHigh:attackEfficiencyBest", group: "gameHigh", label: "Best attack efficiency in a match", enabled: true },
    { id: "gameHigh:blockPoints", group: "gameHigh", label: "Most blocks in a match", enabled: true },
];

export function getDefaultHomeCardConfigs(): HomeCardMetricConfig[] {
    return defaultConfigs.map((item) => ({ ...item }));
}

export function loadHomeCardConfigs(): HomeCardMetricConfig[] {
    if (typeof window === "undefined") {
        return getDefaultHomeCardConfigs();
    }

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return getDefaultHomeCardConfigs();
        }

        const parsed = JSON.parse(raw) as Array<Partial<HomeCardMetricConfig>>;
        if (!Array.isArray(parsed)) {
            return getDefaultHomeCardConfigs();
        }

        const byId = new Map(getDefaultHomeCardConfigs().map((item) => [item.id, item]));

        for (const item of parsed) {
            const id = typeof item.id === "string" ? item.id : "";
            const defaultItem = byId.get(id);
            if (!defaultItem) continue;

            defaultItem.enabled = Boolean(item.enabled ?? defaultItem.enabled);
            const label = typeof item.label === "string" ? item.label.trim() : "";
            if (label) {
                defaultItem.label = label;
            }
        }

        return Array.from(byId.values());
    } catch {
        return getDefaultHomeCardConfigs();
    }
}

export function saveHomeCardConfigs(configs: HomeCardMetricConfig[]) {
    if (typeof window === "undefined") {
        return;
    }

    const normalized = configs.map((item) => ({
        id: item.id,
        group: item.group,
        label: item.label,
        enabled: item.enabled,
    }));

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
}

export function isHomeCardMetricEnabled(metricId: string) {
    return loadHomeCardConfigs().some((item) => item.id === metricId && item.enabled);
}

export function getConfiguredHomeCardLabel(metricId: string, fallbackLabel: string) {
    const config = loadHomeCardConfigs().find((item) => item.id === metricId);
    if (!config) {
        return fallbackLabel;
    }

    if (!config.enabled) {
        return "";
    }

    return config.label.trim() || fallbackLabel;
}
