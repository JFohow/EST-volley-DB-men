import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PlayerListItem = {
    player_id: number;
    first_name: string;
    last_name: string;
    position: string | null;
    photo_url: string | null;

    amAppearances: number;
    amGamesPlayed: number;
    amBench: number;

    vmAppearances: number;
    vmGamesPlayed: number;
    vmBench: number;

    allAppearances: number;
    allGamesPlayed: number;
    allBench: number;
};

type PlayerRow = {
    player_id: number;
    first_name: string;
    last_name: string;
    position: string | null;
    photo_url: string | null;
};

type AppearanceMatchRow = {
    match_id: number;
    vm: boolean | null;
    am: boolean | null;
    mam: boolean | null;
};

type AppearanceRow = {
    player_id: number;
    sets_played: number | null;
    on_the_bench: boolean | null;
    player_match_stats:
    | {
        points: number | null;
        block_points: number | null;
        plus_minus: number | null;
        serve_total: number | null;
        serve_aces: number | null;
        serve_errors: number | null;
        reception_total: number | null;
        reception_errors: number | null;
        reception_positive_pct: number | null;
        reception_excellent_pct: number | null;
        attack_total: number | null;
        attack_errors: number | null;
        attack_blocked: number | null;
        attack_kills: number | null;
        attack_kill_pct: number | null;
        attack_efficiency: number | null;
        break_points: number | null;
        set1_position: string | null;
        set2_position: string | null;
        set3_position: string | null;
        set4_position: string | null;
        set5_position: string | null;
    }
    | Array<{
        points: number | null;
        block_points: number | null;
        plus_minus: number | null;
        serve_total: number | null;
        serve_aces: number | null;
        serve_errors: number | null;
        reception_total: number | null;
        reception_errors: number | null;
        reception_positive_pct: number | null;
        reception_excellent_pct: number | null;
        attack_total: number | null;
        attack_errors: number | null;
        attack_blocked: number | null;
        attack_kills: number | null;
        attack_kill_pct: number | null;
        attack_efficiency: number | null;
        break_points: number | null;
        set1_position: string | null;
        set2_position: string | null;
        set3_position: string | null;
        set4_position: string | null;
        set5_position: string | null;
    }>
    | null;
    matches:
    | Array<AppearanceMatchRow>
    | AppearanceMatchRow
    | null;
};

type AppearanceStatsRow = {
    points: number | null;
    block_points: number | null;
    plus_minus: number | null;
    serve_total: number | null;
    serve_aces: number | null;
    serve_errors: number | null;
    reception_total: number | null;
    reception_errors: number | null;
    reception_positive_pct: number | null;
    reception_excellent_pct: number | null;
    attack_total: number | null;
    attack_errors: number | null;
    attack_blocked: number | null;
    attack_kills: number | null;
    attack_kill_pct: number | null;
    attack_efficiency: number | null;
    break_points: number | null;
    set1_position: string | null;
    set2_position: string | null;
    set3_position: string | null;
    set4_position: string | null;
    set5_position: string | null;
};

function normalizeRelations<T>(value: T | T[] | null): T[] {
    if (Array.isArray(value)) {
        return value.filter((item): item is T => Boolean(item));
    }

    return value ? [value] : [];
}

function countPlayedSetsFromPositions(stats: AppearanceStatsRow): number {
    const values = [
        stats.set1_position,
        stats.set2_position,
        stats.set3_position,
        stats.set4_position,
        stats.set5_position,
    ];

    return values.filter((value) => typeof value === "string" && value.trim() !== "").length;
}

function hasAnyNumericMatchStats(stats: AppearanceStatsRow): boolean {
    const statValues: Array<number | null> = [
        stats.points,
        stats.block_points,
        stats.plus_minus,
        stats.serve_total,
        stats.serve_aces,
        stats.serve_errors,
        stats.reception_total,
        stats.reception_errors,
        stats.reception_positive_pct,
        stats.reception_excellent_pct,
        stats.attack_total,
        stats.attack_errors,
        stats.attack_blocked,
        stats.attack_kills,
        stats.attack_kill_pct,
        stats.attack_efficiency,
        stats.break_points,
    ];

    return statValues.some((value) => typeof value === "number");
}

