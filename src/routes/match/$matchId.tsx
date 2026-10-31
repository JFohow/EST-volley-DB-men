import { Link, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { matchOptions } from "@/lib/match-stats.queries";
import { useTranslation } from "react-i18next";
import { useState } from "react";

const PERCENT_FIELDS = new Set([
    "reception_positive_pct",
    "reception_excellent_pct",
    "attack_kill_pct",
    "attack_efficiency",
]);

export const Route = createFileRoute("/match/$matchId")({
    loader: ({ context, params }) =>
        context.queryClient.ensureQueryData(matchOptions(Number(params.matchId))),

    component: MatchStatsPage,
});

function MatchStatsPage() {
    const { matchId } = Route.useParams();
    const { t, i18n } = useTranslation();

    const { data } = useSuspenseQuery(matchOptions(Number(matchId)));

    const match = data.match;
    const players = data.players;
    const unavailableStats = new Set<string>(
        (match.match_unavailable_stats ?? []).map((row: { stat_field: string }) => row.stat_field),
    );
    const teamTotals: Record<string, number> = data.teamTotals ?? {};
    const hasTeamTotals = (...fields: string[]) => fields.every((f) => teamTotals[f] !== undefined);

    // determine available stats versions across players (e.g. 'ALL', 'AM')
    const availableStatVersions = new Set<string>();
    players.forEach((p: any) => {
        (p.player_match_stats ?? []).forEach((r: any) => {
            if (r?.stats_version) availableStatVersions.add(r.stats_version);
        });
    });

    const hasMultipleStatVersions = availableStatVersions.size > 1;
    const showStatsToggle = !!match.has_additional_sets && hasMultipleStatVersions;

    const [statsMode, setStatsMode] = useState<"official" | "all">(
        showStatsToggle ? "official" : "all",
    );
    const currentLanguage = i18n.language?.startsWith("et") ? "et" : "en";

    const opponent =
        currentLanguage === "et" ? match.opponent : (match.opponent_en ?? match.opponent);
    const competition =
        currentLanguage === "et" ? match.competition : (match.competition_en ?? match.competition);
    const city = match.city_en ?? match.city;
    const estoniaLabel = t("common.estonia");
    const sourceUrl =
        typeof match.source_row === "string" && match.source_row.trim()
            ? match.source_row.trim()
            : null;

    const getCountryFlag = (country: string | null | undefined) => {
        const normalized = (country ?? "").trim().toLowerCase();
        const map: Record<string, string> = {
            estonia: "🇪🇪",
            finland: "🇫🇮",
            belgium: "🇧🇪",
            france: "🇫🇷",
            italy: "🇮🇹",
            spain: "🇪🇸",
            germany: "🇩🇪",
            poland: "🇵🇱",
            portugal: "🇵🇹",
            netherlands: "🇳🇱",
            brazil: "🇧🇷",
            serbia: "🇷🇸",
            slovenia: "🇸🇮",
            turkey: "🇹🇷",
            latvia: "🇱🇻",
            lithuania: "🇱🇹",
            greece: "🇬🇷",
            croatia: "🇭🇷",
            montenegro: "🇲🇪",
            usa: "🇺🇸",
            "united states": "🇺🇸",
            uk: "🇬🇧",
            "united kingdom": "🇬🇧",
            sweden: "🇸🇪",
            switzerland: "🇨🇭",
            norway: "🇳🇴",
            denmark: "🇩🇰",
            "czech republic": "🇨🇿",
            slovakia: "🇸🇰",
        };
        return map[normalized] ?? "🌍";
    };

    const hasSixthSet = players.some((p: any) =>
        (p.player_match_stats ?? []).some((r: any) => Boolean(r?.set6_position)),
    );

    const officialSetScores = (match.match_sets ?? [])
        .filter(
            (set: { set_number: number; estonia_points: number; opponent_points: number }) =>
                set.set_number <= 5,
        )
        .map(
            (set: { estonia_points: number; opponent_points: number }) =>
                `${set.estonia_points}:${set.opponent_points}`,
        )
        .join(" • ");

    const additionalSetScores = (match.match_sets ?? [])
        .filter(
            (set: { set_number: number; estonia_points: number; opponent_points: number }) =>
                set.set_number > 5,
        )
        .map(
            (set: { estonia_points: number; opponent_points: number }) =>
                `${set.estonia_points}:${set.opponent_points}`,
        )
        .join(" • ");

    const formatStat = (value: number | null): string => {
        if (value == null) return "-";
        if (typeof value === "number") {
            if (value > 100) return Math.round(value).toString();
            return value % 1 === 0 ? Math.round(value).toString() : value.toFixed(1);
        }
        return "-";
    };

    const formatPercent = (value: number | null): string => {
        if (value == null) return "";
        return `${Math.round(Number(value))}%`;
    };

    const formatField = (fieldName: string, value: number | null): string => {
        if (value == null) return "";

        if (fieldName === "attack_efficiency") {
            return formatPercent(value);
        }
        if (fieldName.includes("pct") || fieldName === "attack_kill_pct") {
            return formatPercent(value);
        }
        return formatStat(Number(value));
    };

    const safeInt = (v: any) => (typeof v === "number" && Number.isInteger(v) ? v : 0);

    const computeAttackEff = (stats: any) => {
        if (!stats) return null;
        const attackTotRaw = stats.attack_total;
        const attackTot = safeInt(attackTotRaw);

        // If attack total is null/zero or invalid, show no value
        if (attackTotRaw == null || attackTot === 0) return null;

        const attackExc = safeInt(stats.attack_kills);
        const attackBlk = safeInt(stats.attack_blocked);
        const attackErr = safeInt(stats.attack_errors);

        return ((attackExc - attackBlk - attackErr) / attackTot) * 100;
    };

    const computeAttackKillPct = (stats: any) => {
        if (!stats) return null;
        const attackTotRaw = stats.attack_total;
        const attackTot = safeInt(attackTotRaw);

        if (attackTotRaw == null || attackTot === 0) return null;

        const attackExc = safeInt(stats.attack_kills);
        return (attackExc / attackTot) * 100;
    };

    const setColumns = hasSixthSet ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];

    const getSetPosition = (
        stats:
            | {
                set1_position?: string | null;
                set2_position?: string | null;
                set3_position?: string | null;
                set4_position?: string | null;
                set5_position?: string | null;
                set6_position?: string | null;
            }
            | null
            | undefined,
        setNumber: number,
    ) => {
        if (!stats) return "";
        if (setNumber === 1) return stats.set1_position ?? "";
        if (setNumber === 2) return stats.set2_position ?? "";
        if (setNumber === 3) return stats.set3_position ?? "";
        if (setNumber === 4) return stats.set4_position ?? "";
        if (setNumber === 5) return stats.set5_position ?? "";
        if (setNumber === 6) return stats.set6_position ?? "";
        return "";
    };

    const statColumns = [
        { field: "points", label: "PTS" },
        { field: "break_points", label: "BP" },
        { field: "plus_minus", label: "W-P" },
    ];

    const serveColumns = [
        { field: "serve_total", label: "Tot" },
        { field: "serve_errors", label: "Err" },
        { field: "serve_aces", label: "Ace" },
    ];

    const receptionColumns = [
        { field: "reception_total", label: "Tot" },
        { field: "reception_errors", label: "Err" },
        { field: "reception_positive_pct", label: "Pos%" },
        { field: "reception_excellent_pct", label: "Exc%" },
    ];

    const attackColumns = [
        { field: "attack_total", label: "Tot" },
        { field: "attack_errors", label: "Err" },
        { field: "attack_blocked", label: "Blk" },
        { field: "attack_kills", label: "Exc." },
        { field: "attack_kill_pct", label: "Exc.%" },
        { field: "attack_efficiency", label: "Eff%" },
    ];

    const blockColumns = [{ field: "block_points", label: "PTS" }];

    // Calculate totals
    const calculateTotals = () => {
        const totals: Record<string, number> = {};
        const counts: Record<string, number> = {};
        let receptionPositiveCount = 0;
        let receptionExcellentCount = 0;
        const allFields = [
            ...statColumns,
            ...serveColumns,
            ...receptionColumns,
            ...attackColumns,
            ...blockColumns,
        ];

        allFields.forEach((col) => {
            totals[col.field] = 0;
            counts[col.field] = 0;
        });

        const getPlayerStats = (player: any) => {
            // Use one row per player, the same row the table displays for the active mode.
            const rows = player.player_match_stats ?? [];
            if (!rows || rows.length === 0) return null;

            if (statsMode === "official") {
                return rows.find((r: any) => r?.stats_version === "AM") ?? rows[0] ?? null;
            }

            return rows.find((r: any) => r?.stats_version === "ALL") ?? rows[0] ?? null;
        };

        players.forEach((player) => {
            const stats = getPlayerStats(player);
            if (!stats) return;

            allFields.forEach((col) => {
                const value = stats[col.field as keyof typeof stats];
                if (typeof value === "number" && value !== null && !unavailableStats.has(col.field)) {
                    if (
                        col.field !== "reception_positive_pct" &&
                        col.field !== "reception_excellent_pct" &&
                        col.field !== "attack_kill_pct" &&
                        col.field !== "attack_efficiency"
                    ) {
                        totals[col.field] += value;
                    }
                }
            });

            const playerReceptionTotal = stats.reception_total;
            if (typeof playerReceptionTotal === "number" && playerReceptionTotal > 0) {
                if (typeof stats.reception_positive_pct === "number") {
                    receptionPositiveCount += playerReceptionTotal * (stats.reception_positive_pct / 100);
                }

                if (typeof stats.reception_excellent_pct === "number") {
                    receptionExcellentCount += playerReceptionTotal * (stats.reception_excellent_pct / 100);
                }
            }
        });

        return { totals, counts, receptionPositiveCount, receptionExcellentCount };
    };

    const { totals, receptionPositiveCount, receptionExcellentCount } = calculateTotals();

    // Stored team totals replace the player sums for count stats.
    Object.entries(teamTotals).forEach(([field, value]) => {
        if (!PERCENT_FIELDS.has(field) && field in totals) {
            totals[field] = value;
        }
    });

    const getStatValue = (fieldName: string): string => {
        if (PERCENT_FIELDS.has(fieldName) && teamTotals[fieldName] !== undefined) {
            return formatPercent(teamTotals[fieldName]);
        }
        if (teamTotals[fieldName] !== undefined) {
            return formatStat(teamTotals[fieldName]);
        }
        if (unavailableStats.has(fieldName)) return "";
        if (
            fieldName === "attack_efficiency" &&
            !hasTeamTotals("attack_total", "attack_kills", "attack_blocked", "attack_errors") &&
            ["attack_total", "attack_kills", "attack_blocked", "attack_errors"].some((field) =>
                unavailableStats.has(field),
            )
        )
            return "";
        if (
            fieldName === "attack_kill_pct" &&
            !hasTeamTotals("attack_total", "attack_kills") &&
            ["attack_total", "attack_kills"].some((field) => unavailableStats.has(field))
        )
            return "";
        if (
            ((fieldName === "reception_positive_pct" && unavailableStats.has("reception_positive_pct")) ||
                (fieldName === "reception_excellent_pct" &&
                    unavailableStats.has("reception_excellent_pct")) ||
                ((fieldName === "reception_positive_pct" || fieldName === "reception_excellent_pct") &&
                    unavailableStats.has("reception_total"))) &&
            !hasTeamTotals("reception_total")
        )
            return "";

        const value = totals[fieldName];
        if (value === undefined) return "-";

        if (fieldName === "reception_positive_pct") {
            if (!totals.reception_total) return "";
            return formatPercent((receptionPositiveCount / totals.reception_total) * 100);
        }

        if (fieldName === "reception_excellent_pct") {
            if (!totals.reception_total) return "";
            return formatPercent((receptionExcellentCount / totals.reception_total) * 100);
        }

        if (fieldName === "attack_kill_pct") {
            if (!totals.attack_total) return "";
            return formatPercent((totals.attack_kills / totals.attack_total) * 100);
        }

        if (fieldName === "attack_efficiency") {
            if (!totals.attack_total) return "";
            return formatPercent(
                ((totals.attack_kills - totals.attack_blocked - totals.attack_errors) /
                    totals.attack_total) *
                100,
            );
        }

        return formatStat(value);
    };

    return (
        <div className="text-slate-900">
            <div className="mx-auto max-w-7xl px-6 py-10">
                {/* Enhanced Match Header */}
                <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
                    <div className="flex items-center justify-between gap-6">
                        {/* Estonia Flag */}
                        <div className="flex-shrink-0">
                            <div className="text-[5rem] leading-none">{getCountryFlag("Estonia")}</div>
                            <p className="mt-2 text-center text-base font-semibold text-slate-700">
                                {estoniaLabel}
                            </p>
                        </div>

                        {/* Match Info */}
                        <div className="flex-1 text-center">
                            <h1 className="font-display text-4xl uppercase italic">
                                {match.estonia_sets}–{match.opponent_sets}
                            </h1>

                            {officialSetScores && (
                                <div className="mt-2 text-sm font-mono text-slate-700">{officialSetScores}</div>
                            )}

                            {additionalSetScores && (
                                <div className="mt-1 text-xs italic text-amber-600">+ {additionalSetScores}</div>
                            )}

                            <p className="mt-4 text-sm font-semibold text-slate-700">
                                {new Date(match.match_date).toLocaleDateString("en-GB", {
                                    day: "2-digit",
                                    month: "long",
                                    year: "numeric",
                                })}
                            </p>

                            <p className="mt-2 text-sm text-slate-600">{competition}</p>

                            {city && <p className="text-sm text-slate-500">📍 {city}</p>}

                            <div className="mt-3 text-xs">
                                {sourceUrl ? (
                                    <a
                                        href={sourceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center text-estonia-blue hover:text-estonia-dark"
                                    >
                                        📊 {t("matches.sourceLink")}
                                        <span className="ml-1">↗</span>
                                    </a>
                                ) : (
                                    <span className="inline-flex items-center text-slate-500">
                                        📊 {t("matches.sourceLink")}: N/A
                                    </span>
                                )}
                            </div>

                            {match.match_unavailable_stats?.length > 0 && (
                                <p className="mt-1 text-xs font-semibold text-amber-700">
                                    {t("matches.partialStatisticsNotice")}
                                </p>
                            )}

                            {showStatsToggle && (
                                <div className="mt-4 flex justify-center">
                                    <div className="inline-flex overflow-hidden rounded-md border border-slate-200 bg-white text-xs font-semibold uppercase tracking-wide">
                                        <button
                                            onClick={() => setStatsMode("official")}
                                            className={
                                                statsMode === "official"
                                                    ? "bg-estonia-blue px-3 py-2 text-white"
                                                    : "px-3 py-2 text-slate-500 hover:bg-slate-50"
                                            }
                                        >
                                            {t("matches.statsMode.official")}
                                        </button>
                                        <button
                                            onClick={() => setStatsMode("all")}
                                            className={
                                                statsMode === "all"
                                                    ? "bg-estonia-blue px-3 py-2 text-white"
                                                    : "px-3 py-2 text-slate-500 hover:bg-slate-50"
                                            }
                                        >
                                            {t("matches.statsMode.all")}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Opponent Flag */}
                        <div className="flex-shrink-0 text-center">
                            <div className="text-[5rem] leading-none">{getCountryFlag(opponent)}</div>
                            <p className="mt-2 text-center text-base font-semibold text-slate-700 uppercase">
                                {opponent}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Statistics Table */}
                <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                    <table className="w-full border-collapse">
                        <thead>
                            {/* Section Headers */}
                            <tr className="border-b-2 border-slate-300 bg-slate-50">
                                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 border-r border-slate-200">
                                    #
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 border-r-2 border-slate-300">
                                    Player
                                </th>

                                {/* Sets Section */}
                                <th
                                    colSpan={5}
                                    className="border-r-2 border-slate-300 px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500"
                                >
                                    Sets
                                </th>

                                {/* Points Section */}
                                <th
                                    colSpan={3}
                                    className="border-r-2 border-slate-300 px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500"
                                >
                                    Points
                                </th>

                                {/* Serve Section */}
                                <th
                                    colSpan={3}
                                    className="border-r-2 border-slate-300 px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500"
                                >
                                    Serve
                                </th>

                                {/* Reception Section */}
                                <th
                                    colSpan={4}
                                    className="border-r-2 border-slate-300 px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500"
                                >
                                    Reception
                                </th>

                                {/* Attack Section */}
                                <th
                                    colSpan={6}
                                    className="border-r-2 border-slate-300 px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500"
                                >
                                    Attack
                                </th>

                                {/* Block Section */}
                                <th
                                    colSpan={1}
                                    className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500"
                                >
                                    Block
                                </th>
                            </tr>

                            {/* Column Headers */}
                            <tr className="border-b-2 border-slate-300 bg-slate-50">
                                <th className="border-r border-slate-200 px-4 py-2 text-center text-[10px] font-semibold text-slate-600" />
                                <th className="border-r-2 border-slate-300 px-4 py-2 text-left text-[10px] font-semibold text-slate-600" />

                                {/* Set columns */}
                                {setColumns.map((set, idx) => (
                                    <th
                                        key={`set-${set}`}
                                        className={`px-2 py-2 text-center text-[10px] font-semibold text-slate-600 ${idx === setColumns.length - 1 ? "border-r-2 border-slate-300" : "border-r border-slate-200"}`}
                                    >
                                        {set}
                                    </th>
                                ))}

                                {/* Points columns */}
                                {statColumns.map((col, idx) => (
                                    <th
                                        key={col.field}
                                        className={`px-2 py-2 text-center text-[10px] font-semibold text-slate-600 ${idx === statColumns.length - 1
                                                ? "border-r-2 border-slate-300"
                                                : "border-r border-slate-200"
                                            }`}
                                    >
                                        {col.label}
                                    </th>
                                ))}

                                {/* Serve columns */}
                                {serveColumns.map((col) => (
                                    <th
                                        key={col.field}
                                        className={`px-2 py-2 text-center text-[10px] font-semibold text-slate-600 border-r-2 border-slate-300`}
                                    >
                                        {col.label}
                                    </th>
                                ))}

                                {/* Reception columns */}
                                {receptionColumns.map((col) => (
                                    <th
                                        key={col.field}
                                        className={`px-2 py-2 text-center text-[10px] font-semibold text-slate-600 border-r-2 border-slate-300`}
                                    >
                                        {col.label}
                                    </th>
                                ))}

                                {/* Attack columns */}
                                {attackColumns.map((col) => (
                                    <th
                                        key={col.field}
                                        className={`px-2 py-2 text-center text-[10px] font-semibold text-slate-600 border-r-2 border-slate-300`}
                                    >
                                        {col.label}
                                    </th>
                                ))}

                                {/* Block columns */}
                                {blockColumns.map((col) => (
                                    <th
                                        key={col.field}
                                        className="px-2 py-2 text-center text-[10px] font-semibold text-slate-600"
                                    >
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {/* Player Rows */}
                            {players.map((player, idx) => {
                                const statsRows = player.player_match_stats ?? [];
                                const stats =
                                    statsMode === "official"
                                        ? (statsRows.find((r) => r?.stats_version === "AM") ?? statsRows[0])
                                        : (statsRows.find((r) => r?.stats_version === "ALL") ?? statsRows[0]);

                                return (
                                    <tr
                                        key={player.appearance_id}
                                        className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}
                                    >
                                        <td className="border-r border-slate-200 px-4 py-3 text-center font-bold text-slate-900">
                                            {player.shirt_number || "—"}
                                        </td>
                                        <td className="border-r-2 border-slate-300 px-4 py-3 text-left text-sm font-medium text-slate-900">
                                            <Link
                                                to="/players/$playerId"
                                                params={{ playerId: String(player.player_id) }}
                                                className="hover:text-estonia-blue hover:underline"
                                            >
                                                {Array.isArray(player.players)
                                                    ? `${player.players[0]?.first_name} ${player.players[0]?.last_name}`
                                                    : `${player.players?.first_name} ${player.players?.last_name}`}
                                            </Link>
                                        </td>

                                        {/* Set appearances - showing if they played that set */}
                                        {setColumns.map((set, idx) => (
                                            <td
                                                key={`set-${set}`}
                                                className={`px-2 py-3 text-center text-sm text-slate-700 ${idx === setColumns.length - 1 ? "border-r-2 border-slate-300" : "border-r border-slate-200"}`}
                                            >
                                                {getSetPosition(stats, set)}
                                            </td>
                                        ))}

                                        {/* Points Stats */}
                                        {statColumns.map((col, idx) => (
                                            <td
                                                key={col.field}
                                                className={`px-2 py-3 text-center text-sm text-slate-700 ${idx === statColumns.length - 1
                                                        ? "border-r-2 border-slate-300"
                                                        : "border-r border-slate-200"
                                                    }`}
                                            >
                                                {stats
                                                    ? formatField(
                                                        col.field,
                                                        stats[col.field as keyof typeof stats] as number | null,
                                                    )
                                                    : "-"}
                                            </td>
                                        ))}

                                        {/* Serve Stats */}
                                        {serveColumns.map((col) => (
                                            <td
                                                key={col.field}
                                                className={`px-2 py-3 text-center text-sm text-slate-700 ${col === serveColumns[serveColumns.length - 1] ? "border-r-2 border-slate-300" : "border-r border-slate-200"}`}
                                            >
                                                {stats
                                                    ? formatField(
                                                        col.field,
                                                        stats[col.field as keyof typeof stats] as number | null,
                                                    )
                                                    : "-"}
                                            </td>
                                        ))}

                                        {/* Reception Stats */}
                                        {receptionColumns.map((col) => (
                                            <td
                                                key={col.field}
                                                className={`px-2 py-3 text-center text-sm text-slate-700 ${col === receptionColumns[receptionColumns.length - 1] ? "border-r-2 border-slate-300" : "border-r border-slate-200"}`}
                                            >
                                                {stats
                                                    ? formatField(
                                                        col.field,
                                                        stats[col.field as keyof typeof stats] as number | null,
                                                    )
                                                    : "-"}
                                            </td>
                                        ))}

                                        {/* Attack Stats */}
                                        {attackColumns.map((col) => (
                                            <td
                                                key={col.field}
                                                className={`px-2 py-3 text-center text-sm text-slate-700 ${col === attackColumns[attackColumns.length - 1] ? "border-r-2 border-slate-300" : "border-r border-slate-200"}`}
                                            >
                                                {stats
                                                    ? col.field === "attack_efficiency"
                                                        ? [
                                                            "attack_total",
                                                            "attack_kills",
                                                            "attack_blocked",
                                                            "attack_errors",
                                                        ].some((field) => unavailableStats.has(field))
                                                            ? ""
                                                            : formatField("attack_efficiency", computeAttackEff(stats))
                                                        : col.field === "attack_kill_pct"
                                                            ? ["attack_total", "attack_kills"].some((field) =>
                                                                unavailableStats.has(field),
                                                            )
                                                                ? ""
                                                                : formatField("attack_kill_pct", computeAttackKillPct(stats))
                                                            : formatField(
                                                                col.field,
                                                                stats[col.field as keyof typeof stats] as number | null,
                                                            )
                                                    : "-"}
                                            </td>
                                        ))}

                                        {/* Block Stats */}
                                        {blockColumns.map((col) => (
                                            <td key={col.field} className="px-2 py-3 text-center text-sm text-slate-700">
                                                {stats
                                                    ? formatField(
                                                        col.field,
                                                        stats[col.field as keyof typeof stats] as number | null,
                                                    )
                                                    : "-"}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}

                            {/* Totals Row */}
                            <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                                <td className="border-r border-slate-200 px-4 py-3 text-center text-slate-900">
                                    Σ
                                </td>
                                <td className="border-r-2 border-slate-300 px-4 py-3 text-left text-slate-900">
                                    TOTALS
                                </td>

                                {/* Set totals - not applicable */}
                                {setColumns.map((set, idx) => (
                                    <td
                                        key={`set-total-${set}`}
                                        className={`px-2 py-3 text-center text-sm text-slate-700 ${idx === setColumns.length - 1 ? "border-r-2 border-slate-300" : "border-r border-slate-200"}`}
                                    >
                                        —
                                    </td>
                                ))}

                                {/* Points totals */}
                                {statColumns.map((col, idx) => (
                                    <td
                                        key={`total-${col.field}`}
                                        className={`px-2 py-3 text-center text-sm text-slate-900 ${idx === statColumns.length - 1
                                                ? "border-r-2 border-slate-300"
                                                : "border-r border-slate-200"
                                            }`}
                                    >
                                        {getStatValue(col.field)}
                                    </td>
                                ))}

                                {/* Serve totals */}
                                {serveColumns.map((col) => (
                                    <td
                                        key={`total-${col.field}`}
                                        className={`px-2 py-3 text-center text-sm text-slate-900 ${col === serveColumns[serveColumns.length - 1] ? "border-r-2 border-slate-300" : "border-r border-slate-200"}`}
                                    >
                                        {getStatValue(col.field)}
                                    </td>
                                ))}

                                {/* Reception totals */}
                                {receptionColumns.map((col) => (
                                    <td
                                        key={`total-${col.field}`}
                                        className={`px-2 py-3 text-center text-sm text-slate-900 ${col === receptionColumns[receptionColumns.length - 1] ? "border-r-2 border-slate-300" : "border-r border-slate-200"}`}
                                    >
                                        {getStatValue(col.field)}
                                    </td>
                                ))}

                                {/* Attack totals */}
                                {attackColumns.map((col) => (
                                    <td
                                        key={`total-${col.field}`}
                                        className={`px-2 py-3 text-center text-sm text-slate-900 ${col === attackColumns[attackColumns.length - 1] ? "border-r-2 border-slate-300" : "border-r border-slate-200"}`}
                                    >
                                        {getStatValue(col.field)}
                                    </td>
                                ))}

                                {/* Block totals */}
                                {blockColumns.map((col) => (
                                    <td
                                        key={`total-${col.field}`}
                                        className="px-2 py-3 text-center text-sm text-slate-900"
                                    >
                                        {getStatValue(col.field)}
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
