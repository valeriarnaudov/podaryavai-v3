import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { ArrowLeft, Loader2, Save, Trash2, CalendarPlus, X, Sparkles, Camera, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { findNameDay } from '../lib/nameDaysBg';

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
            alert('Could not load contact details.');
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
                    name: `${firstName} ${lastName}`.trim()
                })
                .eq('id', id);

            if (error) throw error;
            navigate('/contacts');
        } catch (error) {
            console.error('Error updating contact:', error);
            alert('Failed to update contact.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteContact = async () => {
        if (!confirm('Are you sure you want to completely remove this contact and all their events?')) return;
        setSaving(true);
        try {
            const { error } = await supabase.from('contacts').delete().eq('id', id);
            if (error) throw error;
            navigate('/contacts');
        } catch (error) {
            console.error('Error deleting contact:', error);
            alert('Failed to delete contact.');
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
            alert('Failed to add new date.');
        }
    };

    const handleDeleteEvent = async (eventId: string) => {
        if (!confirm('Remove this event?')) return;
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
            <div className="bg-background min-h-[100dvh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
            </div>
        );
    }

    return (
        <div className="bg-background min-h-[100dvh] pb-safe sm:h-[90dvh]">
            <header className="bg-white/80 backdrop-blur-lg sticky top-0 z-10 px-6 py-4 flex items-center justify-between border-b border-slate-100 shadow-sm">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-lg font-bold text-textMain">Edit Contact</h1>
                <div className="w-10"></div> {/* Spacer for centering */}
            </header>

            <main className="p-6 space-y-8">
                {/* Contact Form Details */}
                <div className="bg-white p-6 rounded-3xl shadow-soft border border-slate-100/50">
                    <form onSubmit={handleUpdateContact} className="space-y-6">
                        {/* Avatar Upload / Display */}
                        <div className="flex justify-center mb-6">
                            <div className="relative group">
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer overflow-hidden hover:border-accent transition-colors"
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
                                <label className="block text-sm font-medium text-slate-700 mb-2">First Name</label>
                                <input
                                    type="text"
                                    required
                                    value={firstName}
                                    onChange={e => setFirstName(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Last Name</label>
                                <input
                                    type="text"
                                    required
                                    value={lastName}
                                    onChange={e => setLastName(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Relationship</label>
                            <select
                                value={relationship}
                                onChange={e => setRelationship(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all appearance-none"
                            >
                                <option value="Friend">Friend</option>
                                <option value="Family">Family</option>
                                <option value="Partner">Partner</option>
                                <option value="Colleague">Colleague</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        {/* AI Profiling Form */}
                        <div className="pt-4 border-t border-slate-100">
                            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center">
                                <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider mr-2">AI Feature</span>
                                Gift Profiling
                            </h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Age Group</label>
                                    <select
                                        value={ageGroup}
                                        onChange={e => setAgeGroup(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 outline-none transition-all appearance-none"
                                    >
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
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Personality Trait</label>
                                    <select
                                        value={personality}
                                        onChange={e => setPersonality(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 outline-none transition-all appearance-none"
                                    >
                                        <option value="Balanced">Balanced / Average</option>
                                        <option value="Introvert/Homebody">Introvert / Homebody</option>
                                        <option value="Extrovert/Social">Extrovert / Social</option>
                                        <option value="Adventurous/Active">Adventurous / Active</option>
                                        <option value="Creative/Artistic">Creative / Artistic</option>
                                        <option value="Practical/Logical">Practical / Logical</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Style Preference</label>
                                    <select
                                        value={style}
                                        onChange={e => setStyle(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 outline-none transition-all appearance-none"
                                    >
                                        <option value="Casual">Casual / Everyday</option>
                                        <option value="Minimalist">Minimalist</option>
                                        <option value="Luxury">Luxury / Premium</option>
                                        <option value="Handmade/Artisanal">Handmade / Artisanal</option>
                                        <option value="Tech-focused">Tech-focused / Gadgets</option>
                                        <option value="Sporty">Sporty / Athletic</option>
                                        <option value="Vintage/Retro">Vintage / Retro</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Favorite Color (Optional)</label>
                                    <input
                                        type="text"
                                        value={favoriteColor}
                                        onChange={e => setFavoriteColor(e.target.value)}
                                        placeholder="e.g. Blue, Dark green, Pastels"
                                        className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Interests & Hobbies (Detailed)</label>
                                    <textarea
                                        value={interests}
                                        onChange={e => setInterests(e.target.value)}
                                        placeholder="e.g. Loves reading sci-fi, hiking mountains, drinking espresso, and PC gaming"
                                        rows={3}
                                        className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 outline-none transition-all resize-none"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        The AI uses these precise modifiers to generate highly accurate gift recommendations.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Budget Preference</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <span className="text-slate-500 font-medium">€</span>
                                        </div>
                                        <input
                                            type="number"
                                            min="0"
                                            value={budgetPreference}
                                            onChange={e => setBudgetPreference(e.target.value)}
                                            placeholder="e.g. 50"
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 outline-none transition-all"
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
                                    <span>Save Contact</span>
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
                            <div className="bg-white p-2 rounded-xl text-indigo-500 shadow-sm">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-indigo-900 flex items-center">
                                    Smart Name Day <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Auto</span>
                                </h3>
                                <p className="text-sm text-indigo-800/80 mt-1">
                                    <span className="font-semibold">{firstName}</span> celebrates on <span className="font-semibold">{new Date(`2024-${findNameDay(firstName)!.date}`).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span> for <span className="font-semibold">{findNameDay(firstName)!.holiday}</span>!
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Important Dates Management */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-textMain">Important Dates</h2>
                        <button
                            onClick={() => setShowEventForm(!showEventForm)}
                            className="text-accent text-sm font-semibold hover:underline flex items-center"
                        >
                            <CalendarPlus className="w-4 h-4 mr-1" /> Add Date
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
                                    <input type="text" placeholder="Occasion / Event Title (e.g. Wedding)" required value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)}
                                        className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-sm focus:border-accent outline-none" />
                                </div>
                            )}
                            <div className="flex space-x-2">
                                <select value={newEventType} onChange={e => setNewEventType(e.target.value)} className="w-1/2 px-3 py-2 bg-white rounded-lg border border-slate-200 text-sm appearance-none focus:border-accent outline-none">
                                    <option value="BIRTHDAY">Birthday</option>
                                    <option value="NAME_DAY">Name Day</option>
                                    <option value="ANNIVERSARY">Anniversary</option>
                                    <option value="OTHER">Other (Custom)</option>
                                </select>
                                <input type="date" required value={newEventDate} onChange={e => setNewEventDate(e.target.value)}
                                    className="w-1/2 px-3 py-2 bg-white rounded-lg border border-slate-200 text-sm" />
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button type="button" onClick={() => setShowEventForm(false)} className="px-3 py-1.5 text-sm text-slate-500 font-medium hover:text-slate-700">Cancel</button>
                                <button type="submit" className="px-3 py-1.5 bg-accent text-white text-sm font-medium rounded-lg">Add</button>
                            </div>
                        </motion.form>
                    )}

                    <div className="space-y-3">
                        {events.length === 0 && !showEventForm ? (
                            <p className="text-sm text-slate-500 text-center py-4 bg-white rounded-2xl border border-slate-100/50 border-dashed">No dates added yet.</p>
                        ) : (
                            events.map(event => (
                                <div key={event.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center group">
                                    <div>
                                        <h4 className="font-semibold text-textMain text-sm">{event.title}</h4>
                                        <p className="text-xs text-slate-500 mt-0.5">{new Date(event.event_date).toLocaleDateString()} • {event.event_type}</p>
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
                        <span>Delete Contact</span>
                    </button>
                </div>
            </main>
        </div>
    );
}
