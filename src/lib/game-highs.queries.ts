import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { getUnavailableStatSet, type MatchUnavailableStatRow } from "@/lib/match-unavailable-stats";

export type GameHighRow = {
  appearanceId: number;
  matchId: number;
  matchSetCount: number;
  playerId: number;
  name: string;
  position: string | null;
  statsVersion: "ALL" | "AM" | null;
  points: number | null;
  plusMinus: number | null;
  breakPoints: number | null;
  serveTotal: number | null;
  serveAces: number | null;
  serveErrors: number | null;
  receptionTotal: number | null;
  receptionErrors: number | null;
  receptionPositivePct: number | null;
  receptionExcellentPct: number | null;
  attackTotal: number | null;
  attackErrors: number | null;
  attackBlocked: number | null;
  attackKills: number | null;
  attackKillPct: number | null;
  attackEfficiency: number | null;
  blockPoints: number | null;
  opponent: string;
  opponentEn: string | null;
  competition: string | null;
  competitionEn: string | null;
  maxEstoniaSetPoints: number | null;
  maxSetOpponentPoints: number | null;
  additionalSetScores: string[];
  matchDate: string;
  score: string;
  vm: boolean | null;
  am: boolean | null;
  mam: boolean | null;
  unavailableStats: string[];
};

type GameHighAppearanceRow = {
  appearance_id: number;
  player_position_in_match: string | null;
  match_id: number;
  players:
    | {
        player_id: number;
        first_name: string;
        last_name: string;
        position: string | null;
      }
    | Array<{
        player_id: number;
        first_name: string;
        last_name: string;
        position: string | null;
      }>
    | null;
  player_match_stats:
    | {
        stats_version: "ALL" | "AM" | null;
        points: number | null;
        plus_minus: number | null;
        break_points: number | null;
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
        block_points: number | null;
      }
    | Array<{
        stats_version: "ALL" | "AM" | null;
        points: number | null;
        plus_minus: number | null;
        break_points: number | null;
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
        block_points: number | null;
      }>
    | null;
};

type MatchRow = {
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

type MatchSetRow = {
  match_id: number;
  set_number: number;
  estonia_points: number;
  opponent_points: number;
};

const OFFICIAL_SET_COUNT = 5;

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value;
}

function deriveAttackKillPct(stats: {
  attack_total: number | null;
  attack_kills: number | null;
}): number | null {
  if (stats.attack_total == null || stats.attack_total === 0 || stats.attack_kills == null) {
    return null;
  }

  return (stats.attack_kills / stats.attack_total) * 100;
}

function deriveAttackEfficiency(stats: {
  attack_total: number | null;
  attack_kills: number | null;
  attack_blocked: number | null;
  attack_errors: number | null;
}): number | null {
  if (stats.attack_total == null || stats.attack_total === 0) {
    return null;
  }

  const kills = stats.attack_kills ?? 0;
  const blocked = stats.attack_blocked ?? 0;
  const errors = stats.attack_errors ?? 0;

  return ((kills - blocked - errors) / stats.attack_total) * 100;
}

