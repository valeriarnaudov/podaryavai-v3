import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { ArrowLeft, Loader2, Camera, User } from 'lucide-react';

export default function NewContact() {
    const navigate = useNavigate();
    const { user, karmaBoostUntil, refreshUserData } = useAuth();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [relationship, setRelationship] = useState('Friend');
    const [birthday, setBirthday] = useState('');
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
                    // keep "name" for backwards compatibility
                    name: `${firstName} ${lastName}`.trim()
                })
                .select()
                .single();

            if (contactError) throw contactError;

            // 2. Create the Birthday Event for this contact
            const { error: eventError } = await supabase.from('events').insert({
                user_id: user.id,
                contact_id: contact.id,
                title: 'Birthday',
                event_type: 'BIRTHDAY',
                event_date: birthday
            });

            if (eventError) {
                console.error("Birthday event error:", eventError);
                // Non-fatal, but we should log it.
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
            setPageError(error.message || 'Failed to save contact. Please check your data and try again.');
        } finally {
            setLoading(false);
        }
    };

    const initials = firstName ? firstName.charAt(0).toUpperCase() + (lastName ? lastName.charAt(0).toUpperCase() : '') : '';

    return (
        <div className="bg-background min-h-[100dvh] pb-safe sm:h-[90dvh]">
            <header className="bg-white/80 backdrop-blur-lg sticky top-0 z-10 px-6 py-4 flex items-center border-b border-slate-100 shadow-sm">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 mr-4"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-lg font-bold text-textMain">Add New Contact</h1>
            </header>

            <main className="p-6">
                <div className="bg-white p-6 rounded-3xl shadow-soft border border-slate-100/50">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Avatar Upload */}
                        <div className="flex justify-center mb-8">
                            <div className="relative group">
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer overflow-hidden hover:border-accent transition-colors"
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
                                <label className="block text-sm font-medium text-slate-700 mb-2">First Name</label>
                                <input
                                    type="text"
                                    required
                                    value={firstName}
                                    onChange={e => setFirstName(e.target.value)}
                                    placeholder="Ivan"
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
                                    placeholder="Ivanov"
                                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Birthday</label>
                            <input
                                type="date"
                                required
                                value={birthday}
                                onChange={e => setBirthday(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all text-slate-700"
                            />
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

                        {pageError && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100/50 flex flex-col">
                                <span className="font-semibold mb-1">Error saving contact:</span>
                                <span>{pageError}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-accent text-white rounded-2xl font-semibold shadow-floating shadow-accent/20 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-70 mt-4"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Save Contact (+{karmaBoostUntil && new Date(karmaBoostUntil) > new Date() ? 20 : 10} Karma)</span>}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}
