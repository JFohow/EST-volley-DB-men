import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  };
}

type TotalsAccumulator = {
  totals: PlayerTotals;
  receptionPositiveCount: number;
  receptionExcellentCount: number;
};

function createTotalsAccumulator(): TotalsAccumulator {
  return {
    totals: createTotals(),
    receptionPositiveCount: 0,
    receptionExcellentCount: 0,
  };
}

function updateTotals(
  accumulator: TotalsAccumulator,
  appearance: AppearanceRow,
  stats: PlayerMatchStatsRow | null,
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

  totals.points += stats.points ?? 0;
  totals.blockPoints += stats.block_points ?? 0;
  totals.plusMinus += stats.plus_minus ?? 0;
  totals.serveTotal += stats.serve_total ?? 0;
  totals.serveAces += stats.serve_aces ?? 0;
  totals.serveErrors += stats.serve_errors ?? 0;
  totals.receptionTotal += stats.reception_total ?? 0;
  totals.receptionErrors += stats.reception_errors ?? 0;

  const receptionTotal = stats.reception_total;
  if (typeof receptionTotal === "number" && receptionTotal > 0) {
    if (typeof stats.reception_positive_pct === "number") {
      accumulator.receptionPositiveCount += receptionTotal * (stats.reception_positive_pct / 100);
    }

    if (typeof stats.reception_excellent_pct === "number") {
      accumulator.receptionExcellentCount += receptionTotal * (stats.reception_excellent_pct / 100);
    }
  }

  totals.attackTotal += stats.attack_total ?? 0;
  totals.attackErrors += stats.attack_errors ?? 0;
  totals.attackBlocked += stats.attack_blocked ?? 0;
  totals.attackKills += stats.attack_kills ?? 0;
  totals.breakPoints += stats.break_points ?? 0;
}

function finalizeReceptionPercentages(accumulator: TotalsAccumulator) {
  if (!accumulator.totals.receptionTotal) {
    accumulator.totals.receptionPositivePct = 0;
    accumulator.totals.receptionExcellentPct = 0;
    return;
  }

  accumulator.totals.receptionPositivePct =
    (accumulator.receptionPositiveCount / accumulator.totals.receptionTotal) * 100;
  accumulator.totals.receptionExcellentPct =
    (accumulator.receptionExcellentCount / accumulator.totals.receptionTotal) * 100;
}

function computeAttackKillPct(totals: PlayerTotals): number {
  if (!totals.attackTotal) {
    return 0;
  }
  return (totals.attackKills / totals.attackTotal) * 100;
}

function computeAttackEfficiency(totals: PlayerTotals): number {
  if (!totals.attackTotal) {
    return 0;
  }
  return (
    ((totals.attackKills - totals.attackBlocked - totals.attackErrors) / totals.attackTotal) * 100
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
        `appearance_id, player_id, match_id, sets_played, sets_started, on_the_bench, matches(match_id, match_date, opponent, opponent_en, competition, competition_en, estonia_sets, opponent_sets, vm, am, mam), player_match_stats(points, block_points, plus_minus, serve_total, serve_aces, serve_errors, reception_total, reception_errors, reception_positive_pct, reception_excellent_pct, attack_total, attack_errors, attack_blocked, attack_kills, attack_kill_pct, attack_efficiency, break_points, stats_version, set1_position, set2_position, set3_position, set4_position, set5_position)`,
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

  for (const appearance of appearances) {
    const match = normalizeRelation(appearance.matches);
    const statsRows = normalizeRelations(appearance.player_match_stats);

    if (!match) {
      continue;
    }

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
      updateTotals(totals.official, appearance, pickStatsRowForMode(statsRows, "am"));
    }

    if (isCompetitive) {
      updateTotals(totals.competitive, appearance, pickStatsRowForMode(statsRows, "am"));
    }

    if (isNonOfficial) {
      updateTotals(totals.nonOfficial, appearance, pickStatsRowForMode(statsRows, "am"));
    }

    updateTotals(totals.all, appearance, pickStatsRowForMode(statsRows, "all"));

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

    totals.official.totals.attackKillPct = computeAttackKillPct(totals.official.totals);
    totals.competitive.totals.attackKillPct = computeAttackKillPct(totals.competitive.totals);
    totals.nonOfficial.totals.attackKillPct = computeAttackKillPct(totals.nonOfficial.totals);
    totals.all.totals.attackKillPct = computeAttackKillPct(totals.all.totals);

    totals.official.totals.attackEfficiency = computeAttackEfficiency(totals.official.totals);
    totals.competitive.totals.attackEfficiency = computeAttackEfficiency(totals.competitive.totals);
    totals.nonOfficial.totals.attackEfficiency = computeAttackEfficiency(totals.nonOfficial.totals);
    totals.all.totals.attackEfficiency = computeAttackEfficiency(totals.all.totals);

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
