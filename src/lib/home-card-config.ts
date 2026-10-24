import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type HomeCardMetricConfig = {
    id: string;
    group: "totalTop" | "gameHigh";
    enabled: boolean;
};

export const homeCardConfigQueryKey = ["home-card-configs"] as const;

const defaultConfigs: HomeCardMetricConfig[] = [
    { id: "totalTop:appearances", group: "totalTop", enabled: true },
    { id: "totalTop:sets", group: "totalTop", enabled: true },
    { id: "totalTop:points", group: "totalTop", enabled: true },
    { id: "totalTop:breakPoints", group: "totalTop", enabled: false },
    { id: "totalTop:plusMinus", group: "totalTop", enabled: true },
    { id: "totalTop:serveTotal", group: "totalTop", enabled: true },
    { id: "totalTop:serveAces", group: "totalTop", enabled: true },
    { id: "totalTop:serveErrors", group: "totalTop", enabled: false },
    { id: "totalTop:receptionTotal", group: "totalTop", enabled: true },
    { id: "totalTop:receptionErrors", group: "totalTop", enabled: false },
    { id: "totalTop:receptionPositivePct", group: "totalTop", enabled: true },
    { id: "totalTop:receptionExcellentPct", group: "totalTop", enabled: true },
    { id: "totalTop:attackTotal", group: "totalTop", enabled: true },
    { id: "totalTop:attackErrors", group: "totalTop", enabled: false },
    { id: "totalTop:attackBlocked", group: "totalTop", enabled: false },
    { id: "totalTop:attackKills", group: "totalTop", enabled: true },
    { id: "totalTop:attackKillPct", group: "totalTop", enabled: true },
    { id: "totalTop:attackEfficiency", group: "totalTop", enabled: true },
    { id: "totalTop:blockPoints", group: "totalTop", enabled: true },
    { id: "gameHigh:pointsPerGame", group: "gameHigh", enabled: true },
    { id: "gameHigh:plusMinusBest", group: "gameHigh", enabled: true },
    { id: "gameHigh:plusMinusWorst", group: "gameHigh", enabled: false },
    { id: "gameHigh:serveTotal", group: "gameHigh", enabled: false },
    { id: "gameHigh:serveAces", group: "gameHigh", enabled: true },
    { id: "gameHigh:serveErrorsMost", group: "gameHigh", enabled: false },
    { id: "gameHigh:serveErrorsLeast", group: "gameHigh", enabled: false },
    { id: "gameHigh:receptionTotal", group: "gameHigh", enabled: true },
    { id: "gameHigh:receptionErrors", group: "gameHigh", enabled: false },
    { id: "gameHigh:receptionPositivePctBest", group: "gameHigh", enabled: true },
    { id: "gameHigh:receptionPositivePctWorst", group: "gameHigh", enabled: false },
    { id: "gameHigh:receptionExcellentPctBest", group: "gameHigh", enabled: true },
    { id: "gameHigh:receptionExcellentPctWorst", group: "gameHigh", enabled: false },
    { id: "gameHigh:attackTotal", group: "gameHigh", enabled: true },
    { id: "gameHigh:attackErrors", group: "gameHigh", enabled: false },
    { id: "gameHigh:attackBlocked", group: "gameHigh", enabled: false },
    { id: "gameHigh:attackKills", group: "gameHigh", enabled: true },
    { id: "gameHigh:attackKillPctBest", group: "gameHigh", enabled: true },
    { id: "gameHigh:attackKillPctWorst", group: "gameHigh", enabled: false },
    { id: "gameHigh:attackEfficiencyBest", group: "gameHigh", enabled: true },
    { id: "gameHigh:attackEfficiencyWorst", group: "gameHigh", enabled: false },
    { id: "gameHigh:blockPoints", group: "gameHigh", enabled: true },
];

export function getDefaultHomeCardConfigs(): HomeCardMetricConfig[] {
    return defaultConfigs.map((item) => ({ ...item }));
}

export const homeCardConfigOptions = () =>
    queryOptions({
        queryKey: homeCardConfigQueryKey,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("home_card_configs")
                .select("metric_id, enabled");

            if (error) throw error;

            const enabledById = new Map((data ?? []).map((row) => [row.metric_id, row.enabled]));
            return getDefaultHomeCardConfigs().map((config) => ({
                ...config,
                enabled: enabledById.get(config.id) ?? config.enabled,
            }));
        },
    });
