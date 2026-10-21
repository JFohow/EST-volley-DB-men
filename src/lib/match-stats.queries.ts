import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
    getUnavailableStatSet,
    maskUnavailableStatValues,
    type UnavailableStatField,
} from "@/lib/match-unavailable-stats";

export type MatchDetails = Awaited<
    ReturnType<
        NonNullable<ReturnType<typeof matchOptions>["queryFn"]>
    >
>;

export type PlayerMatchStats = {
    appearance_id: number;
    player_id: number;
    shirt_number: number | null;
    sets_played: number | null;
    on_the_bench: boolean;
    player_position_in_match: string | null;
    unavailableStats: UnavailableStatField[];
    players: {
        player_id: number;
        first_name: string;
        last_name: string;
        position: string | null;
        photo_url: string | null;
    };
    player_match_stats: Array<{
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
        attack_efficiency: number | null;
        attack_kills: number | null;
        attack_kill_pct: number | null;
        break_points: number | null;
        stats_version: string | null;
        set1_position: string | null;
        set2_position: string | null;
        set3_position: string | null;
        set4_position: string | null;
        set5_position: string | null;
    }>;
};

export type MatchDetailsWithPlayers = {
    match: any;
    players: PlayerMatchStats[];
};

export function matchOptions(matchId: number) {
    return queryOptions({
        queryKey: ["match-stats", matchId],

        queryFn: async () => {
            const { data: match, error: matchError } = await supabase
                .from("matches")
                .select(`
          *,
          match_sets (
            *
                    ),
                    match_unavailable_stats(stat_field)
        `)
                .eq("match_id", matchId)
                .single();

            if (matchError) {
                throw matchError;
            }

            const { data: appearances, error: appearanceError } = await supabase
                .from("appearances")
                .select(`
          appearance_id,
          player_id,
          shirt_number,
          sets_played,
          on_the_bench,
                    player_position_in_match,
          players (
            player_id,
            first_name,
            last_name,
            position,
            photo_url
          ),
                    player_match_stats (
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
                        attack_efficiency,
                        attack_kills,
                        attack_kill_pct,
                        break_points,
                        stats_version,
                        set1_position,
                        set2_position,
                        set3_position,
                        set4_position,
                        set5_position
                    )
        `)
                .eq("match_id", matchId)
                .order("shirt_number", { ascending: true, nullsFirst: false });

            if (appearanceError) {
                throw appearanceError;
            }

            const unavailableStats = getUnavailableStatSet(match.match_unavailable_stats);
            const playersWithMaskedStats = (appearances ?? []).map((appearance) => {
                const statsRows = Array.isArray(appearance.player_match_stats)
                    ? appearance.player_match_stats
                    : appearance.player_match_stats
                        ? [appearance.player_match_stats]
                        : [];

                return {
                    ...appearance,
                    unavailableStats: [...unavailableStats],
                    player_match_stats: statsRows.map((stats) =>
                        maskUnavailableStatValues(stats, unavailableStats),
                    ),
                };
            });

            return {
                match,
                players: playersWithMaskedStats,
            } as MatchDetailsWithPlayers;
        },
    });
}