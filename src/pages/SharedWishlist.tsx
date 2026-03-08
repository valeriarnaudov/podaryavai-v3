import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Gift, ExternalLink, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/AuthContext';

interface WishlistItem {
    id: string;
    title: string;
    description: string;
    price_range: string;
    image_url: string;
    source_url: string;
    is_bought?: boolean;
    buyer_id?: string;
}

export default function SharedWishlist() {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const [items, setItems] = useState<WishlistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState<string>('Someone');
    const [userAvatar, setUserAvatar] = useState<string | null>(null);
    const [userHasAura, setUserHasAura] = useState(false);
    const [markingItemId, setMarkingItemId] = useState<string | null>(null);
    const { t } = useTranslation();
    const { user, refreshUserData } = useAuth();

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

    const handleMarkAsBought = async (giftId: string) => {
        if (!user) {
            alert(t('gamification.loginToBuy', { defaultValue: 'Трябва да сте вписани, за да маркирате подарък и да спечелите Карма!' }));
            navigate(`/register?ref=${userId}`);
            return;
        }

        if (user.id === userId) {
            alert(t('gamification.cantBuyOwn', { defaultValue: 'Не можете да маркирате собствените си подаръци.' }));
            return;
        }

        setMarkingItemId(giftId);
        try {
            const { data: karmaRes } = await supabase.rpc('mark_gift_as_bought', {
                gift_id: giftId,
                buyer: user.id
            });

            if (karmaRes?.success) {
                setItems(items.map(item => item.id === giftId ? { ...item, is_bought: true, buyer_id: user.id } : item));
                
                if (karmaRes.awarded > 0) {
                    await refreshUserData();
                }
            } else {
                alert(karmaRes?.message || t('gamification.errorMarking', { defaultValue: 'Грешка при маркирането.' }));
            }
        } catch (err) {
            console.error('Error marking gift as bought:', err);
            alert(t('gamification.errorMarking', { defaultValue: 'Грешка при маркирането.' }));
        } finally {
            setMarkingItemId(null);
        }
    };

    return (
        <div className="min-h-[100dvh] flex flex-col bg-background dark:bg-slate-900 relative overflow-hidden sm:h-[90dvh] sm:min-h-0 sm:rounded-3xl sm:max-w-md sm:mx-auto sm:mt-[5vh] shadow-2xl">
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
                <h1 className="text-2xl font-bold text-textMain dark:text-white tracking-tight">
                    {t('sharedWishlist.title', { name: userName })}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                    {t('sharedWishlist.subtitle', { name: userName })}
                </p>
            </header>

            <main className="flex-1 overflow-y-auto px-6 pb-32">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm mt-4">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Gift className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-textMain dark:text-white mb-2">{t('sharedWishlist.emptyTitle')}</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm px-6">
                            {t('sharedWishlist.emptyDesc', { name: userName })}
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
                                className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft overflow-hidden border border-slate-100/50 dark:border-slate-700/50 flex flex-col"
                            >
                                <div className="h-32 bg-slate-50 dark:bg-slate-900 relative group">
                                    {item.image_url ? (
                                        <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">{t('wishlist.noImage')}</div>
                                    )}
                                </div>
                                <div className="p-3 flex-1 flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-semibold text-textMain dark:text-white text-sm line-clamp-2 leading-snug mb-1">{item.title}</h3>
                                        <p className="text-xs font-medium text-accent">{item.price_range || t('wishlist.priceNA')}</p>
                                    </div>
                                    {item.source_url && (
                                        <a
                                            href={item.source_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-3 flex items-center justify-center space-x-1 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 py-1.5 rounded-lg hover:bg-slate-100 dark:bg-slate-700 transition-colors"
                                        >
                                            <span>{t('sharedWishlist.viewStore')}</span>
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}
                                    <button
                                        onClick={() => handleMarkAsBought(item.id)}
                                        disabled={item.is_bought || markingItemId === item.id}
                                        className={`mt-2 w-full flex items-center justify-center space-x-1 py-1.5 rounded-lg transition-colors text-xs font-bold ${
                                            item.is_bought 
                                            ? 'bg-green-100/50 text-green-600 dark:bg-green-900/30 dark:text-green-400 cursor-not-allowed border border-green-200 dark:border-green-800'
                                            : 'bg-emerald-500 tracking-wide hover:bg-emerald-600 text-white shadow-soft active:scale-[0.98]'
                                        }`}
                                    >
                                        {markingItemId === item.id ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : item.is_bought ? (
                                            <>
                                                <CheckCircle2 className="w-3 h-3" />
                                                <span>{t('gamification.alreadyBought', { defaultValue: 'Запазен' })}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Gift className="w-3 h-3" />
                                                <span>{t('gamification.markBought', { defaultValue: 'Маркирай като Купен' })}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>

            {/* Static Bottom CTA */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-white dark:bg-slate-800/90 backdrop-blur-md border-t border-slate-100/50 dark:border-slate-700/50 z-20">
                <button
                    onClick={() => navigate(`/register?ref=${userId}`)}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-floating active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
                >
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                    <span>{t('sharedWishlist.createOwn')}</span>
                </button>
            </div>
        </div>
    );
}
