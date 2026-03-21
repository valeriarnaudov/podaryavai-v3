import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { useSettings } from '../lib/SettingsContext';
import { ArrowLeft, Loader2, Camera, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function NewContact() {
    const navigate = useNavigate();
    const { user, karmaBoostUntil, refreshUserData, subscriptionPlan } = useAuth();
    const { settings } = useSettings();
    const { t } = useTranslation();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [relationship, setRelationship] = useState('Friend');
    const [birthday, setBirthday] = useState('');
    const [ageGroup, setAgeGroup] = useState('20-30');
    const [interests, setInterests] = useState('');
    const [budgetPreference, setBudgetPreference] = useState('');
    const [personality, setPersonality] = useState('Balanced');
    const [style, setStyle] = useState('Casual');
    const [favoriteColor, setFavoriteColor] = useState('');
    const [weekendActivity, setWeekendActivity] = useState('');
    const [favoriteVibe, setFavoriteVibe] = useState('');
    const [dislikes, setDislikes] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [pageError, setPageError] = useState<string | null>(null);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        setPageError(null);

        try {
            // Check limitations
            let limitStr = '-1';
            if (subscriptionPlan === 'FREE') limitStr = settings.LIMIT_CONTACTS_FREE;
            else if (subscriptionPlan === 'STANDARD') limitStr = settings.LIMIT_CONTACTS_STANDARD;
            else if (subscriptionPlan === 'PRO') limitStr = settings.LIMIT_CONTACTS_PRO;
            else if (subscriptionPlan === 'ULTRA') limitStr = settings.LIMIT_CONTACTS_ULTRA;
            else if (subscriptionPlan === 'BUSINESS') limitStr = settings.LIMIT_CONTACTS_BUSINESS;
            
            const limit = parseInt(limitStr || '-1', 10);
            
            if (limit !== -1) {
                const { count } = await supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
                if (count !== null && count >= limit) {
                    throw new Error(t('contactForm.errors.createFailedLimit', { limit }));
                }
            }

            // 1. Create Contact
            // * Requires `first_name`, `last_name`, `avatar_url` columns in DB *
            const { data: contact, error: contactError } = await supabase
                .from('contacts')
                .insert({
                    user_id: user.id,
                    first_name: firstName,
                    last_name: lastName,
                    // Save the base64 string or null
                    avatar_url: avatarUrl || null,
                    relationship,
                    age_group: ageGroup,
                    interests,
                    budget_preference: budgetPreference ? `${budgetPreference} EUR` : null, // Store with EUR for the AI prompt
                    personality,
                    style,
                    favorite_color: favoriteColor,
                    weekend_activity: weekendActivity,
                    favorite_vibe: favoriteVibe,
                    dislikes,
                    // keep "name" for backwards compatibility
                    name: `${firstName} ${lastName}`.trim()
                })
                .select()
                .single();

            if (contactError) throw contactError;

            // 2. Create the automatic Events for this contact
            const currentYear = new Date().getFullYear();
            const eventsToInsert = [];
            
            if (birthday) {
                eventsToInsert.push({
                    user_id: user.id,
                    contact_id: contact.id,
                    title: 'Рожден Ден',
                    event_type: 'BIRTHDAY',
                    event_date: birthday
                });
            }

            // Gender detection: ends with 'а', 'я', 'a', 'ya', 'ia', 'e'
            const cleanFirstName = firstName.trim().toLowerCase();
            const isFemale = /[аяae]$/i.test(cleanFirstName) || cleanFirstName.endsWith('ya') || cleanFirstName.endsWith('ia');

            if (relationship === 'Family' || relationship === 'Partner') {
                // Christmas
                eventsToInsert.push({
                    user_id: user.id,
                    contact_id: contact.id,
                    title: t('events.christmas', { defaultValue: 'Коледа' }),
                    event_type: 'CHRISTMAS',
                    event_date: `${currentYear}-12-25`
                });

                // Women's Day (8th March) if female
                if (isFemale) {
                    eventsToInsert.push({
                        user_id: user.id,
                        contact_id: contact.id,
                        title: t('events.womensDay', { defaultValue: 'Ден на жената (8ми март)' }),
                        event_type: 'WOMENS_DAY',
                        event_date: `${currentYear}-03-08`
                    });
                }
            }

            if (relationship === 'Partner') {
                // Valentine's Day
                eventsToInsert.push({
                    user_id: user.id,
                    contact_id: contact.id,
                    title: t('events.valentines', { defaultValue: 'Свети Валентин' }),
                    event_type: 'VALENTINES_DAY',
                    event_date: `${currentYear}-02-14`
                });
            }

            if (eventsToInsert.length > 0) {
                const { error: eventError } = await supabase.from('events').insert(eventsToInsert);
                if (eventError) {
                    console.error("Events insert error:", eventError);
                }
            }

            // 3. Add Karma points (gamification)
            try {
                const isBoosted = karmaBoostUntil && new Date(karmaBoostUntil) > new Date();
                const earnedPoints = isBoosted ? 20 : 10;

                const { data: userData } = await supabase.from('users').select('karma_points').eq('id', user.id).single();
                if (userData) {
                    await supabase.from('users').update({ karma_points: userData.karma_points + earnedPoints }).eq('id', user.id);
                    await refreshUserData();
                }
            } catch (karmaErr) {
                console.warn('Failed to add karma points:', karmaErr); // Gamification failure shouldn't crash contact creation
            }

            // Success! Navigate back.
            navigate(-1);
        } catch (error: any) {
            console.error('Error creating contact:', error);
            setPageError(error.message || t('contactForm.errors.createFailed'));
        } finally {
            setLoading(false);
        }
    };

    const initials = firstName ? firstName.charAt(0).toUpperCase() + (lastName ? lastName.charAt(0).toUpperCase() : '') : '';

    return (
        <div className="bg-background dark:bg-slate-900 min-h-[100dvh] pb-safe sm:h-[90dvh]">
            <header className="bg-white dark:bg-slate-800/80 backdrop-blur-lg sticky top-0 z-10 px-6 py-4 flex items-center border-b border-slate-100 dark:border-slate-700 shadow-sm">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 mr-4"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-lg font-bold text-textMain dark:text-white">{t('contactForm.titleNew')}</h1>
            </header>

            <main className="p-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-soft border border-slate-100/50 dark:border-slate-700/50">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Avatar Upload */}
                        <div className="flex justify-center mb-8">
                            <div className="relative group">
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-700 border-2 border-dashed border-slate-300 dark:border-slate-500 flex items-center justify-center cursor-pointer overflow-hidden hover:border-accent transition-colors"
                                >
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                                    ) : initials ? (
                                        <span className="text-3xl font-bold text-slate-400 group-hover:text-accent transition-colors">{initials}</span>
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
                                    placeholder={t('contactForm.firstNamePlaceholder')}
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
                                    placeholder={t('contactForm.lastNamePlaceholder')}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-600 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">{t('contactForm.birthdayLabel')}</label>
                            <input
                                type="date"
                                required
                                value={birthday}
                                onChange={e => setBirthday(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-600 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all text-slate-700 dark:text-slate-200"
                            />
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

                        {pageError && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100/50 flex flex-col">
                                <span className="font-semibold mb-1">{t('contactForm.errors.createFailed')}</span>
                                <span>{pageError}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-accent text-white rounded-2xl font-semibold shadow-floating shadow-accent/20 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-70 mt-4"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>{t('contactForm.createContactKarma', { karma: karmaBoostUntil && new Date(karmaBoostUntil) > new Date() ? '20' : '10' })}</span>}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}
