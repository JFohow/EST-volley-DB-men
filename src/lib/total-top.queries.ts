import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  addStatCoverage,
  createStatCoverage,
  getUnavailableStatSet,
  type MatchUnavailableStatRow,
  type StatCoverage,
  type UnavailableStatField,
} from "@/lib/match-unavailable-stats";

export type PlayerTotals = {
  appearances: number;
  matchesNotPlayed: number;
  games: number;
  sets: number;
  setsStarted: number;
  setsBench: number;
  bench: number;
  points: number;
  blockPoints: number;
  plusMinus: number;
  serveTotal: number;
  serveAces: number;
  serveErrors: number;
  serveAcePctTotal: number;
  serveAcePctAces: number;
  serveErrorPctTotal: number;
  serveErrorPctErrors: number;
  serveAceErrorRatioTotal: number;
  serveAceErrorRatioAces: number;
  serveAceErrorRatioErrors: number;
  receptionTotal: number;
  receptionErrors: number;
  receptionPositivePct: number;
  receptionExcellentPct: number;
  attackTotal: number;
  attackErrors: number;
  attackBlocked: number;
  attackKills: number;
  attackKillPct: number;
  attackEfficiency: number;
  breakPoints: number;
  coverage: StatCoverage;
};

export type TotalTopRow = {
  playerId: number;
  name: string;
  position: string | null;
  photoUrl: string | null;
  appearances: TotalTopAppearance[];
  official: PlayerTotals;
  competitive: PlayerTotals;
  nonOfficial: PlayerTotals;
  all: PlayerTotals;
};

export type TotalTopAppearance = {
  appearanceId: number;
  matchId: number;
  setsStarted: number | null;
  matchDate: string;
  opponent: string;
  opponentEn: string | null;
  competition: string | null;
  competitionEn: string | null;
  estoniaSets: number;
  opponentSets: number;
  vm: boolean | null;
  am: boolean | null;
  mam: boolean | null;
  onTheBench: boolean;
  hasPositionInfo: boolean;
  unavailableStats: UnavailableStatField[];
  statsRows: PlayerMatchStatsRow[];
};

type AppearanceRow = {
  appearance_id: number;
  player_id: number;
  match_id: number;
  sets_played: number | null;
  sets_started: number | null;
  on_the_bench: boolean | null;
  matches:
  | {
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
  }
  | Array<{
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
  }>
  | null;
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
    stats_version: string | null;
    set1_position: string | null;
    set2_position: string | null;
    set3_position: string | null;
    set4_position: string | null;
    set5_position: string | null;
    set6_position: string | null;
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
    stats_version: string | null;
    set1_position: string | null;
    set2_position: string | null;
    set3_position: string | null;
    set4_position: string | null;
    set5_position: string | null;
    set6_position: string | null;
  }>
  | null;
};

type PlayerMatchStatsRow = {
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
  stats_version: string | null;
  set1_position: string | null;
  set2_position: string | null;
  set3_position: string | null;
  set4_position: string | null;
  set5_position: string | null;
  set6_position: string | null;
};

function countSetsFromPositions(stats: PlayerMatchStatsRow | null): number {
  if (!stats) {
    return 0;
  }

  const positions = [
    stats.set1_position,
    stats.set2_position,
    stats.set3_position,
    stats.set4_position,
    stats.set5_position,
    stats.set6_position,
  ];

  return positions.filter((value) => typeof value === "string" && value.trim() !== "").length;
}

type PlayerRow = {
  player_id: number;
  first_name: string;
  last_name: string;
  position: string | null;
  photo_url: string | null;
};

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value;
}

function normalizeRelations<T>(value: T | T[] | null): T[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is T => Boolean(item));
  }

  return value ? [value] : [];
}

function pickStatsRowForMode(
  rows: PlayerMatchStatsRow[],
  mode: "all" | "am",
): PlayerMatchStatsRow | null {
  if (rows.length === 0) {
    return null;
  }

  if (mode === "all") {
    return (
      rows.find((row) => row.stats_version === "ALL") ??
      rows.find((row) => row.stats_version === "AM") ??
      rows[0] ??
      null
    );
  }

  return (
    rows.find((row) => row.stats_version === "AM") ??
    rows.find((row) => row.stats_version === "ALL") ??
    rows[0] ??
    null
  );
}

