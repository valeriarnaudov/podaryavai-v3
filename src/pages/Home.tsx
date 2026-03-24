import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { ChevronLeft, ChevronRight, Loader2, Shield, CalendarHeart, Users, Sparkles, CalendarPlus } from 'lucide-react';
import { generateIcalString, downloadIcalFile } from '../lib/icalendar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { findNameDay } from '../lib/nameDaysBg';
import { useTranslation } from 'react-i18next';

interface Event {
    id: string;
    title: string;
    event_date: string;
    event_type: string;
    ai_recommendations?: any;
    contacts?: { id: string; first_name: string; last_name: string; avatar_url: string | null; budget_preference: number | null };
    holiday?: string;
}

export default function Home() {
    const navigate = useNavigate();
    const { isAdmin, user, subscriptionPlan } = useAuth();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [generatingFor, setGeneratingFor] = useState<string | null>(null);
    const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
    const { t, i18n } = useTranslation();

    const [budgetModalOpen, setBudgetModalOpen] = useState(false);
    const [pendingEventForGifts, setPendingEventForGifts] = useState<Event | null>(null);
    const [tempBudget, setTempBudget] = useState<string>('');
    const [savingBudget, setSavingBudget] = useState(false);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    useEffect(() => {
        fetchEvents();
    }, [currentDate]);

    useEffect(() => {
        const processReferral = async () => {
            const refId = localStorage.getItem('referral_id');
            if (refId && user) {
                try {
                    // Fetch the referrer's name
                    const { data: refUser } = await supabase
                        .from('users')
                        .select('full_name, karma_points, karma_boost_until')
                        .eq('id', refId)
                        .maybeSingle();

                    if (refUser) {
                        const parts = (refUser.full_name || 'Unknown').split(' ');
                        const firstName = parts[0] || 'Unknown';
                        const lastName = parts.slice(1).join(' ') || '';

                        // Add to contacts
                        await supabase.from('contacts').insert([{
                            user_id: user.id,
                            first_name: firstName,
                            last_name: lastName,
                            relationship: 'Friend (via Link)'
                        }]);

                        // Award referrer karma
                        const isBoosted = refUser.karma_boost_until && new Date(refUser.karma_boost_until) > new Date();
                        const earnedPoints = isBoosted ? 100 : 50; // 50 points for referral

                        await supabase.from('users').update({
                            karma_points: refUser.karma_points + earnedPoints
                        }).eq('id', refId);
                    }
                } catch (err) {
                    console.error('Error processing referral:', err);
                } finally {
                    localStorage.removeItem('referral_id');
                }
            }
        };

        processReferral();
    }, [user]);

    const fetchEvents = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('events')
                .select(`
                    id, title, event_date, event_type, ai_recommendations,
                    contacts (id, first_name, last_name, avatar_url, budget_preference)
                `);

            if (error) throw error;

            const { data: contactsData, error: contactsError } = await supabase
                .from('contacts')
                .select('id, first_name, last_name, avatar_url, budget_preference')
                .eq('user_id', user.id);

            const currentViewYear = currentDate.getFullYear();

            // Map the events to create virtual occurrences for the current year
            const parsedEvents = (data as unknown as Event[]).map((e) => {
                if (['BIRTHDAY', 'NAME_DAY', 'ANNIVERSARY', 'CHRISTMAS', 'WOMENS_DAY', 'VALENTINES_DAY'].includes(e.event_type)) {
                    // It's a recurring event, so force it into the currently viewed year
                    const originalDate = new Date(e.event_date);
                    const virtualDate = new Date(currentViewYear, originalDate.getMonth(), originalDate.getDate());
                    // Keep original time component or normalize to noon
                    return {
                        ...e,
                        event_date: `${virtualDate.getFullYear()}-${String(virtualDate.getMonth() + 1).padStart(2, '0')}-${String(virtualDate.getDate()).padStart(2, '0')}T00:00:00`,
                        original_date: e.event_date // keep reference if needed
                    };
                }
                return e;
            });

            // Append AI virtual Namesdays
            if (!contactsError && contactsData) {
                contactsData.forEach(contact => {
                    const nd = findNameDay(contact.first_name);
                    if (nd) {
                        const virtualDateStr = `${currentViewYear}-${nd.date}T00:00:00`;
                        const manuallyAdded = parsedEvents.some(e => e.contacts?.id === contact.id && e.event_type === 'NAME_DAY' && e.event_date.startsWith(virtualDateStr.split('T')[0]));
                        if (!manuallyAdded) {
                            parsedEvents.push({
                                id: `ai-nd-${contact.id}-${currentViewYear}`,
                                title: t('home.nameDayTitle', { name: contact.first_name }),
                                event_date: virtualDateStr,
                                event_type: 'AI_NAME_DAY',
                                contacts: contact,
                                holiday: nd.holiday
                            });
                        }
                    }
                });
            }

            // Append Account Birthday
            const userDob = user.user_metadata?.dob;
            if (userDob) {
                // dob might be YYYY-MM-DD
                const parts = userDob.split('-');
                if (parts.length === 3) {
                    const month = parts[1];
                    const day = parts[2];
                    const virtualBdayStr = `${currentViewYear}-${month}-${day}T00:00:00`;
                    
                    parsedEvents.push({
                        id: `account-bday-${user.id}-${currentViewYear}`,
                        title: t('home.myBirthday', { defaultValue: 'Моят Рожден Ден' }),
                        event_date: virtualBdayStr,
                        event_type: 'ACCOUNT_BIRTHDAY'
                    });
                }
            }

            // Append Account Name Day
            const userFirstName = user.user_metadata?.first_name || (user.user_metadata?.full_name?.split(' ')[0] || '');
            if (userFirstName) {
                const nd = findNameDay(userFirstName);
                if (nd) {
                    const virtualNdStr = `${currentViewYear}-${nd.date}T00:00:00`;
                    parsedEvents.push({
                        id: `account-nd-${user.id}-${currentViewYear}`,
                        title: t('home.myNameDay', { defaultValue: 'Моят Имен Ден' }),
                        event_date: virtualNdStr,
                        event_type: 'ACCOUNT_NAME_DAY',
                        holiday: nd.holiday
                    });
                }
            }

            // --- EVENT DEDUPLICATION LOGIC ---
            const finalEvents: Event[] = [];
            const accountEvents = parsedEvents.filter(e => !e.contacts);
            const contactEvents = parsedEvents.filter(e => e.contacts);

            // Group by contact id
            const eventsByContact = contactEvents.reduce((acc, curr) => {
                const cid = curr.contacts!.id;
                if (!acc[cid]) acc[cid] = [];
                acc[cid].push(curr);
                return acc;
            }, {} as Record<string, Event[]>);

            for (const cid in eventsByContact) {
                // Sort chronologically ascending
                const cEvents = eventsByContact[cid].sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
                
                let currentGroup: Event | null = null;
                for (const ev of cEvents) {
                    if (!currentGroup) {
                        currentGroup = { ...ev };
                    } else {
                        const diffTime = new Date(ev.event_date).getTime() - new Date(currentGroup.event_date).getTime();
                        const diffDays = Math.abs(diffTime / (1000 * 60 * 60 * 24));
                        
                        // If within 7 days, merge into currentGroup
                        if (diffDays <= 7) {
                            const cleanTitle = ev.title.replace('Имен Ден на', 'Имен Ден').replace('Рожден Ден на', 'Рожден Ден').trim();
                            if (!currentGroup.title.includes(cleanTitle)) {
                                currentGroup.title = `${currentGroup.title} и ${cleanTitle}`;
                            }
                            if (ev.holiday && !currentGroup.holiday?.includes(ev.holiday)) {
                                currentGroup.holiday = currentGroup.holiday ? `${currentGroup.holiday} / ${ev.holiday}` : ev.holiday;
                            }
                        } else {
                            finalEvents.push(currentGroup);
                            currentGroup = { ...ev };
                        }
                    }
                }
                if (currentGroup) finalEvents.push(currentGroup);
            }

            // Do the same for Account events
            const sortedAccountEvents = accountEvents.sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
            let currentAccGroup: Event | null = null;
            for (const ev of sortedAccountEvents) {
                if (!currentAccGroup) {
                    currentAccGroup = { ...ev };
                } else {
                    const diffTime = new Date(ev.event_date).getTime() - new Date(currentAccGroup.event_date).getTime();
                    const diffDays = Math.abs(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays <= 7) {
                        if (!currentAccGroup.title.includes(ev.title)) {
                            currentAccGroup.title = `${currentAccGroup.title} и ${ev.title}`;
                        }
                        if (ev.holiday && !currentAccGroup.holiday?.includes(ev.holiday)) {
                            currentAccGroup.holiday = currentAccGroup.holiday ? `${currentAccGroup.holiday} / ${ev.holiday}` : ev.holiday;
                        }
                    } else {
                        finalEvents.push(currentAccGroup);
                        currentAccGroup = { ...ev };
                    }
                }
            }
            if (currentAccGroup) finalEvents.push(currentAccGroup);

            setEvents(finalEvents);
        } catch (error) {
            console.error('Error fetching events:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateClick = (event: Event, forceRegenerate: boolean = false) => {
        if (!user) return;
        if (!['PRO', 'ULTRA', 'BUSINESS'].includes(subscriptionPlan || 'FREE')) return;

        if (!forceRegenerate && event.ai_recommendations) {
            setExpandedEvent(expandedEvent === event.id ? null : event.id);
            return;
        }

        const budget = event.contacts?.budget_preference;
        if (!budget || budget <= 0) {
            setPendingEventForGifts(event);
            setTempBudget('');
            setBudgetModalOpen(true);
            return;
        }

        executeGeneration(event, forceRegenerate);
    };

    const handleSyncCalendar = () => {
        if (!events || events.length === 0) {
            alert(t('home.noEventsToSync', { defaultValue: 'Няма събития за синхронизиране.' }));
            return;
        }
        const icsString = generateIcalString(events);
        downloadIcalFile(icsString, 'podaryavai_events.ics');
    };

    const handleSaveBudgetAndGenerate = async () => {
        if (!pendingEventForGifts || !tempBudget) return;
        setSavingBudget(true);

        try {
            const budgetNum = parseFloat(tempBudget);
            
            // 1. Save to contact
            const { error: updateError } = await supabase
                .from('contacts')
                .update({ budget_preference: budgetNum })
                .eq('id', pendingEventForGifts.contacts!.id);

            if (updateError) throw updateError;

            // Update local state so it doesn't prompt again
            setEvents(prev => prev.map(e => 
                e.contacts?.id === pendingEventForGifts.contacts!.id 
                    ? { ...e, contacts: { id: e.contacts.id, first_name: e.contacts.first_name, last_name: e.contacts.last_name, avatar_url: e.contacts.avatar_url, budget_preference: budgetNum } }
                    : e
            ));

            setBudgetModalOpen(false);
            
            // 2. Execute Generation
            executeGeneration({
                ...pendingEventForGifts,
                contacts: { ...pendingEventForGifts.contacts!, budget_preference: budgetNum }
            });

        } catch (err) {
            console.error("Failed to save budget:", err);
            alert("Failed to save budget. Please try again.");
        } finally {
            setSavingBudget(false);
        }
    };

    const executeGeneration = async (event: Event, forceRegenerate: boolean = false) => {
        setGeneratingFor(event.id);
        setExpandedEvent(event.id);
        
        try {
            const { data, error } = await supabase.functions.invoke('generate_contact_gifts', {
                body: { contact_id: event.contacts!.id, event_id: event.id, force_regenerate: forceRegenerate }
            });

            if (error) {
                console.error("Function error:", error);
                throw error;
            }
            if (data && data._error) {
                throw new Error(data.message);
            }
            
            setEvents(prevEvents => prevEvents.map(e => e.id === event.id ? { ...e, ai_recommendations: data.recommendations } : e));
        } catch (err: any) {
            console.error('Failed to generate:', err);
            
            let errMsg = 'Unknown error';
            if (err instanceof Error) {
                errMsg = err.message;
            } else if (typeof err === 'object' && err !== null) {
                try {
                    errMsg = JSON.stringify(err);
                } catch {
                    // ignore
                }
            }
            alert(`Edge Function Error: ${errMsg}`);
            setExpandedEvent(null);
        } finally {
            setGeneratingFor(null);
            setPendingEventForGifts(null);
        }
    };

    // Calendar generation logic
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => {
        let day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1; // Make Monday the first day (0 = Mon, 6 = Sun)
    };

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayIndex = getFirstDayOfMonth(year, month);

    const days = [];
    // Padding previous month
    for (let i = 0; i < firstDayIndex; i++) {
        days.push(null);
    }
    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));

    // Get events for the currently specifically selected day
    const selectedDateString = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

    const selectedEvents = events.filter(e => {
        // Handle both YYYY-MM-DD and YYYY-MM-DDTHH:mm:ss format safely matching prefix
        return e.event_date.startsWith(selectedDateString);
    });

    const todayDate = new Date();
    const todayString = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

    // Calculate Upcoming events (next 5)
    // Filter future events (>= today), exclude the currently selected date to avoid duplication if we are looking at today, sort, and slice
    const upcomingEvents = events
        .filter(e => {
            const evDate = e.event_date.split('T')[0];
            return evDate >= todayString && !e.event_date.startsWith(selectedDateString);
        })
        .sort((a, b) => a.event_date.localeCompare(b.event_date))
        .slice(0, 3);

    const getEventTextColor = (type: string) => {
        switch(type) {
            case 'AI_NAME_DAY': return 'text-purple-500';
            case 'ACCOUNT_BIRTHDAY': return 'text-amber-500';
            case 'ACCOUNT_NAME_DAY': return 'text-blue-500';
            case 'CHRISTMAS': return 'text-emerald-500';
            case 'WOMENS_DAY': return 'text-fuchsia-500';
            case 'VALENTINES_DAY': return 'text-rose-500';
            case 'BIRTHDAY': return 'text-rose-500';
            default: return 'text-rose-500';
        }
    };

    const getEventBgColor = (type: string) => {
        switch(type) {
            case 'AI_NAME_DAY': return 'bg-purple-100 text-purple-600';
            case 'ACCOUNT_BIRTHDAY': return 'bg-amber-100 text-amber-600';
            case 'ACCOUNT_NAME_DAY': return 'bg-blue-100 text-blue-600';
            case 'CHRISTMAS': return 'bg-emerald-100 text-emerald-600';
            case 'WOMENS_DAY': return 'bg-fuchsia-100 text-fuchsia-600';
            case 'VALENTINES_DAY': return 'bg-rose-100 text-rose-600';
            case 'BIRTHDAY': return 'bg-rose-100 text-rose-600';
            default: return 'bg-rose-100 text-rose-600';
        }
    };

    const getEventSmallBgColor = (type: string) => {
        switch(type) {
            case 'AI_NAME_DAY': return 'bg-purple-50 text-purple-600';
            case 'ACCOUNT_BIRTHDAY': return 'bg-amber-50 text-amber-500';
            case 'ACCOUNT_NAME_DAY': return 'bg-blue-50 text-blue-500';
            case 'CHRISTMAS': return 'bg-emerald-50 text-emerald-500';
            case 'WOMENS_DAY': return 'bg-fuchsia-50 text-fuchsia-500';
            case 'VALENTINES_DAY': return 'bg-rose-50 text-rose-500';
            case 'BIRTHDAY': return 'bg-rose-50 text-rose-500';
            default: return 'bg-rose-50 text-rose-500';
        }
    };

    const getEventLabel = (type: string) => {
        switch(type) {
            case 'AI_NAME_DAY': return t('home.nameDayAI');
            case 'ACCOUNT_BIRTHDAY': return '🎂 ' + t('home.myBirthday', { defaultValue: 'Моят Рожден Ден' });
            case 'ACCOUNT_NAME_DAY': return '✨ ' + t('home.myNameDay', { defaultValue: 'Моят Имен Ден' });
            case 'CHRISTMAS': return '🎄 ' + t('events.christmas', { defaultValue: 'Коледа' });
            case 'WOMENS_DAY': return '💐 ' + t('events.womensDay', { defaultValue: 'Ден на жената' });
            case 'VALENTINES_DAY': return '❤️ ' + t('events.valentines', { defaultValue: 'Свети Валентин' });
            case 'BIRTHDAY': return '🎂 ' + t('events.birthday', { defaultValue: 'Рожден Ден' });
            default: return type;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 space-y-6"
        >
            <header className="pt-4 pb-2 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-textMain dark:text-white tracking-tight">{t('home.title')}</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('home.subtitle')}</p>
                </div>
                <div className="flex space-x-2">
                    {isAdmin && (
                        <button
                            onClick={() => navigate('/admin')}
                            className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-white shadow-soft hover:bg-slate-800 transition-colors"
                            title={t('home.adminDashboard')}
                        >
                            <Shield className="w-5 h-5" />
                        </button>
                    )}
                    <button
                        onClick={() => navigate('/contacts')}
                        className="w-10 h-10 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-soft hover:bg-slate-50 dark:bg-slate-900 transition-colors"
                    >
                        <Users className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleSyncCalendar}
                        className="w-10 h-10 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-soft hover:bg-slate-50 dark:bg-slate-900 transition-colors"
                        title={t('home.syncCalendar', { defaultValue: 'Добави в Календара' })}
                    >
                        <CalendarPlus className="w-5 h-5 text-accent" />
                    </button>
                </div>
            </header>

            {/* Monthly Calendar */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-soft border border-slate-100/50 dark:border-slate-700/50">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={prevMonth} className="p-2 -ml-2 hover:bg-slate-50 dark:bg-slate-900 rounded-full text-slate-600 dark:text-slate-300">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-lg font-bold text-textMain dark:text-white capitalize">
                        {currentDate.toLocaleString(i18n.language, { month: 'long', year: 'numeric' })}
                    </h2>
                    <button onClick={nextMonth} className="p-2 -mr-2 hover:bg-slate-50 dark:bg-slate-900 rounded-full text-slate-600 dark:text-slate-300">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                    {[0, 1, 2, 3, 4, 5, 6].map(dayIdx => (
                        <div key={dayIdx} className="text-center text-xs font-semibold text-slate-400 capitalize">
                            {t(`home.daysSmall.${dayIdx}` as any)}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                    {days.map((day, idx) => {
                        if (!day) return <div key={`empty-${idx}`} className="h-10" />;

                        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const dayEvents = events.filter(e => e.event_date.startsWith(dateString));
                        const hasEvent = dayEvents.length > 0;
                        const hasNormal = dayEvents.some(e => e.event_type !== 'AI_NAME_DAY' && e.event_type !== 'ACCOUNT_BIRTHDAY' && e.event_type !== 'ACCOUNT_NAME_DAY');
                        const hasAINameDay = dayEvents.some(e => e.event_type === 'AI_NAME_DAY');
                        const hasAccountBirthday = dayEvents.some(e => e.event_type === 'ACCOUNT_BIRTHDAY');
                        const hasAccountNameDay = dayEvents.some(e => e.event_type === 'ACCOUNT_NAME_DAY');

                        const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
                        const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

                        return (
                            <button
                                key={day}
                                onClick={() => setSelectedDate(new Date(year, month, day))}
                                className={`h-10 w-full rounded-xl flex items-center justify-center relative text-sm font-medium transition-all
                                    ${isSelected ? 'bg-textMain text-white' :
                                        isToday ? 'bg-accent/10 text-accent' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900'}
                                `}
                            >
                                {day}
                                {hasEvent && (
                                    <div className="absolute bottom-1 flex space-x-0.5 mt-1">
                                        {hasNormal && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-accent dark:bg-emerald-400'}`} />}
                                        {hasAINameDay && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-purple-500 dark:bg-purple-400'}`} />}
                                        {hasAccountBirthday && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-amber-400 dark:bg-amber-400'}`} />}
                                        {hasAccountNameDay && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-400 dark:bg-blue-400'}`} />}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Selected Date Events */}
            <div className="pt-2">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-textMain dark:text-white text-lg capitalize">
                        {selectedDate.toLocaleDateString(i18n.language, { weekday: 'long', month: 'short', day: 'numeric' })}
                    </h3>
                    {selectedEvents.length > 0 && (
                        <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-full font-semibold px-3">
                            {selectedEvents.length} {t('home.eventsCount')}
                        </span>
                    )}
                </div>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
                    </div>
                ) : selectedEvents.length === 0 ? (
                    <div className="bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 border-dashed rounded-3xl p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                        {t('home.noEvents')}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {selectedEvents.map((event, index) => (
                            <div
                                key={event.id}
                                className={`bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100/50 dark:border-slate-700/50 relative overflow-hidden ${index === 0 ? 'shadow-floating' : 'shadow-soft'
                                    }`}
                            >
                                {index === 0 && (
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                                )}
                                <div className="relative z-10 flex items-center justify-between">
                                    <div>
                                        <p className={`text-sm font-semibold mb-1 ${getEventTextColor(event.event_type)}`}>
                                            {getEventLabel(event.event_type)}
                                        </p>
                                        <h3 className="text-lg font-bold text-textMain dark:text-white">
                                            {event.title} {event.contacts ? `- ${event.contacts.first_name} ${event.contacts.last_name}` : ''}
                                        </h3>
                                        {event.holiday && <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{event.holiday}</p>}
                                    </div>
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg overflow-hidden shadow-sm ${getEventBgColor(event.event_type)}`}>
                                        {event.contacts?.avatar_url || ((event.event_type === 'ACCOUNT_BIRTHDAY' || event.event_type === 'ACCOUNT_NAME_DAY') && user?.user_metadata?.avatar_url) ? (
                                            <img src={(event.contacts?.avatar_url || user?.user_metadata?.avatar_url) as string} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            event.contacts?.first_name?.charAt(0) || user?.user_metadata?.full_name?.charAt(0) || '?'
                                        )}
                                    </div>
                                </div>
                                {/* AI Feature is Premium Only - Do not show for Account Events */}
                                {['PRO', 'ULTRA', 'BUSINESS'].includes(subscriptionPlan || 'FREE') && event.event_type !== 'ACCOUNT_BIRTHDAY' && event.event_type !== 'ACCOUNT_NAME_DAY' && (
                                    <>
                                        <div className="mt-5 relative z-10">
                                            <button
                                                onClick={() => handleGenerateClick(event)}
                                                disabled={generatingFor === event.id}
                                                className={`w-full py-3 text-white rounded-2xl font-medium shadow-md shadow-accent/20 active:scale-95 transition-all flex justify-center items-center space-x-2 disabled:opacity-80
                                                    ${event.ai_recommendations && expandedEvent !== event.id ? 'bg-indigo-500' : 'bg-accent'}`}
                                            >
                                                {generatingFor === event.id ? (
                                                    <>
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                        <span>{t('home.deepSearching')}</span>
                                                    </>
                                                ) : event.ai_recommendations && expandedEvent !== event.id ? (
                                                    <span>{t('home.viewRecommendations')}</span>
                                                ) : event.ai_recommendations && expandedEvent === event.id ? (
                                                    <span>{t('home.closeRecommendations')}</span>
                                                ) : (
                                                    <span>{t('home.findGiftAI')}</span>
                                                )}
                                            </button>
                                        </div>
                                        
                                        {/* AI Ideas Dropdown */}
                                        {expandedEvent === event.id && (
                                            <motion.div 
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 overflow-hidden"
                                            >
                                        {event.ai_recommendations && Array.isArray(event.ai_recommendations) ? (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {event.ai_recommendations.map((gift: any, giftIdx: number) => (
                                                        <div key={giftIdx} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col h-full hover:border-accent hover:shadow-md transition-all cursor-pointer">
                                                            <div className="aspect-video w-full rounded-xl bg-slate-50 dark:bg-slate-900 mb-3 overflow-hidden">
                                                                <img
                                                                    src={gift.image_url || `https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=800&auto=format&fit=crop`}
                                                                    alt={gift.name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                            <div className="flex-1 flex flex-col">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-snug">{gift.name}</h4>
                                                                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap ml-2">
                                                                        {gift.price}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-slate-500 dark:text-slate-400 flex-1">{gift.reason}</p>
                                                            </div>
                                                            <a href={`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(gift.name)}`} target="_blank" rel="noopener noreferrer" className="mt-4 w-full py-2 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold text-center transition-colors">
                                                                {t('home.findOnline')}
                                                            </a>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 font-medium border-t border-slate-100 dark:border-slate-700">
                                                    <span>{t('home.dontLike')}</span>
                                                    <button onClick={() => handleGenerateClick(event, true)} className="mt-2 sm:mt-0 px-4 py-2 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg transition-colors flex items-center shadow-sm whitespace-nowrap">
                                                        <Sparkles className="w-3 h-3 mr-1.5 text-accent" />
                                                        {t('home.regenerateIdeas')}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : generatingFor === event.id && (
                                            <div className="py-8 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 border-dashed">
                                                <div className="w-10 h-10 mb-3 bg-purple-100 rounded-full flex items-center justify-center animate-pulse">
                                                    <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                                                </div>
                                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('home.analyzingProfile')}</p>
                                                <p className="text-xs text-slate-400 mt-1 max-w-[200px] text-center">{t('home.findingPerfectGifts')}</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Upcoming Events Section */}
            {upcomingEvents.length > 0 && (
                <div className="pt-4 pb-8 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center space-x-2 mb-4">
                        <CalendarHeart className="w-5 h-5 text-accent" />
                        <h3 className="font-bold text-textMain dark:text-white text-lg">{t('home.comingUpSoon')}</h3>
                    </div>

                    <div className="space-y-3">
                        {upcomingEvents.map(event => (
                            <div
                                key={`upcoming-${event.id}`}
                                onClick={() => {
                                    const date = new Date(event.event_date);
                                    // Make sure we select the exact month and year to navigate calendar too
                                    setCurrentDate(new Date(date.getFullYear(), date.getMonth(), 1));
                                    setSelectedDate(date);
                                }}
                                className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:bg-slate-900 transition-colors"
                            >
                                <div className="flex items-center space-x-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden shrink-0 ${getEventSmallBgColor(event.event_type)}`}>
                                        {event.contacts?.avatar_url || ((event.event_type === 'ACCOUNT_BIRTHDAY' || event.event_type === 'ACCOUNT_NAME_DAY') && user?.user_metadata?.avatar_url) ? (
                                            <img src={(event.contacts?.avatar_url || user?.user_metadata?.avatar_url) as string} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            event.contacts?.first_name?.charAt(0) || user?.user_metadata?.full_name?.charAt(0) || '?'
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-textMain dark:text-white text-sm">
                                            {event.title} {event.contacts ? `- ${event.contacts.first_name} ${event.contacts.last_name}` : ''}
                                        </h4>
                                        <p className={`text-xs font-medium capitalize ${getEventTextColor(event.event_type)}`}>
                                            {new Date(event.event_date).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-slate-400">
                                    <ChevronRight className="w-5 h-5" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Set Budget Modal */}
            <AnimatePresence>
                {budgetModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !savingBudget && setBudgetModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden pointer-events-auto flex flex-col max-h-[90vh]"
                        >
                            <div className="p-6">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t('home.setBudgetLimit')}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                                    {t('home.aiNeedsBudget')} <span className="font-semibold text-slate-700 dark:text-slate-200">{pendingEventForGifts?.contacts?.first_name}</span>.
                                </p>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">{t('home.budgetTarget')}</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <span className="text-slate-500 dark:text-slate-400 font-medium">€</span>
                                        </div>
                                        <input
                                            type="number"
                                            min="0"
                                            value={tempBudget}
                                            onChange={e => setTempBudget(e.target.value)}
                                            placeholder="e.g. 50"
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-600 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 pt-0 flex space-x-3">
                                <button
                                    onClick={() => setBudgetModalOpen(false)}
                                    disabled={savingBudget}
                                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-semibold hover:bg-slate-200 dark:bg-slate-600 transition-colors"
                                >
                                    {t('home.cancel')}
                                </button>
                                <button
                                    onClick={handleSaveBudgetAndGenerate}
                                    disabled={savingBudget || !tempBudget}
                                    className="flex-1 py-3 bg-accent text-white rounded-2xl font-semibold shadow-floating shadow-accent/20 active:scale-95 transition-all flex justify-center items-center disabled:opacity-70 whitespace-nowrap"
                                >
                                    {savingBudget ? <Loader2 className="w-5 h-5 animate-spin" /> : t('home.saveAndGenerate')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </motion.div>
    );
}
