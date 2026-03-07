import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { ArrowLeft, Loader2, Save, Trash2, CalendarPlus, X, Sparkles, Camera, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { findNameDay } from '../lib/nameDaysBg';
import { useTranslation } from 'react-i18next';

interface Event {
    id: string;
    title: string;
    event_type: string;
    event_date: string;
}

export default function EditContact() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t, i18n } = useTranslation();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [relationship, setRelationship] = useState('Friend');
    const [ageGroup, setAgeGroup] = useState('20-30');
    const [interests, setInterests] = useState('');
    const [budgetPreference, setBudgetPreference] = useState('');
    const [personality, setPersonality] = useState('Balanced');
    const [style, setStyle] = useState('Casual');
    const [favoriteColor, setFavoriteColor] = useState('');
    const [weekendActivity, setWeekendActivity] = useState('');
    const [favoriteVibe, setFavoriteVibe] = useState('');
    const [dislikes, setDislikes] = useState('');
    const [events, setEvents] = useState<Event[]>([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // New Event State
    const [showEventForm, setShowEventForm] = useState(false);
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventType, setNewEventType] = useState('BIRTHDAY');
    const [newEventDate, setNewEventDate] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 150;
                const MAX_HEIGHT = 150;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height = Math.round((height * MAX_WIDTH) / width);
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width = Math.round((width * MAX_HEIGHT) / height);
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                // Compress to base64 jpeg
                const base64String = canvas.toDataURL('image/jpeg', 0.8);
                setAvatarUrl(base64String);
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    useEffect(() => {
        if (id) {
            fetchContactAndEvents();
        }
    }, [id]);

    const fetchContactAndEvents = async () => {
        setLoading(true);
        try {
            // Fetch contact
            const { data: contactData, error: contactError } = await supabase
                .from('contacts')
                .select('*')
                .eq('id', id)
                .single();

            if (contactError) throw contactError;
            setFirstName(contactData.first_name || '');
            setLastName(contactData.last_name || '');
            setAvatarUrl(contactData.avatar_url || '');
            setRelationship(contactData.relationship);
            setAgeGroup(contactData.age_group || '20-30');
            setInterests(contactData.interests || '');
            // Strip the " EUR" off the end for the number input if it exists
            const budgetVal = (contactData.budget_preference || '').replace(' EUR', '');
            setBudgetPreference(budgetVal);
            setPersonality(contactData.personality || 'Balanced');
            setStyle(contactData.style || 'Casual');
            setFavoriteColor(contactData.favorite_color || '');
            setWeekendActivity(contactData.weekend_activity || '');
            setFavoriteVibe(contactData.favorite_vibe || '');
            setDislikes(contactData.dislikes || '');

            // Fetch events for this contact
            const { data: eventsData, error: eventsError } = await supabase
                .from('events')
                .select('*')
                .eq('contact_id', id)
                .order('event_date', { ascending: true });

            if (eventsError) throw eventsError;
            setEvents(eventsData || []);

        } catch (error) {
            console.error('Error fetching details:', error);
            alert(t('contactForm.errors.loadFailed'));
            navigate('/contacts');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateContact = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase
                .from('contacts')
                .update({
                    first_name: firstName,
                    last_name: lastName,
                    avatar_url: avatarUrl || null,
                    relationship,
                    age_group: ageGroup,
                    interests: interests,
                    budget_preference: budgetPreference ? `${budgetPreference} EUR` : null,
                    personality,
                    style,
                    favorite_color: favoriteColor,
                    weekend_activity: weekendActivity,
                    favorite_vibe: favoriteVibe,
                    dislikes,
                    name: `${firstName} ${lastName}`.trim()
                })
                .eq('id', id);

            if (error) throw error;
            navigate('/contacts');
        } catch (error) {
            console.error('Error updating contact:', error);
            alert(t('contactForm.errors.updateFailed'));
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteContact = async () => {
        if (!confirm(t('contactForm.deleteContactConfirm'))) return;
        setSaving(true);
        try {
            const { error } = await supabase.from('contacts').delete().eq('id', id);
            if (error) throw error;
            navigate('/contacts');
        } catch (error) {
            console.error('Error deleting contact:', error);
            alert(t('contactForm.errors.deleteFailed'));
            setSaving(false);
        }
    };

    const handleAddEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !id) return;

        try {
            let eventTitle = newEventTitle;
            if (newEventType === 'BIRTHDAY') eventTitle = 'Birthday';
            if (newEventType === 'NAME_DAY') eventTitle = 'Name Day';
            if (newEventType === 'ANNIVERSARY') eventTitle = 'Anniversary';

            const { data, error } = await supabase.from('events').insert({
                user_id: user.id,
                contact_id: id,
                title: eventTitle,
                event_type: newEventType,
                event_date: newEventDate
            }).select().single();

            if (error) throw error;

            setEvents([...events, data]);
            setShowEventForm(false);
            setNewEventTitle('');
            setNewEventDate('');
            setNewEventType('BIRTHDAY');
        } catch (error) {
            console.error('Error adding event:', error);
            alert(t('contactForm.errors.addDateFailed'));
        }
    };

    const handleDeleteEvent = async (eventId: string) => {
        if (!confirm(t('contactForm.errors.deleteEventConfirm'))) return;
        try {
            const { error } = await supabase.from('events').delete().eq('id', eventId);
            if (error) throw error;
            setEvents(events.filter(e => e.id !== eventId));
        } catch (error) {
            console.error('Error deleting event:', error);
        }
    };

    if (loading) {
        return (
            <div className="bg-background dark:bg-slate-900 min-h-[100dvh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
            </div>
        );
    }

    return (
        <div className="bg-background dark:bg-slate-900 min-h-[100dvh] pb-safe sm:h-[90dvh]">
            <header className="bg-white dark:bg-slate-800/80 backdrop-blur-lg sticky top-0 z-10 px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-700 shadow-sm">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-lg font-bold text-textMain dark:text-white">{t('contactForm.titleEdit')}</h1>
                <div className="w-10"></div> {/* Spacer for centering */}
            </header>

            <main className="p-6 space-y-8">
                {/* Contact Form Details */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-soft border border-slate-100/50 dark:border-slate-700/50">
                    <form onSubmit={handleUpdateContact} className="space-y-6">
                        {/* Avatar Upload / Display */}
                        <div className="flex justify-center mb-6">
                            <div className="relative group">
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-700 border-2 border-dashed border-slate-300 dark:border-slate-500 flex items-center justify-center cursor-pointer overflow-hidden hover:border-accent transition-colors"
                                >
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                                    ) : (firstName || lastName) ? (
                                        <span className="text-3xl font-bold text-slate-400 group-hover:text-accent transition-colors">
                                            {(firstName?.[0] || '') + (lastName?.[0] || '')}
                                        </span>
                                    ) : (
                                        <User className="w-8 h-8 text-slate-300 group-hover:text-accent transition-colors" />
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-0 right-0 w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white hover:scale-110 transition-transform"
                                >
                                    <Camera className="w-4 h-4" />
                                </button>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleImageUpload}
                                />
                            </div>
                        </div>

                        <div className="flex space-x-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">{t('contactForm.firstName')}</label>
                                <input
                                    type="text"
                                    required
                                    value={firstName}
                                    onChange={e => setFirstName(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-600 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">{t('contactForm.lastName')}</label>
                                <input
                                    type="text"
                                    required
                                    value={lastName}
                                    onChange={e => setLastName(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-600 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">{t('contactForm.relationship')}</label>
                            <select
                                value={relationship}
                                onChange={e => setRelationship(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-600 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all appearance-none"
                            >
                                <option value="Friend">{t('contactForm.relationships.friend')}</option>
                                <option value="Family">{t('contactForm.relationships.family')}</option>
                                <option value="Partner">{t('contactForm.relationships.partner')}</option>
                                <option value="Colleague">{t('contactForm.relationships.colleague')}</option>
                                <option value="Other">{t('contactForm.relationships.other')}</option>
                            </select>
                        </div>

                        {/* AI Profiling Form */}
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center">
                                <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider mr-2">{t('contactForm.aiFeature')}</span>
                                {t('contactForm.giftProfiling')}
                            </h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">{t('contactForm.ageGroup')}</label>
                                    <select
                                        value={ageGroup}
                                        onChange={e => setAgeGroup(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-600 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 outline-none transition-all appearance-none"
                                    >
                                        <option value="Child (0-12)">{t('contactForm.ages.child')}</option>
                                        <option value="Teen (13-19)">{t('contactForm.ages.teen')}</option>
                                        <option value="20-30">{t('contactForm.ages.20')}</option>
                                        <option value="30-40">{t('contactForm.ages.30')}</option>
                                        <option value="40-50">{t('contactForm.ages.40')}</option>
                                        <option value="50-60">{t('contactForm.ages.50')}</option>
                                        <option value="60+">{t('contactForm.ages.60')}</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">{t('contactForm.personality')}</label>
                                    <select
                                        value={personality}
                                        onChange={e => setPersonality(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-600 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 outline-none transition-all appearance-none"
                                    >
                                        <option value="Balanced">{t('contactForm.personalities.balanced')}</option>
                                        <option value="Introvert/Homebody">{t('contactForm.personalities.introvert')}</option>
                                        <option value="Extrovert/Social">{t('contactForm.personalities.extrovert')}</option>
                                        <option value="Adventurous/Active">{t('contactForm.personalities.adventurous')}</option>
                                        <option value="Creative/Artistic">{t('contactForm.personalities.creative')}</option>
                                        <option value="Practical/Logical">{t('contactForm.personalities.practical')}</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">{t('contactForm.style')}</label>
                                    <select
                                        value={style}
                                        onChange={e => setStyle(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-600 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 outline-none transition-all appearance-none"
                                    >
                                        <option value="Casual">{t('contactForm.styles.casual')}</option>
                                        <option value="Minimalist">{t('contactForm.styles.minimalist')}</option>
                                        <option value="Luxury">{t('contactForm.styles.luxury')}</option>
                                        <option value="Handmade/Artisanal">{t('contactForm.styles.handmade')}</option>
                                        <option value="Tech-focused">{t('contactForm.styles.tech')}</option>
                                        <option value="Sporty">{t('contactForm.styles.sporty')}</option>
                                        <option value="Vintage/Retro">{t('contactForm.styles.vintage')}</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">{t('contactForm.favoriteColor')}</label>
                                    <select
                                        value={favoriteColor}
                                        onChange={e => setFavoriteColor(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-600 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 outline-none transition-all appearance-none"
                                    >
                                        <option value="">{t('contactForm.colors.any')}</option>
                                        <option value="Black">{t('contactForm.colors.black')}</option>
                                        <option value="White">{t('contactForm.colors.white')}</option>
                                        <option value="Blue">{t('contactForm.colors.blue')}</option>
                                        <option value="Red">{t('contactForm.colors.red')}</option>
                                        <option value="Green">{t('contactForm.colors.green')}</option>
                                        <option value="Yellow">{t('contactForm.colors.yellow')}</option>
                                        <option value="Purple">{t('contactForm.colors.purple')}</option>
                                        <option value="Pink">{t('contactForm.colors.pink')}</option>
                                        <option value="Pastels">{t('contactForm.colors.pastels')}</option>
                                        <option value="Earth Tones">{t('contactForm.colors.earth')}</option>
                                        <option value="Monochrome">{t('contactForm.colors.monochrome')}</option>
                                    </select>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">{t('contactForm.favoriteVibe')}</label>
                                        <select
                                            value={favoriteVibe}
                                            onChange={e => setFavoriteVibe(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-600 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 outline-none transition-all appearance-none"
                                        >
                                            <option value="">{t('contactForm.vibes.any')}</option>
                                            <option value="Cozy">{t('contactForm.vibes.cozy')}</option>
                                            <option value="Techy">{t('contactForm.vibes.techy')}</option>
                                            <option value="Glamorous">{t('contactForm.vibes.glamorous')}</option>
                                            <option value="Minimalist">{t('contactForm.vibes.minimalist')}</option>
                                            <option value="Earthy">{t('contactForm.vibes.earthy')}</option>
                                            <option value="Industrial">{t('contactForm.vibes.industrial')}</option>
                                            <option value="Vintage">{t('contactForm.vibes.vintage')}</option>
                                            <option value="Sporty">{t('contactForm.vibes.sporty')}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">{t('contactForm.dislikesLabel')}</label>
                                        <input
                                            type="text"
                                            value={dislikes}
                                            onChange={e => setDislikes(e.target.value)}
                                            placeholder={t('contactForm.dislikesPlaceholder')}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-600 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">{t('contactForm.weekendActivity')}</label>
                                    <select
                                        value={weekendActivity}
                                        onChange={e => setWeekendActivity(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-600 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 outline-none transition-all appearance-none"
                                    >
                                        <option value="">{t('contactForm.activities.any')}</option>
                                        <option value="Outdoors & Hiking">{t('contactForm.activities.outdoors')}</option>
                                        <option value="Netflix & Chill">{t('contactForm.activities.netflix')}</option>
                                        <option value="Partying & Events">{t('contactForm.activities.partying')}</option>
                                        <option value="Board Games & Puzzles">{t('contactForm.activities.boardGames')}</option>
                                        <option value="Cooking & Baking">{t('contactForm.activities.cooking')}</option>
                                        <option value="Reading & Coffee">{t('contactForm.activities.reading')}</option>
                                        <option value="Sports & Gym">{t('contactForm.activities.sports')}</option>
                                        <option value="Video Games">{t('contactForm.activities.videoGames')}</option>
                                        <option value="DIY & Crafts">{t('contactForm.activities.diy')}</option>
                                        <option value="Traveling & Exploring">{t('contactForm.activities.traveling')}</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">{t('contactForm.interestsLabel')}</label>
                                    <textarea
                                        value={interests}
                                        onChange={e => setInterests(e.target.value)}
                                        placeholder={t('contactForm.interestsPlaceholder')}
                                        rows={3}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-600 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 outline-none transition-all resize-none"
                                    />
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        {t('contactForm.aiDisclaimer')}
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">{t('contactForm.budgetLabel')}</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <span className="text-slate-500 dark:text-slate-400 font-medium">€</span>
                                        </div>
                                        <input
                                            type="number"
                                            min="0"
                                            value={budgetPreference}
                                            onChange={e => setBudgetPreference(e.target.value)}
                                            placeholder={t('contactForm.budgetPlaceholder')}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-600 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-semibold shadow-soft active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-70"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                <>
                                    <Save className="w-5 h-5" />
                                    <span>{t('contactForm.saveContact')}</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Automatic Name Day Display */}
                <AnimatePresence>
                    {firstName && findNameDay(firstName) && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-3xl border border-indigo-100 shadow-sm flex items-start space-x-4"
                        >
                            <div className="bg-white dark:bg-slate-800 p-2 rounded-xl text-indigo-500 shadow-sm">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-indigo-900 flex items-center">
                                    {t('contactForm.smartNameDay')} <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{t('contactForm.autoLabel')}</span>
                                </h3>
                                <p className="text-sm text-indigo-800/80 mt-1">
                                    {t('contactForm.celebratesOn', { name: firstName, date: new Date(`2024-${findNameDay(firstName)!.date}`).toLocaleDateString(i18n.language, { month: 'long', day: 'numeric' }), holiday: findNameDay(firstName)!.holiday })}
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Important Dates Management */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-textMain dark:text-white">{t('contactForm.importantDates')}</h2>
                        <button
                            onClick={() => setShowEventForm(!showEventForm)}
                            className="text-accent text-sm font-semibold hover:underline flex items-center"
                        >
                            <CalendarPlus className="w-4 h-4 mr-1" /> {t('contactForm.addDate')}
                        </button>
                    </div>

                    {showEventForm && (
                        <motion.form
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            onSubmit={handleAddEvent}
                            className="bg-accent/5 p-4 rounded-2xl border border-accent/20 mb-4 space-y-4"
                        >
                            {newEventType === 'OTHER' && (
                                <div>
                                    <input type="text" placeholder={t('contactForm.eventTitlePlaceholder')} required value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 text-sm focus:border-accent outline-none" />
                                </div>
                            )}
                            <div className="flex space-x-2">
                                <select value={newEventType} onChange={e => setNewEventType(e.target.value)} className="w-1/2 px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 text-sm appearance-none focus:border-accent outline-none">
                                    <option value="BIRTHDAY">{t('contactForm.eventTypes.BIRTHDAY')}</option>
                                    <option value="NAME_DAY">{t('contactForm.eventTypes.NAME_DAY')}</option>
                                    <option value="ANNIVERSARY">{t('contactForm.eventTypes.ANNIVERSARY')}</option>
                                    <option value="OTHER">{t('contactForm.eventTypes.OTHER')}</option>
                                </select>
                                <input type="date" required value={newEventDate} onChange={e => setNewEventDate(e.target.value)}
                                    className="w-1/2 px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 text-sm" />
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button type="button" onClick={() => setShowEventForm(false)} className="px-3 py-1.5 text-sm text-slate-500 dark:text-slate-400 font-medium hover:text-slate-700 dark:text-slate-200">{t('contactForm.cancel')}</button>
                                <button type="submit" className="px-3 py-1.5 bg-accent text-white text-sm font-medium rounded-lg">{t('contactForm.add')}</button>
                            </div>
                        </motion.form>
                    )}

                    <div className="space-y-3">
                        {events.length === 0 && !showEventForm ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100/50 dark:border-slate-700/50 border-dashed">{t('contactForm.noDates')}</p>
                        ) : (
                            events.map(event => (
                                <div key={event.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center group">
                                    <div>
                                        <h4 className="font-semibold text-textMain dark:text-white text-sm">
                                            {['Birthday', 'Name Day', 'Anniversary'].includes(event.title) 
                                                ? t(`contactForm.eventTypes.${event.event_type}`) 
                                                : event.title}
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{new Date(event.event_date).toLocaleDateString(i18n.language)} • {t(`contactForm.eventTypes.${event.event_type}`) || event.event_type}</p>
                                    </div>
                                    <button onClick={() => handleDeleteEvent(event.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="pt-8 border-t border-red-100/50 flex justify-center">
                    <button
                        type="button"
                        onClick={handleDeleteContact}
                        disabled={saving}
                        className="px-6 py-3 bg-red-50 text-red-600 rounded-2xl font-semibold hover:bg-red-100 active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-70"
                    >
                        <Trash2 className="w-5 h-5" />
                        <span>{t('contactForm.deleteContact')}</span>
                    </button>
                </div>
            </main>
        </div>
    );
}
