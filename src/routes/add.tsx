import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

type ImportMode = "dvw" | "pdf" | "cev";

type DvwSet = {
    setNumber: number;
    score: string | null;
    homePoints: number | null;
    awayPoints: number | null;
    winner: "home" | "away" | null;
};

type DvwPlayer = {
    team: "home" | "away";
    jerseyNumber: string;
    lastName: string;
    firstName: string;
    setPosition1: string;
    setPosition2: string;
    setPosition3: string;
    setPosition4: string;
    setPosition5: string;
};

type DvwDerivedPlayerStats = {
    team: "home" | "away";
    jerseyNumber: string;
    lastName: string;
    firstName: string;
    serve_total: number;
    serve_errors: number;
    serve_aces: number;
    reception_total: number;
    reception_errors: number;
    reception_positive_pct: number;
    reception_excellent_pct: number;
    attack_total: number;
    attack_errors: number;
    attack_blocked: number;
    attack_kills: number;
    attack_kill_pct: number;
    block_points: number;
    plus_minus: number;
    points: number;
};

type DvwPreview = {
    fileMetadata: Array<{ key: string; value: string }>;
    fileFormat: string | null;
    generatorDay: string | null;
    matchDate: string | null;
    matchTime: string | null;
    season: string | null;
    competition: string | null;
    phase: string | null;
    homeTeamName: string | null;
    awayTeamName: string | null;
    homeCoach: string | null;
    awayCoach: string | null;
    city: string | null;
    venue: string | null;
    scoreFromMatchHeader: string | null;
    scoreBySets: string | null;
    setPointsTotal: string | null;
    sets: DvwSet[];
    homePlayers: DvwPlayer[];
    awayPlayers: DvwPlayer[];
    scoutRowCount: number;
    attackCombinationCount: number;
    setterCallCount: number;
    scoutSummary: {
        scoreMarkers: number;
        timeoutMarkers: number;
        lineupMarkers: number;
        substitutions: number;
        actionRows: number;
        teamActionCounts: {
            home: Record<string, number>;
            away: Record<string, number>;
        };
    };
    scoutRows: string[];
    sectionOverview: Array<{ section: string; lineCount: number; sampleLines: string[] }>;
};

function parseScoutEvent(line: string): {
    team: "home" | "away";
    playerNumber: string;
    action: string;
    suffix: string;
} | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    const firstToken = trimmed.split(";")[0]?.trim() ?? "";
    if (!firstToken) return null;

    const match = firstToken.match(/^([*a])(\d{1,2})([A-Z]+)(.*)$/i);
    if (!match) return null;

    return {
        team: match[1] === "*" ? "home" : "away",
        playerNumber: match[2],
        action: match[3].toUpperCase(),
        suffix: match[4] ?? "",
    };
}

