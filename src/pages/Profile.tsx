import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { User, Mail, LogOut, Loader2, Save, Settings, Edit3, Crown, Calendar, Lock, Award, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Profile() {
    const { user, signOut, hasGoldenAura, subscriptionPlan, activeReward } = useAuth();
    const navigate = useNavigate();

    const [isEditing, setIsEditing] = useState(false);
    const [portalLoading, setPortalLoading] = useState(false);

    // Form fields
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [dob, setDob] = useState('');
    const [password, setPassword] = useState('');

    // Giftinder Preferences
    const [hobbies, setHobbies] = useState('');
    const [dislikes, setDislikes] = useState('');
    const [favoriteBrands, setFavoriteBrands] = useState('');

    // Status UI
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            setFirstName(user.user_metadata?.first_name || (user.user_metadata?.full_name?.split(' ')[0] || ''));
            setLastName(user.user_metadata?.last_name || (user.user_metadata?.full_name?.split(' ')?.slice(1)?.join(' ') || ''));
            setEmail(user.email || '');
            setDob(user.user_metadata?.dob || '');

            const fetchGiftinderPrefs = async () => {
                const { data } = await supabase.from('users').select('giftinder_preferences').eq('id', user.id).single();
                if (data?.giftinder_preferences) {
                    const prefs = data.giftinder_preferences as any;
                    setHobbies(prefs.hobbies || '');
                    setDislikes(prefs.dislikes || '');
                    setFavoriteBrands(prefs.favoriteBrands || '');
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
            
            // 3. Update Giftinder Preferences in users table
            const prefs = { hobbies: hobbies.trim(), dislikes: dislikes.trim(), favoriteBrands: favoriteBrands.trim() };
            const { error: prefsError } = await supabase.from('users').update({ giftinder_preferences: prefs }).eq('id', user.id);
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
                    <h1 className="text-2xl font-bold text-textMain tracking-tight">Profile</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage your account settings.</p>
                </div>
            </header>

            {/* Main Profile Info & Edit Form */}
            <div className="bg-white p-6 rounded-3xl shadow-soft border border-slate-100/50 space-y-6 relative overflow-hidden">
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
                        <div>
                            <h2 className="text-2xl font-bold text-textMain">{displayFullName || 'Unknown User'}</h2>
                            <p className="text-slate-500 text-sm font-medium">{email}</p>
                        </div>
                    </div>
                    {!isEditing && (
                        <button onClick={() => setIsEditing(true)} className="p-2 text-slate-400 hover:text-accent bg-slate-50 rounded-full transition-colors">
                            <Edit3 className="w-5 h-5" />
                        </button>
                    )}
                </div>

                <div className="h-px bg-slate-100 w-full" />

                <AnimatePresence mode="wait">
                    {!isEditing ? (
                        <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-2xl">
                                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1 flex items-center"><User className="w-3 h-3 mr-1" /> Full Name</p>
                                    <p className="font-semibold text-textMain">{displayFullName || '-'}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl">
                                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1 flex items-center"><Calendar className="w-3 h-3 mr-1" /> Date of Birth</p>
                                    <p className="font-semibold text-textMain">{dob || '-'}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl col-span-2">
                                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1 flex items-center"><Mail className="w-3 h-3 mr-1" /> Email Address</p>
                                    <p className="font-semibold text-textMain">{email}</p>
                                </div>
                            </div>
                            {message && <p className="text-sm font-medium text-green-600 bg-green-50 p-3 rounded-xl">{message}</p>}
                        </motion.div>
                    ) : (
                        <motion.form key="edit" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={handleUpdateProfile} className="space-y-5">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">First Name</label>
                                        <input
                                            type="text"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            placeholder="e.g. Ivan"
                                            className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Last Name</label>
                                        <input
                                            type="text"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            placeholder="e.g. Ivanov"
                                            className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Date of Birth</label>
                                    <input
                                        type="date"
                                        value={dob}
                                        onChange={(e) => setDob(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all text-slate-700"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                />
                                <p className="text-xs text-slate-400 mt-1">Changing this will require verification.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">New Password (Optional)</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Leave blank to keep current"
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Giftinder AI Preferences */}
                            <div className="pt-4 mt-2 border-t border-slate-100">
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                                    <Heart className="w-5 h-5 mr-2 text-rose-500" />
                                    Giftinder AI Preferences
                                </h3>
                                <p className="text-sm text-slate-500 mb-4">Help the AI learn your style, so we can suggest better daily gifts for you to save!</p>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">My Hobbies & Interests</label>
                                        <input
                                            type="text"
                                            value={hobbies}
                                            onChange={(e) => setHobbies(e.target.value)}
                                            placeholder="e.g. Photography, Cooking, Tech gadgets"
                                            className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Favorite Brands or Styles</label>
                                        <input
                                            type="text"
                                            value={favoriteBrands}
                                            onChange={(e) => setFavoriteBrands(e.target.value)}
                                            placeholder="e.g. Minimalist, Apple, Nike, Boho"
                                            className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Things I Dislike / Don't Want</label>
                                        <input
                                            type="text"
                                            value={dislikes}
                                            onChange={(e) => setDislikes(e.target.value)}
                                            placeholder="e.g. Alcohol, Socks, Cheap plastic toys"
                                            className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex space-x-3 pt-2">
                                <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-semibold hover:bg-slate-200 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className="flex-1 py-3 bg-accent text-white rounded-2xl font-semibold active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-70 shadow-floating shadow-accent/20">
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            <span>Save Changes</span>
                                        </>
                                    )}
                                </button>
                            </div>
                            {error && <p className="text-sm font-medium text-red-500 bg-red-50 p-3 rounded-xl">{error}</p>}
                        </motion.form>
                    )}
                </AnimatePresence>
            </div>

            {/* Subscription Plan Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-3xl shadow-soft text-white relative overflow-hidden flex flex-col gap-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10" />
                
                {/* Active Reward Full-Width Banner */}
                {activeReward && (
                    <div className="relative z-10 w-full bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Award className="w-5 h-5 text-emerald-400" />
                                <h4 className="font-bold text-emerald-400 text-xs tracking-widest uppercase">Active Karma Reward</h4>
                            </div>
                            <p className="text-white font-medium">{activeReward.title} (Expires: {new Date(activeReward.expires_at).toLocaleDateString()})</p>
                        </div>
                        <div className="sm:text-right shrink-0">
                            <span className="text-xs text-emerald-200">Time Remaining</span>
                            <p className="font-bold text-white text-lg">
                                {Math.max(0, Math.ceil((new Date(activeReward.expires_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24)))} Days
                            </p>
                        </div>
                    </div>
                )}

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center space-x-2 mb-1">
                            <Crown className="w-5 h-5 text-yellow-400" />
                            <h3 className="font-bold text-lg">Current Plan</h3>
                        </div>
                        <p className="text-4xl font-extrabold tracking-tight mb-2 capitalize">
                            {(subscriptionPlan || 'FREE').toLowerCase()}
                        </p>
                        <p className="text-sm text-slate-300">
                            {activeReward ? "Your account will handle limits according to your active reward tier." : "Upgrade to unlock more AI gift generations and premium models."}
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        {subscriptionPlan && subscriptionPlan.toLowerCase() !== 'free' && (
                            <button
                                onClick={handleOpenPortal}
                                disabled={portalLoading}
                                className="py-3 px-6 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-2xl font-bold active:scale-95 transition-all whitespace-nowrap shadow-soft flex items-center justify-center"
                            >
                                {portalLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Settings className="w-4 h-4 mr-2" />}
                                Manage Subscription
                            </button>
                        )}
                        <button
                            onClick={() => navigate('/upgrade')}
                            className="py-3 px-8 bg-white text-slate-900 rounded-2xl font-bold hover:bg-slate-50 active:scale-95 transition-all whitespace-nowrap shadow-xl text-center"
                        >
                            View Plans
                        </button>
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="mt-8 pt-8 border-t border-slate-200/50 flex justify-center">
                <button
                    onClick={handleLogout}
                    disabled={loading}
                    className="w-full sm:w-auto px-6 py-3 bg-red-50 text-red-600 rounded-2xl font-semibold hover:bg-red-100 active:scale-95 transition-all flex items-center justify-center space-x-2"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                        <>
                            <LogOut className="w-5 h-5" />
                            <span>Log Out Safely</span>
                        </>
                    )}
                </button>
            </div>
        </motion.div>
    );
}