async function fetchPlayers(): Promise<PlayerListItem[]> {
    const playersResponse = await supabase
        .from("players")
        .select(`
      player_id,
      first_name,
      last_name,
      position,
      photo_url
    `);

    const players = playersResponse.data as PlayerRow[] | null;
    if (playersResponse.error) throw playersResponse.error;

    const apps: AppearanceRow[] = [];
    const pageSize = 1000;
    let pageStart = 0;

    while (true) {
        const { data: appsPage, error: appsError } = await supabase
            .from("appearances")
            .select(`
                player_id,
                sets_played,
                on_the_bench,
                player_match_stats(
                    points,
                    block_points,
                    plus_minus,
                    serve_total,
                    serve_aces,
                    serve_errors,
                    reception_total,
                    reception_errors,
                    reception_positive_pct,
                    reception_excellent_pct,
                    attack_total,
                    attack_errors,
                    attack_blocked,
                    attack_kills,
                    attack_kill_pct,
                    attack_efficiency,
                    break_points,
                    set1_position,
                    set2_position,
                    set3_position,
                    set4_position,
                    set5_position
                ),
                matches(
                    match_id,
                    match_date,
                    opponent,
                    competition,
                    estonia_sets,
                    opponent_sets,
                    vm,
                    am,
                    mam
                )
            `)
            .order("appearance_id", { ascending: true })
            .range(pageStart, pageStart + pageSize - 1);

        if (appsError) throw appsError;

        const pageRows = (appsPage ?? []) as AppearanceRow[];
        apps.push(...pageRows);

        if (pageRows.length < pageSize) {
            break;
        }

        pageStart += pageSize;
    }

    const stats = new Map<
        number,
        {
            amAppearances: number;
            amGamesPlayed: number;
            amBench: number;

            vmAppearances: number;
            vmGamesPlayed: number;
            vmBench: number;

            allAppearances: number;
            allGamesPlayed: number;
            allBench: number;
        }
    >();

    const matchHasFullStats = new Map<number, boolean>();

    (apps ?? []).forEach((a) => {
        const match = Array.isArray(a.matches)
            ? a.matches[0]
            : a.matches;

        if (!match) return;

        const statsRows = normalizeRelations(a.player_match_stats);
        const hasFullStatsForAppearance = statsRows.some((row) => hasAnyNumericMatchStats(row));
        const current = matchHasFullStats.get(match.match_id) ?? false;
        matchHasFullStats.set(match.match_id, current || hasFullStatsForAppearance);
    });

    (apps ?? []).forEach((a) => {
        const match = Array.isArray(a.matches)
            ? a.matches[0]
            : a.matches;
        const isAM = Boolean(match?.am);
        const isVM = Boolean(match?.vm);

        const current = stats.get(a.player_id) ?? {
            amAppearances: 0,
            amGamesPlayed: 0,
            amBench: 0,

            vmAppearances: 0,
            vmGamesPlayed: 0,
            vmBench: 0,

            allAppearances: 0,
            allGamesPlayed: 0,
            allBench: 0,
        };

        const statsRows = normalizeRelations(a.player_match_stats);
        const setsFromPositions = statsRows.reduce(
            (maxPlayedSets, row) => Math.max(maxPlayedSets, countPlayedSetsFromPositions(row)),
            0,
        );

        const isPlayersListOnlyMatch = match ? !Boolean(matchHasFullStats.get(match.match_id)) : false;
        const wasPlayed = isPlayersListOnlyMatch || setsFromPositions > 0;
        const wasBench = !wasPlayed;

        // Official (AM)

        if (isAM) {
            current.amAppearances += 1;

            if (wasPlayed) {
                current.amGamesPlayed += 1;
            }

            if (wasBench) {
                current.amBench += 1;
            }
        }

        // Competitive (VM)

        if (isVM) {
            current.vmAppearances += 1;

            if (wasPlayed) {
                current.vmGamesPlayed += 1;
            }

            if (wasBench) {
                current.vmBench += 1;
            }
        }

        // All Matches (total appearances)

        current.allAppearances += 1;

        if (wasPlayed) {
            current.allGamesPlayed += 1;
        }

        if (wasBench) {
            current.allBench += 1;
        }

        stats.set(a.player_id, current);
    });

    return (players ?? [])
        .map((p) => ({
            ...p,

            amAppearances:
                stats.get(p.player_id)?.amAppearances ?? 0,

            amGamesPlayed:
                stats.get(p.player_id)?.amGamesPlayed ?? 0,

            amBench:
                stats.get(p.player_id)?.amBench ?? 0,

            vmAppearances:
                stats.get(p.player_id)?.vmAppearances ?? 0,

            vmGamesPlayed:
                stats.get(p.player_id)?.vmGamesPlayed ?? 0,

            vmBench:
                stats.get(p.player_id)?.vmBench ?? 0,

            allAppearances:
                stats.get(p.player_id)?.allAppearances ?? 0,

            allGamesPlayed:
                stats.get(p.player_id)?.allGamesPlayed ?? 0,

            allBench:
                stats.get(p.player_id)?.allBench ?? 0,
        }))
        .sort(
            (a, b) =>
                b.amAppearances - a.amAppearances
        );
}

export const playersOptions = () =>
    queryOptions({
        queryKey: ["players"],
        queryFn: fetchPlayers,
    });

export type PlayerMatchStatsSummary = {
    matchCount: number;
    totals: Record<string, number>;
    averages: Record<string, number | null>;
};

type MatchStatRow = Partial<Record<(typeof playerMatchStatFields)[number], number | null>>;

type PositionRow = {
    position_name: string | null;
    position_name_ee: string | null;
};

const playerMatchStatFields = [
    "attack_blocked",
    "attack_efficiency",
    "attack_errors",
    "attack_kill_pct",
    "attack_kills",
    "attack_total",
    "block_points",
    "break_points",
    "plus_minus",
    "points",
    "reception_errors",
    "reception_excellent_pct",
    "reception_positive_pct",
    "reception_total",
    "serve_aces",
    "serve_errors",
    "serve_total",
] as const;

