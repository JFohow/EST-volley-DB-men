import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MatchUnavailableStatRow } from "@/lib/match-unavailable-stats";

export const statisticsFields = [
    "points",
    "block_points",
    "plus_minus",
    "serve_total",
    "serve_aces",
    "serve_errors",
    "reception_total",
    "reception_errors",
    "reception_positive_pct",
    "reception_excellent_pct",
    "attack_total",
    "attack_errors",
    "attack_blocked",
    "attack_kills",
    "attack_kill_pct",
    "attack_efficiency",
    "break_points",
] as const;

export type StatisticsField = (typeof statisticsFields)[number];
export type StatisticsMode = "official" | "competitive" | "nonCompetitive" | "all";

const percentageFields = new Set<StatisticsField>([
    "reception_positive_pct",
    "reception_excellent_pct",
    "attack_kill_pct",
    "attack_efficiency",
]);

type TotalsRecord = Record<StatisticsField, number>;
type CountsRecord = Record<StatisticsField, number>;

export type StatisticsGroup = {
    appearances: number;
    sets: number;
    setsStarted: number;
    totals: TotalsRecord;
    counts: CountsRecord;
    receptionPositiveCount: number;
    receptionPositiveTotal: number;
    receptionExcellentCount: number;
    receptionExcellentTotal: number;
    attackKillPctTotal: number;
    attackKillPctKills: number;
    attackEfficiencyTotal: number;
    attackEfficiencyKills: number;
    attackEfficiencyBlocked: number;
    attackEfficiencyErrors: number;
};

export type PlayerStatisticsRow = {
    playerId: number;
    name: string;
    position: string | null;
    official: StatisticsGroup;
    competitive: StatisticsGroup;
    nonCompetitive: StatisticsGroup;
    all: StatisticsGroup;
};

type PlayerRow = {
    player_id: number;
    first_name: string;
    last_name: string;
    position: string | null;
};

export type StatisticsMatchRow = {
    match_id: number;
    match_date: string;
    opponent: string;
    opponent_en: string | null;
    competition: string | null;
    competition_en: string | null;
    estonia_sets: number;
    opponent_sets: number;
    vm: boolean | null;
    am: boolean | null;
    mam: boolean | null;
    match_unavailable_stats: MatchUnavailableStatRow[] | null;
};

export type AppearanceStatsRow = {
    [K in StatisticsField]: number | null;
} & {
    stats_version?: "ALL" | "AM" | string | null;
    set1_position?: string | null;
    set2_position?: string | null;
    set3_position?: string | null;
    set4_position?: string | null;
    set5_position?: string | null;
};

export type StatisticsAppearanceRow = {
    appearance_id: number;
    player_id: number;
    sets_played: number | null;
    sets_started: number | null;
    matches: StatisticsMatchRow | StatisticsMatchRow[] | null;
    player_match_stats: AppearanceStatsRow | AppearanceStatsRow[] | null;
};

export type StatisticsDataset = {
    players: PlayerRow[];
    appearances: StatisticsAppearanceRow[];
};

function normalizeRelation<T>(value: T | T[] | null): T | null {
    if (Array.isArray(value)) {
        return value[0] ?? null;
    }
    return value;
}

export function createGroup(): StatisticsGroup {
    const totals = {} as TotalsRecord;
    const counts = {} as CountsRecord;

    for (const field of statisticsFields) {
        totals[field] = 0;
        counts[field] = 0;
    }

    return {
        appearances: 0,
        sets: 0,
        setsStarted: 0,
        totals,
        counts,
        receptionPositiveCount: 0,
        receptionPositiveTotal: 0,
        receptionExcellentCount: 0,
        receptionExcellentTotal: 0,
        attackKillPctTotal: 0,
        attackKillPctKills: 0,
        attackEfficiencyTotal: 0,
        attackEfficiencyKills: 0,
        attackEfficiencyBlocked: 0,
        attackEfficiencyErrors: 0,
    };
}

export function addStats(
    group: StatisticsGroup,
    stats: AppearanceStatsRow,
    unavailableStats: ReadonlySet<string> = new Set(),
) {
    for (const field of statisticsFields) {
        const value = stats[field];
        if (typeof value !== "number" || unavailableStats.has(field)) continue;

        if (
            field === "attack_kill_pct" ||
            field === "attack_efficiency" ||
            field === "reception_positive_pct" ||
            field === "reception_excellent_pct"
        ) {
            continue;
        }

        group.totals[field] += value;
        if (percentageFields.has(field)) {
            group.counts[field] += 1;
        }
    }

    const receptionTotal = stats.reception_total;
    if (!unavailableStats.has("reception_total") && typeof receptionTotal === "number" && receptionTotal > 0) {
        if (!unavailableStats.has("reception_positive_pct") && typeof stats.reception_positive_pct === "number") {
            group.receptionPositiveCount += receptionTotal * (stats.reception_positive_pct / 100);
            group.receptionPositiveTotal += receptionTotal;
        }

        if (!unavailableStats.has("reception_excellent_pct") && typeof stats.reception_excellent_pct === "number") {
            group.receptionExcellentCount += receptionTotal * (stats.reception_excellent_pct / 100);
            group.receptionExcellentTotal += receptionTotal;
        }
    }

    if (
        !unavailableStats.has("attack_total") &&
        !unavailableStats.has("attack_kills") &&
        typeof stats.attack_total === "number" &&
        typeof stats.attack_kills === "number"
    ) {
        group.attackKillPctTotal += stats.attack_total;
        group.attackKillPctKills += stats.attack_kills;
    }

    if (
        !unavailableStats.has("attack_total") &&
        !unavailableStats.has("attack_kills") &&
        !unavailableStats.has("attack_blocked") &&
        !unavailableStats.has("attack_errors") &&
        typeof stats.attack_total === "number" &&
        typeof stats.attack_kills === "number" &&
        typeof stats.attack_blocked === "number" &&
        typeof stats.attack_errors === "number"
    ) {
        group.attackEfficiencyTotal += stats.attack_total;
        group.attackEfficiencyKills += stats.attack_kills;
        group.attackEfficiencyBlocked += stats.attack_blocked;
        group.attackEfficiencyErrors += stats.attack_errors;
    }
}

