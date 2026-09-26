import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { matchOptions } from "@/lib/match-stats.queries";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/match/$matchId/all")({
    loader: ({ context, params }) =>
        context.queryClient.ensureQueryData(
            matchOptions(Number(params.matchId))
        ),

    component: MatchStatsAllPage,
});

function MatchStatsAllPage() {
    const { matchId } = Route.useParams();
    const { t, i18n } = useTranslation();

    const { data } = useSuspenseQuery(
        matchOptions(Number(matchId))
    );

    const match = data.match;
    const players = data.players;
    const currentLanguage = i18n.language?.startsWith("et") ? "et" : "en";

    const opponent = currentLanguage === "et" ? match.opponent : match.opponent_en ?? match.opponent;
    const competition = currentLanguage === "et" ? match.competition : match.competition_en ?? match.competition;
    const city = match.city_en ?? match.city;
    const estoniaLabel = t("common.estonia");
    const sourceUrl = typeof match.source_row === "string" && match.source_row.trim() ? match.source_row.trim() : null;

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

    const officialSetScores = (match.match_sets ?? [])
        .filter((set: { set_number: number; estonia_points: number; opponent_points: number }) => set.set_number <= 5)
        .map((set: { estonia_points: number; opponent_points: number }) => `${set.estonia_points}:${set.opponent_points}`)
        .join(" • ");

    const additionalSetScores = (match.match_sets ?? [])
        .filter((set: { set_number: number; estonia_points: number; opponent_points: number }) => set.set_number > 5)
        .map((set: { estonia_points: number; opponent_points: number }) => `${set.estonia_points}:${set.opponent_points}`)
        .join(" • ");

    const formatStat = (value: number | null): string => {
        if (value == null) return "";
        if (typeof value === "number") {
            if (value > 100) return Math.round(value).toString();
            return value % 1 === 0 ? Math.round(value).toString() : value.toFixed(1);
        }
        return "";
    };

    const formatPercent = (value: number | null): string => {
        if (value == null) return "";
        return `${Math.round(Number(value))}%`;
    };

    const toNumber = (value: unknown): number | null =>
        typeof value === "number" && Number.isFinite(value) ? value : null;

    const computeAttackKillPct = (stats: Record<string, unknown>): number | null => {
        const attackTotal = toNumber(stats.attack_total);
        const attackKills = toNumber(stats.attack_kills);

        if (attackTotal == null || attackTotal === 0 || attackKills == null) {
            return null;
        }

        return (attackKills / attackTotal) * 100;
    };

    const computeAttackEff = (stats: Record<string, unknown>): number | null => {
        const attackTotal = toNumber(stats.attack_total);
        const attackKills = toNumber(stats.attack_kills);
        const attackBlocked = toNumber(stats.attack_blocked);
        const attackErrors = toNumber(stats.attack_errors);

        if (
            attackTotal == null ||
            attackTotal === 0 ||
            attackKills == null ||
            attackBlocked == null ||
            attackErrors == null
        ) {
            return null;
        }

        return ((attackKills - attackBlocked - attackErrors) / attackTotal) * 100;
    };

    const setColumns = [1, 2, 3, 4, 5];

    const statColumns = [
        { field: "points", label: "PTS" },
        { field: "break_points", label: "BP" },
        { field: "plus_minus", label: "W-P" },
    ];

    const serveColumns = [
        { field: "serve_total", label: "Tot" },
        { field: "serve_aces", label: "Ace" },
        { field: "serve_errors", label: "Err" },
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

    const blockColumns = [
        { field: "block_points", label: "PTS" },
    ];

    const calculateTotals = () => {
        const totals: Record<string, number> = {};
        const counts: Record<string, number> = {};
        let receptionPositiveCount = 0;
        let receptionExcellentCount = 0;
        const allFields = [...statColumns, ...serveColumns, ...receptionColumns, ...attackColumns, ...blockColumns];

        allFields.forEach((col) => {
            totals[col.field] = 0;
            counts[col.field] = 0;
        });

        players.forEach((player) => {
            const stats = player.player_match_stats?.[0];
            if (!stats) return;

            allFields.forEach((col) => {
                const value = stats[col.field as keyof typeof stats];
                if (typeof value === "number" && value !== null) {
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

    const { totals, counts, receptionPositiveCount, receptionExcellentCount } = calculateTotals();

    const getStatValue = (fieldName: string): string => {
        const value = totals[fieldName];
        if (value === undefined) return "-";

        if (fieldName === "attack_kill_pct") {
            if (!totals.attack_total) return "";
            return formatPercent((totals.attack_kills / totals.attack_total) * 100);
        }

        if (fieldName === "attack_efficiency") {
            if (!totals.attack_total) return "";
            return formatPercent(((totals.attack_kills - totals.attack_blocked - totals.attack_errors) / totals.attack_total) * 100);
        }

        if (fieldName === "reception_positive_pct") {
            if (!totals.reception_total) return "";
            return formatPercent((receptionPositiveCount / totals.reception_total) * 100);
        }

        if (fieldName === "reception_excellent_pct") {
            if (!totals.reception_total) return "";
            return formatPercent((receptionExcellentCount / totals.reception_total) * 100);
        }

        if (fieldName.includes("pct")) {
            const count = counts[fieldName] || 1;
            return formatStat(value / Math.max(count, 1));
        }

        return formatStat(value);
    };


    return (
        <div className="text-slate-900">
            <div className="mx-auto max-w-7xl px-6 py-10">
                <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
                    <div className="flex items-center justify-between gap-6">
                        <div className="flex-shrink-0">
                            <div className="text-[5rem] leading-none">{getCountryFlag("Estonia")}</div>
                            <p className="mt-2 text-center text-base font-semibold text-slate-700">{estoniaLabel}</p>
                        </div>

                        <div className="flex-1 text-center">
                            <h1 className="font-display text-4xl uppercase italic">
                                {match.estonia_sets}–{match.opponent_sets}
                            </h1>

                            {officialSetScores && (
                                <div className="mt-2 text-sm font-mono text-slate-700">
                                    {officialSetScores}
                                </div>
                            )}

                            {additionalSetScores && (
                                <div className="mt-1 text-xs italic text-amber-600">
                                    + {additionalSetScores}
                                </div>
                            )}

                            <p className="mt-4 text-sm font-semibold text-slate-700">
                                {new Date(match.match_date).toLocaleDateString("en-GB", {
                                    day: "2-digit",
                                    month: "long",
                                    year: "numeric",
                                })}
                            </p>

                            <p className="mt-2 text-sm text-slate-600">
                                {competition}
                            </p>

                            {city && (
                                <p className="text-sm text-slate-500">
                                    📍 {city}
                                </p>
                            )}

                            {officialSetScores && (
                                <div className="mt-4 text-sm font-mono text-slate-700">
                                    {officialSetScores}
                                </div>
                            )}

                            {(
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
                            )}

                            {additionalSetScores && (
                                <div className="mt-2 text-xs italic text-amber-600">
                                    + {additionalSetScores}
                                </div>
                            )}
                        </div>

                        <div className="flex-shrink-0 text-center">
                            <div className="text-[5rem] leading-none">{getCountryFlag(opponent)}</div>
                            <p className="mt-2 text-center text-base font-semibold text-slate-700 uppercase">
                                {opponent}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b-2 border-slate-300 bg-slate-50">
                                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 border-r border-slate-200">
                                    #
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 border-r-2 border-slate-300">
                                    Player
                                </th>
                                <th colSpan={5} className="border-r-2 border-slate-300 px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    Sets
                                </th>
                                <th colSpan={3} className="border-r-2 border-slate-300 px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    Points
                                </th>
                                <th colSpan={3} className="border-r-2 border-slate-300 px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    Serve
                                </th>
                                <th colSpan={4} className="border-r-2 border-slate-300 px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    Reception
                                </th>
                                <th colSpan={6} className="border-r-2 border-slate-300 px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    Attack
                                </th>
                                <th colSpan={1} className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    Block
                                </th>
                            </tr>

                            <tr className="border-b-2 border-slate-300 bg-slate-50">
                                <th className="border-r border-slate-200 px-4 py-2 text-center text-[10px] font-semibold text-slate-600" />
                                <th className="border-r-2 border-slate-300 px-4 py-2 text-left text-[10px] font-semibold text-slate-600" />
                                {setColumns.map((set, idx) => (
                                    <th
                                        key={`set-${set}`}
                                        className={`px-2 py-2 text-center text-[10px] font-semibold text-slate-600 ${idx === setColumns.length - 1 ? "border-r-2 border-slate-300" : "border-r border-slate-200"}`}
                                    >
                                        {set}
                                    </th>
                                ))}
                                {statColumns.map((col, idx) => (
                                    <th
                                        key={col.field}
                                        className={`px-2 py-2 text-center text-[10px] font-semibold text-slate-600 ${idx === statColumns.length - 1 ? "border-r-2 border-slate-300" : "border-r border-slate-200"}`}
                                    >
                                        {col.label}
                                    </th>
                                ))}
                                {serveColumns.map((col) => (
                                    <th
                                        key={col.field}
                                        className="px-2 py-2 text-center text-[10px] font-semibold text-slate-600 border-r-2 border-slate-300"
                                    >
                                        {col.label}
                                    </th>
                                ))}
                                {receptionColumns.map((col) => (
                                    <th
                                        key={col.field}
                                        className="px-2 py-2 text-center text-[10px] font-semibold text-slate-600 border-r-2 border-slate-300"
                                    >
                                        {col.label}
                                    </th>
                                ))}
                                {attackColumns.map((col) => (
                                    <th
                                        key={col.field}
                                        className="px-2 py-2 text-center text-[10px] font-semibold text-slate-600 border-r-2 border-slate-300"
                                    >
                                        {col.label}
                                    </th>
                                ))}
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
                            {players.map((player, idx) => {
                                const stats = player.player_match_stats?.[0];

                                return (
                                    <tr key={player.appearance_id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                                        <td className="border-r border-slate-200 px-4 py-3 text-center font-bold text-slate-900">
                                            {player.shirt_number || "—"}
                                        </td>
                                        <td className="border-r-2 border-slate-300 px-4 py-3 text-left text-sm font-medium text-slate-900">
                                            {Array.isArray(player.players) ? `${player.players[0]?.first_name} ${player.players[0]?.last_name}` : `${player.players?.first_name} ${player.players?.last_name}`}
                                        </td>
                                        {setColumns.map((set, idx) => (
                                            <td
                                                key={`set-${set}`}
                                                className={`px-2 py-3 text-center text-sm text-slate-700 ${idx === setColumns.length - 1 ? "border-r-2 border-slate-300" : "border-r border-slate-200"}`}
                                            >
                                                {((player as unknown) as Record<string, string | null | undefined>)[`set${set}_position`] ?? ""}
                                            </td>
                                        ))}
                                        {statColumns.map((col, idx) => (
                                            <td
                                                key={col.field}
                                                className={`px-2 py-3 text-center text-sm text-slate-700 ${idx === statColumns.length - 1 ? "border-r-2 border-slate-300" : "border-r border-slate-200"}`}
                                            >
                                                {stats ? formatStat(stats[col.field as keyof typeof stats] as number | null) : "-"}
                                            </td>
                                        ))}
                                        {serveColumns.map((col) => (
                                            <td
                                                key={col.field}
                                                className="px-2 py-3 text-center text-sm text-slate-700 border-r-2 border-slate-300"
                                            >
                                                {stats ? formatStat(stats[col.field as keyof typeof stats] as number | null) : "-"}
                                            </td>
                                        ))}
                                        {receptionColumns.map((col) => (
                                            <td
                                                key={col.field}
                                                className="px-2 py-3 text-center text-sm text-slate-700 border-r-2 border-slate-300"
                                            >
                                                {stats ? formatStat(stats[col.field as keyof typeof stats] as number | null) : "-"}
                                            </td>
                                        ))}
                                        {attackColumns.map((col) => (
                                            <td
                                                key={col.field}
                                                className="px-2 py-3 text-center text-sm text-slate-700 border-r-2 border-slate-300"
                                            >
                                                {stats
                                                    ? col.field === "attack_kill_pct"
                                                        ? formatPercent(computeAttackKillPct(stats as Record<string, unknown>))
                                                        : col.field === "attack_efficiency"
                                                            ? formatPercent(computeAttackEff(stats as Record<string, unknown>))
                                                            : col.field === "reception_positive_pct" || col.field === "reception_excellent_pct"
                                                                ? formatPercent(stats[col.field as keyof typeof stats] as number | null)
                                                                : formatStat(stats[col.field as keyof typeof stats] as number | null)
                                                    : "-"}
                                            </td>
                                        ))}
                                        {blockColumns.map((col) => (
                                            <td
                                                key={col.field}
                                                className="px-2 py-3 text-center text-sm text-slate-700"
                                            >
                                                {stats ? formatStat(stats[col.field as keyof typeof stats] as number | null) : "-"}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}

                            <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                                <td className="border-r border-slate-200 px-4 py-3 text-center text-slate-900">
                                    Σ
                                </td>
                                <td className="border-r-2 border-slate-300 px-4 py-3 text-left text-slate-900">
                                    TOTALS
                                </td>
                                {setColumns.map((set, idx) => (
                                    <td
                                        key={`set-total-${set}`}
                                        className={`px-2 py-3 text-center text-sm text-slate-700 ${idx === setColumns.length - 1 ? "border-r-2 border-slate-300" : "border-r border-slate-200"}`}
                                    >
                                        —
                                    </td>
                                ))}
                                {statColumns.map((col, idx) => (
                                    <td
                                        key={`total-${col.field}`}
                                        className={`px-2 py-3 text-center text-sm text-slate-900 ${idx === statColumns.length - 1 ? "border-r-2 border-slate-300" : "border-r border-slate-200"}`}
                                    >
                                        {getStatValue(col.field)}
                                    </td>
                                ))}
                                {serveColumns.map((col) => (
                                    <td
                                        key={`total-${col.field}`}
                                        className="px-2 py-3 text-center text-sm text-slate-900 border-r-2 border-slate-300"
                                    >
                                        {getStatValue(col.field)}
                                    </td>
                                ))}
                                {receptionColumns.map((col) => (
                                    <td
                                        key={`total-${col.field}`}
                                        className="px-2 py-3 text-center text-sm text-slate-900 border-r-2 border-slate-300"
                                    >
                                        {getStatValue(col.field)}
                                    </td>
                                ))}
                                {attackColumns.map((col) => (
                                    <td
                                        key={`total-${col.field}`}
                                        className="px-2 py-3 text-center text-sm text-slate-900 border-r-2 border-slate-300"
                                    >
                                        {getStatValue(col.field)}
                                    </td>
                                ))}
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