import { Link, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Fragment, useEffect, useMemo, useState } from "react";
import MultiSelect from "@/components/ui/multi-select";
import { fetchPlayer } from "@/lib/players.queries";
import { useTranslation } from "react-i18next";

type RawMatchRecord = {
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
    match_unavailable_stats: { stat_field: string }[] | null;
};

type MatchRecord = RawMatchRecord & {
    match_type: "VM" | "AM" | "MAM" | null;
};

type PlayerAppearance = {
    appearance_id: number;
    player_id: number;
    match_id: number;
    sets_played: number;
    on_the_bench: boolean;
    player_position_in_match: string | null;
    shirt_number: number | null;
    matches: RawMatchRecord | RawMatchRecord[] | null;
    player_match_stats: Array<{
        attack_blocked: number | null;
        attack_efficiency: number | null;
        attack_errors: number | null;
        attack_kill_pct: number | null;
        attack_kills: number | null;
        attack_total: number | null;
        block_points: number | null;
        break_points: number | null;
        plus_minus: number | null;
        points: number | null;
        reception_errors: number | null;
        reception_excellent_pct: number | null;
        reception_positive_pct: number | null;
        reception_total: number | null;
        serve_aces: number | null;
        serve_errors: number | null;
        serve_total: number | null;
        stats_version: string | null;
    }> | null;
};

type PlayerPageData = {
    player: {
        player_id: number;
        first_name: string;
        last_name: string;
        position: string | null;
        position_name: string | null;
        position_name_ee: string | null;
        photo_url: string | null;
        height_cm: number | null;
        birth_date: string | null;
        place_of_birth: string | null;
        birth_county: string | null;
        handedness: string | null;
    };
    appearances: PlayerAppearance[];
    statsSummary: {
        matchCount: number;
        totals: Record<string, number>;
        averages: Record<string, number | null>;
    };
};

export const Route = createFileRoute("/players/$playerId")({
    component: PlayerPage,
});