async function fetchGameHighs(): Promise<GameHighRow[]> {
  const pageSize = 1000;
  let lastAppearanceId = 0;
  const allAppearanceRows: GameHighAppearanceRow[] = [];

  const { count: totalAppearanceCount, error: totalAppearanceCountError } = await supabase
    .from("appearances")
    .select("appearance_id, player_match_stats!inner(stats_version)", {
      count: "exact",
      head: true,
    });

  if (totalAppearanceCountError) {
    throw totalAppearanceCountError;
  }

  while (true) {
    const { data, error } = await supabase
      .from("appearances")
      .select(
        `appearance_id, player_position_in_match, match_id, players(player_id, first_name, last_name, position), player_match_stats!inner(stats_version, points, plus_minus, break_points, serve_total, serve_aces, serve_errors, reception_total, reception_errors, reception_positive_pct, reception_excellent_pct, attack_total, attack_errors, attack_blocked, attack_kills, attack_kill_pct, attack_efficiency, block_points)`,
      )
      .gt("appearance_id", lastAppearanceId)
      .order("appearance_id", { ascending: true })
      .limit(pageSize);

    if (error) throw error;

    const chunk = (data ?? []) as GameHighAppearanceRow[];
    if (chunk.length === 0) {
      break;
    }

    allAppearanceRows.push(...chunk);

    const maxId = Math.max(...chunk.map((row) => row.appearance_id));
    if (maxId <= lastAppearanceId) {
      break;
    }

    lastAppearanceId = maxId;
  }

  if (totalAppearanceCount != null && allAppearanceRows.length !== totalAppearanceCount) {
    throw new Error(
      `Game Highs fetch is incomplete: expected ${totalAppearanceCount} appearance rows with stats, got ${allAppearanceRows.length}. This can happen when the query silently truncates after the default PostgREST limit.`,
    );
  }

  const appearanceRows = allAppearanceRows;
  const matchIds = [...new Set(appearanceRows.map((item) => item.match_id))];

  const { data: matchesData, error: matchError } = await supabase
    .from("matches")
    .select(
      "match_id, match_date, opponent, opponent_en, competition, competition_en, estonia_sets, opponent_sets, vm, am, mam, match_unavailable_stats(stat_field)",
    )
    .in("match_id", matchIds);

  if (matchError) throw matchError;

  const { data: matchSetsData, error: matchSetsError } = await supabase
    .from("match_sets")
    .select("match_id, set_number, estonia_points, opponent_points")
    .in("match_id", matchIds);

  if (matchSetsError) throw matchSetsError;

  const maxSetByMatch = new Map<number, { estonia: number; opponent: number }>();
  const additionalSetsByMatch = new Map<number, MatchSetRow[]>();
  for (const setRow of (matchSetsData ?? []) as MatchSetRow[]) {
    const current = maxSetByMatch.get(setRow.match_id);
    if (current == null || setRow.estonia_points > current.estonia) {
      maxSetByMatch.set(setRow.match_id, {
        estonia: setRow.estonia_points,
        opponent: setRow.opponent_points,
      });
    }

    if (setRow.set_number > OFFICIAL_SET_COUNT) {
      const sets = additionalSetsByMatch.get(setRow.match_id) ?? [];
      sets.push(setRow);
      additionalSetsByMatch.set(setRow.match_id, sets);
    }
  }

  const additionalSetScoresByMatch = new Map<number, string[]>();
  for (const [matchId, sets] of additionalSetsByMatch) {
    additionalSetScoresByMatch.set(
      matchId,
      [...sets]
        .sort((a, b) => a.set_number - b.set_number)
        .map((set) => `${set.estonia_points}:${set.opponent_points}`),
    );
  }

  const matchesById = new Map(
    ((matchesData ?? []) as MatchRow[]).map((match) => [match.match_id, match]),
  );

  const rows: GameHighRow[] = [];

  for (const item of appearanceRows) {
    const player = normalizeRelation(item.players);
    const match = matchesById.get(item.match_id);
    const statsRows = Array.isArray(item.player_match_stats)
      ? item.player_match_stats
      : item.player_match_stats
        ? [item.player_match_stats]
        : [];

    if (!player || !match || statsRows.length === 0) {
      continue;
    }

    for (const stats of statsRows) {
      const unavailableStats = getUnavailableStatSet(match.match_unavailable_stats);

      rows.push({
        appearanceId: item.appearance_id,
        matchId: item.match_id,
        matchSetCount: match.estonia_sets + match.opponent_sets,
        playerId: player.player_id,
        name: `${player.first_name} ${player.last_name}`,
        position: item.player_position_in_match ?? player.position ?? "Unknown",
        statsVersion: stats.stats_version,
        points: unavailableStats.has("points") ? null : stats.points,
        plusMinus: unavailableStats.has("plus_minus") ? null : stats.plus_minus,
        breakPoints: unavailableStats.has("break_points") ? null : stats.break_points,
        serveTotal: unavailableStats.has("serve_total") ? null : stats.serve_total,
        serveAces: unavailableStats.has("serve_aces") ? null : stats.serve_aces,
        serveErrors: unavailableStats.has("serve_errors") ? null : stats.serve_errors,
        receptionTotal: unavailableStats.has("reception_total") ? null : stats.reception_total,
        receptionErrors: unavailableStats.has("reception_errors") ? null : stats.reception_errors,
        receptionPositivePct:
          unavailableStats.has("reception_total") || unavailableStats.has("reception_positive_pct")
            ? null
            : stats.reception_positive_pct,
        receptionExcellentPct:
          unavailableStats.has("reception_total") || unavailableStats.has("reception_excellent_pct")
            ? null
            : stats.reception_excellent_pct,
        attackTotal: unavailableStats.has("attack_total") ? null : stats.attack_total,
        attackErrors: unavailableStats.has("attack_errors") ? null : stats.attack_errors,
        attackBlocked: unavailableStats.has("attack_blocked") ? null : stats.attack_blocked,
        attackKills: unavailableStats.has("attack_kills") ? null : stats.attack_kills,
        attackKillPct:
          unavailableStats.has("attack_total") || unavailableStats.has("attack_kills")
            ? null
            : deriveAttackKillPct(stats),
        attackEfficiency:
          unavailableStats.has("attack_total") ||
          unavailableStats.has("attack_kills") ||
          unavailableStats.has("attack_blocked") ||
          unavailableStats.has("attack_errors")
            ? null
            : deriveAttackEfficiency(stats),
        blockPoints: unavailableStats.has("block_points") ? null : stats.block_points,
        opponent: match.opponent,
        opponentEn: match.opponent_en,
        competition: match.competition,
        competitionEn: match.competition_en,
        maxEstoniaSetPoints: maxSetByMatch.get(item.match_id)?.estonia ?? null,
        maxSetOpponentPoints: maxSetByMatch.get(item.match_id)?.opponent ?? null,
        additionalSetScores: additionalSetScoresByMatch.get(item.match_id) ?? [],
        matchDate: match.match_date,
        score: `${match.estonia_sets}-${match.opponent_sets}`,
        vm: match.vm,
        am: match.am,
        mam: match.mam,
        unavailableStats: [...unavailableStats],
      });
    }
  }

  return rows.sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
}

export const TEAM_TOTAL_STAT_FIELDS = [
  "points",
  "block_points",
  "plus_minus",
  "break_points",
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
] as const;

export type MatchTeamTotalRow = {
  matchId: number;
  statField: string;
  teamTotal: number;
};

type MatchTeamTotalDbRow = {
  match_id: number;
  stat_field: string;
  team_total: number;
};

async function fetchMatchTeamTotals(): Promise<MatchTeamTotalRow[]> {
  const pageSize = 1000;
  const rows: MatchTeamTotalRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("match_team_totals")
      .select("match_id, stat_field, team_total")
      .order("match_id", { ascending: true })
      .order("stat_field", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const chunk = (data ?? []) as MatchTeamTotalDbRow[];
    rows.push(
      ...chunk.map((row) => ({
        matchId: row.match_id,
        statField: row.stat_field,
        teamTotal: row.team_total,
      })),
    );

    if (chunk.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return rows;
}

export const gameHighsOptions = () =>
  queryOptions({
    queryKey: ["game-highs"],
    queryFn: fetchGameHighs,
  });

export const matchTeamTotalsOptions = () =>
  queryOptions({
    queryKey: ["match-team-totals"],
    queryFn: fetchMatchTeamTotals,
  });
