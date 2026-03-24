export interface SyncEvent {
    id: string;
    title: string;
    event_date: string; // ISO or YYYY-MM-DD
    event_type: string;
    holiday?: string;
    contacts?: {
        first_name?: string;
        last_name?: string;
    };
}

/**
 * Format date object into ICS Date string (YYYYMMDD)
 */
function formatDateIcs(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

/**
 * Generates an iCalendar (.ics) formatted string containing all passed events
 */
export function generateIcalString(events: SyncEvent[]): string {
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Podaryavai//NONSGML v2.0//BG',
        'CALSCALE:GREGORIAN',
    ];

    events.forEach(event => {
        const dateObj = new Date(event.event_date);
        if (isNaN(dateObj.getTime())) return; // Skip invalid dates
        
        const startStr = formatDateIcs(dateObj);
        
        // All-day events in ICS technically end on the following day
        const endDateObj = new Date(dateObj);
        endDateObj.setDate(endDateObj.getDate() + 1);
        const endStr = formatDateIcs(endDateObj);

        // Deterministic unique ID prevents duplicate calendar entries across multiple syncs
        const uid = `${event.id}@podaryavai.app`;
        const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        
        // Build readable titles based on what it is
        const contactName = event.contacts 
            ? `${event.contacts.first_name || ''} ${event.contacts.last_name || ''}`.trim()
            : '';
            
        const title = contactName ? `${event.title} - ${contactName}` : event.title;
        const description = event.holiday 
            ? `Повод: ${event.holiday}` 
            : 'Подготви подарък за този празник чрез Podaryvai.app';

        lines.push('BEGIN:VEVENT');
        lines.push(`UID:${uid}`);
        lines.push(`DTSTAMP:${dtstamp}`);
        lines.push(`DTSTART;VALUE=DATE:${startStr}`);
        lines.push(`DTEND;VALUE=DATE:${endStr}`);
        lines.push(`SUMMARY:${title}`);
        lines.push(`DESCRIPTION:${description}`);
        
        // Keep them permanently locked into the native calendar year after year
        const recurringTypes = [
            'BIRTHDAY', 'NAME_DAY', 'ANNIVERSARY', 
            'CHRISTMAS', 'WOMENS_DAY', 'VALENTINES_DAY', 
            'ACCOUNT_BIRTHDAY', 'ACCOUNT_NAME_DAY'
        ];
        
        if (recurringTypes.includes(event.event_type)) {
            lines.push('RRULE:FREQ=YEARLY');
        }

        lines.push('END:VEVENT');
    });

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
}

/**
 * Triggers the browser's native download dialog for the ICS string
 */
export function downloadIcalFile(icsString: string, filename: string = 'podaryavai_events.ics') {
    const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
