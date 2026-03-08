import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Zap, CheckCircle2, Gift, Star, Calendar, X } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

interface DailyStreakModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function DailyStreakModal({ isOpen, onClose }: DailyStreakModalProps) {
    const { t } = useTranslation();
    const { dailyStreak, claimDailyStreak, hasGoldenAura, karmaPoints } = useAuth();
    const [claiming, setClaiming] = useState(false);
    const [justClaimed, setJustClaimed] = useState(false);

    // If no context available yet, don't render inner contents
    if (!dailyStreak) return null;

    const {
        can_claim,
        current_streak,
        next_streak,
        reward_amount,
        day1_reward,
        day3_reward,
        day7_reward
    } = dailyStreak;

    // Logic for the timeline
    // We want to show a 7-day visual bar.
    // If the streak is > 7, we take the modulo to show the current "week" cycle.
    const displayStreak = current_streak % 7;
    const isDay7 = current_streak > 0 && current_streak % 7 === 0;

    const handleClaim = async () => {
        if (!can_claim || claiming) return;
        setClaiming(true);
        try {
            await claimDailyStreak();
            setJustClaimed(true);
            setTimeout(() => {
                onClose();
                setJustClaimed(false);
            }, 2500); // Auto close after 2.5s success
        } catch (err) {
            console.error(err);
        } finally {
            setClaiming(false);
        }
    };

    const getDayReward = (dayIndex: number) => {
        if (dayIndex === 7) return day7_reward;
        if (dayIndex >= 3) return day3_reward;
        return day1_reward;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative"
                    >
                        {/* Header Gradient */}
                        <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-6 text-white text-center relative overflow-hidden">
                            {hasGoldenAura && (
                                <motion.div
                                    className="absolute inset-0 bg-white/20"
                                    animate={{ 
                                        x: ['-100%', '100%'] 
                                    }}
                                    transition={{ 
                                        duration: 3, 
                                        repeat: Infinity, 
                                        ease: "linear" 
                                    }}
                                />
                            )}
                            <button 
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4 ring-4 ring-white/30">
                                <Zap className="w-8 h-8 drop-shadow-md" fill="currentColor" />
                            </div>
                            <h2 className="text-2xl font-bold mb-1">
                                {t('gamification.streakTitle', { defaultValue: 'Дневен Бонус' })}
                            </h2>
                            <p className="text-orange-50 font-medium">
                                {t('gamification.currentStreak', { defaultValue: 'Текуща серия: {{count}} дни', count: current_streak })}
                            </p>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-6">
                            
                            {/* Points Summary */}
                            <div className="flex justify-between items-center px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                                        <Star className="w-5 h-5 text-amber-500" fill="currentColor" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                                            {t('gamification.totalKarma', { defaultValue: 'Твоята Карма' })}
                                        </p>
                                        <p className="font-bold text-slate-800 dark:text-slate-200">
                                            {karmaPoints} <span className="text-amber-500">KP</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Timeline */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                                    {t('gamification.thisWeek', { defaultValue: 'Тази седмица' })}
                                </h3>
                                <div className="grid grid-cols-7 gap-2">
                                    {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                                        // Visual state logic
                                        // A day is "claimed" if its number is <= displayStreak (unless day 7 is claimed)
                                        // A day is "next" if it's the exact next_streak modulo 7
                                        
                                        const isClaimed = isDay7 ? true : day <= displayStreak;
                                        
                                        // If we can claim today, the 'next_streak' is the one blinking
                                        const isTodayTarget = can_claim && (
                                            (next_streak % 7 === day) || 
                                            (next_streak % 7 === 0 && day === 7)
                                        );

                                        const reward = getDayReward(day);
                                        const isBigReward = day === 3 || day === 7;

                                        return (
                                            <div key={day} className="flex flex-col items-center">
                                                <div 
                                                    className={`
                                                        w-full aspect-square rounded-xl flex flex-col items-center justify-center transition-all duration-300 relative
                                                        ${isClaimed && !isTodayTarget ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800' : ''}
                                                        ${isTodayTarget ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 scale-110 z-10' : ''}
                                                        ${!isClaimed && !isTodayTarget ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700' : ''}
                                                    `}
                                                >
                                                    {isTodayTarget && (
                                                        <motion.div
                                                            className="absolute inset-0 rounded-xl border-2 border-orange-400/50"
                                                            animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }}
                                                            transition={{ duration: 1.5, repeat: Infinity }}
                                                        />
                                                    )}
                                                    
                                                    {isClaimed && !isTodayTarget ? (
                                                        <CheckCircle2 className="w-5 h-5 mb-0.5" />
                                                    ) : isBigReward ? (
                                                        <Gift className="w-5 h-5 mb-0.5" />
                                                    ) : (
                                                        <span className="font-bold text-sm mb-0.5">+{reward}</span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-1.5 uppercase">
                                                    D{day}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Action Area */}
                            <div className="pt-4">
                                {justClaimed ? (
                                    <motion.div 
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-4 rounded-2xl flex items-center justify-center font-bold space-x-2 border border-green-200 dark:border-green-800/50"
                                    >
                                        <CheckCircle2 className="w-5 h-5" />
                                        <span>{t('gamification.claimedSuccess', { defaultValue: 'Успешно взето!' })}</span>
                                    </motion.div>
                                ) : can_claim ? (
                                    <button
                                        onClick={handleClaim}
                                        disabled={claiming}
                                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-orange-500/25 transition-all active:scale-[0.98] disabled:opacity-70 flex justify-center items-center"
                                    >
                                        {claiming ? (
                                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <span>
                                                {t('gamification.claimButton', { defaultValue: 'Вземи +{{amount}} Карма', amount: reward_amount })}
                                            </span>
                                        )}
                                    </button>
                                ) : (
                                    <div className="bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 p-4 rounded-2xl flex flex-col items-center justify-center text-center text-sm font-medium border border-slate-200 dark:border-slate-700">
                                        <Calendar className="w-5 h-5 mb-1" />
                                        <p>{t('gamification.alreadyClaimed', { defaultValue: 'Вече си взел дневната си награда.' })}</p>
                                        <p className="text-xs opacity-75 mt-1">{t('gamification.comeBackTomorrow', { defaultValue: 'Ела пак утре за още!' })}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