function PlayerPage() {
    const { playerId } = Route.useParams();

    const { t, i18n } = useTranslation();
    const currentLanguage = i18n.language?.startsWith("et") ? "et" : "en";

    const { data } = useSuspenseQuery<PlayerPageData>({
        queryKey: ["player", Number(playerId)],
        queryFn: () => fetchPlayer(Number(playerId)),
    });

    if (!data) {
        return null;
    }

    const player = data.player;
    const appearances = data.appearances;
    const statsSummary = data.statsSummary;

    const getMatch = (appearance: PlayerAppearance): MatchRecord | null => {
        const rawMatch = appearance.matches;
        if (!rawMatch) return null;

        const normalized = Array.isArray(rawMatch) ? rawMatch[0] : rawMatch;

        if (!normalized) return null;

        const match_type = normalized.vm ? "VM" : normalized.am ? "AM" : normalized.mam ? "MAM" : null;

        return {
            ...normalized,
            match_type,
        };
    };

    const getLocalizedOpponent = (match: MatchRecord) =>
        currentLanguage === "et" ? match.opponent : (match.opponent_en ?? match.opponent);

    const getLocalizedCompetition = (match: MatchRecord) =>
        currentLanguage === "et" ? match.competition : (match.competition_en ?? match.competition);

    const [statsMode, setStatsMode] = useState<"official" | "competitive" | "all">("official");
    const [selectedYear, setSelectedYear] = useState<string[]>(["all"]);
    const [selectedCompetition, setSelectedCompetition] = useState<string[]>(["all"]);
    const [selectedOpponent, setSelectedOpponent] = useState<string[]>(["all"]);
    const [selectedMatches, setSelectedMatches] = useState<string[]>([]);
    const [expandedGameHighMetric, setExpandedGameHighMetric] = useState<string | null>(null);

    const statColumns = [
        { field: "points", label: "PTS" },
        { field: "break_points", label: "BP" },
        { field: "plus_minus", label: "W-P" },
        { field: "serve_total", label: "Tot" },
        { field: "serve_errors", label: "Err" },
        { field: "serve_aces", label: "Ace" },
        { field: "reception_total", label: "Tot" },
        { field: "reception_errors", label: "Err" },
        { field: "reception_positive_pct", label: "Pos%" },
        { field: "reception_excellent_pct", label: "Exc%" },
        { field: "attack_total", label: "Tot" },
        { field: "attack_errors", label: "Err" },
        { field: "attack_blocked", label: "Blk" },
        { field: "attack_kills", label: "Exc." },
        { field: "attack_kill_pct", label: "Exc.%" },
        { field: "attack_efficiency", label: "Eff%" },
        { field: "block_points", label: "PTS" },
    ] as const;

    const isPercentField = (field: string) =>
        field === "reception_positive_pct" ||
        field === "reception_excellent_pct" ||
        field === "attack_kill_pct" ||
        field === "attack_efficiency";

    const safeInt = (v: any) => (typeof v === "number" && Number.isInteger(v) ? v : 0);

    const computeAttackEff = (stats: any) => {
        if (!stats) return null;
        const attackTotRaw = stats.attack_total;
        const attackTot = safeInt(attackTotRaw);

        if (attackTotRaw == null || attackTot === 0) return null;

        const attackExc = safeInt(stats.attack_kills);
        const attackBlk = safeInt(stats.attack_blocked);
        const attackErr = safeInt(stats.attack_errors);

        const eff = ((attackExc - attackBlk - attackErr) / attackTot) * 100;
        return eff;
    };

    const pickStatsRowForMode = (rows: PlayerAppearance["player_match_stats"]) => {
        if (!rows || rows.length === 0) return null;

        const preferredStatsVersion = statsMode === "official" ? "AM" : "ALL";

        return (
            rows.find((row) => row?.stats_version === preferredStatsVersion) ??
            rows.find((row) => row?.stats_version === (preferredStatsVersion === "AM" ? "ALL" : "AM")) ??
            rows[0] ??
            null
        );
    };

    const appearanceMatchesWithStats = useMemo(() => {
        return appearances.filter((a) => {
            const match = getMatch(a);
            if (!match) return false;

            if (statsMode === "official") {
                return match.am === true;
            }

            if (statsMode === "competitive") {
                return match.vm === true;
            }

            return true;
        });
    }, [appearances, statsMode]);

    const yearOptions = useMemo(() => {
        const values = new Set<string>();
        appearanceMatchesWithStats.forEach((a) => {
            const match = getMatch(a);
            if (!match) return;
            const localizedCompetition = getLocalizedCompetition(match);
            const localizedOpponent = getLocalizedOpponent(match);

            // adaptive: respect selected competition/opponent when building year list
            if (
                !selectedCompetition.includes("all") &&
                localizedCompetition &&
                !selectedCompetition.includes(localizedCompetition)
            )
                return;
            if (
                !selectedOpponent.includes("all") &&
                localizedOpponent &&
                !selectedOpponent.includes(localizedOpponent)
            )
                return;

            if (match.match_date) {
                values.add(new Date(match.match_date).getFullYear().toString());
            }
        });
        return [...values].sort();
    }, [appearanceMatchesWithStats, selectedCompetition, selectedOpponent, currentLanguage]);

    const competitionOptions = useMemo(() => {
        const values = new Set<string>();
        appearanceMatchesWithStats.forEach((a) => {
            const match = getMatch(a);
            if (!match) return;
            const localizedCompetition = getLocalizedCompetition(match);
            const localizedOpponent = getLocalizedOpponent(match);

            // adaptive: respect selected year/opponent when building competition list
            if (!selectedYear.includes("all")) {
                const year = new Date(match.match_date).getFullYear().toString();
                if (!selectedYear.includes(year)) return;
            }
            if (
                !selectedOpponent.includes("all") &&
                localizedOpponent &&
                !selectedOpponent.includes(localizedOpponent)
            )
                return;

            if (localizedCompetition) {
                values.add(localizedCompetition);
            }
        });
        return [...values].sort();
    }, [appearanceMatchesWithStats, selectedYear, selectedOpponent, currentLanguage]);

    const opponentOptions = useMemo(() => {
        const values = new Set<string>();
        appearanceMatchesWithStats.forEach((a) => {
            const match = getMatch(a);
            if (!match) return;
            const localizedCompetition = getLocalizedCompetition(match);
            const localizedOpponent = getLocalizedOpponent(match);

            // adaptive: respect selected year/competition when building opponent list
            if (!selectedYear.includes("all")) {
                const year = new Date(match.match_date).getFullYear().toString();
                if (!selectedYear.includes(year)) return;
            }
            if (
                !selectedCompetition.includes("all") &&
                localizedCompetition &&
                !selectedCompetition.includes(localizedCompetition)
            )
                return;

            if (localizedOpponent) {
                values.add(localizedOpponent);
            }
        });
        return [...values].sort();
    }, [appearanceMatchesWithStats, selectedYear, selectedCompetition, currentLanguage]);

    const matchOptions = useMemo(() => {
        const values: Array<{ id: number; label: string }> = [];
        const seen = new Set<number>();
        appearanceMatchesWithStats.forEach((a) => {
            const match = getMatch(a);
            if (!match) return;
            const localizedCompetition = getLocalizedCompetition(match);
            const localizedOpponent = getLocalizedOpponent(match);

            // adaptive: respect selected year/competition/opponent when building match list
            if (!selectedYear.includes("all")) {
                const year = new Date(match.match_date).getFullYear().toString();
                if (!selectedYear.includes(year)) return;
            }
            if (
                !selectedCompetition.includes("all") &&
                localizedCompetition &&
                !selectedCompetition.includes(localizedCompetition)
            )
                return;
            if (
                !selectedOpponent.includes("all") &&
                localizedOpponent &&
                !selectedOpponent.includes(localizedOpponent)
            )
                return;

            if (!seen.has(a.match_id)) {
                seen.add(a.match_id);
                const dateLabel = new Date(match.match_date).toLocaleDateString("en-GB");
                const scoreLabel = `${match.estonia_sets}-${match.opponent_sets}`;
                values.push({
                    id: a.match_id,
                    label: `${dateLabel} | ${localizedOpponent} | ${scoreLabel}`,
                });
            }
        });
        return values.sort((l, r) => l.label.localeCompare(r.label));
    }, [
        appearanceMatchesWithStats,
        selectedYear,
        selectedCompetition,
        selectedOpponent,
        currentLanguage,
    ]);

    useEffect(() => {
        const allowedIds = new Set(matchOptions.map((m) => String(m.id)));
        setSelectedMatches((current) => current.filter((id) => allowedIds.has(id)));
    }, [matchOptions]);

    const filteredAppearances = useMemo(() => {
        return appearanceMatchesWithStats.filter((a) => {
            const match = getMatch(a);
            if (!match) return false;
            const localizedCompetition = getLocalizedCompetition(match);
            const localizedOpponent = getLocalizedOpponent(match);

            // year filter (multi)
            if (!selectedYear.includes("all") && selectedYear.length > 0) {
                const year = new Date(match.match_date).getFullYear().toString();
                if (!selectedYear.includes(year)) return false;
            }

            // competition filter (multi)
            if (!selectedCompetition.includes("all") && selectedCompetition.length > 0) {
                if (!localizedCompetition || !selectedCompetition.includes(localizedCompetition)) {
                    return false;
                }
            }

            // opponent filter (multi)
            if (!selectedOpponent.includes("all") && selectedOpponent.length > 0) {
                if (!localizedOpponent || !selectedOpponent.includes(localizedOpponent)) {
                    return false;
                }
            }

            // match specific filter (by match id strings)
            if (selectedMatches.length > 0) {
                if (!selectedMatches.includes(String(a.match_id))) return false;
            }

            return true;
        });
    }, [
        appearanceMatchesWithStats,
        selectedYear,
        selectedCompetition,
        selectedOpponent,
        selectedMatches,
    ]);

    const filteredSummary = useMemo(() => {
        const totals: Record<string, number> = {};
        const counts: Record<string, number> = {};
        let receptionPositiveCount = 0;
        let receptionExcellentCount = 0;
        let receptionPositiveTotal = 0;
        let receptionExcellentTotal = 0;
        let attackKillPctTotal = 0;
        let attackKillPctKills = 0;
        let attackEfficiencyTotal = 0;
        let attackEfficiencyKills = 0;
        let attackEfficiencyBlocked = 0;
        let attackEfficiencyErrors = 0;

        statColumns.forEach((column) => {
            totals[column.field] = 0;
            counts[column.field] = 0;
        });

        filteredAppearances.forEach((a) => {
            const stats = pickStatsRowForMode(a.player_match_stats);
            if (!stats) return;
            const rawMatch = Array.isArray(a.matches) ? a.matches[0] : a.matches;
            const unavailableStats = new Set(rawMatch?.match_unavailable_stats?.map((row) => row.stat_field) ?? []);

            statColumns.forEach((column) => {
                if (
                    column.field === "attack_efficiency" ||
                    column.field === "attack_kill_pct" ||
                    column.field === "reception_positive_pct" ||
                    column.field === "reception_excellent_pct" ||
                    unavailableStats.has(column.field)
                ) return;

                const value = stats[column.field as keyof typeof stats];

                if (typeof value === "number") {
                    totals[column.field] += value;
                    counts[column.field] += 1;
                }
            });

            const receptionTotal = stats.reception_total;
            if (!unavailableStats.has("reception_total") && typeof receptionTotal === "number" && receptionTotal > 0) {
                if (!unavailableStats.has("reception_positive_pct") && typeof stats.reception_positive_pct === "number") {
                    receptionPositiveCount += receptionTotal * (stats.reception_positive_pct / 100);
                    receptionPositiveTotal += receptionTotal;
                }

                if (!unavailableStats.has("reception_excellent_pct") && typeof stats.reception_excellent_pct === "number") {
                    receptionExcellentCount += receptionTotal * (stats.reception_excellent_pct / 100);
                    receptionExcellentTotal += receptionTotal;
                }
            }

            if (
                !unavailableStats.has("attack_total") &&
                !unavailableStats.has("attack_kills") &&
                typeof stats.attack_total === "number" &&
                typeof stats.attack_kills === "number"
            ) {
                attackKillPctTotal += stats.attack_total;
                attackKillPctKills += stats.attack_kills;
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
                attackEfficiencyTotal += stats.attack_total;
                attackEfficiencyKills += stats.attack_kills;
                attackEfficiencyBlocked += stats.attack_blocked;
                attackEfficiencyErrors += stats.attack_errors;
            }
        });

        const averages: Record<string, number | null> = {};
        statColumns.forEach((column) => {
            averages[column.field] =
                counts[column.field] > 0 ? totals[column.field] / counts[column.field] : null;
        });

        // Always derive attack percentages from attack totals, never from stored pct sums/averages.
        averages["attack_kill_pct"] =
            attackKillPctTotal > 0 ? (attackKillPctKills / attackKillPctTotal) * 100 : null;
        averages["attack_efficiency"] =
            attackEfficiencyTotal > 0
                ? ((attackEfficiencyKills - attackEfficiencyBlocked - attackEfficiencyErrors) /
                    attackEfficiencyTotal) *
                100
                : null;

        const weightedReceptionPositivePct =
            receptionPositiveTotal > 0
                ? (receptionPositiveCount / receptionPositiveTotal) * 100
                : null;
        const weightedReceptionExcellentPct =
            receptionExcellentTotal > 0
                ? (receptionExcellentCount / receptionExcellentTotal) * 100
                : null;

        averages["reception_positive_pct"] = weightedReceptionPositivePct;
        averages["reception_excellent_pct"] = weightedReceptionExcellentPct;
        totals["reception_positive_pct"] = weightedReceptionPositivePct ?? 0;
        totals["reception_excellent_pct"] = weightedReceptionExcellentPct ?? 0;

        return {
            totals,
            averages,
            counts,
        };
    }, [filteredAppearances, statColumns]);

    const formatStatValue = (field: string, value: number | null) => {
        if (value == null) return "";
        if (isPercentField(field)) {
            return `${Math.round(value)}%`;
        }
        return Number(value.toFixed(1)).toString();
    };

    const getSetCountFromPositions = (appearance: PlayerAppearance) => {
        const statsRows = appearance.player_match_stats ?? [];
        const stats =
            statsRows.find((row) => row?.stats_version === "ALL") ??
            statsRows.find((row) => row?.stats_version === "AM") ??
            statsRows[0];

        if (!stats) {
            return appearance.sets_played ?? 0;
        }

        const row = stats as Record<string, string | null | undefined>;
        const positions = [
            row["set1_position"],
            row["set2_position"],
            row["set3_position"],
            row["set4_position"],
            row["set5_position"],
        ];

        const count = positions.filter(
            (position) => typeof position === "string" && position.trim() !== "",
        ).length;
        return count;
    };

    const allSortedAppearances = [...appearances].sort((a, b) => {
        const aMatch = getMatch(a);
        const bMatch = getMatch(b);
        return (
            (aMatch ? new Date(aMatch.match_date).getTime() : 0) -
            (bMatch ? new Date(bMatch.match_date).getTime() : 0)
        );
    });

    const debutMatch = allSortedAppearances[0] ?? null;
    const lastMatch = allSortedAppearances[allSortedAppearances.length - 1] ?? null;

    const debutMatchRecord = debutMatch ? getMatch(debutMatch) : null;
    const lastMatchRecord = lastMatch ? getMatch(lastMatch) : null;

    const sortedAppearances = useMemo(() => {
        return [...filteredAppearances].sort((a, b) => {
            const aMatch = getMatch(a);
            const bMatch = getMatch(b);
            return (
                (aMatch ? new Date(aMatch.match_date).getTime() : 0) -
                (bMatch ? new Date(bMatch.match_date).getTime() : 0)
            );
        });
    }, [filteredAppearances]);

    const shirtNumbers = [...new Set(appearances.map((a) => a.shirt_number).filter(Boolean))].sort(
        (a, b) => Number(a) - Number(b),
    );

    const amApps = appearances.filter((a) => {
        const match = getMatch(a);
        return match?.match_type === "AM" || match?.match_type === "MAM" || match?.match_type === "VM";
    }).length;

    const age = player.birth_date
        ? Math.floor(
            (Date.now() - new Date(player.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
        )
        : null;

    const positionLabels: Record<string, string> = {
        SET: "Setter",
        OPP: "Opposite",
        OH: "Outside Hitter",
        MB: "Middle Blocker",
        LIB: "Libero",
    };

    const debutOpponent =
        currentLanguage === "et"
            ? debutMatchRecord?.opponent
            : (debutMatchRecord?.opponent_en ?? debutMatchRecord?.opponent);
    const debutCompetition =
        currentLanguage === "et"
            ? debutMatchRecord?.competition
            : (debutMatchRecord?.competition_en ?? debutMatchRecord?.competition);
    const lastOpponent =
        currentLanguage === "et"
            ? lastMatchRecord?.opponent
            : (lastMatchRecord?.opponent_en ?? lastMatchRecord?.opponent);
    const lastCompetition =
        currentLanguage === "et"
            ? lastMatchRecord?.competition
            : (lastMatchRecord?.competition_en ?? lastMatchRecord?.competition);

    const localizedPosition =
        currentLanguage === "et"
            ? (player.position_name_ee ??
                player.position_name ??
                positionLabels[player.position ?? ""] ??
                player.position ??
                "N/A")
            : (player.position_name ?? positionLabels[player.position ?? ""] ?? player.position ?? "N/A");

    const matchHistoryTitle = currentLanguage === "et" ? "Kõik mängud" : "Match History";
    const matchHistoryDateLabel = currentLanguage === "et" ? "Kuupäev" : "Date";
    const matchHistoryOpponentLabel = currentLanguage === "et" ? "Vastane" : "Opponent";
    const matchHistoryScoreLabel = currentLanguage === "et" ? "Tulemus" : "Score";
    const matchHistoryCompetitionLabel = currentLanguage === "et" ? "Võistlus" : "Competition";
    const matchHistoryPositionLabel = currentLanguage === "et" ? "Positsioon" : "Position";
    const matchHistorySetsLabel = currentLanguage === "et" ? "Geime" : "Sets";
    const minReceptionsLabel =
        currentLanguage === "et" ? "(min 10 vastuvõttu)" : "(min 10 receptions)";
    const minAttacksLabel = currentLanguage === "et" ? "(min 10 rünnakut)" : "(min 10 attacks)";

    const statFieldLabels: Record<string, string> = {
        points: t("players.statsField.points"),
        break_points: t("players.statsField.breakPoints"),
        plus_minus: t("players.statsField.plusMinus"),
        serve_total: t("players.statsField.serveTotal"),
        serve_aces: t("players.statsField.serveAces"),
        serve_errors: t("players.statsField.serveErrors"),
        reception_total: t("players.statsField.receptionTotal"),
        reception_errors: t("players.statsField.receptionErrors"),
        reception_positive_pct: `${t("players.statsField.receptionPositivePct")} ${minReceptionsLabel}`,
        reception_excellent_pct: `${t("players.statsField.receptionExcellentPct")} ${minReceptionsLabel}`,
        attack_total: t("players.statsField.attackTotal"),
        attack_errors: t("players.statsField.attackErrors"),
        attack_blocked: t("players.statsField.attackBlocked"),
        attack_kills: t("players.statsField.attackKills"),
        attack_kill_pct: `${t("players.statsField.attackKillPct")} ${minAttacksLabel}`,
        attack_efficiency: `${t("players.statsField.attackEfficiency")} ${minAttacksLabel}`,
        block_points: t("players.statsField.blockPoints"),
    };

    const gameHighRows = useMemo<
        Array<{
            field: (typeof statColumns)[number]["field"];
            label: string;
            best: {
                value: number;
                appearance: PlayerAppearance;
                match: MatchRecord;
            } | null;
            topTen: Array<{
                value: number;
                appearance: PlayerAppearance;
                match: MatchRecord;
            }>;
        }>
    >(() => {
        return statColumns.map((column) => {
            const ranked: Array<{
                value: number;
                appearance: PlayerAppearance;
                match: MatchRecord;
            }> = [];

            filteredAppearances.forEach((appearance) => {
                const match = getMatch(appearance);
                if (!match) return;

                const stats = pickStatsRowForMode(appearance.player_match_stats);
                if (!stats) return;

                const receptionAttempts =
                    typeof stats.reception_total === "number" ? stats.reception_total : 0;
                const attackAttempts = typeof stats.attack_total === "number" ? stats.attack_total : 0;

                if (
                    (column.field === "reception_positive_pct" ||
                        column.field === "reception_excellent_pct") &&
                    receptionAttempts < 10
                ) {
                    return;
                }

                if (
                    (column.field === "attack_kill_pct" || column.field === "attack_efficiency") &&
                    attackAttempts < 10
                ) {
                    return;
                }

                let value: number | null = null;
                if (column.field === "attack_efficiency") {
                    value = computeAttackEff(stats);
                } else if (column.field === "attack_kill_pct") {
                    if (typeof stats.attack_kill_pct === "number") {
                        value = stats.attack_kill_pct;
                    } else if (
                        typeof stats.attack_total === "number" &&
                        stats.attack_total > 0 &&
                        typeof stats.attack_kills === "number"
                    ) {
                        value = (stats.attack_kills / stats.attack_total) * 100;
                    }
                } else {
                    const raw = stats[column.field as keyof typeof stats];
                    value = typeof raw === "number" ? raw : null;
                }

                if (value == null) return;

                ranked.push({ value, appearance, match });
            });

            ranked.sort((left, right) => {
                if (right.value !== left.value) {
                    return right.value - left.value;
                }

                return (
                    new Date(right.match.match_date).getTime() -
                    new Date(left.match.match_date).getTime()
                );
            });

            const topTen = ranked.slice(0, 10);

            return {
                field: column.field,
                label: statFieldLabels[column.field] ?? column.field,
                best: topTen[0] ?? null,
                topTen,
            };
        });
    }, [filteredAppearances, statColumns, currentLanguage]);

    return (
        <div>
            <header className="bg-estonia-dark px-4 py-10 text-white sm:px-6 sm:py-12 lg:px-14">
                <div className="mx-auto max-w-[1480px]">
                    <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_320px] xl:grid-cols-[240px_minmax(0,1fr)_360px] xl:gap-8">
                        <img
                            src={
                                player.photo_url ??
                                `https://lrdblxldprvfylcyoxvb.supabase.co/storage/v1/object/public/player-photos/${player.player_id}.jpg`
                            }
                            alt={`${player.first_name} ${player.last_name}`}
                            className="mx-auto h-56 w-44 rounded-2xl border-2 border-white/20 object-cover sm:h-64 sm:w-48 lg:mx-0"
                        />
                        <div>
                            <h1 className="text-center font-display text-4xl uppercase italic sm:text-5xl lg:text-left">
                                {player.first_name} {player.last_name}
                            </h1>

                            <div className="mt-6 grid gap-x-10 gap-y-4 text-white/80 md:grid-cols-2">
                                <div className="space-y-5">
                                    <div>
                                        <div className="text-xs uppercase tracking-widest text-white/50">
                                            {t("players.position")}
                                        </div>
                                        <div className="mt-1">🏐 {localizedPosition}</div>
                                    </div>

                                    <div>
                                        <div className="text-xs uppercase tracking-widest text-white/50">
                                            {t("players.height")}
                                        </div>
                                        <div className="mt-1">
                                            📏 {player.height_cm ? `${player.height_cm} cm` : "N/A"}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs uppercase tracking-widest text-white/50">
                                            {t("players.birth_date")}
                                        </div>
                                        <div className="mt-1">
                                            🎂{" "}
                                            {player.birth_date
                                                ? new Date(player.birth_date).toLocaleDateString("en-GB")
                                                : "N/A"}
                                            {age ? ` (${age})` : ""}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    <div>
                                        <div className="text-xs uppercase tracking-widest text-white/50">
                                            {t("players.place_of_birth")}
                                        </div>
                                        <div className="mt-1">
                                            📍 {player.place_of_birth ?? "N/A"}
                                            {player.birth_county ? `, ${player.birth_county}` : ""}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs uppercase tracking-widest text-white/50">
                                            {t("players.handedness")}
                                        </div>
                                        <div className="mt-1">✋ {player.handedness ?? "N/A"}</div>
                                    </div>

                                    <div>
                                        <div className="text-xs uppercase tracking-widest text-white/50">
                                            {t("players.shirt_numbers")}
                                        </div>
                                        <div className="mt-1">
                                            👕 {shirtNumbers.length > 0 ? shirtNumbers.join(", ") : "N/A"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 lg:justify-self-end lg:w-full lg:max-w-[360px]">
                            <InfoCard
                                title={t("players.national_team_debut")}
                                date={debutMatchRecord?.match_date}
                                opponent={debutOpponent ?? undefined}
                                competition={debutCompetition ?? undefined}
                            />

                            <InfoCard
                                title={t("players.last_match")}
                                date={lastMatchRecord?.match_date}
                                opponent={lastOpponent ?? undefined}
                                competition={lastCompetition ?? undefined}
                            />
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-[1480px] px-4 py-8 sm:px-6 sm:py-10 lg:px-14">
                <section className="mb-10 rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm sm:p-6">
                    <div className="sticky top-24 z-40 -mx-2 mb-6 grid gap-2 rounded-2xl bg-slate-50/95 px-2 py-2 shadow-sm backdrop-blur sm:top-[4.25rem]">
                        <div className="grid grid-cols-3 gap-2">
                            {(["official", "competitive", "all"] as const).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setStatsMode(mode)}
                                    className={`rounded-full border px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${statsMode === mode ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"}`}
                                >
                                    {t(
                                        `common.${mode === "official" ? "official" : mode === "competitive" ? "competitive" : "allMatches"}`,
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="grid gap-2 sm:grid-cols-3">
                            <div>
                                <span className="sr-only">{t("players.statsFilter.year")}</span>
                                <MultiSelect
                                    options={yearOptions.map((y) => ({ value: y, label: y }))}
                                    value={selectedYear}
                                    onChange={(v) =>
                                        setSelectedYear(v.length === 0 ? ["all"] : v.includes("all") ? ["all"] : v)
                                    }
                                    placeholder={t("players.statsFilter.allYears")}
                                    className="w-full"
                                />
                            </div>

                            <div>
                                <span className="sr-only">{t("players.statsFilter.competition")}</span>
                                <MultiSelect
                                    options={competitionOptions.map((c) => ({ value: c, label: c }))}
                                    value={selectedCompetition}
                                    onChange={(v) =>
                                        setSelectedCompetition(
                                            v.length === 0 ? ["all"] : v.includes("all") ? ["all"] : v,
                                        )
                                    }
                                    placeholder={t("players.statsFilter.allCompetitions")}
                                    className="w-full"
                                />
                            </div>

                            <div>
                                <span className="sr-only">{t("players.statsFilter.opponent")}</span>
                                <MultiSelect
                                    options={opponentOptions.map((o) => ({ value: o, label: o }))}
                                    value={selectedOpponent}
                                    onChange={(v) =>
                                        setSelectedOpponent(v.length === 0 ? ["all"] : v.includes("all") ? ["all"] : v)
                                    }
                                    placeholder={t("players.statsFilter.allOpponents")}
                                    className="w-full"
                                />
                            </div>
                        </div>
                        <div className="mt-2">
                            <label className="sr-only">{t("players.statsFilter.matches")}</label>
                            <MultiSelect
                                options={matchOptions.map((m) => ({ value: String(m.id), label: m.label }))}
                                value={selectedMatches}
                                onChange={(v) => setSelectedMatches(v)}
                                placeholder={t("players.statsFilter.matches")}
                                className="w-full"
                                maxDisplay={2}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <table className="w-full table-fixed border-collapse">
                            <thead className="bg-slate-50">
                                <tr className="border-b-2 border-slate-300">
                                    <th
                                        rowSpan={2}
                                        className="sticky left-0 z-10 border-r-2 border-slate-300 bg-slate-50 px-3 py-2 text-left text-[9px] font-bold uppercase tracking-[0.16em] text-slate-600"
                                    ></th>

                                    <th
                                        colSpan={3}
                                        className="border-r-2 border-slate-300 px-1.5 py-2 text-center text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500"
                                    ></th>

                                    <th
                                        colSpan={3}
                                        className="border-r-2 border-slate-300 px-1.5 py-2 text-center text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500"
                                    >
                                        {t("players.statsGroup.serve")}
                                    </th>

                                    <th
                                        colSpan={4}
                                        className="border-r-2 border-slate-300 px-1.5 py-2 text-center text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500"
                                    >
                                        {t("players.statsGroup.reception")}
                                    </th>

                                    <th
                                        colSpan={6}
                                        className="border-r-2 border-slate-300 px-1.5 py-2 text-center text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500"
                                    >
                                        {t("players.statsGroup.attack")}
                                    </th>

                                    <th
                                        colSpan={1}
                                        className="px-1.5 py-2 text-center text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500"
                                    >
                                        {t("players.statsGroup.blocks")}
                                    </th>
                                </tr>

                                <tr className="border-b-2 border-slate-300">
                                    {statColumns.map((column) => (
                                        <th
                                            key={column.field}
                                            className={`whitespace-nowrap px-1.5 py-2 text-center text-[9px] font-bold uppercase tracking-[0.16em] text-slate-600 ${column.field === "plus_minus" || column.field === "serve_errors" || column.field === "reception_excellent_pct" || column.field === "attack_efficiency" ? "border-r-2 border-slate-300" : "border-r border-slate-200"}`}
                                        >
                                            {column.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                <tr className="bg-slate-50 font-semibold text-slate-700">
                                    <td className="sticky left-0 z-10 border-r-2 border-slate-300 bg-inherit px-3 py-2 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-slate-700">
                                        AVG
                                    </td>
                                    {statColumns.map((column) => (
                                        <td
                                            key={`${column.field}-avg`}
                                            className={`whitespace-nowrap px-1.5 py-2 text-center text-xs text-slate-700 ${column.field === "plus_minus" || column.field === "serve_errors" || column.field === "reception_excellent_pct" || column.field === "attack_efficiency" ? "border-r-2 border-slate-300" : "border-r border-slate-200"}`}
                                        >
                                            {formatStatValue(column.field, filteredSummary.averages[column.field])}
                                        </td>
                                    ))}
                                </tr>

                                <tr className="bg-white font-semibold text-slate-700">
                                    <td className="sticky left-0 z-10 border-r-2 border-slate-300 bg-inherit px-3 py-2 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-slate-700">
                                        TOT
                                    </td>
                                    {statColumns.map((column) => (
                                        <td
                                            key={`${column.field}-tot`}
                                            className={`whitespace-nowrap px-1.5 py-2 text-center text-xs text-slate-700 ${column.field === "plus_minus" || column.field === "serve_errors" || column.field === "reception_excellent_pct" || column.field === "attack_efficiency" ? "border-r-2 border-slate-300" : "border-r border-slate-200"}`}
                                        >
                                            {formatStatValue(
                                                column.field,
                                                isPercentField(column.field)
                                                    ? filteredSummary.averages[column.field]
                                                    : filteredSummary.counts[column.field] > 0
                                                        ? filteredSummary.totals[column.field]
                                                        : null,
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-4 mb-2 flex justify-center gap-2">
                        <button
                            type="button"
                            className="rounded-full border border-slate-900 bg-slate-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white"
                        >
                            {currentLanguage === "et" ? "Ühe mängu parimad" : "Game Highs"}
                        </button>
                    </div>

                    <div className="mt-4 overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <table className="w-full min-w-[980px] border-collapse">
                            <thead className="bg-slate-50">
                                <tr className="border-b border-slate-200">
                                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
                                        {t("players.statsField.stat")}
                                    </th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
                                        {t("gameHighs.table.value")}
                                    </th>
                                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
                                        {t("gameHighs.table.opponent")}
                                    </th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
                                        {t("gameHighs.table.score")}
                                    </th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
                                        {t("gameHighs.table.date")}
                                    </th>
                                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
                                        {t("gameHighs.table.competition")}
                                    </th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
                                        TOP 10
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {gameHighRows.map((item) => {
                                    const best = item.best;
                                    const match = best?.match;
                                    const appearance = best?.appearance;
                                    const scoreTarget =
                                        match?.match_type === "MAM" ? "/match/$matchId/all" : "/match/$matchId";
                                    const resultStyle =
                                        match && match.estonia_sets > match.opponent_sets
                                            ? "text-estonia-blue"
                                            : match && match.estonia_sets === match.opponent_sets
                                                ? "text-green-700"
                                                : "text-red-700";

                                    return (
                                        <Fragment key={item.field}>
                                            <tr className="border-t border-slate-100">
                                                <td className="px-3 py-2 text-sm text-slate-700">{item.label}</td>
                                                <td className="px-3 py-2 text-center text-sm font-semibold text-estonia-dark">
                                                    {best ? formatStatValue(item.field, best.value) : "—"}
                                                </td>
                                                <td className="px-3 py-2 text-sm text-slate-700">
                                                    {match ? getLocalizedOpponent(match) : "—"}
                                                </td>
                                                <td className="px-3 py-2 text-center text-sm">
                                                    {match && appearance ? (
                                                        <Link
                                                            to={scoreTarget}
                                                            params={{
                                                                matchId: String(appearance.match_id),
                                                            }}
                                                            className={`font-semibold hover:underline ${resultStyle}`}
                                                        >
                                                            {match.estonia_sets}-{match.opponent_sets}
                                                        </Link>
                                                    ) : (
                                                        "—"
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-center text-sm text-slate-700">
                                                    {match ? new Date(match.match_date).toLocaleDateString("en-GB") : "—"}
                                                </td>
                                                <td className="px-3 py-2 text-sm text-slate-700">
                                                    {match ? (getLocalizedCompetition(match) ?? "—") : "—"}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    {item.topTen.length > 0 ? (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setExpandedGameHighMetric((current) =>
                                                                    current === item.field ? null : item.field,
                                                                )
                                                            }
                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-base font-bold text-slate-800 transition hover:border-estonia-blue hover:text-estonia-blue"
                                                            aria-label="Toggle top 10"
                                                            title="Toggle top 10"
                                                        >
                                                            {expandedGameHighMetric === item.field ? "▴" : "▾"}
                                                        </button>
                                                    ) : (
                                                        <span className="text-slate-300">—</span>
                                                    )}
                                                </td>
                                            </tr>

                                            {expandedGameHighMetric === item.field && (
                                                <tr className="border-t border-slate-100 bg-slate-50/50">
                                                    <td colSpan={7} className="p-3">
                                                        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                                            <table className="min-w-[760px] w-full border-collapse">
                                                                <thead className="bg-slate-50">
                                                                    <tr>
                                                                        <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                                                            #
                                                                        </th>
                                                                        <th className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                                                            {t("gameHighs.table.value")}
                                                                        </th>
                                                                        <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                                                            {t("gameHighs.table.opponent")}
                                                                        </th>
                                                                        <th className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                                                            {t("gameHighs.table.score")}
                                                                        </th>
                                                                        <th className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                                                            {t("gameHighs.table.date")}
                                                                        </th>
                                                                        <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                                                            {t("gameHighs.table.competition")}
                                                                        </th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {item.topTen.map((entry, index) => {
                                                                        const topMatch = entry.match;
                                                                        const topAppearance = entry.appearance;
                                                                        const topScoreTarget =
                                                                            topMatch.match_type === "MAM"
                                                                                ? "/match/$matchId/all"
                                                                                : "/match/$matchId";
                                                                        const topResultStyle =
                                                                            topMatch.estonia_sets > topMatch.opponent_sets
                                                                                ? "text-estonia-blue"
                                                                                : topMatch.estonia_sets === topMatch.opponent_sets
                                                                                    ? "text-green-700"
                                                                                    : "text-red-700";

                                                                        return (
                                                                            <tr key={`${item.field}-${topAppearance.appearance_id}-${index}`} className="border-t border-slate-100">
                                                                                <td className="px-2 py-2 text-sm text-slate-600">
                                                                                    #{index + 1}
                                                                                </td>
                                                                                <td className="px-2 py-2 text-center text-sm font-semibold text-estonia-dark">
                                                                                    {formatStatValue(item.field, entry.value)}
                                                                                </td>
                                                                                <td className="px-2 py-2 text-sm text-slate-700">
                                                                                    {getLocalizedOpponent(topMatch)}
                                                                                </td>
                                                                                <td className="px-2 py-2 text-center text-sm">
                                                                                    <Link
                                                                                        to={topScoreTarget}
                                                                                        params={{ matchId: String(topAppearance.match_id) }}
                                                                                        className={`font-semibold hover:underline ${topResultStyle}`}
                                                                                    >
                                                                                        {topMatch.estonia_sets}-{topMatch.opponent_sets}
                                                                                    </Link>
                                                                                </td>
                                                                                <td className="px-2 py-2 text-center text-sm text-slate-700">
                                                                                    {new Date(topMatch.match_date).toLocaleDateString("en-GB")}
                                                                                </td>
                                                                                <td className="px-2 py-2 text-sm text-slate-700">
                                                                                    {getLocalizedCompetition(topMatch) ?? "—"}
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>

                <h2 className="mb-6 text-center font-display text-3xl uppercase italic">{matchHistoryTitle}</h2>

                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                    <table className="w-full min-w-[980px] border-collapse">
                        <thead className="bg-slate-50">
                            <tr className="border-b border-slate-200">
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">#</th>
                                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{matchHistoryDateLabel}</th>
                                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{matchHistoryOpponentLabel}</th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{matchHistoryScoreLabel}</th>
                                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{matchHistoryCompetitionLabel}</th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{matchHistoryPositionLabel}</th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{matchHistorySetsLabel}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedAppearances.map((a, index) => {
                                const match = getMatch(a);
                                if (!match) return null;

                                const scoreTarget =
                                    match.match_type === "MAM" ? "/match/$matchId/all" : "/match/$matchId";
                                const resultStyle =
                                    match.estonia_sets > match.opponent_sets
                                        ? "text-estonia-blue"
                                        : match.estonia_sets === match.opponent_sets
                                            ? "text-green-700"
                                            : "text-red-700";

                                return (
                                    <tr key={a.appearance_id} className="border-t border-slate-100">
                                        <td className="px-3 py-2.5 text-center text-sm text-slate-500">{index + 1}</td>
                                        <td className="px-3 py-2.5 text-sm text-slate-700">
                                            {new Date(match.match_date).toLocaleDateString("en-GB")}
                                        </td>
                                        <td className="px-3 py-2.5 text-sm text-slate-700">{getLocalizedOpponent(match)}</td>
                                        <td className="px-3 py-2.5 text-center text-sm">
                                            <Link
                                                to={scoreTarget}
                                                params={{
                                                    matchId: String(a.match_id),
                                                }}
                                                className={`font-semibold hover:underline ${resultStyle}`}
                                            >
                                                {match.estonia_sets}–{match.opponent_sets}
                                            </Link>
                                        </td>
                                        <td className="px-3 py-2.5 text-sm text-slate-700">{getLocalizedCompetition(match) ?? "—"}</td>
                                        <td className="px-3 py-2.5 text-center text-sm text-slate-700">{a.player_position_in_match ?? "—"}</td>
                                        <td className="px-3 py-2.5 text-center text-sm text-slate-700">{getSetCountFromPositions(a)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}

function InfoCard({
    title,
    date,
    opponent,
    competition,
}: {
    title: string;
    date?: string;
    opponent?: string;
    competition?: string;
}) {
    return (
        <div className="rounded-lg border border-white/20 bg-white/5 p-3">
            <div className="text-center text-[12px] uppercase tracking-[0.2em] text-white/60">
                {title}
            </div>

            <div className="mt-2 text-center">
                <div className="font-semibold">
                    {date ? new Date(date).toLocaleDateString("en-GB") : "N/A"}
                </div>

                <div className="mt-1 text-sm text-white/80">{opponent ? `vs ${opponent}` : "N/A"}</div>

                <div className="mt-1 text-xs text-white/60">{competition ?? "N/A"}</div>
            </div>
        </div>
    );
}
