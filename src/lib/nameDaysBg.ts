// Using the comprehensive open-source bg-name-days library
// Supported features: over 800+ core names (thousands with variants), and movable Orthodox feasts (Easter, etc)
// @ts-ignore
import { getNameDay } from 'bg-name-days';

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
        const result = getNameDay(normalized);
        
        if (result) {
            // Format month and day to MM-DD
            const monthStr = result.month.toString().padStart(2, '0');
            const dayStr = result.day.toString().padStart(2, '0');
            
            return {
                date: `${monthStr}-${dayStr}`,
                holiday: result.holiday
            };
        }
    } catch (e) {
        console.error("Error looking up name day:", e);
    }
    
    return null;
}
