import { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { Heart, X, BookmarkCheck, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';



export default function Giftinder() {
    const { user, lastGiftinderGeneration, refreshUserData } = useAuth();

    const [cards, setCards] = useState<any[]>([]);
    const [loadingGifts, setLoadingGifts] = useState(true);
    const [savedCount, setSavedCount] = useState(0);

    useEffect(() => {
        const loadGifts = async () => {
            if (!user) return;
            setLoadingGifts(true);

            try {
                // 1. Bypass React state and fetch directly from DB to prevent Admin Reset caching issues
                const { data: profile } = await supabase
                    .from('users')
                    .select('last_giftinder_generation')
                    .eq('id', user.id)
                    .single();

                const trueLastGen = profile?.last_giftinder_generation;
                const today = new Date().toDateString();
                const lastGenStr = trueLastGen ? new Date(trueLastGen).toDateString() : null;

                if (lastGenStr !== today) {
                    console.log("Generating today's personalized gifts...");
                    const { error } = await supabase.functions.invoke('generate_daily_gifts');

                    if (error) {
                        console.error("Edge Function blocked/failed. Using Frontend Fallback:", error);

                        // FRONTEND FALLBACK: If the Edge function fails (CORS, 401, JWT), 
                        // we manually insert 3 dummy ideas directly into the DB so the screen is NEVER empty.
                        const fallbackIdeas = Array.from({ length: 3 }).map((_, i) => ({
                            user_id: user.id,
                            title: `Trendy Gift Idea ${i + 1}`,
                            description: "A personalized gift idea placeholder. The AI engine is currently resting!",
                            price_range: "$50 - $150",
                            image_url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=400&auto=format&fit=crop',
                            is_saved: false,
                            is_manual: false
                        }));

                        await supabase.from('gift_ideas').insert(fallbackIdeas);
                    }

                    // Always update the Generation Timestamp (whether Edge succeeded or Fallback succeeded)
                    await supabase.from('users').update({ last_giftinder_generation: new Date().toISOString() }).eq('id', user.id);
                    await refreshUserData();
                }

                // 2. Fetch the unsaved personalized ideas AFTER potential generation
                await fetchCardsFromDB();

            } catch (err) {
                console.error("Giftinder load error:", err);
            } finally {
                setLoadingGifts(false);
            }
        };

        const fetchCardsFromDB = async () => {
            if (!user) return;

            const { data, error } = await supabase
                .from('gift_ideas')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_saved', false)
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
                // Discard it forever
                await supabase.from('gift_ideas').delete().eq('id', id);
            }
        } catch (err) {
            console.error("Error handling swipe:", err);
        }

        // Remove card from deck
        setTimeout(() => {
            setCards(prev => prev.filter(c => c.id !== id));
        }, 200);
    };

    return (
        <div className="h-full flex flex-col pt-4 px-6 relative overflow-hidden">
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-textMain tracking-tight">Giftinder</h1>
                    <p className="text-sm text-slate-500">Swipe right to save</p>
                </div>
                <button className="relative p-2 bg-white rounded-full text-slate-700 shadow-soft hover:bg-slate-50 transition-colors">
                    <BookmarkCheck className="w-6 h-6" />
                    {savedCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                            {savedCount}
                        </span>
                    )}
                </button>
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
                            <p>You've seen all ideas for today!</p>
                        </motion.div>
                    ) : (
                        cards.map((card, index) => {
                            const isActive = index === activeIndex;
                            return isActive ? (
                                <SwipeableCard
                                    key={card.id}
                                    card={card}
                                    onSwipe={(dir) => handleSwipe(dir, card.id)}
                                />
                            ) : (
                                <motion.div
                                    key={card.id}
                                    className="absolute w-full h-[60dvh] max-h-[500px] bg-white rounded-3xl shadow-soft overflow-hidden filter brightness-95"
                                    style={{ scale: 1 - (activeIndex - index) * 0.05, top: (activeIndex - index) * -10 }}
                                >
                                    <img src={card.image} alt="" className="w-full h-[60%] object-cover grayscale opacity-50" />
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
        </div>
    );
}

// Separate component for the active swipeable card
function SwipeableCard({ card, onSwipe }: { card: any, onSwipe: (dir: 'left' | 'right') => void }) {
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
            style={{ x, rotate, opacity }}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0, transition: { duration: 0.2 } }}
            className="absolute w-full h-[60dvh] max-h-[500px] bg-white rounded-[2rem] shadow-floating overflow-hidden cursor-grab active:cursor-grabbing border border-slate-100/50"
        >
            <div className="relative w-full h-[60%]">
                <img src={card.image} alt={card.title} className="w-full h-full object-cover pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-4 left-6 text-white">
                    <h2 className="text-2xl font-bold">{card.title}</h2>
                    <p className="text-white/80 font-medium">{card.price}</p>
                </div>
            </div>
            <div className="p-6 h-[40%] flex flex-col justify-between">
                <p className="text-slate-600 leading-relaxed font-medium">"{card.desc}"</p>
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
