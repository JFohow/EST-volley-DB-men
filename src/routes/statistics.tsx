import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import MultiSelect from "@/components/ui/multi-select";
import {
    addStats,
    createGroup,
    firstRelation,
    formatDisplayValue,
    getDisplayValue,
    pickAppearanceStats,
    statisticsOptions,
    type StatisticsAppearanceRow,
    type StatisticsMatchRow,
    type PlayerStatisticsRow,
    type StatisticsField,
    type StatisticsMode,
} from "@/lib/statistics.queries";
import { getUnavailableStatSet } from "@/lib/match-unavailable-stats";
import { useTranslation } from "react-i18next";

type SortField = StatisticsField | "name" | "sets" | "setsStarted";
type DisplayMode = "total" | "perGame";

const columns: Array<{ field: StatisticsField; label: string }> = [
    { field: "points", label: "PTS" },
    { field: "break_points", label: "BP" },
    { field: "plus_minus", label: "W-P" },
    { field: "serve_total", label: "Tot" },
    { field: "serve_aces", label: "Ace" },
    { field: "serve_errors", label: "Err" },
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
];

const modes: StatisticsMode[] = ["official", "competitive", "nonCompetitive", "all"];
const percentageFields = new Set<StatisticsField>([
    "reception_positive_pct",
    "reception_excellent_pct",
    "attack_kill_pct",
    "attack_efficiency",
]);

function getPerGameRawValue(group: ReturnType<typeof createGroup>, field: StatisticsField): number | null {
    if (group.appearances <= 0) {
        return null;
    }

    if (percentageFields.has(field)) {
        return getDisplayValue(group, field);
    }

    return getDisplayValue(group, field) / group.appearances;
}

