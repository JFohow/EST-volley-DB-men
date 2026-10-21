export const unavailableStatFields = [
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
] as const;

export type UnavailableStatField = (typeof unavailableStatFields)[number];

export type MatchUnavailableStatRow = {
    stat_field: string;
};

export function getUnavailableStatSet(
    value: MatchUnavailableStatRow | MatchUnavailableStatRow[] | null | undefined,
): Set<UnavailableStatField> {
    const rows = Array.isArray(value) ? value : value ? [value] : [];
    const allowedFields = new Set<string>(unavailableStatFields);
    return new Set(
        rows
            .map((row) => row.stat_field)
            .filter((field): field is UnavailableStatField => allowedFields.has(field)),
    );
}

export function maskUnavailableStatValues<T extends Record<string, unknown>>(
    stats: T,
    unavailableStats: ReadonlySet<string>,
): T {
    const masked: Record<string, unknown> = { ...stats };

    for (const field of unavailableStatFields) {
        if (unavailableStats.has(field) && field in masked) {
            masked[field] = null;
        }
    }

    if (unavailableStats.has("attack_total") || unavailableStats.has("attack_kills")) {
        if ("attack_kill_pct" in masked) masked.attack_kill_pct = null;
    }

    if (
        unavailableStats.has("attack_total") ||
        unavailableStats.has("attack_kills") ||
        unavailableStats.has("attack_blocked") ||
        unavailableStats.has("attack_errors")
    ) {
        if ("attack_efficiency" in masked) masked.attack_efficiency = null;
    }

    if (unavailableStats.has("reception_total")) {
        if ("reception_positive_pct" in masked) masked.reception_positive_pct = null;
        if ("reception_excellent_pct" in masked) masked.reception_excellent_pct = null;
    }

    return masked as T;
}