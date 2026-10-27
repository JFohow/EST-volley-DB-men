import { useSuspenseQuery } from "@tanstack/react-query";
import { Fragment, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { totalTopOptions, type PlayerTotals } from "@/lib/total-top.queries";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import MultiSelect from "@/components/ui/multi-select";
import {
    addStatCoverage,
    createStatCoverage,
    type UnavailableStatField,
} from "@/lib/match-unavailable-stats";
import { useTranslation } from "react-i18next";

const positionOrder = ["SET", "OPP", "OH", "MB", "LIB"];

type TotalTopStatKey =
    | "appearances"
    | "matchesNotPlayed"
    | "sets"
    | "setsStarted"
    | "setsBench"
    | "points"
    | "blockPoints"
    | "plusMinus"
    | "serveTotal"
    | "serveAces"
    | "serveAcePct"
    | "serveErrors"
    | "serveErrorPct"
    | "serveErrorsLeast"
    | "serveErrorPctLeast"
    | "serveAceErrorRatio"
    | "receptionTotal"
    | "receptionErrors"
    | "receptionPositivePct"
    | "receptionPositivePctWorst"
    | "receptionExcellentPct"
    | "receptionExcellentPctWorst"
    | "attackTotal"
    | "attackErrors"
    | "attackBlocked"
    | "attackKills"
    | "attackKillPct"
    | "attackKillPctWorst"
    | "attackEfficiency"
    | "attackEfficiencyWorst"
    | "breakPoints";

type MatchType = "OFFICIAL" | "COMPETITIVE" | "NON_OFFICIAL" | "ALL";
type SortMode = "perGame" | "total";

export const Route = createFileRoute("/total-top")({
    head: () => ({
        meta: [
            { title: "Total TOP — Eesti Vorkpall DB" },
            {
                name: "description",
                content:
                    "Leaderboards for total career match statistics by position, separated across competitive, official, and all matches.",
            },
        ],
    }),
    loader: ({ context }) => context.queryClient.ensureQueryData(totalTopOptions()),
    component: TotalTopPage,
    errorComponent: TotalTopError,
});

function TotalTopError({ error, reset }: { error: Error; reset: () => void }) {
    return (
        <div className="mx-auto max-w-2xl px-6 py-24 text-center">
            <h1 className="font-display text-3xl uppercase italic">Data unavailable</h1>
            <p className="mt-2 text-sm text-muted-foreground">
                {error.message || "Could not reach the database."}
            </p>
            <button
                onClick={reset}
                className="mt-6 rounded-md bg-estonia-dark px-4 py-2 text-sm font-medium text-white hover:bg-estonia-blue"
            >
                Try again
            </button>
        </div>
    );
}

function getStatValue(group: PlayerTotals, stat: TotalTopStatKey) {
    if (stat === "serveErrorsLeast") return group.serveErrors;
    if (stat === "serveErrorPct") {
        if (group.serveErrorPctTotal <= 0) return null;
        return (group.serveErrorPctErrors / group.serveErrorPctTotal) * 100;
    }
    if (stat === "serveErrorPctLeast") {
        if (group.serveErrorPctTotal <= 0) return null;
        return (group.serveErrorPctErrors / group.serveErrorPctTotal) * 100;
    }
    if (stat === "serveAcePct") {
        if (group.serveAcePctTotal <= 0) return null;
        return (group.serveAcePctAces / group.serveAcePctTotal) * 100;
    }
    if (stat === "serveAceErrorRatio") {
        if (group.serveAces <= 0) return null;
        return group.serveErrors / group.serveAces;
    }
    if (stat === "receptionPositivePctWorst") return group.receptionPositivePct;
    if (stat === "receptionExcellentPctWorst") return group.receptionExcellentPct;
    if (stat === "attackKillPctWorst") return group.attackKillPct;
    if (stat === "attackEfficiencyWorst") return group.attackEfficiency;

    return group[stat];
}

function getPerGameValue(group: PlayerTotals, stat: TotalTopStatKey) {
    if (stat === "serveAceErrorRatio") {
        return getStatValue(group, stat);
    }

    if (
        stat === "serveAcePct" ||
        stat === "serveErrorPct" ||
        stat === "serveErrorPctLeast" ||
        stat === "attackKillPct" ||
        stat === "attackKillPctWorst" ||
        stat === "attackEfficiency" ||
        stat === "attackEfficiencyWorst" ||
        stat === "receptionPositivePct" ||
        stat === "receptionPositivePctWorst" ||
        stat === "receptionExcellentPct" ||
        stat === "receptionExcellentPctWorst"
    ) {
        return getStatValue(group, stat);
    }

    if (group.games <= 0) {
        return null;
    }

    const total = getStatValue(group, stat);
    return total == null ? null : total / group.games;
}

function isPercentageMetric(stat: TotalTopStatKey): boolean {
    return (
        stat === "serveAcePct" ||
        stat === "serveErrorPct" ||
        stat === "serveErrorPctLeast" ||
        stat === "receptionPositivePct" ||
        stat === "receptionPositivePctWorst" ||
        stat === "receptionExcellentPct" ||
        stat === "receptionExcellentPctWorst" ||
        stat === "attackKillPct" ||
        stat === "attackKillPctWorst" ||
        stat === "attackEfficiency" ||
        stat === "attackEfficiencyWorst"
    );
}

function formatMetricValue(
    stat: TotalTopStatKey,
    value: number | null | undefined,
    mode: SortMode,
) {
    if (value == null) {
        return "—";
    }

    const decimals = mode === "perGame" ? 1 : 2;
    const normalized = mode === "perGame" ? Number(value.toFixed(1)) : value;
    const valueLabel = Number.isInteger(normalized)
        ? String(normalized)
        : normalized.toFixed(decimals);

    return isPercentageMetric(stat) ? `${valueLabel}%` : valueLabel;
}

type ServeColumnKey = "serveTotal" | "serveAces" | "serveAcePct" | "serveErrors" | "serveErrorPct";
type ServeDetails = Record<ServeColumnKey, string>;

const serveColumnLabels: Record<ServeColumnKey, string> = {
    serveTotal: "S TOT",
    serveErrors: "S ERR TOT",
    serveErrorPct: "S ERR %",
    serveAces: "S ACE TOT",
    serveAcePct: "S ACE %",
};

const serveColumnOrder: ServeColumnKey[] = [
    "serveTotal",
    "serveErrors",
    "serveErrorPct",
    "serveAces",
    "serveAcePct",
];

const serveBoldColumn: Partial<Record<TotalTopStatKey, ServeColumnKey>> = {
    serveTotal: "serveTotal",
    serveAces: "serveAces",
    serveAcePct: "serveAcePct",
    serveErrors: "serveErrors",
    serveErrorsLeast: "serveErrors",
    serveErrorPct: "serveErrorPct",
    serveErrorPctLeast: "serveErrorPct",
};

const serveTiebreakDirection: Partial<Record<TotalTopStatKey, "asc" | "desc">> = {
    serveAces: "asc",
    serveAcePct: "asc",
    serveErrors: "asc",
    serveErrorPct: "asc",
    serveErrorsLeast: "desc",
    serveErrorPctLeast: "desc",
};

const serveTiebreakNotes: Partial<Record<TotalTopStatKey, { en: string; et: string }>> = {
    serveAces: {
        en: "Ties broken by S TOT: fewer serves ranks higher.",
        et: "Võrdse tulemuse korral loeb S TOT: vähem servi on parem.",
    },
    serveAcePct: {
        en: "Ties broken by S TOT: fewer serves ranks higher.",
        et: "Võrdse tulemuse korral loeb S TOT: vähem servi on parem.",
    },
    serveErrors: {
        en: "Ties broken by S TOT: fewer serves ranks higher.",
        et: "Võrdse tulemuse korral loeb S TOT: vähem servi on parem.",
    },
    serveErrorPct: {
        en: "Ties broken by S TOT: fewer serves ranks higher.",
        et: "Võrdse tulemuse korral loeb S TOT: vähem servi on parem.",
    },
    serveErrorsLeast: {
        en: "Ties broken by S TOT: more serves ranks higher.",
        et: "Võrdse tulemuse korral loeb S TOT: rohkem servi on parem.",
    },
    serveErrorPctLeast: {
        en: "Ties broken by S TOT: more serves ranks higher.",
        et: "Võrdse tulemuse korral loeb S TOT: rohkem servi on parem.",
    },
};

function getServeColumns(_metric: TotalTopStatKey): ServeColumnKey[] {
    return serveColumnOrder;
}

// The ratio has no bold serve column, so its value stays visible.
function showValueColumn(metric: TotalTopStatKey): boolean {
    return !serveMetrics.has(metric) || metric === "serveAceErrorRatio";
}

const serveMetrics = new Set<TotalTopStatKey>([
    "serveTotal",
    "serveAces",
    "serveAcePct",
    "serveErrors",
    "serveErrorPct",
    "serveErrorsLeast",
    "serveErrorPctLeast",
    "serveAceErrorRatio",
]);

const statFieldsByMetric: Partial<Record<TotalTopStatKey, UnavailableStatField[]>> = {
    points: ["points"],
    blockPoints: ["block_points"],
    plusMinus: ["plus_minus"],
    breakPoints: ["break_points"],
    serveTotal: ["serve_total"],
    serveAces: ["serve_aces"],
    serveAcePct: ["serve_total", "serve_aces"],
    serveErrors: ["serve_errors"],
    serveErrorsLeast: ["serve_errors"],
    serveErrorPct: ["serve_total", "serve_errors"],
    serveErrorPctLeast: ["serve_total", "serve_errors"],
    serveAceErrorRatio: ["serve_total", "serve_aces", "serve_errors"],
    receptionTotal: ["reception_total"],
    receptionErrors: ["reception_errors"],
    receptionPositivePct: ["reception_total", "reception_positive_pct"],
    receptionPositivePctWorst: ["reception_total", "reception_positive_pct"],
    receptionExcellentPct: ["reception_total", "reception_excellent_pct"],
    receptionExcellentPctWorst: ["reception_total", "reception_excellent_pct"],
    attackTotal: ["attack_total"],
    attackErrors: ["attack_errors"],
    attackBlocked: ["attack_blocked"],
    attackKills: ["attack_kills"],
    attackKillPct: ["attack_total", "attack_kills"],
    attackKillPctWorst: ["attack_total", "attack_kills"],
    attackEfficiency: ["attack_total", "attack_kills", "attack_blocked", "attack_errors"],
    attackEfficiencyWorst: ["attack_total", "attack_kills", "attack_blocked", "attack_errors"],
};

function hasStatCoverage(totals: PlayerTotals, metric: TotalTopStatKey): boolean {
    const fields = statFieldsByMetric[metric];
    return !fields || fields.every((field) => totals.coverage[field] > 0);
}

function getServeDetails(totals: PlayerTotals, mode: SortMode): ServeDetails {
    const count = (stat: "serveTotal" | "serveAces" | "serveErrors") =>
        mode === "perGame" ? getPerGameValue(totals, stat) : getStatValue(totals, stat);
    const detail = (metric: TotalTopStatKey, value: number | null | undefined) =>
        formatMetricValue(metric, hasStatCoverage(totals, metric) ? value : null, mode);

    return {
        serveTotal: detail("serveTotal", count("serveTotal")),
        serveAces: detail("serveAces", count("serveAces")),
        serveAcePct: detail("serveAcePct", getStatValue(totals, "serveAcePct")),
        serveErrors: detail("serveErrors", count("serveErrors")),
        serveErrorPct: detail("serveErrorPct", getStatValue(totals, "serveErrorPct")),
    };
}

function createEmptyTotals(): PlayerTotals {
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

function getSetSlotSummary(
    stats: Record<string, unknown> | null,
    totalSetsInMatch: number,
    hasPositionInfo: boolean,
): { setsPlayed: number; setsBench: number; matchNotPlayed: number } {
    const boundedSetCount = Math.min(Math.max(totalSetsInMatch, 0), 6);
    if (!stats || boundedSetCount === 0 || !hasPositionInfo) {
        return { setsPlayed: 0, setsBench: 0, matchNotPlayed: 0 };
    }

    const slots = [
        stats["set1_position"],
        stats["set2_position"],
        stats["set3_position"],
        stats["set4_position"],
        stats["set5_position"],
        stats["set6_position"],
    ].slice(0, boundedSetCount);

    const setsPlayed = slots.filter(
        (value) => typeof value === "string" && value.trim() !== "",
    ).length;
    const setsBench = boundedSetCount - setsPlayed;

    return {
        setsPlayed,
        setsBench,
        matchNotPlayed: setsPlayed === 0 ? 1 : 0,
    };
}

function matchesSelectedType(
    matchType: MatchType,
    appearance: {
        am: boolean | null;
        vm: boolean | null;
        mam: boolean | null;
    },
): boolean {
    if (matchType === "OFFICIAL") return appearance.am === true;
    if (matchType === "COMPETITIVE") return appearance.vm === true;
    if (matchType === "NON_OFFICIAL") return appearance.mam === true;
    return true;
}

function pickStatsRowForType(
    rows: Array<{ stats_version: string | null }> | null | undefined,
    matchType: MatchType,
) {
    if (!rows || rows.length === 0) {
        return null;
    }

    if (matchType === "ALL") {
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

function TotalTopPage() {
    const { t, i18n } = useTranslation();
    const { data } = useSuspenseQuery(totalTopOptions());

    const [selectedPosition, setSelectedPosition] = useState<string>("ALL");
    const [matchType, setMatchType] = useState<MatchType>("OFFICIAL");
    const [selectedYear, setSelectedYear] = useState<string[]>(["all"]);
    const [selectedCompetition, setSelectedCompetition] = useState<string[]>(["all"]);
    const [selectedOpponent, setSelectedOpponent] = useState<string[]>(["all"]);
    const [displayMode, setDisplayMode] = useState<SortMode>("total");
    const [expandedMetric, setExpandedMetric] = useState<TotalTopStatKey | null>(null);

    const positions = useMemo(() => ["ALL", ...positionOrder], []);
    const currentLanguage = i18n.language?.toLowerCase() ?? "et";
    const isEstonian = currentLanguage.startsWith("et");
    const minReceptionsLabel = isEstonian ? "(min 10 vastuvõttu)" : "(min 10 receptions)";
    const minAttacksLabel = isEstonian ? "(min 10 rünnakut)" : "(min 10 attacks)";

    const categoryLabel: Record<TotalTopStatKey, string> = {
        appearances: t("totalTop.metrics.mostAppearances"),
        matchesNotPlayed: t("totalTop.metrics.mostMatchesNotPlayed"),
        sets: t("totalTop.metrics.mostSets"),
        setsStarted: t("totalTop.metrics.mostSetsStarted"),
        setsBench: t("totalTop.metrics.mostSetsSatOnBench"),
        points: t("totalTop.metrics.mostPoints"),
        breakPoints: t("totalTop.metrics.mostBreakPoints"),
        plusMinus: t("totalTop.metrics.bestPlusMinus"),
        blockPoints: t("totalTop.metrics.mostBlockPoints"),
        serveTotal: t("totalTop.metrics.mostServes"),
        serveAces: t("totalTop.metrics.mostServeAces"),
        serveAcePct: t("totalTop.metrics.bestServeAcePct"),
        serveErrors: t("totalTop.metrics.mostServeErrors"),
        serveErrorPct: t("totalTop.metrics.biggestServeErrorPct"),
        serveErrorsLeast: t("totalTop.metrics.leastServeErrors"),
        serveErrorPctLeast: t("totalTop.metrics.smallestServeErrorPct"),
        serveAceErrorRatio: t("totalTop.metrics.aceToErrorRatio"),
        receptionTotal: t("totalTop.metrics.mostReceptions"),
        receptionErrors: t("totalTop.metrics.mostReceptionErrors"),
        receptionPositivePct: `${t("totalTop.metrics.bestReceptionPct")} ${minReceptionsLabel}`,
        receptionPositivePctWorst: `${t("totalTop.metrics.worstReceptionPct")} ${minReceptionsLabel}`,
        receptionExcellentPct: `${t("totalTop.metrics.bestIdealReceptionPct")} ${minReceptionsLabel}`,
        receptionExcellentPctWorst: `${t("totalTop.metrics.worstIdealReceptionPct")} ${minReceptionsLabel}`,
        attackTotal: t("totalTop.metrics.mostAttacks"),
        attackErrors: t("totalTop.metrics.mostAttackErrors"),
        attackBlocked: t("totalTop.metrics.mostAttackBlocks"),
        attackKills: t("totalTop.metrics.mostSuccessfulAttack"),
        attackKillPct: `${t("totalTop.metrics.bestAttackPct")} ${minAttacksLabel}`,
        attackKillPctWorst: `${t("totalTop.metrics.worstAttackPct")} ${minAttacksLabel}`,
        attackEfficiency: `${t("totalTop.metrics.bestAttackEffPct")} ${minAttacksLabel}`,
        attackEfficiencyWorst: `${t("totalTop.metrics.worstAttackEffPct")} ${minAttacksLabel}`,
    };

    const categoryGroups: Array<{ title: string; categories: TotalTopStatKey[] }> = [
        {
            title: t("gameHighs.groups.general"),
            categories: [
                "appearances",
                "matchesNotPlayed",
                "sets",
                "setsStarted",
                "setsBench",
                "points",
                "breakPoints",
                "plusMinus",
                "blockPoints",
            ],
        },
        {
            title: t("players.statsGroup.serve"),
            categories: [
                "serveTotal",
                "serveAces",
                "serveAcePct",
                "serveErrors",
                "serveErrorPct",
                "serveErrorsLeast",
                "serveErrorPctLeast",
                "serveAceErrorRatio",
            ],
        },
        {
            title: t("players.statsGroup.reception"),
            categories: [
                "receptionTotal",
                "receptionErrors",
                "receptionPositivePct",
                "receptionPositivePctWorst",
                "receptionExcellentPct",
                "receptionExcellentPctWorst",
            ],
        },
        {
            title: t("players.statsGroup.attack"),
            categories: [
                "attackTotal",
                "attackErrors",
                "attackBlocked",
                "attackKills",
                "attackKillPct",
                "attackKillPctWorst",
                "attackEfficiency",
                "attackEfficiencyWorst",
            ],
        },
    ];

    const positionFilteredEntries = useMemo(() => {
        return data.flatMap((row) => {
            if (selectedPosition !== "ALL" && row.position !== selectedPosition) {
                return [];
            }

            return row.appearances.map((appearance) => ({
                playerId: row.playerId,
                appearance,
            }));
        });
    }, [data, selectedPosition]);

    const matchTypeFilteredEntries = useMemo(() => {
        return positionFilteredEntries.filter(({ appearance }) =>
            matchesSelectedType(matchType, appearance),
        );
    }, [positionFilteredEntries, matchType]);

    const getLocalizedOpponent = (appearance: { opponent: string; opponentEn: string | null }) =>
        isEstonian ? appearance.opponent : (appearance.opponentEn ?? appearance.opponent);

    const getLocalizedCompetition = (appearance: {
        competition: string | null;
        competitionEn: string | null;
    }) =>
        isEstonian ? appearance.competition : (appearance.competitionEn ?? appearance.competition);

    const yearOptions = useMemo(() => {
        const values = new Set<string>();

        matchTypeFilteredEntries.forEach(({ appearance }) => {
            const localizedCompetition = getLocalizedCompetition(appearance);
            const localizedOpponent = getLocalizedOpponent(appearance);

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

            values.add(new Date(appearance.matchDate).getFullYear().toString());
        });

        return [...values].sort((a, b) => Number.parseInt(b, 10) - Number.parseInt(a, 10));
    }, [matchTypeFilteredEntries, selectedCompetition, selectedOpponent, currentLanguage]);

    const competitionOptions = useMemo(() => {
        const values = new Set<string>();

        matchTypeFilteredEntries.forEach(({ appearance }) => {
            const localizedCompetition = getLocalizedCompetition(appearance);
            const localizedOpponent = getLocalizedOpponent(appearance);

            if (!selectedYear.includes("all")) {
                const year = new Date(appearance.matchDate).getFullYear().toString();
                if (!selectedYear.includes(year)) return;
            }
            if (
                !selectedOpponent.includes("all") &&
                localizedOpponent &&
                !selectedOpponent.includes(localizedOpponent)
            )
                return;

            if (localizedCompetition) values.add(localizedCompetition);
        });

        return [...values].sort((a, b) => a.localeCompare(b));
    }, [matchTypeFilteredEntries, selectedYear, selectedOpponent, currentLanguage]);

    const opponentOptions = useMemo(() => {
        const values = new Set<string>();

        matchTypeFilteredEntries.forEach(({ appearance }) => {
            const localizedCompetition = getLocalizedCompetition(appearance);
            const localizedOpponent = getLocalizedOpponent(appearance);

            if (!selectedYear.includes("all")) {
                const year = new Date(appearance.matchDate).getFullYear().toString();
                if (!selectedYear.includes(year)) return;
            }
            if (
                !selectedCompetition.includes("all") &&
                localizedCompetition &&
                !selectedCompetition.includes(localizedCompetition)
            )
                return;

            if (localizedOpponent) values.add(localizedOpponent);
        });

        return [...values].sort((a, b) => a.localeCompare(b));
    }, [matchTypeFilteredEntries, selectedYear, selectedCompetition, currentLanguage]);

    const filteredEntries = useMemo(() => {
        return matchTypeFilteredEntries.filter(({ appearance }) => {
            const localizedCompetition = getLocalizedCompetition(appearance);
            const localizedOpponent = getLocalizedOpponent(appearance);

            if (!selectedYear.includes("all") && selectedYear.length > 0) {
                const year = new Date(appearance.matchDate).getFullYear().toString();
                if (!selectedYear.includes(year)) return false;
            }

            if (!selectedCompetition.includes("all") && selectedCompetition.length > 0) {
                if (!localizedCompetition || !selectedCompetition.includes(localizedCompetition))
                    return false;
            }

            if (!selectedOpponent.includes("all") && selectedOpponent.length > 0) {
                if (!localizedOpponent || !selectedOpponent.includes(localizedOpponent)) return false;
            }

            return true;
        });
    }, [
        matchTypeFilteredEntries,
        selectedYear,
        selectedCompetition,
        selectedOpponent,
        currentLanguage,
    ]);

    const playerRows = useMemo(() => {
        const groupedTotals = new Map<
            number,
            {
                totals: PlayerTotals;
                receptionPositiveCount: number;
                receptionExcellentCount: number;
                qualifiedReceptionTotalForPositive: number;
                qualifiedReceptionTotalForExcellent: number;
                qualifiedAttackTotal: number;
                qualifiedAttackKills: number;
                qualifiedAttackEfficiencyTotal: number;
                qualifiedAttackEfficiencyKills: number;
                qualifiedAttackEfficiencyBlocked: number;
                qualifiedAttackEfficiencyErrors: number;
            }
        >();

        const createGroupedBucket = () => ({
            totals: createEmptyTotals(),
            receptionPositiveCount: 0,
            receptionExcellentCount: 0,
            qualifiedReceptionTotalForPositive: 0,
            qualifiedReceptionTotalForExcellent: 0,
            qualifiedAttackTotal: 0,
            qualifiedAttackKills: 0,
            qualifiedAttackEfficiencyTotal: 0,
            qualifiedAttackEfficiencyKills: 0,
            qualifiedAttackEfficiencyBlocked: 0,
            qualifiedAttackEfficiencyErrors: 0,
        });

        filteredEntries.forEach(({ playerId, appearance }) => {
            const stats = pickStatsRowForType(appearance.statsRows, matchType) as Record<
                string,
                number | string | null
            > | null;
            if (!stats) {
                // The player is in the appearance list, so it counts toward appearances
                // even when no stats row exists for this match type.
                if (displayMode !== "perGame") {
                    const bucket = groupedTotals.get(playerId) ?? createGroupedBucket();
                    bucket.totals.appearances += 1;
                    groupedTotals.set(playerId, bucket);
                }
                return;
            }

            const totalSetsInMatch = Math.min(
                Math.max(appearance.estoniaSets + appearance.opponentSets, 0),
                6,
            );
            const setSummary = getSetSlotSummary(stats, totalSetsInMatch, appearance.hasPositionInfo);

            if (displayMode === "perGame" && setSummary.setsPlayed === 0) {
                return;
            }

            const bucket = groupedTotals.get(playerId) ?? createGroupedBucket();

            bucket.totals.appearances += 1;
            bucket.totals.sets += setSummary.setsPlayed;
            bucket.totals.setsBench += setSummary.setsBench;
            bucket.totals.matchesNotPlayed += setSummary.matchNotPlayed;
            bucket.totals.setsStarted +=
                typeof appearance.setsStarted === "number" && appearance.setsStarted >= 0
                    ? Math.min(appearance.setsStarted, totalSetsInMatch)
                    : setSummary.setsPlayed;

            if (setSummary.setsPlayed > 0) {
                bucket.totals.games += 1;
            }

            if (appearance.onTheBench) {
                bucket.totals.bench += 1;
            }

            addStatCoverage(bucket.totals.coverage, stats, new Set(appearance.unavailableStats));
            const unavailableStats = new Set<string>(appearance.unavailableStats);
            const addKnownStat = (field: string, value: unknown, total: number) =>
                unavailableStats.has(field) ? total : total + Number(value ?? 0);

            bucket.totals.points = addKnownStat("points", stats.points, bucket.totals.points);
            bucket.totals.blockPoints = addKnownStat(
                "block_points",
                stats.block_points,
                bucket.totals.blockPoints,
            );
            bucket.totals.plusMinus = addKnownStat(
                "plus_minus",
                stats.plus_minus,
                bucket.totals.plusMinus,
            );
            bucket.totals.serveTotal = addKnownStat(
                "serve_total",
                stats.serve_total,
                bucket.totals.serveTotal,
            );
            bucket.totals.serveAces = addKnownStat(
                "serve_aces",
                stats.serve_aces,
                bucket.totals.serveAces,
            );
            bucket.totals.serveErrors = addKnownStat(
                "serve_errors",
                stats.serve_errors,
                bucket.totals.serveErrors,
            );
            bucket.totals.receptionTotal = addKnownStat(
                "reception_total",
                stats.reception_total,
                bucket.totals.receptionTotal,
            );
            bucket.totals.receptionErrors = addKnownStat(
                "reception_errors",
                stats.reception_errors,
                bucket.totals.receptionErrors,
            );
            bucket.totals.attackTotal = addKnownStat(
                "attack_total",
                stats.attack_total,
                bucket.totals.attackTotal,
            );
            bucket.totals.attackErrors = addKnownStat(
                "attack_errors",
                stats.attack_errors,
                bucket.totals.attackErrors,
            );
            bucket.totals.attackBlocked = addKnownStat(
                "attack_blocked",
                stats.attack_blocked,
                bucket.totals.attackBlocked,
            );
            bucket.totals.attackKills = addKnownStat(
                "attack_kills",
                stats.attack_kills,
                bucket.totals.attackKills,
            );
            bucket.totals.breakPoints = addKnownStat(
                "break_points",
                stats.break_points,
                bucket.totals.breakPoints,
            );

            const serveTotal = Number(stats.serve_total ?? 0);
            const serveAces = Number(stats.serve_aces ?? 0);
            const serveErrors = Number(stats.serve_errors ?? 0);
            if (!unavailableStats.has("serve_total") && !unavailableStats.has("serve_aces")) {
                bucket.totals.serveAcePctTotal += serveTotal;
                bucket.totals.serveAcePctAces += serveAces;
            }
            if (!unavailableStats.has("serve_total") && !unavailableStats.has("serve_errors")) {
                bucket.totals.serveErrorPctTotal += serveTotal;
                bucket.totals.serveErrorPctErrors += serveErrors;
            }
            if (
                !unavailableStats.has("serve_total") &&
                !unavailableStats.has("serve_aces") &&
                !unavailableStats.has("serve_errors")
            ) {
                bucket.totals.serveAceErrorRatioTotal += serveTotal;
                bucket.totals.serveAceErrorRatioAces += serveAces;
                bucket.totals.serveAceErrorRatioErrors += serveErrors;
            }

            const receptionTotal = Number(stats.reception_total ?? 0);
            const positivePct =
                typeof stats.reception_positive_pct === "number" ? stats.reception_positive_pct : null;
            const excellentPct =
                typeof stats.reception_excellent_pct === "number" ? stats.reception_excellent_pct : null;

            if (
                receptionTotal >= 10 &&
                positivePct !== null &&
                !unavailableStats.has("reception_total") &&
                !unavailableStats.has("reception_positive_pct")
            ) {
                bucket.receptionPositiveCount += receptionTotal * (positivePct / 100);
                bucket.qualifiedReceptionTotalForPositive += receptionTotal;
            }

            if (
                receptionTotal >= 10 &&
                excellentPct !== null &&
                !unavailableStats.has("reception_total") &&
                !unavailableStats.has("reception_excellent_pct")
            ) {
                bucket.receptionExcellentCount += receptionTotal * (excellentPct / 100);
                bucket.qualifiedReceptionTotalForExcellent += receptionTotal;
            }

            const attackTotal = Number(stats.attack_total ?? 0);
            if (
                attackTotal >= 10 &&
                !unavailableStats.has("attack_total") &&
                !unavailableStats.has("attack_kills")
            ) {
                bucket.qualifiedAttackTotal += attackTotal;
                bucket.qualifiedAttackKills += Number(stats.attack_kills ?? 0);
            }
            if (
                attackTotal >= 10 &&
                !unavailableStats.has("attack_total") &&
                !unavailableStats.has("attack_kills") &&
                !unavailableStats.has("attack_blocked") &&
                !unavailableStats.has("attack_errors")
            ) {
                bucket.qualifiedAttackEfficiencyTotal += attackTotal;
                bucket.qualifiedAttackEfficiencyKills += Number(stats.attack_kills ?? 0);
                bucket.qualifiedAttackEfficiencyBlocked += Number(stats.attack_blocked ?? 0);
                bucket.qualifiedAttackEfficiencyErrors += Number(stats.attack_errors ?? 0);
            }

            groupedTotals.set(playerId, bucket);
        });

        const hasActiveDetailFilters =
            !selectedYear.includes("all") ||
            !selectedCompetition.includes("all") ||
            !selectedOpponent.includes("all");

        const ranked = data
            .filter((row) => selectedPosition === "ALL" || row.position === selectedPosition)
            .map((row) => {
                const bucket = groupedTotals.get(row.playerId) ?? {
                    totals: createEmptyTotals(),
                    receptionPositiveCount: 0,
                    receptionExcellentCount: 0,
                    qualifiedReceptionTotalForPositive: 0,
                    qualifiedReceptionTotalForExcellent: 0,
                    qualifiedAttackTotal: 0,
                    qualifiedAttackKills: 0,
                    qualifiedAttackEfficiencyTotal: 0,
                    qualifiedAttackEfficiencyKills: 0,
                    qualifiedAttackEfficiencyBlocked: 0,
                    qualifiedAttackEfficiencyErrors: 0,
                };

                if (bucket.qualifiedReceptionTotalForPositive > 0) {
                    bucket.totals.receptionPositivePct =
                        (bucket.receptionPositiveCount / bucket.qualifiedReceptionTotalForPositive) * 100;
                }

                if (bucket.qualifiedReceptionTotalForExcellent > 0) {
                    bucket.totals.receptionExcellentPct =
                        (bucket.receptionExcellentCount / bucket.qualifiedReceptionTotalForExcellent) * 100;
                }

                if (bucket.qualifiedAttackTotal > 0) {
                    bucket.totals.attackKillPct =
                        (bucket.qualifiedAttackKills / bucket.qualifiedAttackTotal) * 100;
                }
                if (bucket.qualifiedAttackEfficiencyTotal > 0) {
                    bucket.totals.attackEfficiency =
                        ((bucket.qualifiedAttackEfficiencyKills -
                            bucket.qualifiedAttackEfficiencyBlocked -
                            bucket.qualifiedAttackEfficiencyErrors) /
                            bucket.qualifiedAttackEfficiencyTotal) *
                        100;
                }

                return {
                    ...row,
                    filteredTotals: bucket.totals,
                    qualifiedReceptionTotalForPositive: bucket.qualifiedReceptionTotalForPositive,
                    qualifiedReceptionTotalForExcellent: bucket.qualifiedReceptionTotalForExcellent,
                    qualifiedAttackTotal: bucket.qualifiedAttackTotal,
                    qualifiedAttackEfficiencyTotal: bucket.qualifiedAttackEfficiencyTotal,
                };
            })
            .filter((row) => (hasActiveDetailFilters ? row.filteredTotals.appearances > 0 : true));

        ranked.sort((a, b) => a.name.localeCompare(b.name));

        return ranked;
    }, [
        data,
        displayMode,
        filteredEntries,
        matchType,
        selectedPosition,
        selectedYear,
        selectedCompetition,
        selectedOpponent,
    ]);

    const metricRows = useMemo(() => {
        const rankableRows = playerRows.filter((row) => row.filteredTotals.appearances > 0);
        const perGameHiddenMetrics = new Set<TotalTopStatKey>([
            "appearances",
            "matchesNotPlayed",
            "sets",
            "setsStarted",
            "setsBench",
        ]);
        const orderedMetrics = categoryGroups
            .flatMap((group) => group.categories)
            .filter((metric) => !(displayMode === "perGame" && perGameHiddenMetrics.has(metric)));
        const ascendingMetrics = new Set<TotalTopStatKey>([
            "serveAceErrorRatio",
            "serveErrorsLeast",
            "serveErrorPctLeast",
            "receptionPositivePctWorst",
            "receptionExcellentPctWorst",
            "attackKillPctWorst",
            "attackEfficiencyWorst",
        ]);

        const getMetricValue = (
            row: {
                filteredTotals: PlayerTotals;
                qualifiedReceptionTotalForPositive: number;
                qualifiedReceptionTotalForExcellent: number;
                qualifiedAttackTotal: number;
                qualifiedAttackEfficiencyTotal: number;
            },
            metric: TotalTopStatKey,
            mode: SortMode,
        ): number | null => {
            const totals = row.filteredTotals;

            if (!hasStatCoverage(totals, metric)) return null;

            if (metric === "serveErrorsLeast") {
                if (totals.serveErrorPctTotal < 10) return null;
                return mode === "perGame"
                    ? getPerGameValue(totals, "serveErrors")
                    : getStatValue(totals, "serveErrors");
            }

            if (metric === "serveErrorPct") {
                if (totals.serveErrorPctTotal <= 0) return null;
                return getStatValue(totals, "serveErrorPct");
            }

            if (metric === "serveErrorPctLeast") {
                if (totals.serveErrorPctTotal <= 0) return null;
                return getStatValue(totals, "serveErrorPctLeast");
            }

            if (metric === "serveAcePct") {
                if (totals.serveAcePctTotal <= 0) return null;
                return getStatValue(totals, "serveAcePct");
            }

            if (metric === "serveAceErrorRatio") {
                return getStatValue(totals, "serveAceErrorRatio");
            }

            if (metric === "receptionPositivePct" || metric === "receptionPositivePctWorst") {
                if (row.qualifiedReceptionTotalForPositive < 10) return null;
            }

            if (metric === "receptionExcellentPct" || metric === "receptionExcellentPctWorst") {
                if (row.qualifiedReceptionTotalForExcellent < 10) return null;
            }

            if (metric === "attackKillPct" || metric === "attackKillPctWorst") {
                if (row.qualifiedAttackTotal < 10) return null;
            }

            if (metric === "attackEfficiency" || metric === "attackEfficiencyWorst") {
                if (row.qualifiedAttackEfficiencyTotal < 10) return null;
            }

            return mode === "perGame" ? getPerGameValue(totals, metric) : getStatValue(totals, metric);
        };

        return orderedMetrics.map((metric) => {
            const ranked = rankableRows
                .map((row) => {
                    const totals = row.filteredTotals;
                    const value = getMetricValue(row, metric, displayMode);
                    const valueLabel = formatMetricValue(metric, value, displayMode);

                    return {
                        playerId: row.playerId,
                        name: row.name,
                        position: row.position ?? t("positions.Unknown"),
                        rawValue: value,
                        valueLabel,
                        playerHref: `/players/${row.playerId}`,
                        serveDetails: serveMetrics.has(metric) ? getServeDetails(totals, displayMode) : null,
                        tiebreakValue: serveTiebreakDirection[metric] ? totals.serveTotal : null,
                    };
                })
                .filter((item) => item.rawValue != null)
                .sort((a, b) => {
                    if (a.rawValue !== b.rawValue) {
                        if (ascendingMetrics.has(metric)) {
                            return (a.rawValue ?? 0) - (b.rawValue ?? 0);
                        }

                        return (b.rawValue ?? 0) - (a.rawValue ?? 0);
                    }

                    const tiebreakDirection = serveTiebreakDirection[metric];
                    if (tiebreakDirection && a.tiebreakValue !== b.tiebreakValue) {
                        const diff = (a.tiebreakValue ?? 0) - (b.tiebreakValue ?? 0);
                        return tiebreakDirection === "asc" ? diff : -diff;
                    }

                    return a.name.localeCompare(b.name);
                });

            let previous: { value: number; tiebreak: number | null } | null = null;
            let previousRank = 0;
            const topTen = ranked.slice(0, 10).map((item, index) => {
                const currentValue = item.rawValue ?? 0;

                if (
                    !previous ||
                    currentValue !== previous.value ||
                    item.tiebreakValue !== previous.tiebreak
                ) {
                    previousRank = index + 1;
                    previous = { value: currentValue, tiebreak: item.tiebreakValue };
                }

                return {
                    ...item,
                    rankLabel: `#${previousRank}`,
                };
            });

            return {
                key: metric,
                metric: categoryLabel[metric],
                best: topTen[0] ?? null,
                topTen,
            };
        });
    }, [playerRows, categoryGroups, categoryLabel, displayMode, t]);

    useEffect(() => {
        setExpandedMetric(null);
    }, [
        selectedPosition,
        matchType,
        selectedYear,
        selectedCompetition,
        selectedOpponent,
        displayMode,
    ]);

    const metricToneClass: Record<TotalTopStatKey, string> = {
        appearances: "bg-slate-50/60",
        matchesNotPlayed: "bg-slate-50/60",
        sets: "bg-slate-50/60",
        setsStarted: "bg-slate-50/60",
        setsBench: "bg-slate-50/60",
        points: "bg-emerald-50/60",
        blockPoints: "bg-emerald-50/60",
        plusMinus: "bg-emerald-50/60",
        breakPoints: "bg-emerald-50/60",
        serveTotal: "bg-amber-50/60",
        serveAces: "bg-amber-50/60",
        serveAcePct: "bg-amber-50/60",
        serveErrors: "bg-amber-50/60",
        serveErrorPct: "bg-amber-50/60",
        serveErrorsLeast: "bg-amber-50/60",
        serveErrorPctLeast: "bg-amber-50/60",
        serveAceErrorRatio: "bg-amber-50/60",
        receptionTotal: "bg-sky-50/60",
        receptionErrors: "bg-sky-50/60",
        receptionPositivePct: "bg-sky-50/60",
        receptionPositivePctWorst: "bg-sky-50/60",
        receptionExcellentPct: "bg-sky-50/60",
        receptionExcellentPctWorst: "bg-sky-50/60",
        attackTotal: "bg-rose-50/60",
        attackErrors: "bg-rose-50/60",
        attackBlocked: "bg-rose-50/60",
        attackKills: "bg-rose-50/60",
        attackKillPct: "bg-rose-50/60",
        attackKillPctWorst: "bg-rose-50/60",
        attackEfficiency: "bg-rose-50/60",
        attackEfficiencyWorst: "bg-rose-50/60",
    };

    return (
        <main className="mx-auto w-full max-w-[1400px] px-6 py-10 text-slate-900">
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
                            {[
                                { value: "OFFICIAL", label: t("gameHighs.filters.official") },
                                { value: "COMPETITIVE", label: t("gameHighs.filters.competitive") },
                                { value: "NON_OFFICIAL", label: t("gameHighs.filters.nonCompetitive") },
                                { value: "ALL", label: t("gameHighs.filters.all") },
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setMatchType(option.value as MatchType)}
                                    className={`h-10 w-full rounded-md border px-3 text-xs font-semibold uppercase tracking-[0.16em] transition ${matchType === option.value
                                            ? "border-estonia-blue bg-estonia-blue text-white"
                                            : "border-white/30 bg-white/10 text-white/90 hover:bg-white/20"
                                        }`}
                                >
                                    {option.label}
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
                            options={yearOptions.map((year) => ({ value: year, label: year }))}
                            value={selectedYear}
                            onChange={(value) =>
                                setSelectedYear(
                                    value.length === 0 ? ["all"] : value.includes("all") ? ["all"] : value,
                                )
                            }
                            placeholder={t("players.statsFilter.allYears")}
                            className="w-full"
                        />
                    </div>

                    <div>
                        <span className="sr-only">{t("players.statsFilter.competition")}</span>
                        <MultiSelect
                            options={competitionOptions.map((competition) => ({
                                value: competition,
                                label: competition,
                            }))}
                            value={selectedCompetition}
                            onChange={(value) =>
                                setSelectedCompetition(
                                    value.length === 0 ? ["all"] : value.includes("all") ? ["all"] : value,
                                )
                            }
                            placeholder={t("players.statsFilter.allCompetitions")}
                            className="w-full"
                        />
                    </div>

                    <div>
                        <span className="sr-only">{t("players.statsFilter.opponent")}</span>
                        <MultiSelect
                            options={opponentOptions.map((opponent) => ({ value: opponent, label: opponent }))}
                            value={selectedOpponent}
                            onChange={(value) =>
                                setSelectedOpponent(
                                    value.length === 0 ? ["all"] : value.includes("all") ? ["all"] : value,
                                )
                            }
                            placeholder={t("players.statsFilter.allOpponents")}
                            className="w-full"
                        />
                    </div>
                </div>
            </div>

            <h2 className="mb-4 text-center font-display text-2xl uppercase italic text-estonia-dark">
                {displayMode === "total"
                    ? "Estonian National Team All Time Tops"
                    : "Estonian National Team All Time Tops Per Match"}
            </h2>

            {displayMode === "perGame" ? (
                <p className="mb-4 text-center text-sm italic text-slate-600">
                    Calculations are done base off matches, where player actually played, not sat on the
                    bench.
                </p>
            ) : null}

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="min-w-[860px]">
                    <Table className="min-w-full">
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead className="sticky top-0 z-20 bg-slate-50 p-3 text-left">
                                    Category
                                </TableHead>
                                <TableHead className="sticky top-0 z-20 bg-slate-50 p-3 text-left">Best</TableHead>
                                <TableHead className="sticky top-0 z-20 bg-slate-50 p-3 text-center">
                                    {t("gameHighs.table.value")}
                                </TableHead>
                                <TableHead className="sticky top-0 z-20 bg-slate-50 p-3 text-center">
                                    Top 10
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {metricRows.map((row) => (
                                <Fragment key={row.key}>
                                    {displayMode === "total" && row.key === "points" && (
                                        <TableRow className="bg-emerald-100">
                                            <TableCell
                                                colSpan={4}
                                                className="py-2 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-900"
                                            >
                                                GENERAL
                                            </TableCell>
                                        </TableRow>
                                    )}

                                    {(row.key === "serveTotal" ||
                                        row.key === "receptionTotal" ||
                                        row.key === "attackTotal") && (
                                            <TableRow className="bg-slate-100">
                                                <TableCell
                                                    colSpan={4}
                                                    className="py-2 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-slate-600"
                                                >
                                                    {row.key === "serveTotal"
                                                        ? t("players.statsGroup.serve")
                                                        : row.key === "receptionTotal"
                                                            ? t("players.statsGroup.reception")
                                                            : t("players.statsGroup.attack")}
                                                </TableCell>
                                            </TableRow>
                                        )}

                                    <TableRow className={metricToneClass[row.key]}>
                                        <TableCell className="p-3 text-sm text-slate-700">{row.metric}</TableCell>
                                        <TableCell className="p-3 text-sm text-slate-700">
                                            {row.best ? (
                                                <div className="space-y-0.5">
                                                    <a
                                                        href={row.best.playerHref}
                                                        className="block font-semibold text-estonia-dark hover:text-estonia-blue hover:underline"
                                                    >
                                                        {row.best.name}
                                                    </a>
                                                    <div className="text-xs uppercase tracking-[0.08em] text-slate-500">
                                                        {row.best.position}
                                                    </div>
                                                </div>
                                            ) : (
                                                "—"
                                            )}
                                        </TableCell>
                                        <TableCell className="p-3 text-center">
                                            <span className="inline-flex min-w-[88px] items-center justify-center rounded-md bg-white/90 px-2 py-1 text-sm font-bold text-estonia-dark shadow-sm">
                                                {row.best?.valueLabel ?? "—"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="p-3 text-center">
                                            {row.topTen.length > 0 ? (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setExpandedMetric((current) => (current === row.key ? null : row.key))
                                                    }
                                                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-500 bg-white text-base font-bold text-slate-900 shadow-sm transition hover:border-estonia-blue hover:text-estonia-blue"
                                                    aria-label={
                                                        isEstonian
                                                            ? "Ava või peida selle kategooria TOP 10"
                                                            : "Toggle top 10 for this category"
                                                    }
                                                    title={
                                                        isEstonian
                                                            ? "Ava või peida selle kategooria TOP 10"
                                                            : "Toggle top 10 for this category"
                                                    }
                                                >
                                                    {expandedMetric === row.key ? "▴" : "▾"}
                                                </button>
                                            ) : (
                                                <span className="text-slate-300">—</span>
                                            )}
                                        </TableCell>
                                    </TableRow>

                                    {expandedMetric === row.key && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="bg-slate-50/60 p-3">
                                                <div className="mb-2 rounded-md border border-slate-200 bg-slate-100/70 px-3 py-2 text-center">
                                                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                                                        {row.metric}
                                                    </p>
                                                </div>
                                                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                                    <table
                                                        className={`w-full border-collapse ${serveMetrics.has(row.key) ? "min-w-[960px]" : "min-w-[620px]"}`}
                                                    >
                                                        <thead className="bg-slate-50">
                                                            <tr>
                                                                <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                                                    #
                                                                </th>
                                                                <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                                                    {t("gameHighs.table.name")}
                                                                </th>
                                                                <th className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                                                    {t("gameHighs.table.position")}
                                                                </th>
                                                                {showValueColumn(row.key) && (
                                                                    <th className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                                                        {t("gameHighs.table.value")}
                                                                    </th>
                                                                )}
                                                                {serveMetrics.has(row.key) &&
                                                                    getServeColumns(row.key).map((column) => (
                                                                        <th
                                                                            key={column}
                                                                            className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"
                                                                        >
                                                                            {serveColumnLabels[column]}
                                                                        </th>
                                                                    ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {row.topTen.map((item, index) => (
                                                                <tr
                                                                    key={`${row.key}-${index}`}
                                                                    className="border-t border-slate-100"
                                                                >
                                                                    <td className="px-2 py-2 text-sm text-slate-600">
                                                                        {item.rankLabel}
                                                                    </td>
                                                                    <td className="px-2 py-2 text-sm text-slate-700">
                                                                        <a
                                                                            href={item.playerHref}
                                                                            className="font-medium text-estonia-dark hover:text-estonia-blue hover:underline"
                                                                        >
                                                                            {item.name}
                                                                        </a>
                                                                    </td>
                                                                    <td className="px-2 py-2 text-center text-sm text-slate-700">
                                                                        {item.position}
                                                                    </td>
                                                                    {showValueColumn(row.key) && (
                                                                        <td className="px-2 py-2 text-center text-sm font-semibold text-estonia-dark">
                                                                            {item.valueLabel}
                                                                        </td>
                                                                    )}
                                                                    {serveMetrics.has(row.key) &&
                                                                        getServeColumns(row.key).map((column) => (
                                                                            <td
                                                                                key={column}
                                                                                className="px-2 py-2 text-center text-sm text-slate-700"
                                                                            >
                                                                                <span
                                                                                    className={
                                                                                        column === serveBoldColumn[row.key]
                                                                                            ? "font-bold text-estonia-dark"
                                                                                            : undefined
                                                                                    }
                                                                                >
                                                                                    {item.serveDetails?.[column] ?? "—"}
                                                                                </span>
                                                                            </td>
                                                                        ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                    {serveTiebreakNotes[row.key] && (
                                                        <p className="border-t border-slate-100 px-3 py-2 text-xs italic text-slate-500">
                                                            {isEstonian
                                                                ? serveTiebreakNotes[row.key]?.et
                                                                : serveTiebreakNotes[row.key]?.en}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {metricRows.length === 0 && (
                <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-12 text-center text-slate-500">
                    {t("common.noResults")}
                </div>
            )}
        </main>
    );
}