function formatPerGameDisplayValue(group: ReturnType<typeof createGroup>, field: StatisticsField): string {
    const value = getPerGameRawValue(group, field);
    if (value == null) {
        return "—";
    }

    if (percentageFields.has(field)) {
        return `${Math.round(value)}%`;
    }

    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export const Route = createFileRoute("/statistics")({
    loader: ({ context }) => context.queryClient.ensureQueryData(statisticsOptions()),
    component: StatisticsPage,
});

function StatisticsPage() {
    const { t, i18n } = useTranslation();
    const { data } = useSuspenseQuery(statisticsOptions());
    const currentLanguage = i18n.language?.startsWith("et") ? "et" : "en";

    const [mode, setMode] = useState<StatisticsMode>("official");
    const [selectedPosition, setSelectedPosition] = useState<string>("ALL");
    const [selectedYear, setSelectedYear] = useState<string[]>(["all"]);
    const [selectedCompetition, setSelectedCompetition] = useState<string[]>(["all"]);
    const [selectedOpponent, setSelectedOpponent] = useState<string[]>(["all"]);
    const [selectedMatches, setSelectedMatches] = useState<string[]>([]);
    const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
    const [sortField, setSortField] = useState<SortField | "appearances">("appearances");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
    const [displayMode, setDisplayMode] = useState<DisplayMode>("total");

    const positions = useMemo(() => ["ALL", "SET", "OPP", "OH", "MB", "LIB"], []);

    const countSetsFromPositions = (stats: Record<string, unknown>) => {
        const setValues = [
            stats["set1_position"],
            stats["set2_position"],
            stats["set3_position"],
            stats["set4_position"],
            stats["set5_position"],
        ];

        return setValues.filter((value) => typeof value === "string" && value.trim() !== "").length;
    };

    const getLocalizedOpponent = (match: StatisticsMatchRow) =>
        currentLanguage === "et"
            ? match.opponent
            : match.opponent_en ?? match.opponent;

    const getLocalizedCompetition = (match: StatisticsMatchRow) =>
        currentLanguage === "et"
            ? match.competition
            : match.competition_en ?? match.competition;

    const modeFilteredAppearances = useMemo(() => {
        return data.appearances.filter((appearance) => {
            const match = firstRelation(appearance.matches);
            if (!match) return false;

            if (mode === "official") return Boolean(match.am);
            if (mode === "competitive") return Boolean(match.vm);
            if (mode === "nonCompetitive") return Boolean(match.mam);
            return true;
        });
    }, [data.appearances, mode]);

    const yearOptions = useMemo(() => {
        const values = new Set<string>();
        modeFilteredAppearances.forEach((appearance) => {
            const match = firstRelation(appearance.matches);
            if (!match) return;
            const localizedCompetition = getLocalizedCompetition(match);
            const localizedOpponent = getLocalizedOpponent(match);

            if (!selectedCompetition.includes("all") && localizedCompetition && !selectedCompetition.includes(localizedCompetition)) return;
            if (!selectedOpponent.includes("all") && localizedOpponent && !selectedOpponent.includes(localizedOpponent)) return;

            values.add(new Date(match.match_date).getFullYear().toString());
        });
        return [...values].sort((a, b) => Number.parseInt(b, 10) - Number.parseInt(a, 10));
    }, [modeFilteredAppearances, selectedCompetition, selectedOpponent, currentLanguage]);

    const competitionOptions = useMemo(() => {
        const values = new Set<string>();
        modeFilteredAppearances.forEach((appearance) => {
            const match = firstRelation(appearance.matches);
            if (!match) return;
            const localizedCompetition = getLocalizedCompetition(match);
            const localizedOpponent = getLocalizedOpponent(match);

            if (!selectedYear.includes("all")) {
                const year = new Date(match.match_date).getFullYear().toString();
                if (!selectedYear.includes(year)) return;
            }
            if (!selectedOpponent.includes("all") && localizedOpponent && !selectedOpponent.includes(localizedOpponent)) return;

            if (localizedCompetition) values.add(localizedCompetition);
        });
        return [...values].sort();
    }, [modeFilteredAppearances, selectedYear, selectedOpponent, currentLanguage]);

    const opponentOptions = useMemo(() => {
        const values = new Set<string>();
        modeFilteredAppearances.forEach((appearance) => {
            const match = firstRelation(appearance.matches);
            if (!match) return;
            const localizedCompetition = getLocalizedCompetition(match);
            const localizedOpponent = getLocalizedOpponent(match);

            if (!selectedYear.includes("all")) {
                const year = new Date(match.match_date).getFullYear().toString();
                if (!selectedYear.includes(year)) return;
            }
            if (!selectedCompetition.includes("all") && localizedCompetition && !selectedCompetition.includes(localizedCompetition)) return;

            if (localizedOpponent) values.add(localizedOpponent);
        });
        return [...values].sort();
    }, [modeFilteredAppearances, selectedYear, selectedCompetition, currentLanguage]);

    const matchOptions = useMemo(() => {
        const values: Array<{ id: number; label: string; matchDate: string }> = [];
        const seen = new Set<number>();
        modeFilteredAppearances.forEach((appearance) => {
            const match = firstRelation(appearance.matches);
            if (!match) return;
            const localizedCompetition = getLocalizedCompetition(match);
            const localizedOpponent = getLocalizedOpponent(match);

            if (!selectedYear.includes("all")) {
                const year = new Date(match.match_date).getFullYear().toString();
                if (!selectedYear.includes(year)) return;
            }
            if (!selectedCompetition.includes("all") && localizedCompetition && !selectedCompetition.includes(localizedCompetition)) return;
            if (!selectedOpponent.includes("all") && localizedOpponent && !selectedOpponent.includes(localizedOpponent)) return;

            if (!seen.has(match.match_id)) {
                seen.add(match.match_id);
                const dateLabel = new Date(match.match_date).toLocaleDateString("en-GB");
                const scoreLabel = `${match.estonia_sets}-${match.opponent_sets}`;
                values.push({
                    id: match.match_id,
                    label: `${dateLabel} | ${localizedOpponent} | ${scoreLabel}`,
                    matchDate: match.match_date,
                });
            }
        });

        return values.sort(
            (left, right) =>
                new Date(right.matchDate).getTime() - new Date(left.matchDate).getTime()
        );
    }, [modeFilteredAppearances, selectedYear, selectedCompetition, selectedOpponent, currentLanguage]);

    useEffect(() => {
        const allowedIds = new Set(matchOptions.map((m) => String(m.id)));
        setSelectedMatches((current) => current.filter((id) => allowedIds.has(id)));
    }, [matchOptions]);

    const filteredAppearances = useMemo(() => {
        return modeFilteredAppearances.filter((appearance) => {
            const match = firstRelation(appearance.matches);
            if (!match) return false;
            const localizedCompetition = getLocalizedCompetition(match);
            const localizedOpponent = getLocalizedOpponent(match);

            if (!selectedYear.includes("all") && selectedYear.length > 0) {
                const year = new Date(match.match_date).getFullYear().toString();
                if (!selectedYear.includes(year)) return false;
            }

            if (!selectedCompetition.includes("all") && selectedCompetition.length > 0) {
                if (!localizedCompetition || !selectedCompetition.includes(localizedCompetition)) return false;
            }

            if (!selectedOpponent.includes("all") && selectedOpponent.length > 0) {
                if (!localizedOpponent || !selectedOpponent.includes(localizedOpponent)) return false;
            }

            if (selectedMatches.length > 0 && !selectedMatches.includes(String(match.match_id))) {
                return false;
            }

            return true;
        });
    }, [modeFilteredAppearances, selectedYear, selectedCompetition, selectedOpponent, selectedMatches, currentLanguage]);

    const playerOptions = useMemo(() => {
        const values = new Map<number, string>();

        filteredAppearances.forEach((appearance) => {
            if (!values.has(appearance.player_id)) {
                const player = data.players.find((item) => item.player_id === appearance.player_id);
                if (!player) return;
                values.set(player.player_id, `${player.first_name} ${player.last_name}`);
            }
        });

        return Array.from(values.entries())
            .map(([id, label]) => ({ value: String(id), label }))
            .sort((left, right) => left.label.localeCompare(right.label));
    }, [data.players, filteredAppearances]);

    useEffect(() => {
        const allowedIds = new Set(playerOptions.map((player) => player.value));
        setSelectedPlayers((current) => current.filter((id) => allowedIds.has(id)));
    }, [playerOptions]);

    const rows = useMemo(() => {
        const rowMap = new Map<number, { row: PlayerStatisticsRow; perGameGroup: ReturnType<typeof createGroup> }>();
        const hasActiveDetailFilters =
            !selectedYear.includes("all") ||
            !selectedCompetition.includes("all") ||
            !selectedOpponent.includes("all") ||
            selectedMatches.length > 0 ||
            selectedPlayers.length > 0;

        data.players
            .filter((player) => selectedPosition === "ALL" || player.position === selectedPosition)
            .filter((player) =>
                selectedPlayers.length === 0 ? true : selectedPlayers.includes(String(player.player_id))
            )
            .forEach((player) => {
                rowMap.set(player.player_id, {
                    row: {
                        playerId: player.player_id,
                        name: `${player.first_name} ${player.last_name}`,
                        position: player.position,
                        official: createGroup(),
                        competitive: createGroup(),
                        nonCompetitive: createGroup(),
                        all: createGroup(),
                    },
                    perGameGroup: createGroup(),
                });
            });

        filteredAppearances.forEach((appearance: StatisticsAppearanceRow) => {
            const entry = rowMap.get(appearance.player_id);
            if (!entry) return;

            const row = entry.row;
            row[mode].appearances += 1;
            const stats = pickAppearanceStats(appearance.player_match_stats, mode);
            const unavailableStats = getUnavailableStatSet(
                firstRelation(appearance.matches)?.match_unavailable_stats,
            );
            const setsFromPositions = stats
                ? countSetsFromPositions(stats as Record<string, unknown>)
                : 0;

            // Some imported rows have sets_started and sets_played as 0 even when
            // per-set positions are present. Use positions as a fallback for that case.
            const usePositionFallback =
                appearance.sets_started === 0 &&
                (appearance.sets_played ?? 0) === 0 &&
                setsFromPositions > 0;

            const appearanceSetsStarted =
                typeof appearance.sets_started === "number" && appearance.sets_started >= 0
                    ? Math.min(usePositionFallback ? setsFromPositions : appearance.sets_started, 6)
                    : Math.min(setsFromPositions, 6);
            row[mode].setsStarted += appearanceSetsStarted;

            if (!stats) return;

            addStats(row[mode], stats, unavailableStats);
            row[mode].sets += setsFromPositions;

            if (setsFromPositions > 0) {
                entry.perGameGroup.appearances += 1;
                entry.perGameGroup.sets += setsFromPositions;
                entry.perGameGroup.setsStarted += appearanceSetsStarted;
                addStats(entry.perGameGroup, stats, unavailableStats);
            }
        });

        const copy = Array.from(rowMap.values()).filter(({ row }) =>
            hasActiveDetailFilters ? row[mode].appearances > 0 : true
        );

        copy.sort((a, b) => {
            const rowA = a.row;
            const rowB = b.row;

            if (sortField === "name") {
                const comp = rowA.name.localeCompare(rowB.name);
                return sortDirection === "asc" ? comp : -comp;
            }

            if (sortField === "appearances") {
                const aValue = rowA[mode].appearances;
                const bValue = rowB[mode].appearances;
                return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
            }

            if (sortField === "sets") {
                const aValue = rowA[mode].sets;
                const bValue = rowB[mode].sets;
                return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
            }

            if (sortField === "setsStarted") {
                const aValue = rowA[mode].setsStarted;
                const bValue = rowB[mode].setsStarted;
                return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
            }

            const aValue =
                displayMode === "total"
                    ? getDisplayValue(rowA[mode], sortField)
                    : (getPerGameRawValue(a.perGameGroup, sortField) ?? -1);
            const bValue =
                displayMode === "total"
                    ? getDisplayValue(rowB[mode], sortField)
                    : (getPerGameRawValue(b.perGameGroup, sortField) ?? -1);
            return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
        });

        return copy;
    }, [
        data.players,
        filteredAppearances,
        mode,
        displayMode,
        sortDirection,
        sortField,
        selectedCompetition,
        selectedMatches,
        selectedOpponent,
        selectedPlayers,
        selectedPosition,
        selectedYear,
    ]);

    function handleSort(field: SortField | "appearances") {
        if (sortField === field) {
            setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
            return;
        }

        setSortField(field);
        setSortDirection(field === "name" ? "asc" : "desc");
    }

    return (
        <main className="mx-auto max-w-[1480px] px-4 py-8 sm:px-6 sm:py-10 lg:px-14">
            <div className="mb-6 rounded-2xl bg-estonia-dark p-6 text-white shadow-sm md:p-8">
                <div className="mx-auto mb-5 grid w-full max-w-[520px] grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => setDisplayMode("total")}
                        className={`h-10 w-full rounded-md border px-3 text-xs font-semibold uppercase tracking-[0.14em] transition ${displayMode === "total"
                            ? "border-estonia-blue bg-estonia-blue text-white"
                            : "border-white/30 bg-white/10 text-white/90 hover:bg-white/20"
                            }`}
                    >
                        {t("totalTop.table.totals")}
                    </button>
                    <button
                        type="button"
                        onClick={() => setDisplayMode("perGame")}
                        className={`h-10 w-full rounded-md border px-3 text-xs font-semibold uppercase tracking-[0.14em] transition ${displayMode === "perGame"
                            ? "border-estonia-blue bg-estonia-blue text-white"
                            : "border-white/30 bg-white/10 text-white/90 hover:bg-white/20"
                            }`}
                    >
                        {t("totalTop.table.perGame")}
                    </button>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                    <div className="text-center">
                        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
                            {t("gameHighs.filters.matchType")}
                        </div>
                        <div className="mx-auto grid w-full max-w-[440px] grid-cols-2 gap-2">
                            {modes.map((currentMode) => (
                                <button
                                    key={currentMode}
                                    type="button"
                                    onClick={() => setMode(currentMode)}
                                    className={`h-10 w-full rounded-md border px-3 text-xs font-semibold uppercase tracking-[0.16em] transition ${mode === currentMode
                                        ? "border-estonia-blue bg-estonia-blue text-white"
                                        : "border-white/30 bg-white/10 text-white/90 hover:bg-white/20"
                                        }`}
                                >
                                    {t(`statistics.filters.${currentMode}`)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="text-center">
                        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
                            {t("gameHighs.filters.position")}
                        </div>
                        <div className="mx-auto grid w-full max-w-[440px] grid-cols-3 gap-2">
                            {positions.map((position) => (
                                <button
                                    key={position}
                                    type="button"
                                    onClick={() => setSelectedPosition(position)}
                                    className={`h-10 w-full rounded-md border px-3 text-xs font-semibold uppercase tracking-[0.16em] transition ${selectedPosition === position
                                        ? "border-estonia-blue bg-estonia-blue text-white"
                                        : "border-white/30 bg-white/10 text-white/90 hover:bg-white/20"
                                        }`}
                                >
                                    {position === "ALL" ? "ALL" : position}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                    <div>
                        <span className="sr-only">{t("players.statsFilter.year")}</span>
                        <MultiSelect
                            options={yearOptions.map((y) => ({ value: y, label: y }))}
                            value={selectedYear}
                            onChange={(v) => setSelectedYear(v.length === 0 ? ["all"] : v.includes("all") ? ["all"] : v)}
                            placeholder={t("players.statsFilter.allYears")}
                            className="w-full"
                        />
                    </div>

                    <div>
                        <span className="sr-only">{t("players.statsFilter.competition")}</span>
                        <MultiSelect
                            options={competitionOptions.map((c) => ({ value: c, label: c }))}
                            value={selectedCompetition}
                            onChange={(v) => setSelectedCompetition(v.length === 0 ? ["all"] : v.includes("all") ? ["all"] : v)}
                            placeholder={t("players.statsFilter.allCompetitions")}
                            className="w-full"
                        />
                    </div>

                    <div>
                        <span className="sr-only">{t("players.statsFilter.opponent")}</span>
                        <MultiSelect
                            options={opponentOptions.map((o) => ({ value: o, label: o }))}
                            value={selectedOpponent}
                            onChange={(v) => setSelectedOpponent(v.length === 0 ? ["all"] : v.includes("all") ? ["all"] : v)}
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

                <div className="mt-2">
                    <label className="sr-only">{t("players.statsFilter.players")}</label>
                    <MultiSelect
                        options={playerOptions}
                        value={selectedPlayers}
                        onChange={(v) => setSelectedPlayers(v)}
                        placeholder={t("players.statsFilter.players")}
                        className="w-full"
                        maxDisplay={2}
                    />
                </div>
            </div>

            <h2 className="mb-4 text-center font-display text-2xl uppercase italic text-estonia-dark">
                {displayMode === "total"
                    ? (currentLanguage === "et" ? "Total Statistics" : "Total Statistics")
                    : (currentLanguage === "et" ? "Per Game Statistics" : "Per Game Statistics")}
            </h2>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full min-w-[1200px] border-collapse">
                    <thead className="bg-slate-50">
                        <tr className="border-b-2 border-slate-300">
                            <th rowSpan={2} className="sticky left-0 z-10 border-r-2 border-slate-300 bg-slate-50 px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
                                <button
                                    type="button"
                                    onClick={() => handleSort("name")}
                                    className="inline-flex items-center gap-2"
                                >
                                    {t("statistics.table.player")}
                                    <span>{sortField === "name" ? (sortDirection === "asc" ? "↑" : "↓") : "⇅"}</span>
                                </button>
                            </th>

                            <th rowSpan={2} className="border-r-2 border-slate-300 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
                                <button
                                    type="button"
                                    onClick={() => handleSort("appearances")}
                                    className="inline-flex items-center gap-1"
                                >
                                    {t("statistics.table.appearances")}
                                    <span>{sortField === "appearances" ? (sortDirection === "asc" ? "↑" : "↓") : "⇅"}</span>
                                </button>
                            </th>

                            <th rowSpan={2} className="border-r-2 border-slate-300 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
                                <button
                                    type="button"
                                    onClick={() => handleSort("sets")}
                                    className="inline-flex items-center gap-1"
                                >
                                    {t("statistics.table.sets")}
                                    <span>{sortField === "sets" ? (sortDirection === "asc" ? "↑" : "↓") : "⇅"}</span>
                                </button>
                            </th>

                            <th rowSpan={2} className="border-r-2 border-slate-300 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
                                <button
                                    type="button"
                                    onClick={() => handleSort("setsStarted")}
                                    className="inline-flex items-center gap-1"
                                >
                                    {t("statistics.table.setsStarted")}
                                    <span>{sortField === "setsStarted" ? (sortDirection === "asc" ? "↑" : "↓") : "⇅"}</span>
                                </button>
                            </th>

                            <th colSpan={3} className="border-r-2 border-slate-300 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500"></th>

                            <th colSpan={3} className="border-r-2 border-slate-300 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                                {t("statistics.table.serve")}
                            </th>

                            <th colSpan={4} className="border-r-2 border-slate-300 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                                {t("statistics.table.reception")}
                            </th>

                            <th colSpan={6} className="border-r-2 border-slate-300 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                                {t("statistics.table.attack")}
                            </th>

                            <th colSpan={1} className="px-2 py-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                                {t("statistics.table.block")}
                            </th>
                        </tr>

                        <tr className="border-b-2 border-slate-300">

                            {columns.map((column) => (
                                <th
                                    key={`${column.field}-${column.label}`}
                                    className={`whitespace-nowrap px-2 py-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600 ${column.field === "plus_minus" || column.field === "serve_errors" || column.field === "reception_excellent_pct" || column.field === "attack_efficiency"
                                        ? "border-r-2 border-slate-300"
                                        : "border-r border-slate-200"
                                        }`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => handleSort(column.field)}
                                        className="inline-flex items-center gap-1 whitespace-nowrap"
                                    >
                                        {column.label}
                                        <span>{sortField === column.field ? (sortDirection === "asc" ? "↑" : "↓") : "⇅"}</span>
                                    </button>
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                        {rows.map(({ row, perGameGroup }, idx) => (
                            <PlayerStatisticsTableRow
                                key={row.playerId}
                                row={row}
                                perGameGroup={perGameGroup}
                                mode={mode}
                                displayMode={displayMode}
                                index={idx}
                            />
                        ))}
                    </tbody>
                </table>

                {rows.length === 0 && (
                    <div className="p-8 text-center text-sm text-slate-500">{t("statistics.empty")}</div>
                )}
            </div>
        </main>
    );
}

function PlayerStatisticsTableRow({
    row,
    perGameGroup,
    mode,
    displayMode,
    index,
}: {
    row: PlayerStatisticsRow;
    perGameGroup: ReturnType<typeof createGroup>;
    mode: StatisticsMode;
    displayMode: DisplayMode;
    index: number;
}) {
    const group = row[mode];

    return (
        <tr className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}>
            <td className="sticky left-0 z-10 border-r-2 border-slate-300 bg-inherit px-4 py-3 text-sm font-semibold text-slate-900">
                <a href={`/players/${row.playerId}`} className="text-estonia-dark underline-offset-2 hover:text-estonia-blue hover:underline">
                    {row.name}
                </a>
            </td>

            <td className="border-r-2 border-slate-300 px-2 py-3 text-center text-sm text-slate-700">
                {group.appearances}
            </td>

            <td className="border-r-2 border-slate-300 px-2 py-3 text-center text-sm text-slate-700">
                {group.sets}
            </td>

            <td className="border-r-2 border-slate-300 px-2 py-3 text-center text-sm text-slate-700">
                {group.setsStarted}
            </td>

            {columns.map((column) => (
                <td
                    key={`${column.field}-${column.label}`}
                    className={`whitespace-nowrap px-2 py-3 text-center text-sm text-slate-700 ${column.field === "plus_minus" || column.field === "serve_errors" || column.field === "reception_excellent_pct" || column.field === "attack_efficiency"
                        ? "border-r-2 border-slate-300"
                        : "border-r border-slate-200"
                        }`}
                >
                    {displayMode === "total"
                        ? formatDisplayValue(group, column.field)
                        : formatPerGameDisplayValue(perGameGroup, column.field)}
                </td>
            ))}
        </tr>
    );
}