function computeDvwDerivedStats(preview: DvwPreview): {
    home: DvwDerivedPlayerStats[];
    away: DvwDerivedPlayerStats[];
} {
    const allPlayers = [
        ...preview.homePlayers.map((player) => ({ ...player, team: "home" as const })),
        ...preview.awayPlayers.map((player) => ({ ...player, team: "away" as const })),
    ];

    const playerMap = new Map<string, DvwDerivedPlayerStats>();
    for (const player of allPlayers) {
        playerMap.set(`${player.team}:${player.jerseyNumber}`, {
            team: player.team,
            jerseyNumber: player.jerseyNumber,
            lastName: player.lastName,
            firstName: player.firstName,
            serve_total: 0,
            serve_errors: 0,
            serve_aces: 0,
            reception_total: 0,
            reception_errors: 0,
            reception_positive_pct: 0,
            reception_excellent_pct: 0,
            attack_total: 0,
            attack_errors: 0,
            attack_blocked: 0,
            attack_kills: 0,
            attack_kill_pct: 0,
            block_points: 0,
            plus_minus: 0,
            points: 0,
        });
    }

    const attackActions = new Set([
        "AT",
        "AQ",
        "AH",
        "AM",
        "AO",
        "BT",
        "BH",
        "DT",
        "DH",
        "FH",
        "EM",
        "EH",
        "DM",
    ]);
    const serveActions = new Set(["SM", "SQ", "SE", "SS", "SC", "SA", "SV", "SO"]);
    const receptionActions = new Set(["RQ", "EQ", "DQ", "RE", "RT", "RA", "RS", "RX"]);

    for (const line of preview.scoutRows) {
        const event = parseScoutEvent(line);
        if (!event) continue;

        const key = `${event.team}:${event.playerNumber}`;
        const stat = playerMap.get(key);
        if (!stat) continue;

        const suffix = event.suffix.toUpperCase();
        const isPositive = /[+=!]/.test(suffix);
        const isExcellent = /[=!]/.test(suffix);
        const isError = /[-E]/.test(suffix) || /[A-Z]/.test(event.action) && /[-]/.test(suffix);

        if (attackActions.has(event.action)) {
            stat.attack_total += 1;
            if (isError) {
                stat.attack_errors += 1;
            }
            if (/[#!+=]/.test(suffix)) {
                stat.attack_kills += 1;
                stat.points += 1;
            }
            if (/[~]/.test(suffix)) {
                stat.attack_blocked += 1;
                stat.block_points += 1;
            }
            if (/[A]/.test(suffix)) {
                stat.block_points += 1;
            }
        }

        if (serveActions.has(event.action)) {
            stat.serve_total += 1;
            if (isError || /[-]/.test(suffix)) {
                stat.serve_errors += 1;
            }
            if (/[A]/.test(suffix) || /[+=!#]/.test(suffix)) {
                stat.serve_aces += 1;
                stat.points += 1;
            }
        }

        if (receptionActions.has(event.action)) {
            stat.reception_total += 1;
            if (isError || /[-]/.test(suffix)) {
                stat.reception_errors += 1;
            }
            if (isPositive) {
                stat.reception_positive_pct += 1;
            }
            if (isExcellent) {
                stat.reception_excellent_pct += 1;
            }
        }

        if (stat.attack_total > 0) {
            stat.attack_kill_pct = Number(((stat.attack_kills / stat.attack_total) * 100).toFixed(1));
        }

        if (stat.reception_total > 0) {
            stat.reception_positive_pct = Number(((stat.reception_positive_pct / stat.reception_total) * 100).toFixed(1));
            stat.reception_excellent_pct = Number(((stat.reception_excellent_pct / stat.reception_total) * 100).toFixed(1));
        }

        stat.plus_minus = stat.points - (stat.attack_errors + stat.serve_errors + stat.reception_errors + stat.attack_blocked);
    }

    return {
        home: [...playerMap.values()].filter((player) => player.team === "home"),
        away: [...playerMap.values()].filter((player) => player.team === "away"),
    };
}

function buildTransferableSummary(preview: DvwPreview) {
    const homePoints = preview.sets.reduce((sum, setItem) => sum + (setItem.homePoints ?? 0), 0);
    const awayPoints = preview.sets.reduce((sum, setItem) => sum + (setItem.awayPoints ?? 0), 0);
    const homeSets = preview.sets.filter((setItem) => setItem.winner === "home").length;
    const awaySets = preview.sets.filter((setItem) => setItem.winner === "away").length;

    const derivedStats = computeDvwDerivedStats(preview);

    return {
        match: {
            homeTeam: preview.homeTeamName,
            awayTeam: preview.awayTeamName,
            date: preview.matchDate,
            time: preview.matchTime,
            competition: preview.competition,
            city: preview.city,
            venue: preview.venue,
            scoreBySets: preview.scoreBySets,
            scoreFromMatchHeader: preview.scoreFromMatchHeader,
            finalSetPoints: preview.setPointsTotal,
        },
        sets: preview.sets.map((setItem) => ({
            setNumber: setItem.setNumber,
            score: setItem.score,
            homePoints: setItem.homePoints,
            awayPoints: setItem.awayPoints,
            winner: setItem.winner,
        })),
        roster: {
            home: preview.homePlayers.map((player) => ({
                jerseyNumber: player.jerseyNumber,
                lastName: player.lastName,
                firstName: player.firstName,
                setPositions: [player.setPosition1, player.setPosition2, player.setPosition3, player.setPosition4, player.setPosition5].filter(Boolean),
            })),
            away: preview.awayPlayers.map((player) => ({
                jerseyNumber: player.jerseyNumber,
                lastName: player.lastName,
                firstName: player.firstName,
                setPositions: [player.setPosition1, player.setPosition2, player.setPosition3, player.setPosition4, player.setPosition5].filter(Boolean),
            })),
        },
        totals: {
            homeSets,
            awaySets,
            homePoints,
            awayPoints,
            totalActionRows: preview.scoutSummary.actionRows,
            totalScoreMarkers: preview.scoutSummary.scoreMarkers,
            totalTimeoutMarkers: preview.scoutSummary.timeoutMarkers,
            totalLineupMarkers: preview.scoutSummary.lineupMarkers,
            totalSubstitutions: preview.scoutSummary.substitutions,
        },
        derivedPlayerTotals: {
            home: derivedStats.home,
            away: derivedStats.away,
        },
        safeToStore: [
            "match metadata",
            "set-by-set scores",
            "team/roster players",
            "scheduled match context",
            "action summary totals",
            "derived player totals preview",
        ],
    };
}

export const Route = createFileRoute("/add")({
    component: AddPage,
});

function parseSemicolonLine(line: string): string[] {
    return line.split(";").map((token) => token.trim());
}

function parseDvwSections(text: string): Map<string, string[]> {
    const sections = new Map<string, string[]>();
    const lines = text.split(/\r?\n/);

    let currentSection: string | null = null;
    for (const rawLine of lines) {
        const line = rawLine.replace(/\u0000/g, "").trimEnd();

        if (/^\[[^\]]+\]$/.test(line)) {
            currentSection = line;
            if (!sections.has(currentSection)) {
                sections.set(currentSection, []);
            }
            continue;
        }

        if (!currentSection) continue;
        sections.get(currentSection)?.push(line);
    }

    return sections;
}

function extractSetScore(tokens: string[]): string | null {
    for (let index = tokens.length - 1; index >= 0; index -= 1) {
        const token = tokens[index];
        if (/^\d+\s*-\s*\d+$/.test(token)) {
            return token.replace(/\s+/g, "");
        }
    }
    return null;
}

function parseSetResult(score: string | null): {
    homePoints: number | null;
    awayPoints: number | null;
    winner: "home" | "away" | null;
} {
    if (!score) {
        return { homePoints: null, awayPoints: null, winner: null };
    }

    const [homeRaw, awayRaw] = score.split("-");
    const homePoints = Number(homeRaw);
    const awayPoints = Number(awayRaw);

    if (!Number.isFinite(homePoints) || !Number.isFinite(awayPoints)) {
        return { homePoints: null, awayPoints: null, winner: null };
    }

    if (homePoints === awayPoints) {
        return { homePoints, awayPoints, winner: null };
    }

    return {
        homePoints,
        awayPoints,
        winner: homePoints > awayPoints ? "home" : "away",
    };
}

function parseFileMetadata(lines: string[]): Array<{ key: string; value: string }> {
    return lines
        .map((line) => {
            const separatorIndex = line.indexOf(":");
            if (separatorIndex === -1) return null;
            const key = line.slice(0, separatorIndex).trim();
            const value = line.slice(separatorIndex + 1).trim();
            if (!key) return null;
            return { key, value };
        })
        .filter((entry): entry is { key: string; value: string } => entry !== null);
}

function summarizeScoutLines(lines: string[]) {
    const nonEmptyLines = lines.filter((line) => line.trim() !== "");

    let scoreMarkers = 0;
    let timeoutMarkers = 0;
    let lineupMarkers = 0;
    let substitutions = 0;
    let actionRows = 0;
    const teamActionCounts: { home: Record<string, number>; away: Record<string, number> } = {
        home: {},
        away: {},
    };

    for (const line of nonEmptyLines) {
        const token = parseSemicolonLine(line)[0] ?? "";
        if (!token) continue;

        if (/^[*a]p\d+:\d+$/i.test(token)) {
            scoreMarkers += 1;
            continue;
        }

        if (/^[*a]T$/i.test(token)) {
            timeoutMarkers += 1;
            continue;
        }

        if (/^[*a]z\d+$/i.test(token)) {
            lineupMarkers += 1;
            continue;
        }

        if (/^[*a]c/i.test(token)) {
            substitutions += 1;
        }

        const actionMatch = token.match(/^([*a])(\d{2})([A-Z\$])/i);
        if (actionMatch) {
            actionRows += 1;
            const teamKey = actionMatch[1] === "*" ? "home" : "away";
            const skill = actionMatch[3].toUpperCase();
            teamActionCounts[teamKey][skill] = (teamActionCounts[teamKey][skill] ?? 0) + 1;
        }
    }

    return {
        scoreMarkers,
        timeoutMarkers,
        lineupMarkers,
        substitutions,
        actionRows,
        teamActionCounts,
    };
}

function parseDvwPlayers(lines: string[], team: "home" | "away"): DvwPlayer[] {
    return lines
        .map((line) => parseSemicolonLine(line))
        .filter((tokens) => tokens.length >= 11)
        .map((tokens) => ({
            team,
            jerseyNumber: tokens[1] ?? "",
            setPosition1: tokens[3] ?? "",
            setPosition2: tokens[4] ?? "",
            setPosition3: tokens[5] ?? "",
            setPosition4: tokens[6] ?? "",
            setPosition5: tokens[7] ?? "",
            lastName: tokens[9] ?? "",
            firstName: tokens[10] ?? "",
        }))
        .filter((player) => player.jerseyNumber !== "");
}

function parseDvwPreview(text: string): DvwPreview {
    const sections = parseDvwSections(text);

    const fileMetaLines = sections.get("[3DATAVOLLEYSCOUT]") ?? [];
    const matchLines = sections.get("[3MATCH]") ?? [];
    const teamsLines = sections.get("[3TEAMS]") ?? [];
    const moreLines = sections.get("[3MORE]") ?? [];
    const setLines = sections.get("[3SET]") ?? [];
    const homePlayersLines = sections.get("[3PLAYERS-H]") ?? [];
    const awayPlayersLines = sections.get("[3PLAYERS-V]") ?? [];
    const scoutLines = sections.get("[3SCOUT]") ?? [];
    const attackCombinationLines = sections.get("[3ATTACKCOMBINATION]") ?? [];
    const setterCallLines = sections.get("[3SETTERCALL]") ?? [];

    const sectionOverview = Array.from(sections.entries()).map(([section, lines]) => ({
        section,
        lineCount: lines.length,
        sampleLines: lines.slice(0, 3),
    }));

    const fileFormatLine = fileMetaLines.find((line) => line.startsWith("FILEFORMAT:"));
    const generatorDayLine = fileMetaLines.find((line) => line.startsWith("GENERATOR-DAY:"));

    const matchTokens = matchLines.length > 0 ? parseSemicolonLine(matchLines[0]) : [];
    const homeTeamTokens = teamsLines.length > 0 ? parseSemicolonLine(teamsLines[0]) : [];
    const awayTeamTokens = teamsLines.length > 1 ? parseSemicolonLine(teamsLines[1]) : [];
    const moreTokens = moreLines.length > 0 ? parseSemicolonLine(moreLines[0]) : [];

    const parsedSets = setLines
        .slice(0, 5)
        .map((line, index) => {
            const score = extractSetScore(parseSemicolonLine(line));
            const parsedResult = parseSetResult(score);
            return {
                setNumber: index + 1,
                score,
                homePoints: parsedResult.homePoints,
                awayPoints: parsedResult.awayPoints,
                winner: parsedResult.winner,
            };
        })
        .filter((setItem) => setItem.score !== null);

    const homeSetWins = parsedSets.filter((setItem) => setItem.winner === "home").length;
    const awaySetWins = parsedSets.filter((setItem) => setItem.winner === "away").length;

    const totalHomeSetPoints = parsedSets.reduce((sum, setItem) => sum + (setItem.homePoints ?? 0), 0);
    const totalAwaySetPoints = parsedSets.reduce((sum, setItem) => sum + (setItem.awayPoints ?? 0), 0);

    const scoreBySets = parsedSets.length > 0 ? `${homeSetWins}:${awaySetWins}` : null;
    const scoreFromMatchHeader =
        matchTokens.length >= 8 && matchTokens[6] !== "" && matchTokens[7] !== ""
            ? `${matchTokens[6]}:${matchTokens[7]}`
            : null;

    const scoutSummary = summarizeScoutLines(scoutLines);
    const fileMetadata = parseFileMetadata(fileMetaLines);

    return {
        fileMetadata,
        fileFormat: fileFormatLine ? fileFormatLine.replace("FILEFORMAT:", "").trim() : null,
        generatorDay: generatorDayLine ? generatorDayLine.replace("GENERATOR-DAY:", "").trim() : null,
        matchDate: matchTokens[0] ?? null,
        matchTime: matchTokens[1] ?? null,
        season: matchTokens[2] ?? null,
        competition: matchTokens[3] ?? null,
        phase: matchTokens[4] ?? null,
        homeTeamName: homeTeamTokens[1] ?? null,
        awayTeamName: awayTeamTokens[1] ?? null,
        homeCoach: homeTeamTokens[3] ?? null,
        awayCoach: awayTeamTokens[3] ?? null,
        city: moreTokens[3] ?? null,
        venue: moreTokens[4] ?? null,
        scoreFromMatchHeader,
        scoreBySets,
        setPointsTotal: parsedSets.length > 0 ? `${totalHomeSetPoints}:${totalAwaySetPoints}` : null,
        sets: parsedSets,
        homePlayers: parseDvwPlayers(homePlayersLines, "home"),
        awayPlayers: parseDvwPlayers(awayPlayersLines, "away"),
        scoutRowCount: scoutLines.filter((line) => line.trim() !== "").length,
        attackCombinationCount: attackCombinationLines.filter((line) => line.trim() !== "").length,
        setterCallCount: setterCallLines.filter((line) => line.trim() !== "").length,
        scoutSummary,
        scoutRows: scoutLines.filter((line) => line.trim() !== ""),
        sectionOverview,
    };
}

function AddPage() {
    const [mode, setMode] = useState<ImportMode>("dvw");
    const [uploadedFileName, setUploadedFileName] = useState<string>("");
    const [rawDvwText, setRawDvwText] = useState<string>("");
    const [parseError, setParseError] = useState<string>("");

    const isDevMode = import.meta.env.DEV;

    const preview = useMemo(() => {
        if (!rawDvwText) return null;
        try {
            return parseDvwPreview(rawDvwText);
        } catch (error) {
            return null;
        }
    }, [rawDvwText]);

    async function handleDvwUpload(file: File | null) {
        if (!file) return;

        setParseError("");
        setUploadedFileName(file.name);

        try {
            const text = await file.text();
            setRawDvwText(text);

            // Parse once here so we can surface immediate validation issues.
            parseDvwPreview(text);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Could not parse selected file.";
            setParseError(message);
            setRawDvwText("");
        }
    }

    if (!isDevMode) {
        return (
            <main className="mx-auto max-w-4xl px-6 py-12">
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <h1 className="font-display text-4xl uppercase italic text-estonia-dark">ADD</h1>
                    <p className="mt-3 text-sm text-slate-600">This page is available only in development mode right now.</p>
                </div>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-6xl px-6 py-10">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-center">
                    <h1 className="font-display text-4xl uppercase italic text-estonia-dark">ADD</h1>
                    <p className="mt-2 text-sm text-slate-600">
                        Dev-only import workspace. Preview first, then we can wire database loading safely.
                    </p>
                </div>

                <div className="mt-6 grid gap-2 sm:grid-cols-3">
                    <button
                        type="button"
                        onClick={() => setMode("dvw")}
                        className={`h-11 rounded-md border px-4 text-xs font-semibold uppercase tracking-[0.16em] transition ${mode === "dvw"
                            ? "border-estonia-blue bg-estonia-blue text-white"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                    >
                        DVW FILE
                    </button>

                    <button
                        type="button"
                        onClick={() => setMode("pdf")}
                        className={`h-11 rounded-md border px-4 text-xs font-semibold uppercase tracking-[0.16em] transition ${mode === "pdf"
                            ? "border-estonia-blue bg-estonia-blue text-white"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                    >
                        PDF SCORESHEET
                    </button>

                    <button
                        type="button"
                        onClick={() => setMode("cev")}
                        className={`h-11 rounded-md border px-4 text-xs font-semibold uppercase tracking-[0.16em] transition ${mode === "cev"
                            ? "border-estonia-blue bg-estonia-blue text-white"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                    >
                        CEV STATS
                    </button>
                </div>

                {mode === "dvw" && (
                    <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-600">
                                    Upload DataVolley .txt file
                                </label>
                                <input
                                    type="file"
                                    accept=".txt,text/plain"
                                    onChange={(event) => void handleDvwUpload(event.target.files?.[0] ?? null)}
                                    className="mt-2 block w-full cursor-pointer rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-700"
                                />
                            </div>

                            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                No database writes on this page yet
                            </div>
                        </div>

                        {uploadedFileName && (
                            <p className="mt-3 text-sm text-slate-700">
                                Loaded file: <span className="font-semibold">{uploadedFileName}</span>
                            </p>
                        )}

                        {parseError && (
                            <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                                {parseError}
                            </p>
                        )}

                        {preview && (() => {
                            const transferSummary = buildTransferableSummary(preview);
                            return (
                                <div className="mt-4 space-y-4">
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <div className="rounded-md border border-slate-200 bg-white p-3">
                                            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Supabase-ready summary</div>
                                            <div className="mt-2 text-sm text-slate-800">
                                                <div>
                                                    {transferSummary.match.homeTeam ?? "?"} vs {transferSummary.match.awayTeam ?? "?"}
                                                </div>
                                                <div>{transferSummary.match.date ?? "?"} {transferSummary.match.time ?? ""}</div>
                                                <div>{transferSummary.match.competition ?? "?"}</div>
                                                <div>Set score: {transferSummary.match.scoreBySets ?? "?"}</div>
                                                <div>Header score: {transferSummary.match.scoreFromMatchHeader ?? "?"}</div>
                                                <div>Total set points: {transferSummary.match.finalSetPoints ?? "?"}</div>
                                                <div>City: {transferSummary.match.city ?? "?"}</div>
                                                <div>Venue: {transferSummary.match.venue ?? "?"}</div>
                                            </div>
                                            <div className="mt-3 rounded bg-emerald-50 px-2 py-2 text-xs text-emerald-800">
                                                Safe transfer fields: {transferSummary.safeToStore.join(", ")}
                                            </div>
                                        </div>

                                        <div className="rounded-md border border-slate-200 bg-white p-3">
                                            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">End totals for match stats</div>
                                            <div className="mt-2 text-sm text-slate-800">
                                                <div>Home sets: {transferSummary.totals.homeSets}</div>
                                                <div>Away sets: {transferSummary.totals.awaySets}</div>
                                                <div>Home points: {transferSummary.totals.homePoints}</div>
                                                <div>Away points: {transferSummary.totals.awayPoints}</div>
                                                <div>Action rows: {transferSummary.totals.totalActionRows}</div>
                                                <div>Score markers: {transferSummary.totals.totalScoreMarkers}</div>
                                                <div>Timeout markers: {transferSummary.totals.totalTimeoutMarkers}</div>
                                                <div>Lineup markers: {transferSummary.totals.totalLineupMarkers}</div>
                                                <div>Substitutions: {transferSummary.totals.totalSubstitutions}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-md border border-slate-200 bg-white p-3">
                                        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Set scores</div>
                                        <div className="mt-2 flex flex-wrap gap-2 text-sm">
                                            {preview.sets.length === 0 && <span className="text-slate-500">No set score lines parsed.</span>}
                                            {preview.sets.map((setItem) => (
                                                <span key={setItem.setNumber} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
                                                    Set {setItem.setNumber}: {setItem.score} ({setItem.winner === "home" ? "home" : setItem.winner === "away" ? "away" : "?"})
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="rounded-md border border-slate-200 bg-white p-3">
                                        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Derived player totals preview</div>
                                        <div className="mt-3 text-xs text-amber-700">
                                            Best effort from DVW scout event codes. This is a derived preview, not an official DataVolley export.
                                        </div>
                                        <div className="mt-3 overflow-x-auto">
                                            <table className="w-full border-collapse text-sm">
                                                <thead>
                                                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-[0.12em] text-slate-600">
                                                        <th className="px-2 py-2">Team</th>
                                                        <th className="px-2 py-2">#</th>
                                                        <th className="px-2 py-2">Name</th>
                                                        <th className="px-2 py-2">A Tot</th>
                                                        <th className="px-2 py-2">A Err</th>
                                                        <th className="px-2 py-2">A K</th>
                                                        <th className="px-2 py-2">R Tot</th>
                                                        <th className="px-2 py-2">R Err</th>
                                                        <th className="px-2 py-2">S Aces</th>
                                                        <th className="px-2 py-2">Pts</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {[...transferSummary.derivedPlayerTotals.home, ...transferSummary.derivedPlayerTotals.away].map((player) => (
                                                        <tr key={`${player.team}-${player.jerseyNumber}`} className="border-b border-slate-100">
                                                            <td className="px-2 py-1">{player.team === "home" ? "EST" : "OPP"}</td>
                                                            <td className="px-2 py-1">{player.jerseyNumber}</td>
                                                            <td className="px-2 py-1">{player.firstName} {player.lastName}</td>
                                                            <td className="px-2 py-1">{player.attack_total}</td>
                                                            <td className="px-2 py-1">{player.attack_errors}</td>
                                                            <td className="px-2 py-1">{player.attack_kills}</td>
                                                            <td className="px-2 py-1">{player.reception_total}</td>
                                                            <td className="px-2 py-1">{player.reception_errors}</td>
                                                            <td className="px-2 py-1">{player.serve_aces}</td>
                                                            <td className="px-2 py-1">{player.points}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div className="rounded-md border border-slate-200 bg-white p-3">
                                        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Transferable payload</div>
                                        <pre className="mt-2 max-h-96 overflow-auto rounded bg-slate-900 p-3 text-xs text-slate-100">{JSON.stringify(transferSummary, null, 2)}</pre>
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-2">
                                        <div className="rounded-md border border-slate-200 bg-white p-3">
                                            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Scout summary</div>
                                            <div className="mt-2 text-sm text-slate-800">
                                                <div>Action rows: {preview.scoutSummary.actionRows}</div>
                                                <div>Score markers: {preview.scoutSummary.scoreMarkers}</div>
                                                <div>Timeout markers: {preview.scoutSummary.timeoutMarkers}</div>
                                                <div>Lineup markers: {preview.scoutSummary.lineupMarkers}</div>
                                                <div>Substitution markers: {preview.scoutSummary.substitutions}</div>
                                            </div>
                                            <div className="mt-2 grid gap-2 text-xs text-slate-700 sm:grid-cols-2">
                                                <div className="rounded bg-slate-50 p-2">
                                                    <div className="font-semibold">Home action codes</div>
                                                    <pre className="mt-1 overflow-auto whitespace-pre-wrap">{JSON.stringify(preview.scoutSummary.teamActionCounts.home, null, 2)}</pre>
                                                </div>
                                                <div className="rounded bg-slate-50 p-2">
                                                    <div className="font-semibold">Away action codes</div>
                                                    <pre className="mt-1 overflow-auto whitespace-pre-wrap">{JSON.stringify(preview.scoutSummary.teamActionCounts.away, null, 2)}</pre>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-md border border-slate-200 bg-white p-3">
                                            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Section overview</div>
                                            <div className="mt-2 max-h-64 overflow-auto text-xs text-slate-700">
                                                {preview.sectionOverview.map((sectionInfo) => (
                                                    <div key={sectionInfo.section} className="mb-2 rounded border border-slate-100 p-2">
                                                        <div className="font-semibold">{sectionInfo.section} ({sectionInfo.lineCount} lines)</div>
                                                        <pre className="mt-1 overflow-auto whitespace-pre-wrap text-[11px]">{sectionInfo.sampleLines.join("\n") || "(empty)"}</pre>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-md border border-slate-200 bg-white p-3">
                                        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Metadata KV</div>
                                        <div className="mt-2 max-h-56 overflow-auto text-sm text-slate-800">
                                            {preview.fileMetadata.length === 0 && <div className="text-slate-500">No metadata key-value lines parsed.</div>}
                                            {preview.fileMetadata.map((item) => (
                                                <div key={item.key} className="grid grid-cols-[220px_1fr] gap-2 border-b border-slate-100 py-1">
                                                    <div className="font-mono text-xs text-slate-500">{item.key}</div>
                                                    <div className="break-all">{item.value}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="rounded-md border border-slate-200 bg-white p-3">
                                        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Roster preview</div>
                                        <div className="mt-2 overflow-x-auto">
                                            <table className="min-w-[840px] w-full border-collapse text-sm">
                                                <thead>
                                                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-[0.12em] text-slate-600">
                                                        <th className="px-2 py-2">Team</th>
                                                        <th className="px-2 py-2">#</th>
                                                        <th className="px-2 py-2">Name</th>
                                                        <th className="px-2 py-2">S1</th>
                                                        <th className="px-2 py-2">S2</th>
                                                        <th className="px-2 py-2">S3</th>
                                                        <th className="px-2 py-2">S4</th>
                                                        <th className="px-2 py-2">S5</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {[...preview.homePlayers, ...preview.awayPlayers].map((player, index) => (
                                                        <tr key={`${player.team}-${player.jerseyNumber}-${index}`} className="border-b border-slate-100">
                                                            <td className="px-2 py-1">{player.team === "home" ? "EST" : "OPP"}</td>
                                                            <td className="px-2 py-1">{player.jerseyNumber}</td>
                                                            <td className="px-2 py-1">{player.lastName} {player.firstName}</td>
                                                            <td className="px-2 py-1">{player.setPosition1 || "-"}</td>
                                                            <td className="px-2 py-1">{player.setPosition2 || "-"}</td>
                                                            <td className="px-2 py-1">{player.setPosition3 || "-"}</td>
                                                            <td className="px-2 py-1">{player.setPosition4 || "-"}</td>
                                                            <td className="px-2 py-1">{player.setPosition5 || "-"}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}

                {mode === "pdf" && (
                    <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
                        PDF scoresheet import flow will be added next.
                    </div>
                )}

                {mode === "cev" && (
                    <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
                        CEV stats import flow will be added next.
                    </div>
                )}
            </section>
        </main>
    );
}
