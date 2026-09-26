import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { playersOptions, type PlayerListItem } from "@/lib/players.queries";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import { Outlet } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/players/")({
    component: PlayersPage,
});

function PlayersPage() {
    const { t } = useTranslation();

    const { data: players } = useSuspenseQuery(playersOptions());

    const [search, setSearch] = useState("");

    const [selectedPositions, setSelectedPositions] = useState<string[]>([]);

    function togglePosition(position: string) {
        setSelectedPositions((current) =>
            current.includes(position) ? current.filter((p) => p !== position) : [...current, position],
        );
    }

    function handleSort(
        field:
            | "amAppearances"
            | "amGamesPlayed"
            | "amBench"
            | "vmAppearances"
            | "vmGamesPlayed"
            | "vmBench"
            | "allAppearances"
            | "allGamesPlayed"
            | "allBench",
    ) {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("desc");
        }
    }

    function SortIcon(field: string) {
        if (sortField !== field) {
            return " ⇅";
        }

        return sortDirection === "asc" ? " ↑" : " ↓";
    }

    const [sortField, setSortField] = useState<
        | "amAppearances"
        | "amGamesPlayed"
        | "amBench"
        | "vmAppearances"
        | "vmGamesPlayed"
        | "vmBench"
        | "allAppearances"
        | "allGamesPlayed"
        | "allBench"
    >("amAppearances");

    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

    const positionOrder = ["SET", "OPP", "OH", "MB", "LIB"];

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();

        let result = players;

        if (q) {
            result = result.filter((p) => `${p.first_name} ${p.last_name}`.toLowerCase().includes(q));
        }

        if (selectedPositions.length > 0) {
            result = result.filter((p) => selectedPositions.includes(p.position ?? "Unknown"));
        }

        return result;
    }, [players, search, selectedPositions]);

    const sortedPlayers = [...filtered].sort((a, b) => {
        const aValue = Number(a[sortField]);
        const bValue = Number(b[sortField]);

        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    });

    return (
        <div className="text-slate-900">
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
                <section className="rounded-2xl bg-estonia-dark p-5 text-white shadow-sm sm:p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex-1 space-y-4">
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t("players.search")}
                                className="h-10 w-full max-w-xl rounded-md border border-white/20 bg-white/10 px-3 text-sm text-white placeholder:text-white/50 outline-none backdrop-blur-sm focus:border-estonia-blue"
                            />

                            <div className="flex flex-wrap gap-2">
                                {positionOrder
                                    .filter((p) => p !== "Unknown")
                                    .map((position) => (
                                        <button
                                            key={position}
                                            type="button"
                                            onClick={() => togglePosition(position)}
                                            className={`h-10 rounded-md border px-3 text-xs font-semibold uppercase tracking-[0.14em] transition ${selectedPositions.includes(position)
                                                ? "border-estonia-blue bg-estonia-blue text-white"
                                                : "border-white/20 bg-white/10 text-white/90 hover:bg-white/20"
                                                }`}
                                        >
                                            {position}
                                        </button>
                                    ))}
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-1 lg:w-[320px]">
                            <div className="flex h-10 items-center justify-between rounded-md border border-white/10 bg-white/10 px-3 backdrop-blur-sm">
                                <div className="text-[10px] uppercase tracking-[0.22em] text-white/55">
                                    {t("players.title")}
                                </div>
                                <div className="font-display text-lg text-white">{filtered.length}</div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="min-w-[980px]">
                        <div className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50">
                            <div className="grid grid-cols-13 px-6 pt-4 text-[10px] font-bold uppercase tracking-widest">
                                <div className="col-span-4" />

                                <div className="col-span-3 text-center text-estonia-dark">
                                    {t("common.official")}
                                </div>

                                <div className="col-span-3 text-center text-estonia-dark">
                                    {t("common.competitive")}
                                </div>

                                <div className="col-span-3 text-center text-estonia-dark">
                                    {t("common.allMatches")}
                                </div>
                            </div>

                            <div className="grid grid-cols-13 gap-3 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                <div className="col-span-4" />

                                <button
                                    onClick={() => handleSort("amAppearances")}
                                    className={`text-center transition-colors hover:text-estonia-blue ${sortField === "amAppearances" ? "text-estonia-blue" : ""
                                        }`}
                                >
                                    {t("players.apps").toUpperCase()}
                                    {SortIcon("amAppearances")}
                                </button>

                                <button
                                    onClick={() => handleSort("amGamesPlayed")}
                                    className={`text-center transition-colors hover:text-estonia-blue ${sortField === "amGamesPlayed" ? "text-estonia-blue" : ""
                                        }`}
                                >
                                    {t("players.gp").toUpperCase()}
                                    {SortIcon("amGamesPlayed")}
                                </button>

                                <button
                                    onClick={() => handleSort("amBench")}
                                    className={`text-center transition-colors hover:text-estonia-blue ${sortField === "amBench" ? "text-estonia-blue" : ""
                                        }`}
                                >
                                    {t("players.bench").toUpperCase()}
                                    {SortIcon("amBench")}
                                </button>

                                <button
                                    onClick={() => handleSort("vmAppearances")}
                                    className={`text-center transition-colors hover:text-estonia-blue ${sortField === "vmAppearances" ? "text-estonia-blue" : ""
                                        }`}
                                >
                                    {t("players.apps").toUpperCase()}
                                    {SortIcon("vmAppearances")}
                                </button>

                                <button
                                    onClick={() => handleSort("vmGamesPlayed")}
                                    className={`text-center transition-colors hover:text-estonia-blue ${sortField === "vmGamesPlayed" ? "text-estonia-blue" : ""
                                        }`}
                                >
                                    {t("players.gp").toUpperCase()}
                                    {SortIcon("vmGamesPlayed")}
                                </button>

                                <button
                                    onClick={() => handleSort("vmBench")}
                                    className={`text-center transition-colors hover:text-estonia-blue ${sortField === "vmBench" ? "text-estonia-blue" : ""
                                        }`}
                                >
                                    {t("players.bench").toUpperCase()}
                                    {SortIcon("vmBench")}
                                </button>

                                <button
                                    onClick={() => handleSort("allAppearances")}
                                    className={`text-center transition-colors hover:text-estonia-blue ${sortField === "allAppearances" ? "text-estonia-blue" : ""
                                        }`}
                                >
                                    {t("players.apps").toUpperCase()}
                                    {SortIcon("allAppearances")}
                                </button>

                                <button
                                    onClick={() => handleSort("allGamesPlayed")}
                                    className={`text-center transition-colors hover:text-estonia-blue ${sortField === "allGamesPlayed" ? "text-estonia-blue" : ""
                                        }`}
                                >
                                    {t("players.gp").toUpperCase()}
                                    {SortIcon("allGamesPlayed")}
                                </button>

                                <button
                                    onClick={() => handleSort("allBench")}
                                    className={`text-center transition-colors hover:text-estonia-blue ${sortField === "allBench" ? "text-estonia-blue" : ""
                                        }`}
                                >
                                    {t("players.bench").toUpperCase()}
                                    {SortIcon("allBench")}
                                </button>
                            </div>
                        </div>

                        {filtered.length === 0 ? (
                            <div className="p-12 text-center">
                                <p className="font-display text-xl uppercase italic text-slate-400">
                                    {t("players.noPlayersFound")}
                                </p>
                            </div>
                        ) : (
                            sortedPlayers.map((player) => <PlayerRow key={player.player_id} player={player} />)
                        )}
                    </div>
                </div>
            </main>
            <Outlet />
        </div>
    );
}

