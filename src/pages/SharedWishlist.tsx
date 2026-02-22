import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Gift, ExternalLink, Loader2, Sparkles } from 'lucide-react';

interface WishlistItem {
    id: string;
    title: string;
    description: string;
    price_range: string;
    image_url: string;
    source_url: string;
}

export default function SharedWishlist() {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const [items, setItems] = useState<WishlistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState<string>('Someone');
    const [userAvatar, setUserAvatar] = useState<string | null>(null);
    const [userHasAura, setUserHasAura] = useState(false);

    useEffect(() => {
        if (userId) {
            fetchSharedData(userId);
        }
    }, [userId]);

    const fetchSharedData = async (uid: string) => {
        try {
            // Fetch User Details to get the name and avatar info
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('full_name, avatar_url, has_golden_aura')
                .eq('id', uid)
                .maybeSingle();

            if (!userError && userData) {
                setUserName(userData.full_name || 'Someone');
                setUserAvatar(userData.avatar_url);
                setUserHasAura(!!userData.has_golden_aura);
            }

            // Fetch Wishlist Items
            const { data, error } = await supabase
                .from('gift_ideas')
                .select('*')
                .eq('user_id', uid)
                .eq('is_saved', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setItems(data as any);
        } catch (error) {
            console.error('Error fetching shared wishlist:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] flex flex-col bg-background relative overflow-hidden sm:h-[90dvh] sm:min-h-0 sm:rounded-3xl sm:max-w-md sm:mx-auto sm:mt-[5vh] shadow-2xl">
            {/* Decorative Header Background */}
            <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-accent/20 to-transparent pointer-events-none" />

            <header className="px-6 pt-12 pb-6 relative z-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 mb-4 relative z-10">
                    <div className={`w-full h-full relative ${userHasAura ? 'p-1 rounded-full bg-gradient-to-tr from-amber-300 via-yellow-400 to-orange-500 shadow-[0_0_20px_rgba(251,191,36,0.6)]' : ''}`}>
                        {userHasAura && (
                            <motion.div
                                className="absolute inset-0 rounded-full border-2 border-white/50"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            />
                        )}
                        {userAvatar ? (
                            <img src={userAvatar} alt="Avatar" className="w-full h-full rounded-full border-4 border-white shadow-soft object-cover relative z-10" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-tr from-accent to-accent/60 rounded-full shadow-soft flex items-center justify-center border-4 border-white relative z-10">
                                <Gift className="w-10 h-10 text-white" />
                            </div>
                        )}
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-textMain tracking-tight">
                    {userName}'s Wishlist
                </h1>
                <p className="text-sm text-slate-500 mt-2">
                    Gift ideas {userName} actually wants!
                </p>
            </header>

            <main className="flex-1 overflow-y-auto px-6 pb-32">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm mt-4">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Gift className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-textMain mb-2">Empty Wishlist</h3>
                        <p className="text-slate-500 text-sm px-6">
                            {userName} hasn't added any public items to their wishlist yet.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        {items.map((item, i) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="bg-white rounded-2xl shadow-soft overflow-hidden border border-slate-100/50 flex flex-col"
                            >
                                <div className="h-32 bg-slate-50 relative group">
                                    {item.image_url ? (
                                        <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">No Image</div>
                                    )}
                                </div>
                                <div className="p-3 flex-1 flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-semibold text-textMain text-sm line-clamp-2 leading-snug mb-1">{item.title}</h3>
                                        <p className="text-xs font-medium text-accent">{item.price_range || 'Price N/A'}</p>
                                    </div>
                                    {item.source_url && (
                                        <a
                                            href={item.source_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-3 flex items-center justify-center space-x-1 text-xs text-slate-500 bg-slate-50 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                                        >
                                            <span>View Store</span>
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>

            {/* Static Bottom CTA */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-md border-t border-slate-100/50 z-20">
                <button
                    onClick={() => navigate(`/register?ref=${userId}`)}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-floating active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
                >
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                    <span>Create Your Own Wishlist</span>
                </button>
            </div>
        </div>
    );
}
