import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { Heart, X, BookmarkCheck, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { useSettings } from '../lib/SettingsContext';

export interface GiftCard {
    id: number;
    title: string;
    price: string;
    image: string;
    desc: string;
    isVip: boolean;
}

export default function Giftinder() {
    const { user, session, lastGiftinderGeneration, refreshUserData, subscriptionPlan } = useAuth();
    const { settings } = useSettings();
    const navigate = useNavigate();

    const [cards, setCards] = useState<GiftCard[]>([]);
    const [loadingGifts, setLoadingGifts] = useState(true);
    const [savedCount, setSavedCount] = useState(0);
    const [aiError, setAiError] = useState<string | null>(null);
    const isGeneratingRef = useRef(false);

    // Floating Karma Animation State
    const [floatingKarma, setFloatingKarma] = useState<{ id: number; amount: number; visible: boolean } | null>(null);

    // Calculate dynamic karma reward based on user's current plan
    const karmaKey = `KARMA_PER_SWIPE_${subscriptionPlan}` as keyof typeof settings;
    const karmaRewardStr = settings[karmaKey] || '1';
    const karmaReward = parseInt(karmaRewardStr as string, 10);

    useEffect(() => {
        const loadGifts = async () => {
            if (!user) return;
            if (isGeneratingRef.current) return;
            isGeneratingRef.current = true;

            setLoadingGifts(true);

            try {
                // 1. Bypass React state and fetch directly from DB to prevent Admin Reset caching issues
                const { data: profile } = await supabase
                    .from('users')
                    .select('last_giftinder_generation, subscription_plan, daily_generations_count')
                    .eq('id', user.id)
                    .single();

                const trueLastGen = profile?.last_giftinder_generation;
                const today = new Date().toDateString();
                const lastGenStr = trueLastGen ? new Date(trueLastGen).toDateString() : null;

                // Reset daily count locally if it's a new day
                let currentDailyCount = profile?.daily_generations_count || 0;
                if (lastGenStr !== today) {
                    currentDailyCount = 0;
                }

                const userPlan = profile?.subscription_plan || 'FREE';
                const limitKey = `LIMIT_AI_${userPlan}` as keyof typeof settings;
                const dailyLimitStr = settings[limitKey] || '1';
                const dailyLimit = parseInt(dailyLimitStr as string, 10);

                if (dailyLimit !== -1 && currentDailyCount >= dailyLimit) {
                    console.log(`User reached daily AI limit limit (${dailyLimit}) for plan ${userPlan}`);
                    await fetchCardsFromDB(); // <--- FIX: We must fetch existing cards if we skip generation!
                    setLoadingGifts(false);
                    return; // Block generation, they only see cards from DB
                }

                if (lastGenStr !== today || (dailyLimit === -1 || currentDailyCount < dailyLimit)) {
                    console.log(`Generating personalized gifts... Limit: ${dailyLimit === -1 ? 'Unlimited' : dailyLimit})`);

                    // Increment optimistic count
                    const newCount = currentDailyCount + 1;

                    let currentSession = session;
if (!currentSession) {
  const { data: { session: s } } = await supabase.auth.getSession();
  currentSession = s;
}
if (!currentSession) {
  const errMsg = 'Auth session missing!';
  console.error(errMsg);
  setAiError(errMsg);
  setLoadingGifts(false);
  return;
}

const { error, data } = await supabase.functions.invoke('generate_daily_gifts', {
  headers: {
    Authorization: `Bearer ${session?.access_token}`,
  },
});

                    if (error) {
                        const errMsg = error.message || error.toString();
                        console.error("Edge Function failed. No fallback logic needed:", errMsg);
                        setAiError(errMsg);
                    } else if (data?.error) {
                        const errMsg = data.error;
                        console.error("Edge Function returned custom error payload:", errMsg);
                        setAiError(errMsg);
                    } else {
                        // Only update the Generation Timestamp and Count if successful
                        await supabase.from('users').update({
                            last_giftinder_generation: new Date().toISOString(),
                            daily_generations_count: newCount
                        }).eq('id', user.id);
                        await refreshUserData();
                    }
                }

                // 2. Fetch the unsaved personalized ideas AFTER potential generation
                await fetchCardsFromDB();

            } catch (err) {
                console.error("Giftinder load error:", err);
            } finally {
                isGeneratingRef.current = false;
                setLoadingGifts(false);
            }
        };

        const fetchCardsFromDB = async () => {
            if (!user) return;

            const { data, error } = await supabase
                .from('gift_ideas')
                .select('*')
                .eq('user_id', user.id)
                .is('is_saved', false)
                .or('is_rejected.is.null,is_rejected.eq.false')
                .order('created_at', { ascending: false });

            if (!error && data) {
                const mappedData = data.map(item => ({
                    id: item.id,
                    title: item.title,
                    price: item.price_range,
                    image: item.image_url,
                    desc: item.description,
                    isVip: false
                }));
                setCards(mappedData);
            } else {
                console.error("Error loading personalized gifts:", error, data);
            }
        };

        loadGifts();
    }, [user, lastGiftinderGeneration]);

    const activeIndex = cards.length - 1;

    const handleSwipe = async (dir: 'left' | 'right', id: number) => {
        if (!user) return;

        try {
            if (dir === 'right') {
                // Save it
                await supabase.from('gift_ideas').update({ is_saved: true }).eq('id', id);
                setSavedCount(prev => prev + 1);
            } else {
                // Discard it forever but keep a record to avoid regenerating it (Continuous Learning)
                await supabase.from('gift_ideas').update({ is_rejected: true }).eq('id', id);
            }

            // Award Karma Points via RPC for ANY evaluation (swipe left or right)
            if (karmaReward > 0) {
                const { error } = await supabase.rpc('claim_swipe_karma', {
                    reward_amount: karmaReward,
                    gift_idea_id: id
                });

                if (!error) {
                    // Show floating animation
                    setFloatingKarma({ id: Date.now(), amount: karmaReward, visible: true });
                    setTimeout(() => setFloatingKarma(null), 1500); // Hide after animation
                    // Refresh user data silently to update core balance
                    refreshUserData();
                } else {
                    console.error("RPC Karma error:", error);
                }
            }
        } catch (err) {
            console.error("Error handling swipe:", err);
        }

        // Remove card from deck immediately to trigger AnimatePresence exit
        setCards(prev => prev.filter(c => c.id !== id));
    };

    return (
        <div className="h-full flex flex-col pt-4 px-6 relative overflow-hidden">
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-textMain tracking-tight">Giftinder</h1>
                    <p className="text-sm text-slate-500">Swipe right to save</p>
                </div>
                <div className="relative">
                    <button 
                        onClick={() => navigate('/wishlist')}
                        className="relative p-2 bg-white rounded-full text-slate-700 shadow-soft hover:bg-slate-50 transition-colors"
                        title="View Wishlist"
                    >
                        <BookmarkCheck className="w-6 h-6" />
                        {savedCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                                {savedCount}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            <div className="relative flex-1 flex items-center justify-center w-full max-w-sm mx-auto">
                <AnimatePresence>
                    {loadingGifts ? (
                        <div className="flex flex-col items-center justify-center text-slate-400">
                            <Loader2 className="w-10 h-10 mb-4 animate-spin text-accent" />
                            <p className="font-medium">Finding perfect gifts...</p>
                        </div>
                    ) : cards.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center text-slate-500"
                        >
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Heart className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="font-bold text-slate-700 text-lg mb-1">You've seen all ideas!</h3>
                            <p className="text-sm">Swipe through them, save what you like, or upgrade your plan to generate more daily.</p>

                            {aiError && (
                                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-mono break-words w-full text-left">
                                    <strong className="block mb-1 text-red-700">AI Error Details:</strong>
                                    {aiError}
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        cards.map((card, index) => {
                            const diff = activeIndex - index;
                            // Only render the active card and max 3 cards behind it to prevent visual clutter
                            if (diff > 3 || diff < 0) return null;

                            const isActive = index === activeIndex;
                            return isActive ? (
                                <SwipeableCard
                                    key={`active-${card.id}`}
                                    card={card}
                                    onSwipe={(dir) => handleSwipe(dir, card.id)}
                                    // Make sure active card is ALWAYS on top
                                    style={{ zIndex: 100 }}
                                />
                            ) : (
                                <motion.div
                                    key={card.id}
                                    className="absolute w-full h-[60dvh] max-h-[500px] bg-white rounded-[2rem] shadow-floating overflow-hidden filter brightness-[0.85] border border-slate-100/50"
                                    style={{
                                        scale: 1 - diff * 0.05,
                                        top: diff * -12,
                                        zIndex: cards.length - diff, // Ensure correct stacking order
                                    }}
                                >
                                    {/* Abstract background card to look exactly like the front card */}
                                    <div
                                        className="relative w-full h-[55%] bg-slate-200 shrink-0 overflow-hidden rounded-t-[2rem]"
                                        style={{
                                            background: `linear-gradient(135deg, hsl(${card.title.length * 15 % 360}, 70%, 60%), hsl(${(card.title.length * 15 + 40) % 360}, 70%, 40%))`
                                        }}
                                    >
                                        <img
                                            src={card.image}
                                            alt=""
                                            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none transition-opacity duration-300 opacity-100"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.opacity = '0';
                                            }}
                                        />
                                    </div>
                                     <div className="p-6 h-[45%] flex flex-col justify-between overflow-hidden opacity-50 bg-white">
                                         <div className="mb-2">
                                            <h2 className="text-2xl font-bold leading-tight text-slate-800 line-clamp-2">{card.title}</h2>
                                            <p className="text-lg font-bold text-accent mt-1">{card.price}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>

            {/* Lower controls for manual tap */}
            {cards.length > 0 && (
                <div className="flex justify-center items-center space-x-8 mt-6 mb-8">
                    <button
                        onClick={() => handleSwipe('left', cards[activeIndex].id)}
                        className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-slate-400 shadow-floating active:scale-95 transition-transform"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <button
                        onClick={() => handleSwipe('right', cards[activeIndex].id)}
                        className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-rose-500 shadow-floating active:scale-95 transition-transform"
                    >
                        <Heart className="w-8 h-8 fill-rose-100" />
                    </button>
                </div>
            )}

            {/* Giant Central Floating Karma Animation */}
            <AnimatePresence>
                {floatingKarma && (
                    <motion.div
                        key={floatingKarma.id}
                        initial={{ opacity: 0, scale: 0.5, y: 50 }}
                        animate={{ opacity: 1, scale: 1.5, y: -100 }}
                        exit={{ opacity: 0, scale: 1, y: -150 }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="absolute inset-0 m-auto flex items-center justify-center z-50 pointer-events-none w-fit h-fit"
                    >
                        <div className="bg-rose-500 border-2 border-white shadow-2xl px-6 py-3 rounded-full flex items-center gap-2 font-black text-white text-xl">
                            <Heart className="w-6 h-6 fill-white" />
                            +{floatingKarma.amount} Karma
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Separate component for the active swipeable card
function SwipeableCard({ card, onSwipe, style = {} }: { card: any, onSwipe: (dir: 'left' | 'right') => void, style?: any }) {
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-10, 10]);
    const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

    const handleDragEnd = (_: any, info: any) => {
        if (info.offset.x > 100) {
            onSwipe('right');
        } else if (info.offset.x < -100) {
            onSwipe('left');
        }
    };

    return (
        <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            style={{ x, rotate, opacity, ...style }}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0, transition: { duration: 0.2 } }}
            className="absolute w-full h-[60dvh] max-h-[500px] bg-white rounded-[2rem] shadow-floating overflow-hidden cursor-grab active:cursor-grabbing border border-slate-100/50"
        >
            {/* Image Container with Fallback Gradient */}
            <div
                className="relative w-full h-[55%] bg-slate-200 shrink-0 overflow-hidden rounded-t-[2rem]"
                style={{
                    background: `linear-gradient(135deg, hsl(${card.title.length * 15 % 360}, 70%, 60%), hsl(${(card.title.length * 15 + 40) % 360}, 70%, 40%))`
                }}
            >
                <img
                    src={card.image}
                    alt={card.title}
                    className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none transition-opacity duration-300 opacity-100"
                    onError={(e) => {
                        // Hide broken image so the beautiful gradient background shows through
                        (e.target as HTMLImageElement).style.opacity = '0';
                    }}
                />
            </div>
            
            <div className="p-6 h-[45%] flex flex-col justify-between overflow-hidden bg-white">
                <div className="mb-2">
                    <h2 className="text-2xl font-bold leading-tight text-slate-800 line-clamp-2">{card.title}</h2>
                    <p className="text-lg font-bold text-accent mt-1">{card.price}</p>
                </div>
                <p className="text-slate-600 leading-snug font-medium line-clamp-3 text-sm">"{card.desc}"</p>
                <div className="flex items-center space-x-2 mt-4">
                    <div className="bg-slate-50 p-4 rounded-2xl flex items-center space-x-3 flex-1">
                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                            <span className="text-accent text-xs font-bold">AI</span>
                        </div>
                        <p className="text-xs text-slate-500">Suggested based on your friend's profile and latest trends.</p>
                    </div>
                    {card.isVip && (
                        <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-4 rounded-2xl flex items-center justify-center shadow-md">
                            <span className="text-white text-xs font-bold tracking-widest uppercase">VIP</span>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