function getPlayerPhotoUrl(playerId: number) {
    const { data } = supabase.storage.from("player-photos").getPublicUrl(`${playerId}.jpg`);

    return data.publicUrl;
}

function PlayerRow({ player }: { player: PlayerListItem }) {
    return (
        <div className="grid grid-cols-13 gap-3 border-t border-slate-100 px-6 py-4 transition-colors hover:bg-slate-50">
            <div className="col-span-4 flex items-center gap-3 border-r border-slate-200 pr-2">
                <PlayerAvatar player={player} />

                <div>
                    <Link
                        to="/players/$playerId"
                        params={{
                            playerId: String(player.player_id),
                        }}
                        className="font-semibold uppercase hover:text-estonia-blue"
                    >
                        {player.first_name} {player.last_name}
                    </Link>

                    <div className="mt-1 text-xs uppercase tracking-wider text-slate-500">
                        {player.position ?? "—"}
                    </div>
                </div>
            </div>

            <div className="text-center font-semibold">{player.amAppearances}</div>

            <div className="text-center">{player.amGamesPlayed}</div>

            <div className="border-r border-slate-200 text-center">{player.amBench}</div>

            <div className="text-center font-semibold">{player.vmAppearances}</div>

            <div className="text-center">{player.vmGamesPlayed}</div>

            <div className="border-r border-slate-200 text-center">{player.vmBench}</div>

            <div className="text-center font-semibold">{player.allAppearances}</div>

            <div className="text-center">{player.allGamesPlayed}</div>

            <div className="text-center">{player.allBench}</div>
        </div>
    );
}
function PlayerAvatar({ player }: { player: PlayerListItem }) {
    const [showFallback, setShowFallback] = useState(false);

    const photoUrl = getPlayerPhotoUrl(player.player_id);

    if (showFallback) {
        return (
            <div className="grid h-10 w-10 place-items-center rounded-full bg-estonia-dark text-sm font-bold text-white">
                {player.first_name[0]}
                {player.last_name[0]}
            </div>
        );
    }

    return (
        <img
            src={photoUrl}
            alt={`${player.first_name} ${player.last_name}`}
            className="h-10 w-10 rounded-full object-cover"
            onError={() => setShowFallback(true)}
        />
    );
}