export async function fetchPlayer(playerId: number) {
    const { data: player, error } = await supabase
        .from("players")
        .select("*")
        .eq("player_id", playerId)
        .single();

    if (error) throw error;

    let positionDetails: PositionRow | null = null;

    if (player.position) {
        const normalizedPosition = player.position.trim();

        const { data: positionRow, error: positionError } = await supabase
            .from("positions")
            .select("position_name, position_name_ee")
            .eq("position", normalizedPosition)
            .maybeSingle();

        // Position labels are optional metadata. If lookup fails
        // (e.g. due RLS policy), keep rendering with fallback values.
        if (!positionError) {
            positionDetails = positionRow;

            if (!positionDetails && normalizedPosition !== normalizedPosition.toUpperCase()) {
                const { data: fallbackPositionRow, error: fallbackPositionError } = await supabase
                    .from("positions")
                    .select("position_name, position_name_ee")
                    .eq("position", normalizedPosition.toUpperCase())
                    .maybeSingle();

                if (!fallbackPositionError) {
                    positionDetails = fallbackPositionRow;
                }
            }
        }
    }

    const { data: appearances, error: appError } = await supabase
        .from("appearances")
        .select(`
      *,
      matches(
        match_id,
        match_date,
        opponent,
                opponent_en,
        competition,
                competition_en,
        estonia_sets,
        opponent_sets,
        vm,
        am,
        mam
      ),
      player_match_stats(
                *
      )
    `)
        .eq("player_id", playerId);

    if (appError) throw appError;

    const rawStats = (appearances ?? [])
        .map((a: any) => {
            const rows = Array.isArray(a.player_match_stats)
                ? a.player_match_stats
                : a.player_match_stats
                    ? [a.player_match_stats]
                    : [];

            if (rows.length === 0) return null;

            return (
                rows.find((row: any) => row?.stats_version === "ALL") ??
                rows.find((row: any) => row?.stats_version === "AM") ??
                rows[0] ??
                null
            );
        })
        .filter(Boolean) as MatchStatRow[];

    const totals: Record<string, number> = {};
    const averages: Record<string, number | null> = {};

    for (const key of playerMatchStatFields) {
        let sum = 0;
        let count = 0;

        for (const stats of rawStats) {
            const value = stats[key];
            if (typeof value === "number") {
                sum += value;
                count += 1;
            }
        }

        totals[key] = sum;
        averages[key] = count > 0 ? sum / count : null;
    }

    // Reconstruct positive/excellent reception counts per match, then compute weighted percentages.
    let receptionTotal = 0;
    let receptionPositiveCount = 0;
    let receptionExcellentCount = 0;

    for (const stats of rawStats) {
        const total = stats.reception_total;
        if (typeof total !== "number" || total <= 0) {
            continue;
        }

        receptionTotal += total;

        if (typeof stats.reception_positive_pct === "number") {
            receptionPositiveCount += total * (stats.reception_positive_pct / 100);
        }

        if (typeof stats.reception_excellent_pct === "number") {
            receptionExcellentCount += total * (stats.reception_excellent_pct / 100);
        }
    }

    const weightedReceptionPositivePct =
        receptionTotal > 0 ? (receptionPositiveCount / receptionTotal) * 100 : null;
    const weightedReceptionExcellentPct =
        receptionTotal > 0 ? (receptionExcellentCount / receptionTotal) * 100 : null;
    const derivedAttackKillPct =
        (totals.attack_total ?? 0) > 0 ? ((totals.attack_kills ?? 0) / (totals.attack_total ?? 0)) * 100 : null;
    const derivedAttackEfficiency =
        (totals.attack_total ?? 0) > 0
            ? (((totals.attack_kills ?? 0) - (totals.attack_blocked ?? 0) - (totals.attack_errors ?? 0)) /
                (totals.attack_total ?? 0)) *
            100
            : null;

    averages.reception_positive_pct = weightedReceptionPositivePct;
    averages.reception_excellent_pct = weightedReceptionExcellentPct;
    totals.reception_positive_pct = weightedReceptionPositivePct ?? 0;
    totals.reception_excellent_pct = weightedReceptionExcellentPct ?? 0;
    averages.attack_kill_pct = derivedAttackKillPct;
    averages.attack_efficiency = derivedAttackEfficiency;
    totals.attack_kill_pct = derivedAttackKillPct ?? 0;
    totals.attack_efficiency = derivedAttackEfficiency ?? 0;

    const statsSummary: PlayerMatchStatsSummary = {
        matchCount: rawStats.length,
        totals,
        averages,
    };

    return {
        player: {
            ...player,
            position_name: positionDetails?.position_name ?? null,
            position_name_ee: positionDetails?.position_name_ee ?? null,
        },
        appearances: appearances ?? [],
        statsSummary,
    };
}

export const playerOptions = (playerId: number) =>
    queryOptions({
        queryKey: ["player", playerId],
        queryFn: () => fetchPlayer(playerId),
    });