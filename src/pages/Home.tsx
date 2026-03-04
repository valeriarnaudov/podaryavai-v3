import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { ChevronLeft, ChevronRight, Loader2, Shield, CalendarHeart, Users, Sparkles } from 'lucide-react';
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
    contacts: { id: string; first_name: string; last_name: string; avatar_url: string | null; budget_preference: number | null };
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
                if (['BIRTHDAY', 'NAME_DAY', 'ANNIVERSARY'].includes(e.event_type)) {
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
                                title: `${contact.first_name}'s Name Day`,
                                event_date: virtualDateStr,
                                event_type: 'AI_NAME_DAY',
                                contacts: contact,
                                holiday: nd.holiday
                            });
                        }
                    }
                });
            }

            setEvents(parsedEvents);
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

    const handleSaveBudgetAndGenerate = async () => {
        if (!pendingEventForGifts || !tempBudget) return;
        setSavingBudget(true);

        try {
            const budgetNum = parseFloat(tempBudget);
            
            // 1. Save to contact
            const { error: updateError } = await supabase
                .from('contacts')
                .update({ budget_preference: budgetNum })
                .eq('id', pendingEventForGifts.contacts.id);

            if (updateError) throw updateError;

            // Update local state so it doesn't prompt again
            setEvents(prev => prev.map(e => 
                e.contacts?.id === pendingEventForGifts.contacts.id 
                    ? { ...e, contacts: { ...e.contacts, budget_preference: budgetNum } }
                    : e
            ));

            setBudgetModalOpen(false);
            
            // 2. Execute Generation
            executeGeneration({
                ...pendingEventForGifts,
                contacts: { ...pendingEventForGifts.contacts, budget_preference: budgetNum }
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
                body: { contact_id: event.contacts.id, event_id: event.id, force_regenerate: forceRegenerate }
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

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 space-y-6"
        >
            <header className="pt-4 pb-2 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-textMain tracking-tight">{t('home.title')}</h1>
                    <p className="text-slate-500 text-sm mt-1">{t('home.subtitle')}</p>
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
                        className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-700 shadow-soft hover:bg-slate-50 transition-colors"
                    >
                        <Users className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Monthly Calendar */}
            <div className="bg-white p-5 rounded-3xl shadow-soft border border-slate-100/50">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={prevMonth} className="p-2 -ml-2 hover:bg-slate-50 rounded-full text-slate-600">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-lg font-bold text-textMain capitalize">
                        {currentDate.toLocaleString(i18n.language, { month: 'long', year: 'numeric' })}
                    </h2>
                    <button onClick={nextMonth} className="p-2 -mr-2 hover:bg-slate-50 rounded-full text-slate-600">
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
                        const hasNormal = dayEvents.some(e => e.event_type !== 'AI_NAME_DAY');
                        const hasAINameDay = dayEvents.some(e => e.event_type === 'AI_NAME_DAY');

                        const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
                        const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

                        return (
                            <button
                                key={day}
                                onClick={() => setSelectedDate(new Date(year, month, day))}
                                className={`h-10 w-full rounded-xl flex items-center justify-center relative text-sm font-medium transition-all
                                    ${isSelected ? 'bg-textMain text-white' :
                                        isToday ? 'bg-accent/10 text-accent' : 'text-slate-700 hover:bg-slate-50'}
                                `}
                            >
                                {day}
                                {hasEvent && (
                                    <div className="absolute bottom-1 flex space-x-0.5 mt-1">
                                        {hasNormal && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-accent'}`} />}
                                        {hasAINameDay && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-purple-500'}`} />}
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
                    <h3 className="font-bold text-textMain text-lg capitalize">
                        {selectedDate.toLocaleDateString(i18n.language, { weekday: 'long', month: 'short', day: 'numeric' })}
                    </h3>
                    {selectedEvents.length > 0 && (
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-semibold px-3">
                            {selectedEvents.length} {t('home.eventsCount')}
                        </span>
                    )}
                </div>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
                    </div>
                ) : selectedEvents.length === 0 ? (
                    <div className="bg-slate-50/50 border border-slate-100 border-dashed rounded-3xl p-8 text-center text-slate-500 text-sm">
                        {t('home.noEvents')}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {selectedEvents.map((event, index) => (
                            <div
                                key={event.id}
                                className={`bg-white p-5 rounded-3xl border border-slate-100/50 relative overflow-hidden ${index === 0 ? 'shadow-floating' : 'shadow-soft'
                                    }`}
                            >
                                {index === 0 && (
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                                )}
                                <div className="relative z-10 flex items-center justify-between">
                                    <div>
                                        <p className={`text-sm font-semibold mb-1 ${event.event_type === 'AI_NAME_DAY' ? 'text-purple-500' : 'text-rose-500'}`}>
                                            {event.event_type === 'AI_NAME_DAY' ? t('home.nameDayAI') : event.event_type}
                                        </p>
                                        <h3 className="text-lg font-bold text-textMain">{event.title} - {event.contacts?.first_name} {event.contacts?.last_name}</h3>
                                        {event.holiday && <p className="text-xs text-slate-500 font-medium mt-0.5">{event.holiday}</p>}
                                    </div>
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg overflow-hidden shadow-sm ${event.event_type === 'AI_NAME_DAY' ? 'bg-purple-100 text-purple-600' : 'bg-rose-100 text-rose-600'}`}>
                                        {event.contacts?.avatar_url ? (
                                            <img src={event.contacts.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            event.contacts?.first_name?.charAt(0) || '?'
                                        )}
                                    </div>
                                </div>
                                {/* AI Feature is Premium Only */}
                                {['PRO', 'ULTRA', 'BUSINESS'].includes(subscriptionPlan || 'FREE') && (
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
                                                className="mt-4 pt-4 border-t border-slate-100 overflow-hidden"
                                            >
                                        {event.ai_recommendations && Array.isArray(event.ai_recommendations) ? (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {event.ai_recommendations.map((gift: any, giftIdx: number) => (
                                                        <div key={giftIdx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-full hover:border-accent hover:shadow-md transition-all cursor-pointer">
                                                            <div className="aspect-video w-full rounded-xl bg-slate-50 mb-3 overflow-hidden">
                                                                <img
                                                                    src={gift.image_url || `https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=800&auto=format&fit=crop`}
                                                                    alt={gift.name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                            <div className="flex-1 flex flex-col">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <h4 className="font-bold text-slate-800 text-sm leading-snug">{gift.name}</h4>
                                                                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap ml-2">
                                                                        {gift.price}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-slate-500 flex-1">{gift.reason}</p>
                                                            </div>
                                                            <a href={`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(gift.name)}`} target="_blank" rel="noopener noreferrer" className="mt-4 w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold text-center transition-colors">
                                                                {t('home.findOnline')}
                                                            </a>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 font-medium border-t border-slate-100">
                                                    <span>{t('home.dontLike')}</span>
                                                    <button onClick={() => handleGenerateClick(event, true)} className="mt-2 sm:mt-0 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-lg transition-colors flex items-center shadow-sm whitespace-nowrap">
                                                        <Sparkles className="w-3 h-3 mr-1.5 text-accent" />
                                                        {t('home.regenerateIdeas')}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : generatingFor === event.id && (
                                            <div className="py-8 flex flex-col items-center justify-center bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                                                <div className="w-10 h-10 mb-3 bg-purple-100 rounded-full flex items-center justify-center animate-pulse">
                                                    <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                                                </div>
                                                <p className="text-sm font-semibold text-slate-700">{t('home.analyzingProfile')}</p>
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
                <div className="pt-4 pb-8 border-t border-slate-100">
                    <div className="flex items-center space-x-2 mb-4">
                        <CalendarHeart className="w-5 h-5 text-accent" />
                        <h3 className="font-bold text-textMain text-lg">{t('home.comingUpSoon')}</h3>
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
                                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center space-x-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden shrink-0 ${event.event_type === 'AI_NAME_DAY' ? 'bg-purple-50 text-purple-600' : 'bg-rose-50 text-rose-500'}`}>
                                        {event.contacts?.avatar_url ? (
                                            <img src={event.contacts.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            event.contacts?.first_name?.charAt(0) || '?'
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-textMain text-sm">
                                            {event.title} - {event.contacts?.first_name} {event.contacts?.last_name}
                                        </h4>
                                        <p className={`text-xs font-medium capitalize ${event.event_type === 'AI_NAME_DAY' ? 'text-purple-500' : 'text-rose-500'}`}>
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
                            className="relative w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden pointer-events-auto flex flex-col max-h-[90vh]"
                        >
                            <div className="p-6">
                                <h3 className="text-xl font-bold text-slate-800 mb-2">{t('home.setBudgetLimit')}</h3>
                                <p className="text-sm text-slate-500 mb-6">
                                    {t('home.aiNeedsBudget')} <span className="font-semibold text-slate-700">{pendingEventForGifts?.contacts?.first_name}</span>.
                                </p>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">{t('home.budgetTarget')}</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <span className="text-slate-500 font-medium">€</span>
                                        </div>
                                        <input
                                            type="number"
                                            min="0"
                                            value={tempBudget}
                                            onChange={e => setTempBudget(e.target.value)}
                                            placeholder="e.g. 50"
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 pt-0 flex space-x-3">
                                <button
                                    onClick={() => setBudgetModalOpen(false)}
                                    disabled={savingBudget}
                                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-semibold hover:bg-slate-200 transition-colors"
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
