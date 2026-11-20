type AttackErrorFields = Partial<Record<"attack_errors" | "attack_blocked" | "attack_errors_combined", unknown>>;

// Older matches publish only total attack errors (out-of-bounds + blocked), stored in attack_errors_combined.
export function getAttackErrorsCombined(stats: AttackErrorFields): number | null {
    if (typeof stats.attack_errors_combined === "number") return stats.attack_errors_combined;
    if (typeof stats.attack_errors === "number" && typeof stats.attack_blocked === "number") {
        return stats.attack_errors + stats.attack_blocked;
    }
    return null;
}

// True when the match stores its attack errors only as a combined total, so Err and Blk merge into one column.
export function hasCombinedAttackErrors(playerStats: AttackErrorFields[]): boolean {
    return playerStats.some(
        (row) => typeof row.attack_errors_combined === "number" && row.attack_blocked == null,
    );
}
