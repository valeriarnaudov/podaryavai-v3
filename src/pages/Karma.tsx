import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, LogOut, Loader2, Award, Clock, History, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';

interface KarmaReward {
    id: string;
    title: string;
    description: string;
    cost_points: number;
    reward_type: string;
    reward_value: string;
    reward_metadata?: Record<string, any>;
    duration_days: number;
}

export default function Karma() {
    const { user, karmaPoints, activeReward, refreshUserData, signOut, loading: authLoading } = useAuth();
    const { t } = useTranslation();
    const [rewards, setRewards] = useState<KarmaReward[]>([]);
    const [loading, setLoading] = useState(true);
    const [redeeming, setRedeeming] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [historyLogs, setHistoryLogs] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        const fetchRewards = async () => {
            const { data } = await supabase
                .from('karma_rewards')
                .select('*')
                .eq('is_active', true)
                .order('cost_points', { ascending: true });
            
            if (data) setRewards(data);
            setLoading(false);
        };
        fetchRewards();
    }, []);

    const handleRedeem = async (reward: KarmaReward) => {
        if (!user || user.id === 'preview') {
            alert(t('karmaStore.loginRequired'));
            return;
        }

        if (karmaPoints < reward.cost_points) {
            alert(t('karmaStore.notEnough'));
            return;
        }

        if (!confirm(t('karmaStore.confirmSpend', { points: reward.cost_points, title: reward.title }))) {
            return;
        }

        setRedeeming(reward.id);

        try {
            const { error: redeemError } = await supabase.rpc('redeem_karma_reward', {
                p_user_id: user.id,
                p_reward_id: reward.id
            });

            if (redeemError) throw redeemError;

            // Success! Refresh user context
            await refreshUserData();

            // Provide feedback
            alert(t('karmaStore.successRedeem', { title: reward.title }));

        } catch (error: any) {
            console.error("Error redeeming reward:", error);
            alert(t('karmaStore.errorRedeem', { error: error.message || t('karmaStore.genericError') }));
        } finally {
            setRedeeming(null);
        }
    };

    const loadHistory = async () => {
        setShowHistory(true);
        if (historyLogs.length > 0) return; // Prevent over-fetching

        setLoadingHistory(true);
        // We only want to show:
        // 1) Purchases (SPENT)
        // 2) Referral Bonuses (description = 'Referral Bonus')
        // 3) 7-Day Streaks (description = '7-Day Streak Reward')
        const { data } = await supabase
            .from('user_karma_history')
            .select('*')
            .eq('user_id', user?.id)
            .or('action_type.eq.SPENT,description.eq."Referral Bonus",description.eq."7-Day Streak Reward"')
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (data) setHistoryLogs(data);
        setLoadingHistory(false);
    };

    return (
        <div className="h-full flex flex-col bg-background dark:bg-slate-900 relative overflow-hidden">
            <header className="px-6 pt-10 pb-6 flex justify-between items-center relative z-10">
                <div>
                    <h1 className="text-2xl font-bold text-textMain dark:text-white tracking-tight">{t('karmaStore.title')}</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('karmaStore.subtitle')}</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadHistory}
                        className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300 hover:text-accent hover:bg-slate-200 dark:bg-slate-600 transition-colors"
                        title="History"
                    >
                        <History className="w-5 h-5" />
                    </button>
                    <button
                        onClick={signOut}
                        className="p-2.5 bg-white dark:bg-slate-800 rounded-full text-slate-400 hover:text-red-500 shadow-soft transition-colors"
                        title="Sign Out"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto px-6 pb-24">
                {/* Points Display */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-8 text-white shadow-floating text-center relative overflow-hidden mb-8"
                >
                    <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white dark:bg-slate-800/20 rounded-full blur-2xl"></div>
                    <div className="absolute bottom-[-20%] left-[-10%] w-40 h-40 bg-white dark:bg-slate-800/10 rounded-full blur-2xl"></div>

                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white dark:bg-slate-800/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
                            {authLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Sparkles className="w-8 h-8 text-white drop-shadow-md" />}
                        </div>
                        <h2 className="text-6xl font-black mb-1 drop-shadow-md">{karmaPoints}</h2>
                        <p className="font-semibold tracking-widest uppercase text-white/90 text-sm">{t('karmaStore.points')}</p>
                    </div>
                </motion.div>

                {/* Premium Active Reward Status */}
                {activeReward && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl shadow-sm mb-6 flex items-start gap-4"
                    >
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shrink-0">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-emerald-800">{t('karmaStore.activeReward')}: {activeReward.title}</h4>
                            <p className="text-sm font-medium text-emerald-600 mt-1">
                                {t('karmaStore.benefitsExpire')} {new Date(activeReward.expires_at).toLocaleDateString()}.
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Rewards List */}
                <div>
                    <h3 className="text-lg font-bold text-textMain dark:text-white mb-4">{t('karmaStore.store')}</h3>
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>
                    ) : rewards.length === 0 ? (
                        <div className="text-center py-10 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <p className="text-slate-500 dark:text-slate-400">{t('karmaStore.noRewards')}</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {rewards.map((reward, i) => {
                                const isLocked = karmaPoints < reward.cost_points;

                                return (
                                    <motion.div
                                        key={reward.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${isLocked
                                            ? 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-700 opacity-70 grayscale hover:grayscale-0'
                                            : 'bg-white dark:bg-slate-800 border-amber-100 shadow-soft hover:border-amber-300'
                                            }`}
                                    >
                                        <div className="flex items-center space-x-4">
                                            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-amber-100">
                                                <Award className="w-6 h-6 text-amber-500" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-textMain dark:text-white">{reward.title}</h4>
                                                <div className="flex flex-wrap items-center gap-2 gap-y-1.5 mt-2 text-[10px] sm:text-xs font-semibold">
                                                    <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md whitespace-nowrap">{t('karmaStore.costPoints', { points: reward.cost_points })}</span>
                                                    
                                                    <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md whitespace-nowrap">
                                                        {reward.reward_type === 'PLAN_UPGRADE' ? `${t('karmaStore.unlocks')}: ${reward.reward_value}` : 
                                                         reward.reward_type === 'ADD_FREE_DELIVERIES' ? t('karmaStore.deliveries', { amount: reward.reward_metadata?.amount || 1 }) : 
                                                         reward.reward_type.replace(/_/g, ' ')}
                                                    </span>

                                                    {reward.duration_days > 0 && (
                                                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md whitespace-nowrap">{t('karmaStore.days', { days: reward.duration_days })}</span>
                                                    )}
                                                </div>
                                                {reward.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{reward.description}</p>}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleRedeem(reward)}
                                            disabled={redeeming === reward.id || isLocked}
                                            className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-bold rounded-xl shadow-md active:scale-95 transition-all outline-none disabled:opacity-50 flex items-center justify-center whitespace-nowrap"
                                        >
                                            {redeeming === reward.id ? <Loader2 className="w-4 h-4 animate-spin" /> : (isLocked ? t('karmaStore.locked') : t('karmaStore.buyReward'))}
                                        </button>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            {/* History Modal */}
            {showHistory && (
                <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"
                    >
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t('karmaStore.historyTitle')}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('karmaStore.historySubtitle')}</p>
                            </div>
                            <button onClick={() => setShowHistory(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-3">
                            {loadingHistory ? (
                                <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
                            ) : historyLogs.length === 0 ? (
                                <p className="text-center text-slate-500 dark:text-slate-400 py-6">{t('karmaStore.noHistory')}</p>
                            ) : (
                                historyLogs.map(log => (
                                    <div key={log.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${log.action_type === 'EARNED' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                                                {log.action_type === 'EARNED' ? <ArrowUpRight className="w-5 h-5 text-emerald-600" /> : <ArrowDownRight className="w-5 h-5 text-red-600" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{log.description}</p>
                                                <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">{new Date(log.created_at).toLocaleDateString()} {t('karmaStore.atTime')} {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        </div>
                                        <span className={`font-black tracking-tight ${log.action_type === 'EARNED' ? 'text-emerald-500' : 'text-slate-500 dark:text-slate-400'}`}>
                                            {log.action_type === 'EARNED' ? '+' : '-'}{log.points}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
