import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { User, Mail, LogOut, Loader2, Save, Settings, Edit3, Crown, Calendar, Lock, Award, Heart, Globe, Moon, Sun, Monitor, Share2, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DailyStreakModal from '../components/DailyStreakModal';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../lib/SettingsContext';

export default function Profile() {
    const { user, signOut, hasGoldenAura, subscriptionPlan, activeReward } = useAuth();
    const { settings } = useSettings();
    const navigate = useNavigate();

    const [isEditing, setIsEditing] = useState(false);
    const [portalLoading, setPortalLoading] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const { t, i18n } = useTranslation();
    const { theme, setTheme } = useTheme();

    const toggleLanguage = () => {
        i18n.changeLanguage(i18n.language === 'en' ? 'bg' : 'en');
    };

    const getThemeIcon = () => {
        if (theme === 'light') return <Sun className="w-4 h-4 text-amber-500" />;
        if (theme === 'dark') return <Moon className="w-4 h-4 text-indigo-400" />;
        return <Monitor className="w-4 h-4 text-slate-400" />;
    };

    // Form fields
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [dob, setDob] = useState('');
    const [password, setPassword] = useState('');

    // Notification Preferences
    const [notifyEmailEvents, setNotifyEmailEvents] = useState(true);

    // Giftinder Preferences (Matching Contacts)
    const [ageGroup, setAgeGroup] = useState('');
    const [personality, setPersonality] = useState('Balanced');
    const [style, setStyle] = useState('Casual');
    const [favoriteColor, setFavoriteColor] = useState('');
    const [weekendActivity, setWeekendActivity] = useState('');
    const [favoriteVibe, setFavoriteVibe] = useState('');
    const [dislikes, setDislikes] = useState('');
    const [interests, setInterests] = useState('');
    const [budgetPreference, setBudgetPreference] = useState('');

    // Status UI
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);

    useEffect(() => {
        if (user) {
            setFirstName(user.user_metadata?.first_name || (user.user_metadata?.full_name?.split(' ')[0] || ''));
            setLastName(user.user_metadata?.last_name || (user.user_metadata?.full_name?.split(' ')?.slice(1)?.join(' ') || ''));
            setEmail(user.email || '');
            setDob(user.user_metadata?.dob || '');

            const fetchGiftinderPrefs = async () => {
                const { data } = await supabase.from('users').select('giftinder_preferences, notify_email_events').eq('id', user.id).single();
                if (data) {
                    if (data.notify_email_events !== undefined) {
                        setNotifyEmailEvents(data.notify_email_events);
                    }
                    if (data.giftinder_preferences) {
                        const prefs = data.giftinder_preferences as any;
                        setAgeGroup(prefs.ageGroup || '');
                        setPersonality(prefs.personality || 'Balanced');
                        setStyle(prefs.style || 'Casual');
                        setFavoriteColor(prefs.favoriteColor || '');
                        setWeekendActivity(prefs.weekendActivity || '');
                        setFavoriteVibe(prefs.favoriteVibe || '');
                        setDislikes(prefs.dislikes || '');
                        setInterests(prefs.interests || '');
                        setBudgetPreference(prefs.budgetPreference || '');
                    }
                }
            };
            fetchGiftinderPrefs();
        }
    }, [user]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setSaving(true);
        setMessage('');
        setError('');

        try {
            // 1. Update metadata (Name and DOB)
            const updates: any = {
                data: {
                    first_name: firstName.trim(),
                    last_name: lastName.trim(),
                    full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
                    dob: dob
                }
            };

            // 2. Update optional critical fields if changed
            if (password.trim() !== '') {
                updates.password = password;
            }
            if (email !== user.email) {
                updates.email = email;
            }

            const { error: updateError } = await supabase.auth.updateUser(updates);
            if (updateError) throw updateError;
            
            const prefs = { 
                ageGroup, 
                personality, 
                style, 
                favoriteColor: favoriteColor.trim(),
                weekendActivity: weekendActivity.trim(),
                favoriteVibe: favoriteVibe.trim(),
                dislikes: dislikes.trim(),
                interests: interests.trim(), 
                budgetPreference 
            };
            const { error: prefsError } = await supabase.from('users').update({ 
                giftinder_preferences: prefs,
                notify_email_events: notifyEmailEvents
            }).eq('id', user.id);
            if (prefsError) throw prefsError;

            setMessage(email !== user.email ? 'Profile updated. Please check email to confirm change.' : 'Profile updated successfully!');
            setIsEditing(false); // Close edit mode on success
            if (password) setPassword(''); // clear password field
        } catch (err: any) {
            console.error('Error updating profile:', err);
            setError(err.message || 'Failed to update profile.');
        } finally {
            setSaving(false);
            if (!error) setTimeout(() => setMessage(''), 5000);
        }
    };

    const handleLogout = async () => {
        setLoading(true);
        try {
            await signOut();
            navigate('/login');
        } catch (err) {
            console.error('Error logging out:', err);
            alert('Failed to log out.');
            setLoading(false);
        }
    };

    const handleShareProfile = async () => {
        if (!user) return;
        const inviteLink = `${window.location.origin}/register?ref=${user.id}`;
        const points = settings.REFERRAL_REWARD_BASE || '50';
        const text = t('profile.shareText', { defaultValue: 'Хей! Използвам Podaryavai, за да следя рождените дни и да намирам страхотни подаръци. Добави ме и виж моя Wishlist: ' }) + inviteLink;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Podaryavai Invite',
                    text: text,
                    url: inviteLink
                });
            } catch (err) {
                console.log('Share canceled or failed', err);
            }
        } else {
            // Fallback for desktop: Copy to clipboard
            await navigator.clipboard.writeText(text);
            alert(t('profile.shareCopiedPoints', { 
                defaultValue: `Линкът за покана е копиран в клипборда! Ще получиш +{{points}} Карма при регистрация.`,
                points 
            }));
        }
    };

    const handleOpenPortal = async () => {
        if (!user) return;
        setPortalLoading(true);
        setError('');
        
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token;
            
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create_portal_session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const responseData = await response.json();

            if (!response.ok) {
                console.error("Portal Error:", responseData);
                throw new Error(responseData.error || "Failed to open billing portal.");
            }

            if (responseData?.url) {
                window.location.href = responseData.url;
            }
        } catch (err: any) {
            console.error("Portal error:", err);
            setError(err.message || 'Failed to initialize Stripe Customer Portal.');
            setTimeout(() => setError(''), 5000);
        } finally {
            setPortalLoading(false);
        }
    };

    // Calculate initial logo or avatar
    const displayFullName = `${firstName} ${lastName}`.trim();
    const avatarUrl = user?.user_metadata?.avatar_url;
    const initial = firstName ? firstName.charAt(0).toUpperCase() : displayFullName ? displayFullName.charAt(0).toUpperCase() : email ? email.charAt(0).toUpperCase() : '?';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 space-y-6 max-w-2xl mx-auto"
        >
            <header className="pt-4 pb-2 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-textMain dark:text-white tracking-tight">{t('profile.title')}</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('profile.subtitle')}</p>
                </div>
            </header>

            {/* Main Profile Info & Edit Form */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-soft border border-slate-100/50 dark:border-slate-700/50 space-y-6 relative overflow-hidden">
                <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-4">
                        <div className={`relative ${hasGoldenAura ? 'p-1 rounded-full bg-gradient-to-tr from-amber-300 via-yellow-400 to-orange-500 shadow-[0_0_15px_rgba(251,191,36,0.5)]' : ''}`}>
                            {hasGoldenAura && (
                                <motion.div
                                    className="absolute inset-0 rounded-full border-2 border-white/50"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                />
                            )}
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full border-2 border-white shadow-md object-cover relative z-10" />
                            ) : (
                                <div className="w-20 h-20 bg-gradient-to-tr from-accent to-accent/60 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-md relative z-10">
                                    {initial}
                                </div>
                            )}
                        </div>
                        <div className="relative flex-1">
                            <div className="flex items-center justify-between w-full">
                                <h2 className="text-xl sm:text-2xl font-bold text-textMain dark:text-white truncate pr-2">{displayFullName || t('profile.unknownUser')}</h2>
                                <div className="flex items-center space-x-1 shrink-0">
                                    <button
                                        onClick={handleShareProfile}
                                        className="p-1.5 text-slate-400 hover:text-accent bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:bg-slate-700 rounded-full transition-colors relative"
                                        title={t('profile.shareProfile', { defaultValue: 'Сподели Профил' })}
                                    >
                                        <Share2 className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                                        className="p-1.5 text-slate-400 hover:text-accent bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:bg-slate-700 rounded-full transition-colors relative"
                                        title="App Settings"
                                    >
                                        <Settings className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1 truncate">{email}</p>

                            {/* Settings Dropdown */}
                            <AnimatePresence>
                                {isSettingsOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                        className="absolute left-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50"
                                    >
                                        <div className="p-3 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                {t('profile.preferences')}
                                            </span>
                                            <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-300 text-xs font-medium">{t('profile.cancel')}</button>
                                        </div>
                                        
                                        <div className="p-2 space-y-1">
                                            {/* Language Toggle */}
                                            <button
                                                onClick={toggleLanguage}
                                                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-700/50 transition-colors"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <Globe className="w-4 h-4 text-blue-500" />
                                                    <span>{t('profile.language')}</span>
                                                </div>
                                                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 dark:text-slate-400 uppercase bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md">
                                                    {i18n.language === 'en' ? 'EN' : 'BG'}
                                                </span>
                                            </button>

                                            {/* Theme Toggle */}
                                            <div className="px-3 py-2 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                                                        {getThemeIcon()}
                                                        <span>{t('profile.theme')}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
                                                    <button 
                                                        onClick={() => setTheme('light')}
                                                        className={`flex-1 py-1 text-xs font-bold rounded-md transition-colors ${theme === 'light' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 dark:hover:text-slate-300'}`}
                                                    >
                                                        {t('profile.themeLight')}
                                                    </button>
                                                    <button 
                                                        onClick={() => setTheme('dark')}
                                                        className={`flex-1 py-1 text-xs font-bold rounded-md transition-colors ${theme === 'dark' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 dark:hover:text-slate-300'}`}
                                                    >
                                                        {t('profile.themeDark')}
                                                    </button>
                                                    <button 
                                                        onClick={() => setTheme('system')}
                                                        className={`flex-1 py-1 text-xs font-bold rounded-md transition-colors ${theme === 'system' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 dark:hover:text-slate-300'}`}
                                                    >
                                                        {t('profile.themeSystem')}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="h-px bg-slate-100 dark:bg-slate-700 my-2" />
                                            
                                            {/* Notification Preferences */}
                                            <div className="px-3 py-2">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('profile.notifications')}</span>
                                                </div>
                                                <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-900 rounded-lg p-2">
                                                    <div>
                                                        <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">{t('profile.emailAlerts')}</p>
                                                    </div>
                                                    <button
                                                        onClick={async () => {
                                                            const newValue = !notifyEmailEvents;
                                                            setNotifyEmailEvents(newValue);
                                                            if (user) await supabase.from('users').update({ notify_email_events: newValue }).eq('id', user.id);
                                                        }}
                                                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                            notifyEmailEvents ? 'bg-accent' : 'bg-slate-300 dark:bg-slate-600'
                                                        }`}
                                                    >
                                                        <span
                                                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white dark:bg-slate-800 shadow ring-0 transition duration-200 ease-in-out ${
                                                                notifyEmailEvents ? 'translate-x-4' : 'translate-x-0'
                                                            }`}
                                                        />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="h-px bg-slate-100 dark:bg-slate-700 my-2" />
                                            
                                            {/* Logout */}
                                            <button
                                                onClick={handleLogout}
                                                disabled={loading}
                                                className="w-full flex items-center justify-start px-3 py-2 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            >
                                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-3" /> : <LogOut className="w-4 h-4 mr-3" />}
                                                <span>{t('profile.logout')}</span>
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                    {!isEditing && (
                        <button onClick={() => setIsEditing(true)} className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-accent bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:bg-slate-700 rounded-xl transition-colors">
                            <Edit3 className="w-4 h-4" />
                            <span>{t('profile.editProfile')}</span>
                        </button>
                    )}
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-700 w-full" />

                <AnimatePresence mode="wait">
                    {!isEditing ? (
                        <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl">
                                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1 flex items-center"><User className="w-3 h-3 mr-1" /> {t('profile.fullName')}</p>
                                    <p className="font-semibold text-textMain dark:text-white break-words">{displayFullName || '-'}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl">
                                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1 flex items-center"><Calendar className="w-3 h-3 mr-1" /> {t('profile.dob')}</p>
                                    <p className="font-semibold text-textMain dark:text-white break-words">{dob || '-'}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl sm:col-span-2">
                                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1 flex items-center"><Mail className="w-3 h-3 mr-1" /> {t('profile.emailAddress')}</p>
                                    <p className="font-semibold text-textMain dark:text-white break-words">{email}</p>
                                </div>
                            </div>
                            
                            {/* Read-Only Giftinder Preferences */}
                            <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl mt-4">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center">
                                    <Heart className="w-4 h-4 mr-2 text-rose-500" />
                                    {t('profile.giftinderProfile')}
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">{t('profile.ageGroup')}</p>
                                        <p className="font-semibold text-textMain dark:text-white text-sm">{ageGroup || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">{t('profile.personality')}</p>
                                        <p className="font-semibold text-textMain dark:text-white text-sm">{personality || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">{t('profile.style')}</p>
                                        <p className="font-semibold text-textMain dark:text-white text-sm">{style || '-'}</p>
                                    </div>
                                    {favoriteColor && (
                                        <div>
                                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">{t('profile.favoriteColor')}</p>
                                            <p className="font-semibold text-textMain dark:text-white text-sm">{favoriteColor}</p>
                                        </div>
                                    )}
                                    {budgetPreference && (
                                        <div>
                                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">{t('profile.budgetPref')}</p>
                                            <p className="font-semibold text-textMain dark:text-white text-sm">€{budgetPreference}</p>
                                        </div>
                                    )}
                                    <div className="col-span-2 sm:col-span-3">
                                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">{t('profile.interestsHobbies')}</p>
                                        <p className="font-semibold text-textMain dark:text-white text-sm">{interests || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            {message && <p className="text-sm font-medium text-green-600 bg-green-50 p-3 rounded-xl">{message}</p>}
                        </motion.div>
                    ) : (
                        <motion.form key="edit" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={handleUpdateProfile} className="space-y-5">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">{t('contactForm.firstName')}</label>
                                        <input
                                            type="text"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            placeholder={t('contactForm.firstNamePlaceholder')}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-600 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">{t('contactForm.lastName')}</label>
                                        <input
                                            type="text"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            placeholder={t('contactForm.lastNamePlaceholder')}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-600 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">{t('profile.dob')}</label>
                                    <input
                                        type="date"
                                        value={dob}
                                        onChange={(e) => setDob(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-600 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all text-slate-700 dark:text-slate-200"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">{t('profile.emailAddress')}</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-600 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                />
                                <p className="text-xs text-slate-400 mt-1">{t('profile.emailVerification')}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">{t('profile.newPassword')}</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder={t('profile.newPasswordPlaceholder')}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-600 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Giftinder AI Preferences */}
                            <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-700">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center">
                                    <Heart className="w-5 h-5 mr-2 text-rose-500" />
                                    {t('profile.giftinderAIPrefs')}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{t('profile.giftinderAIDesc')}</p>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">{t('profile.ageGroup')}</label>
                                            <select
                                                value={ageGroup}
                                                onChange={e => setAgeGroup(e.target.value)}
                                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-600 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all appearance-none"
                                            >
                                                <option value="">{t('profile.selectAgeGroup')}</option>
                                                <option value="Child (0-12)">Child (0-12)</option>
                                                <option value="Teen (13-19)">Teen (13-19)</option>
                                                <option value="20-30">20 - 30</option>
                                                <option value="30-40">30 - 40</option>
                                                <option value="40-50">40 - 50</option>
                                                <option value="50-60">50 - 60</option>
                                                <option value="60+">60+</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">{t('profile.personality')}</label>
                                            <select
                                                value={personality}
                                                onChange={e => setPersonality(e.target.value)}
                                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-600 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all appearance-none"
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
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">{t('profile.style')}</label>
                                            <select
                                                value={style}
                                                onChange={e => setStyle(e.target.value)}
                                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-600 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all appearance-none"
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
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">{t('profile.favoriteColor')}</label>
                                            <select
                                                value={favoriteColor}
                                                onChange={e => setFavoriteColor(e.target.value)}
                                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-600 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all appearance-none"
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
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">{t('profile.favoriteVibe')}</label>
                                            <select
                                                value={favoriteVibe}
                                                onChange={e => setFavoriteVibe(e.target.value)}
                                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-600 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all appearance-none"
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
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">{t('profile.dislikesLabel')}</label>
                                            <input
                                                type="text"
                                                value={dislikes}
                                                onChange={e => setDislikes(e.target.value)}
                                                placeholder={t('profile.dislikesPlaceholder')}
                                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-600 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">{t('profile.weekendActivity')}</label>
                                        <select
                                            value={weekendActivity}
                                            onChange={e => setWeekendActivity(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-600 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all appearance-none"
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
                                            rows={2}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-600 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all resize-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">{t('profile.budgetTarget')}</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <span className="text-slate-500 dark:text-slate-400 font-medium">€</span>
                                            </div>
                                            <input
                                                type="number"
                                                min="0"
                                                value={budgetPreference}
                                                onChange={e => setBudgetPreference(e.target.value)}
                                                placeholder={t('profile.budgetTargetPlaceholder')}
                                                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-600 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex space-x-3 pt-2">
                                <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-semibold hover:bg-slate-200 dark:bg-slate-600 transition-colors">
                                    {t('profile.cancel')}
                                </button>
                                <button type="submit" disabled={saving} className="flex-1 py-3 bg-accent text-white rounded-2xl font-semibold active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-70 shadow-floating shadow-accent/20">
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            <span>{t('profile.save')}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                            {error && <p className="text-sm font-medium text-red-500 bg-red-50 p-3 rounded-xl">{error}</p>}
                        </motion.form>
                    )}
                </AnimatePresence>
            </div>

            {/* Daily Streak Card */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-soft border border-slate-100/50 dark:border-slate-700/50 relative overflow-hidden flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                        <Zap className="w-6 h-6" fill="currentColor" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-100">{t('gamification.streakTitle', { defaultValue: 'Дневен Бонус' })}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {t('gamification.checkStreak', { defaultValue: 'Проследи своята серия и вземи Карма' })}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setIsStreakModalOpen(true)}
                    className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-all active:scale-95 text-sm"
                >
                    {t('gamification.view', { defaultValue: 'Виж' })}
                </button>
            </div>

            <DailyStreakModal 
                isOpen={isStreakModalOpen} 
                onClose={() => setIsStreakModalOpen(false)} 
            />

            {/* Subscription Plan Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-3xl shadow-soft text-white relative overflow-hidden flex flex-col gap-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white dark:bg-slate-800/5 rounded-full blur-3xl -mr-10 -mt-10" />
                
                {/* Active Reward Full-Width Banner */}
                {activeReward && (
                    <div className="relative z-10 w-full bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Award className="w-5 h-5 text-emerald-400" />
                                <h4 className="font-bold text-emerald-400 text-xs tracking-widest uppercase">{t('profile.activeKarmaReward')}</h4>
                            </div>
                            <p className="text-white font-medium">{activeReward.title} (Expires: {new Date(activeReward.expires_at).toLocaleDateString()})</p>
                        </div>
                        <div className="sm:text-right shrink-0">
                            <span className="text-xs text-emerald-200">{t('profile.timeRemaining')}</span>
                            <p className="font-bold text-white text-lg">
                                {Math.max(0, Math.ceil((new Date(activeReward.expires_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24)))} {t('profile.days')}
                            </p>
                        </div>
                    </div>
                )}

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center space-x-2 mb-1">
                            <Crown className="w-5 h-5 text-yellow-400" />
                            <h3 className="font-bold text-lg">{t('profile.currentPlan')}</h3>
                        </div>
                        <p className="text-4xl font-extrabold tracking-tight mb-2 capitalize">
                            {(subscriptionPlan || 'FREE').toLowerCase()}
                        </p>
                        <p className="text-sm text-slate-300">
                            {activeReward ? t('profile.activeRewardLimits') : t('profile.upgradeUnlock')}
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        {subscriptionPlan && subscriptionPlan.toLowerCase() !== 'free' && (
                            <button
                                onClick={handleOpenPortal}
                                disabled={portalLoading}
                                className="py-3 px-6 bg-white dark:bg-slate-800/10 hover:bg-white dark:bg-slate-800/20 border border-white/20 text-white rounded-2xl font-bold active:scale-95 transition-all whitespace-nowrap shadow-soft flex items-center justify-center"
                            >
                                {portalLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Settings className="w-4 h-4 mr-2" />}
                                {t('profile.manageSubscription')}
                            </button>
                        )}
                        <button
                            onClick={() => navigate('/upgrade')}
                            className="py-3 px-8 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl font-bold hover:bg-slate-50 dark:bg-slate-900 active:scale-95 transition-all whitespace-nowrap shadow-xl text-center"
                        >
                            {t('profile.viewPlans')}
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
