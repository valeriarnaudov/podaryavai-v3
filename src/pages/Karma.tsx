import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Lock, Gift, Star, Zap, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';

const REWARDS = [
    { id: 'has_golden_aura', points: 500, title: 'Golden Aura', desc: 'Sleek golden frame around your avatar', icon: Star },
    { id: 'free_deliveries_count', points: 800, title: 'Free Delivery', desc: 'Free delivery on next Concierge order', icon: Gift },
    { id: 'has_vip_giftinder', points: 1200, title: 'VIP Giftinder', desc: 'Unlock premium VIP tier gift ideas', icon: Lock },
    { id: 'karma_boost_until', points: 2000, title: 'x2 Karma Multiplier (24h)', desc: 'Earn double points for 24 hours', icon: Zap },
];

export default function Karma() {
    const { user, karmaPoints, hasGoldenAura, hasVipGiftinder, karmaBoostUntil, refreshUserData, signOut, loading } = useAuth();
    const [redeeming, setRedeeming] = useState<string | null>(null);

    const hasReward = (rewardId: string) => {
        if (rewardId === 'has_golden_aura') return hasGoldenAura;
        if (rewardId === 'has_vip_giftinder') return hasVipGiftinder;
        if (rewardId === 'karma_boost_until') return karmaBoostUntil && new Date(karmaBoostUntil) > new Date();
        return false; // Free delivery is stackable
    };

    const handleRedeem = async (reward: typeof REWARDS[0]) => {
        if (!user || user.id === 'preview') {
            alert("Please log in to redeem rewards.");
            return;
        }

        if (karmaPoints < reward.points) {
            alert("Not enough Karma points!");
            return;
        }

        setRedeeming(reward.id);

        try {
            // Calculate new values to update
            const updates: any = {
                karma_points: karmaPoints - reward.points
            };

            if (reward.id === 'has_golden_aura') updates.has_golden_aura = true;
            if (reward.id === 'has_vip_giftinder') updates.has_vip_giftinder = true;

            if (reward.id === 'free_deliveries_count') {
                const { data } = await supabase.from('users').select('free_deliveries_count').eq('id', user.id).single();
                updates.free_deliveries_count = (data?.free_deliveries_count || 0) + 1;
            }

            if (reward.id === 'karma_boost_until') {
                const boostEnd = new Date();
                boostEnd.setHours(boostEnd.getHours() + 24);
                updates.karma_boost_until = boostEnd.toISOString();
            }

            const { error } = await supabase.from('users').update(updates).eq('id', user.id);

            if (error) throw error;

            // Success! Refresh user context
            await refreshUserData();

            // Provide feedback
            alert(`🎉 Success! You redeemed ${reward.title}.`);

        } catch (error: any) {
            console.error("Error redeeming reward:", error);
            alert(`Error: ${error.message || 'Could not redeem reward.'}`);
        } finally {
            setRedeeming(null);
        }
    };

    return (
        <div className="h-full flex flex-col bg-background relative overflow-hidden">
            <header className="px-6 pt-10 pb-6 flex justify-between items-center relative z-10">
                <div>
                    <h1 className="text-2xl font-bold text-textMain tracking-tight">Gamification</h1>
                    <p className="text-sm text-slate-500">Earn points, unlock rewards.</p>
                </div>
                <button
                    onClick={signOut}
                    className="p-2 bg-white rounded-full text-slate-400 hover:text-red-500 shadow-soft transition-colors"
                    title="Sign Out"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </header>

            <main className="flex-1 overflow-y-auto px-6 pb-24">
                {/* Points Display */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-8 text-white shadow-floating text-center relative overflow-hidden mb-8"
                >
                    <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/20 rounded-full blur-2xl"></div>
                    <div className="absolute bottom-[-20%] left-[-10%] w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>

                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
                            {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Sparkles className="w-8 h-8 text-white drop-shadow-md" />}
                        </div>
                        <h2 className="text-6xl font-black mb-1 drop-shadow-md">{karmaPoints}</h2>
                        <p className="font-semibold tracking-widest uppercase text-white/90 text-sm">Karma Points</p>
                    </div>
                </motion.div>

                {/* Rewards List */}
                <div>
                    <h3 className="text-lg font-bold text-textMain mb-4">Unlock Rewards</h3>
                    <div className="space-y-4">
                        {REWARDS.map((reward, i) => {
                            const Icon = reward.icon;
                            const isLocked = karmaPoints < reward.points;
                            const isOwned = hasReward(reward.id);

                            return (
                                <motion.div
                                    key={reward.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className={`p-5 rounded-2xl border flex items-center justify-between transition-all ${isLocked && !isOwned
                                        ? 'bg-slate-50 border-slate-100 opacity-60 grayscale'
                                        : isOwned
                                            ? 'bg-amber-50/50 border-amber-200 shadow-sm'
                                            : 'bg-white border-amber-100 shadow-soft'
                                        }`}
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isLocked && !isOwned ? 'bg-slate-200' : 'bg-amber-100'
                                            }`}>
                                            {isLocked && !isOwned ? <Lock className="w-5 h-5 text-slate-400" /> : <Icon className={`w-6 h-6 ${isOwned ? 'text-amber-600' : 'text-amber-500'}`} />}
                                        </div>
                                        <div>
                                            <h4 className={`font-bold ${isLocked && !isOwned ? 'text-slate-500' : isOwned ? 'text-amber-700' : 'text-textMain'}`}>{reward.title}</h4>
                                            <p className={`text-xs font-medium mt-0.5 ${isOwned ? 'text-amber-600/70' : 'text-slate-400'}`}>
                                                {isOwned && reward.id !== 'karma_boost_until' ? 'Already Purchased' : `${reward.points} Points • ${reward.desc}`}
                                            </p>
                                        </div>
                                    </div>

                                    {!isLocked && !isOwned && (
                                        <button
                                            onClick={() => handleRedeem(reward)}
                                            disabled={redeeming === reward.id}
                                            className="px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-bold rounded-xl shadow-md active:scale-95 transition-all outline-none disabled:opacity-70 flex items-center"
                                        >
                                            {redeeming === reward.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Redeem'}
                                        </button>
                                    )}

                                    {isOwned && reward.id === 'karma_boost_until' && (
                                        <div className="px-3 py-1.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-lg border border-amber-200 inline-block uppercase tracking-wider">
                                            Active
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </main>
        </div>
    );
}
