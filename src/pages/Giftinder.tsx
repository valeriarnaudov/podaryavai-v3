import { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { Heart, X, BookmarkCheck, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { useSettings } from '../lib/SettingsContext';

export default function Giftinder() {
    const { user, lastGiftinderGeneration, dailyGenerationsCount, refreshUserData } = useAuth();
    const { settings } = useSettings();

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
                    .select('last_giftinder_generation, subscription_plan')
                    .eq('id', user.id)
                    .single();

                const trueLastGen = profile?.last_giftinder_generation;
                const today = new Date().toDateString();
                const lastGenStr = trueLastGen ? new Date(trueLastGen).toDateString() : null;

                // Reset daily count locally if it's a new day
                let currentDailyCount = dailyGenerationsCount;
                if (lastGenStr !== today) {
                    currentDailyCount = 0;
                }

                const userPlan = profile?.subscription_plan || 'FREE';
                const limitKey = `LIMIT_AI_${userPlan}` as keyof typeof settings;
                const dailyLimitStr = settings[limitKey] || '1';
                const dailyLimit = parseInt(dailyLimitStr as string, 10);

                if (dailyLimit !== -1 && currentDailyCount >= dailyLimit) {
                    console.log(`User reached daily AI limit limit (${dailyLimit}) for plan ${userPlan}`);
                    setLoadingGifts(false);
                    return; // Block generation, they only see cards from DB
                }

                if (lastGenStr !== today || (dailyLimit === -1 || currentDailyCount < dailyLimit)) {
                    console.log(`Generating personalized gifts... (Count: ${currentDailyCount} / Limit: ${dailyLimit === -1 ? 'Unlimited' : dailyLimit})`);

                    // Increment optimistic count
                    const newCount = currentDailyCount + 1;

                    const { error } = await supabase.functions.invoke('generate_daily_gifts');

                    if (error) {
                        console.error("Edge Function blocked/failed. Using Frontend OpenAI Fallback:", error);

                        try {
                            const groqKey = import.meta.env.VITE_GROQ_API_KEY || import.meta.env.VITE_OPENAI_API_KEY;
                            let amountToGenerate = 3;
                            if (profile?.subscription_plan === 'STANDARD') amountToGenerate = 5;
                            if (profile?.subscription_plan === 'PRO') amountToGenerate = 7;
                            if (profile?.subscription_plan === 'ULTRA') amountToGenerate = 10;
                            if (profile?.subscription_plan === 'BUSINESS') amountToGenerate = 15;

                            if (groqKey) {
                                console.log("Directly calling Groq API...");
                                const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                                    method: 'POST',
                                    headers: {
                                        'Authorization': `Bearer ${groqKey}`,
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        model: 'llama-3.3-70b-versatile',
                                        messages: [
                                            {
                                                role: 'system',
                                                content: `You are a premium AI gift concierge. Generate exactly ${amountToGenerate} highly specific, trendy, premium gift ideas based on the user's taste. 
                                                
CRITICAL RULES:
1. Prices MUST be in EUR (e.g., "€100 - €150").
2. Suggest CONCRETE products, brands, or models (e.g., "Sony WH-1000XM5 Headphones" instead of "Headphones").
3. Return ONLY a valid JSON array of ${amountToGenerate} objects. Each object MUST have "title", "description", "price_range", and "image_keyword" (a SINGLE English word describing the item for a photo search, e.g. "headphones", "perfume", "watch"). Do not wrap in markdown quotes.`
                                            },
                                            { role: 'user', content: `Generate exactly ${amountToGenerate} hyper-specific, trendy gift ideas in EUR. Keep titles descriptive but under 6 words. Keep descriptions engaging and under 100 characters. Make sure image_keyword is a single visually descriptive word.` }
                                        ],
                                    }),
                                });

                                const rawText = await response.text();
                                let suggestions: any[] = [];
                                if (rawText) {
                                    const aiData = JSON.parse(rawText);
                                    if (aiData.choices && aiData.choices[0]) {
                                        try {
                                            suggestions = JSON.parse(aiData.choices[0].message.content);
                                        } catch {
                                            const clean = aiData.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '');
                                            suggestions = JSON.parse(clean);
                                        }
                                    }
                                }

                                if (suggestions && suggestions.length > 0) {
                                    // FORCE EXACT LENGTH LIMIT
                                    const limitedSuggestions = suggestions.slice(0, amountToGenerate);
                                    const pexelsKey = import.meta.env.VITE_PEXELS_API_KEY;

                                    const fallbackIdeas = await Promise.all(limitedSuggestions.map(async (gift: any) => {
                                        let finalImageUrl = '';

                                        if (pexelsKey && gift.image_keyword) {
                                            try {
                                                const pexRes = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(gift.image_keyword)}&per_page=1`, {
                                                    headers: { Authorization: pexelsKey }
                                                });
                                                const pexData = await pexRes.json();
                                                if (pexData.photos && pexData.photos.length > 0) {
                                                    // Use portrait or large image for the card
                                                    finalImageUrl = pexData.photos[0].src.portrait || pexData.photos[0].src.large;
                                                }
                                            } catch (e) {
                                                console.error("Failed to fetch from Pexels", e);
                                            }
                                        } else {
                                            console.warn("No Pexels API Key found. Falling back to gradient UI.");
                                        }

                                        return {
                                            user_id: user.id,
                                            title: gift.title,
                                            description: gift.description,
                                            price_range: gift.price_range,
                                            image_url: finalImageUrl,
                                            is_saved: false,
                                            is_manual: false
                                        };
                                    }));
                                    await supabase.from('gift_ideas').insert(fallbackIdeas);
                                    console.log("Successfully inserted direct OpenAI gifts with Pexels images!");
                                } else {
                                    throw new Error("No suggestions returned from OpenAI direct call");
                                }
                            } else {
                                throw new Error("No VITE_OPENAI_API_KEY found in frontend .env");
                            }
                        } catch (fallbackError) {
                            console.error("Critical Fallback Failed too! Inserting placebo cards.", fallbackError);
                            const placeboIdeas = Array.from({ length: 3 }).map((_, i) => ({
                                user_id: user.id,
                                title: `Trendy Gift Idea ${i + 1}`,
                                description: "A personalized gift idea placeholder. The AI engine is currently resting!",
                                price_range: "$50 - $150",
                                image_url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=400&auto=format&fit=crop',
                                is_saved: false,
                                is_manual: false
                            }));
                            await supabase.from('gift_ideas').insert(placeboIdeas);
                        }
                    }

                    // Always update the Generation Timestamp and Count
                    await supabase.from('users').update({
                        last_giftinder_generation: new Date().toISOString(),
                        daily_generations_count: newCount
                    }).eq('id', user.id);
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
                            <h3 className="font-bold text-slate-700 text-lg mb-1">You've seen all ideas!</h3>
                            <p className="text-sm">Swipe through them, save what you like, or upgrade your plan to generate more daily.</p>
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
                                    className="absolute w-full h-[60dvh] max-h-[500px] bg-slate-200 rounded-[2rem] shadow-soft overflow-hidden filter brightness-95"
                                    style={{
                                        scale: 1 - (activeIndex - index) * 0.05,
                                        top: (activeIndex - index) * -10,
                                        background: `linear-gradient(135deg, hsl(${card.title.length * 15 % 360}, 70%, 60%), hsl(${(card.title.length * 15 + 40) % 360}, 70%, 40%))`
                                    }}
                                >
                                    <img
                                        src={card.image}
                                        alt=""
                                        className="w-full h-[60%] object-cover object-center transition-opacity duration-300 pointer-events-none opacity-100"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.opacity = '0';
                                        }}
                                    />
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
            {/* Image Container with Fallback Gradient */}
            <div
                className="relative w-full h-[60%] bg-slate-200"
                style={{
                    background: `linear-gradient(135deg, hsl(${card.title.length * 15 % 360}, 70%, 60%), hsl(${(card.title.length * 15 + 40) % 360}, 70%, 40%))`
                }}
            >
                <img
                    src={card.image}
                    alt={card.title}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-300 opacity-100"
                    onError={(e) => {
                        // Hide broken image so the beautiful gradient background shows through
                        (e.target as HTMLImageElement).style.opacity = '0';
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"></div>
                <div className="absolute bottom-4 left-6 right-6 text-white pointer-events-none">
                    <h2 className="text-3xl font-bold leading-tight drop-shadow-md">{card.title}</h2>
                    <p className="text-xl font-medium text-white/90 drop-shadow-md mt-1">{card.price}</p>
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
