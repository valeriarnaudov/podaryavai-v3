// Using the comprehensive open-source bg-name-days library
// Supported features: over 800+ core names (thousands with variants), and movable Orthodox feasts (Easter, etc)
import { getNameDay } from "npm:bg-name-days@^2.0.0";

export interface NameDay {
    date: string; // format "MM-DD"
    holiday: string;
}

/**
 * Normalizes the name and uses bg-name-days to find a matching name day.
 */
export function findNameDay(firstName: string): NameDay | null {
    if (!firstName) return null;

    let normalized = firstName.trim();

    try {
        // bg-name-days handles cyrillic/latin and variants automatically
        let result = getNameDay(normalized);

        // Some names (like Maria) return an array of name days
        if (Array.isArray(result)) {
            result = result[0];
        }

        if (result && result.month !== undefined && result.day !== undefined) {
            // Format month and day to MM-DD
            const monthStr = result.month.toString().padStart(2, "0");
            const dayStr = result.day.toString().padStart(2, "0");

            return {
                date: `${monthStr}-${dayStr}`,
                holiday: result.holiday,
            };
        }
    } catch (e) {
        console.error("Error looking up name day:", e);
    }

    return null;
}