function isPercentageField(field: StatisticsField) {
    return percentageFields.has(field);
}

function deriveAttackKillPct(group: StatisticsGroup): number {
    const attackTotal = group.attackKillPctTotal;
    if (!attackTotal) return 0;
    return (group.attackKillPctKills / attackTotal) * 100;
}

function deriveAttackEfficiency(group: StatisticsGroup): number {
    const attackTotal = group.attackEfficiencyTotal;
    if (!attackTotal) return 0;
    return (
        ((group.attackEfficiencyKills - group.attackEfficiencyBlocked - group.attackEfficiencyErrors) /
            attackTotal) *
        100
    );
}
async function fetchStatisticsData(): Promise<StatisticsDataset> {
    const playersResponse = await supabase
        .from("players")
        .select("player_id, first_name, last_name, position");

    if (playersResponse.error) throw playersResponse.error;

    const { count: totalAppearanceCount, error: totalAppearanceCountError } = await supabase
        .from("appearances")
        .select("appearance_id", { count: "exact", head: true });

    if (totalAppearanceCountError) throw totalAppearanceCountError;

    const pageSize = 1000;
    let lastAppearanceId = 0;
    const allAppearanceRows: StatisticsAppearanceRow[] = [];

    while (true) {
        const { data, error } = await supabase
            .from("appearances")
            .select(
                `appearance_id, player_id, sets_played, sets_started, matches(match_id, match_date, opponent, opponent_en, competition, competition_en, estonia_sets, opponent_sets, vm, am, mam, match_unavailable_stats(stat_field)), player_match_stats(points, block_points, plus_minus, serve_total, serve_aces, serve_errors, reception_total, reception_errors, reception_positive_pct, reception_excellent_pct, attack_total, attack_errors, attack_blocked, attack_kills, attack_kill_pct, attack_efficiency, break_points, stats_version, set1_position, set2_position, set3_position, set4_position, set5_position)`,
            )
            .gt("appearance_id", lastAppearanceId)
            .order("appearance_id", { ascending: true })
            .limit(pageSize);

        if (error) throw error;

        const chunk = (data ?? []) as unknown as StatisticsAppearanceRow[];
        if (chunk.length === 0) break;

        allAppearanceRows.push(...chunk);

        const maxId = Math.max(...chunk.map((row) => row.appearance_id));
        if (maxId <= lastAppearanceId) break;

        lastAppearanceId = maxId;
    }

    if (totalAppearanceCount != null && allAppearanceRows.length !== totalAppearanceCount) {
        throw new Error(
            `Statistics fetch is incomplete: expected ${totalAppearanceCount} appearance rows with stats, got ${allAppearanceRows.length}. This can happen when the query silently truncates after the default PostgREST limit.`,
        );
    }

    return {
        players: (playersResponse.data ?? []) as PlayerRow[],
        appearances: allAppearanceRows,
    };
}

export function firstRelation<T>(value: T | T[] | null): T | null {
    return normalizeRelation(value);
}

export function pickAppearanceStats(
    value: AppearanceStatsRow | AppearanceStatsRow[] | null,
    mode: StatisticsMode
): AppearanceStatsRow | null {
    if (!value) return null;

    const rows = Array.isArray(value) ? value : [value];

    if (mode === "all") {
        return (
            rows.find((row) => row?.stats_version === "ALL") ??
            rows.find((row) => row?.stats_version === "AM") ??
            rows[0] ??
            null
        );
    }

    return (
        rows.find((row) => row?.stats_version === "AM") ??
        rows.find((row) => row?.stats_version === "ALL") ??
        rows[0] ??
        null
    );
}

export function getDisplayValue(group: StatisticsGroup, field: StatisticsField): number {
    if (field === "attack_kill_pct") {
        return deriveAttackKillPct(group);
    }

    if (field === "attack_efficiency") {
        return deriveAttackEfficiency(group);
    }

    if (field === "reception_positive_pct") {
        const receptionTotal = group.totals.reception_total;
        if (!receptionTotal) return 0;
        return (group.receptionPositiveCount / receptionTotal) * 100;
    }

    if (field === "reception_excellent_pct") {
        const receptionTotal = group.totals.reception_total;
        if (!receptionTotal) return 0;
        return (group.receptionExcellentCount / receptionTotal) * 100;
    }

    if (!isPercentageField(field)) {
        return group.totals[field];
    }

    const count = group.counts[field];
    if (!count) return 0;
    return group.totals[field] / count;
}

export function formatDisplayValue(group: StatisticsGroup, field: StatisticsField): string {
    const value = getDisplayValue(group, field);
    if (isPercentageField(field)) {
        return `${Math.round(value)}%`;
    }
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export const statisticsOptions = () =>
    queryOptions({
        queryKey: ["statistics"],
        queryFn: fetchStatisticsData,
    });