function createTotals(): PlayerTotals {
  return {
    appearances: 0,
    matchesNotPlayed: 0,
    games: 0,
    sets: 0,
    setsStarted: 0,
    setsBench: 0,
    bench: 0,
    points: 0,
    blockPoints: 0,
    plusMinus: 0,
    serveTotal: 0,
    serveAces: 0,
    serveErrors: 0,
    serveAcePctTotal: 0,
    serveAcePctAces: 0,
    serveErrorPctTotal: 0,
    serveErrorPctErrors: 0,
    serveAceErrorRatioTotal: 0,
    serveAceErrorRatioAces: 0,
    serveAceErrorRatioErrors: 0,
    receptionTotal: 0,
    receptionErrors: 0,
    receptionPositivePct: 0,
    receptionExcellentPct: 0,
    attackTotal: 0,
    attackErrors: 0,
    attackBlocked: 0,
    attackKills: 0,
    attackKillPct: 0,
    attackEfficiency: 0,
    breakPoints: 0,
    coverage: createStatCoverage(),
  };
}

type TotalsAccumulator = {
  totals: PlayerTotals;
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

function createTotalsAccumulator(): TotalsAccumulator {
  return {
    totals: createTotals(),
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

function updateTotals(
  accumulator: TotalsAccumulator,
  appearance: AppearanceRow,
  stats: PlayerMatchStatsRow | null,
  unavailableStats: ReadonlySet<string>,
) {
  const totals = accumulator.totals;

  totals.appearances += 1;
  const sets = countSetsFromPositions(stats);
  totals.sets += sets;

  if (sets > 0) {
    totals.games += 1;
  }

  if (appearance.on_the_bench) {
    totals.bench += 1;
  }

  if (!stats) {
    return;
  }

  addStatCoverage(totals.coverage, stats, unavailableStats);
  if (!unavailableStats.has("points")) totals.points += stats.points ?? 0;
  if (!unavailableStats.has("block_points")) totals.blockPoints += stats.block_points ?? 0;
  if (!unavailableStats.has("plus_minus")) totals.plusMinus += stats.plus_minus ?? 0;
  if (!unavailableStats.has("serve_total")) totals.serveTotal += stats.serve_total ?? 0;
  if (!unavailableStats.has("serve_aces")) totals.serveAces += stats.serve_aces ?? 0;
  if (!unavailableStats.has("serve_errors")) totals.serveErrors += stats.serve_errors ?? 0;

  if (
    !unavailableStats.has("serve_total") &&
    !unavailableStats.has("serve_aces") &&
    typeof stats.serve_total === "number" &&
    typeof stats.serve_aces === "number"
  ) {
    totals.serveAcePctTotal += stats.serve_total;
    totals.serveAcePctAces += stats.serve_aces;
  }

  if (
    !unavailableStats.has("serve_total") &&
    !unavailableStats.has("serve_errors") &&
    typeof stats.serve_total === "number" &&
    typeof stats.serve_errors === "number"
  ) {
    totals.serveErrorPctTotal += stats.serve_total;
    totals.serveErrorPctErrors += stats.serve_errors;
  }

  if (
    !unavailableStats.has("serve_total") &&
    !unavailableStats.has("serve_aces") &&
    !unavailableStats.has("serve_errors") &&
    typeof stats.serve_total === "number" &&
    typeof stats.serve_aces === "number" &&
    typeof stats.serve_errors === "number"
  ) {
    totals.serveAceErrorRatioTotal += stats.serve_total;
    totals.serveAceErrorRatioAces += stats.serve_aces;
    totals.serveAceErrorRatioErrors += stats.serve_errors;
  }
  if (!unavailableStats.has("reception_total")) totals.receptionTotal += stats.reception_total ?? 0;
  if (!unavailableStats.has("reception_errors"))
    totals.receptionErrors += stats.reception_errors ?? 0;

  const receptionTotal = stats.reception_total;
  if (
    !unavailableStats.has("reception_total") &&
    typeof receptionTotal === "number" &&
    receptionTotal > 0
  ) {
    if (
      !unavailableStats.has("reception_positive_pct") &&
      typeof stats.reception_positive_pct === "number"
    ) {
      accumulator.receptionPositiveCount += receptionTotal * (stats.reception_positive_pct / 100);
      accumulator.receptionPositiveTotal += receptionTotal;
    }

    if (
      !unavailableStats.has("reception_excellent_pct") &&
      typeof stats.reception_excellent_pct === "number"
    ) {
      accumulator.receptionExcellentCount += receptionTotal * (stats.reception_excellent_pct / 100);
      accumulator.receptionExcellentTotal += receptionTotal;
    }
  }

  if (!unavailableStats.has("attack_total")) totals.attackTotal += stats.attack_total ?? 0;
  if (!unavailableStats.has("attack_errors")) totals.attackErrors += stats.attack_errors ?? 0;
  if (!unavailableStats.has("attack_blocked")) totals.attackBlocked += stats.attack_blocked ?? 0;
  if (!unavailableStats.has("attack_kills")) totals.attackKills += stats.attack_kills ?? 0;
  if (!unavailableStats.has("break_points")) totals.breakPoints += stats.break_points ?? 0;

  if (
    !unavailableStats.has("attack_total") &&
    !unavailableStats.has("attack_kills") &&
    typeof stats.attack_total === "number" &&
    typeof stats.attack_kills === "number"
  ) {
    accumulator.attackKillPctTotal += stats.attack_total;
    accumulator.attackKillPctKills += stats.attack_kills;
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
    accumulator.attackEfficiencyTotal += stats.attack_total;
    accumulator.attackEfficiencyKills += stats.attack_kills;
    accumulator.attackEfficiencyBlocked += stats.attack_blocked;
    accumulator.attackEfficiencyErrors += stats.attack_errors;
  }
}

function finalizeReceptionPercentages(accumulator: TotalsAccumulator) {
  if (!accumulator.receptionPositiveTotal) {
    accumulator.totals.receptionPositivePct = 0;
  } else {
    accumulator.totals.receptionPositivePct =
      (accumulator.receptionPositiveCount / accumulator.receptionPositiveTotal) * 100;
  }

  if (!accumulator.receptionExcellentTotal) {
    accumulator.totals.receptionExcellentPct = 0;
  } else {
    accumulator.totals.receptionExcellentPct =
      (accumulator.receptionExcellentCount / accumulator.receptionExcellentTotal) * 100;
  }
}

function computeAttackKillPct(accumulator: TotalsAccumulator): number {
  if (!accumulator.attackKillPctTotal) {
    return 0;
  }
  return (accumulator.attackKillPctKills / accumulator.attackKillPctTotal) * 100;
}

function computeAttackEfficiency(accumulator: TotalsAccumulator): number {
  if (!accumulator.attackEfficiencyTotal) {
    return 0;
  }
  return (
    ((accumulator.attackEfficiencyKills -
      accumulator.attackEfficiencyBlocked -
      accumulator.attackEfficiencyErrors) /
      accumulator.attackEfficiencyTotal) *
    100
  );
}

async function fetchTotalTop(): Promise<TotalTopRow[]> {
  const playersResponse = await supabase
    .from("players")
    .select("player_id, first_name, last_name, position, photo_url");

  if (playersResponse.error) throw playersResponse.error;

  const { count: totalAppearanceCount, error: totalAppearanceCountError } = await supabase
    .from("appearances")
    .select("appearance_id", { count: "exact", head: true });

  if (totalAppearanceCountError) throw totalAppearanceCountError;

  const pageSize = 1000;
  let lastAppearanceId = 0;
  const allAppearanceRows: AppearanceRow[] = [];

  while (true) {
    const { data, error } = await supabase
      .from("appearances")
      .select(
        `appearance_id, player_id, match_id, sets_played, sets_started, on_the_bench, matches(match_id, match_date, opponent, opponent_en, competition, competition_en, estonia_sets, opponent_sets, vm, am, mam, match_unavailable_stats(stat_field)), player_match_stats(points, block_points, plus_minus, serve_total, serve_aces, serve_errors, reception_total, reception_errors, reception_positive_pct, reception_excellent_pct, attack_total, attack_errors, attack_blocked, attack_kills, attack_kill_pct, attack_efficiency, break_points, stats_version, set1_position, set2_position, set3_position, set4_position, set5_position, set6_position)`,
      )
      .gt("appearance_id", lastAppearanceId)
      .order("appearance_id", { ascending: true })
      .limit(pageSize);

    if (error) throw error;

    const chunk = (data ?? []) as AppearanceRow[];
    if (chunk.length === 0) break;

    allAppearanceRows.push(...chunk);

    const maxId = Math.max(...chunk.map((row) => row.appearance_id));
    if (maxId <= lastAppearanceId) break;

    lastAppearanceId = maxId;
  }

  if (totalAppearanceCount != null && allAppearanceRows.length !== totalAppearanceCount) {
    throw new Error(
      `Total Top fetch is incomplete: expected ${totalAppearanceCount} appearance rows with stats, got ${allAppearanceRows.length}. This can happen when the query silently truncates after the default PostgREST limit.`,
    );
  }

  const totalsByPlayer = new Map<
    number,
    {
      official: TotalsAccumulator;
      competitive: TotalsAccumulator;
      nonOfficial: TotalsAccumulator;
      all: TotalsAccumulator;
    }
  >();
  const appearancesByPlayer = new Map<number, TotalTopAppearance[]>();
  const appearances = allAppearanceRows;
  const matchesWithPositionInfo = new Set<number>(
    appearances
      .filter((appearance) =>
        normalizeRelations(appearance.player_match_stats).some(
          (row) => countSetsFromPositions(row) > 0,
        ),
      )
      .map((appearance) => appearance.match_id),
  );

  for (const appearance of appearances) {
    const match = normalizeRelation(appearance.matches);
    const statsRows = normalizeRelations(appearance.player_match_stats);

    if (!match) {
      continue;
    }

    const unavailableStats = getUnavailableStatSet(match.match_unavailable_stats);

    const isOfficial = match.am === true;
    const isCompetitive = match.vm === true;
    const isNonOfficial = match.mam === true;

    const totals = totalsByPlayer.get(appearance.player_id) ?? {
      official: createTotalsAccumulator(),
      competitive: createTotalsAccumulator(),
      nonOfficial: createTotalsAccumulator(),
      all: createTotalsAccumulator(),
    };

    if (isOfficial) {
      updateTotals(
        totals.official,
        appearance,
        pickStatsRowForMode(statsRows, "am"),
        unavailableStats,
      );
    }

    if (isCompetitive) {
      updateTotals(
        totals.competitive,
        appearance,
        pickStatsRowForMode(statsRows, "am"),
        unavailableStats,
      );
    }

    if (isNonOfficial) {
      updateTotals(
        totals.nonOfficial,
        appearance,
        pickStatsRowForMode(statsRows, "am"),
        unavailableStats,
      );
    }

    updateTotals(totals.all, appearance, pickStatsRowForMode(statsRows, "all"), unavailableStats);

    const playerAppearances = appearancesByPlayer.get(appearance.player_id) ?? [];
    playerAppearances.push({
      appearanceId: appearance.appearance_id,
      matchId: appearance.match_id,
      setsStarted: appearance.sets_started,
      matchDate: match.match_date,
      opponent: match.opponent,
      opponentEn: match.opponent_en,
      competition: match.competition,
      competitionEn: match.competition_en,
      estoniaSets: match.estonia_sets,
      opponentSets: match.opponent_sets,
      vm: match.vm,
      am: match.am,
      mam: match.mam,
      onTheBench: Boolean(appearance.on_the_bench),
      hasPositionInfo: matchesWithPositionInfo.has(appearance.match_id),
      unavailableStats: [...unavailableStats],
      statsRows,
    });
    appearancesByPlayer.set(appearance.player_id, playerAppearances);

    totalsByPlayer.set(appearance.player_id, totals);
  }

  const players = (playersResponse.data ?? []) as PlayerRow[];

  const rows: TotalTopRow[] = players.map((player) => {
    const totals = totalsByPlayer.get(player.player_id) ?? {
      official: createTotalsAccumulator(),
      competitive: createTotalsAccumulator(),
      nonOfficial: createTotalsAccumulator(),
      all: createTotalsAccumulator(),
    };

    finalizeReceptionPercentages(totals.official);
    finalizeReceptionPercentages(totals.competitive);
    finalizeReceptionPercentages(totals.nonOfficial);
    finalizeReceptionPercentages(totals.all);

    totals.official.totals.attackKillPct = computeAttackKillPct(totals.official);
    totals.competitive.totals.attackKillPct = computeAttackKillPct(totals.competitive);
    totals.nonOfficial.totals.attackKillPct = computeAttackKillPct(totals.nonOfficial);
    totals.all.totals.attackKillPct = computeAttackKillPct(totals.all);

    totals.official.totals.attackEfficiency = computeAttackEfficiency(totals.official);
    totals.competitive.totals.attackEfficiency = computeAttackEfficiency(totals.competitive);
    totals.nonOfficial.totals.attackEfficiency = computeAttackEfficiency(totals.nonOfficial);
    totals.all.totals.attackEfficiency = computeAttackEfficiency(totals.all);

    return {
      playerId: player.player_id,
      name: `${player.first_name} ${player.last_name}`,
      position: player.position,
      photoUrl: player.photo_url,
      appearances: appearancesByPlayer.get(player.player_id) ?? [],
      official: totals.official.totals,
      competitive: totals.competitive.totals,
      nonOfficial: totals.nonOfficial.totals,
      all: totals.all.totals,
    };
  });

  return rows.sort((a, b) => b.all.points - a.all.points);
}

export const totalTopOptions = () =>
  queryOptions({
    queryKey: ["total-top"],
    queryFn: fetchTotalTop,
  });
