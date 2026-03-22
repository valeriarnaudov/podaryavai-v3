/**
 * Analyzes a given first name to determine if it is likely female.
 * It uses the Genderize AI oracle API for precise name-to-gender mapping 
 * (which correctly handles exceptions like the male name 'Никола'), 
 * and falls back to a Bulgarian phonetic heuristic if offline.
 * 
 * @param firstName The contact's first name
 * @returns Promise<boolean> true if the name is female
 */
export async function detectGenderAI(firstName: string): Promise<boolean> {
    if (!firstName) return false;
    
    // 1. Clean the name (use the first word only)
    const cleanName = firstName.trim().split(' ')[0];
    if (!cleanName) return false;

    try {
        // Query the AI gender oracle
        const res = await fetch(`https://api.genderize.io/?name=${encodeURIComponent(cleanName)}`);
        
        if (res.ok) {
            const data = await res.json();
            
            // If the AI API returns a valid gender classification:
            if (data && data.gender) {
                return data.gender === 'female';
            }
        }
    } catch (e) {
        console.warn("AI gender pipeline failed, falling back to heuristics:", e);
    }
    
    // 2. Fallback Heuristic if API is unreachable or rate-limited
    const lowerName = cleanName.toLowerCase();
    
    // Common Bulgarian male names that end in 'а'/'я' and would fail standard regex
    const maleExceptions = [
        'никола', 'илия', 'сава', 'тома', 'мика', 'лука', 
        'никита', 'альоша', 'миша', 'саша', 'георги'
    ];
    
    if (maleExceptions.includes(lowerName)) {
        return false;
    }
    
    // General rule: Bulgarian and Latin female names frequently end in these vowels
    return /[аяae]$/i.test(lowerName) || lowerName.endsWith('ya') || lowerName.endsWith('ia');
}
