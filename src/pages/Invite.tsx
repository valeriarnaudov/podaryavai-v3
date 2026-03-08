import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Loader2, UserPlus, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Invite() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { session, loading: authLoading } = useAuth();
    const { t } = useTranslation();

    const [processState, setProcessState] = useState<'checking' | 'connecting' | 'success' | 'error'>('checking');
    const [inviterName, setInviterName] = useState<string>('');

    const refCode = searchParams.get('ref');

    useEffect(() => {
        // Wait until auth is resolved
        if (authLoading) return;

        const processInvite = async () => {
            if (!refCode) {
                setProcessState('error');
                return;
            }

            const recordClick = async (inviterId: string) => {
                let deviceId = localStorage.getItem('device_fingerprint');
                if (!deviceId) {
                    deviceId = Math.random().toString(36).substring(2) + Date.now().toString(36);
                    localStorage.setItem('device_fingerprint', deviceId);
                }
                try {
                    await supabase.rpc('record_referral_click', {
                        p_inviter_id: inviterId,
                        p_fingerprint: deviceId
                    });
                } catch (e) {
                    console.error('Failed to record click', e);
                }
            };

            // Fetch the inviter's basic info to show on screen
            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('first_name, last_name, full_name')
                    .eq('id', refCode)
                    .single();

                if (data && !error) {
                    const fname = data.first_name || data.full_name?.split(' ')[0] || '';
                    const lname = data.last_name || data.full_name?.split(' ').slice(1).join(' ') || '';
                    setInviterName(`${fname} ${lname}`.trim() || t('gamification.someone', { defaultValue: 'Някой' }));
                } else {
                    setInviterName(t('gamification.someone', { defaultValue: 'Някой' }));
                }
            } catch (err) {
                console.error(err);
                setInviterName(t('gamification.someone', { defaultValue: 'Някой' }));
            }

            if (!session) {
                // User is not logged in: Record click & redirect
                await recordClick(refCode);
                localStorage.setItem('invited_by', refCode);
                navigate(`/register?ref=${refCode}`);
            } else {
                // User is logged in: Check if it's the same user
                if (session.user.id === refCode) {
                    navigate('/profile'); // User clicked their own link
                    return;
                }
                await recordClick(refCode);
                setProcessState('connecting');
            }
        };

        processInvite();
    }, [authLoading, session, refCode, navigate, t]);

    const handleConnect = async () => {
        if (!session?.user || !refCode) return;
        setProcessState('checking'); // Use checking as a loading state for the button

        try {
            const { error } = await supabase.rpc('connect_users', {
                inviter_id: refCode,
                invitee_id: session.user.id
            });

            if (error) {
                console.error("Connect Users Error:", error);
                setProcessState('error');
                return;
            }

            setProcessState('success');
            setTimeout(() => {
                navigate('/contacts');
            }, 2500);

        } catch (err) {
            console.error(err);
            setProcessState('error');
        }
    };

    if (authLoading || (processState === 'checking' && !session)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
                <Loader2 className="w-10 h-10 animate-spin text-accent mb-4" />
                <p className="text-slate-500 font-medium">{t('gamification.loadingInvite', { defaultValue: 'Зареждане на поканата...' })}</p>
            </div>
        );
    }

    if (processState === 'error') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 dark:text-white pb-2">{t('gamification.invalidLink', { defaultValue: 'Невалиден линк' })}</h2>
                    <p className="text-slate-500 mb-6">{t('gamification.invalidLinkDesc', { defaultValue: 'Тази покана е невалидна или вече не съществува.' })}</p>
                    <button 
                        onClick={() => navigate('/')} 
                        className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-2xl transition-colors"
                    >
                        {t('gamification.goHome', { defaultValue: 'Към Начало' })}
                    </button>
                </div>
            </div>
        );
    }

    if (processState === 'success') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl max-w-md w-full text-center border-t-4 border-green-500"
                >
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 dark:text-white">{t('gamification.connected', { defaultValue: 'Успешно свързване!' })}</h2>
                    <p className="text-slate-500 mb-6 flex flex-col items-center">
                        <span className="font-semibold text-slate-700 dark:text-slate-200 block text-lg mb-1">{inviterName}</span> 
                        <span>{t('gamification.addedToContacts', { defaultValue: 'вече е в списъка ви с контакти.' })}</span>
                    </p>
                    <p className="text-xs text-slate-400 animate-pulse">{t('gamification.redirecting', { defaultValue: 'Пренасочване към контакти...' })}</p>
                </motion.div>
            </div>
        );
    }

    // Process State is 'connecting'
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 p-4 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -mr-16 -mt-16" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -ml-16 -mb-16" />

            <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/20 border border-slate-100 dark:border-slate-700/50 max-w-md w-full relative z-10"
            >
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 rounded-full border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center shadow-inner">
                        <UserPlus className="w-10 h-10 text-accent drop-shadow-sm" />
                    </div>
                </div>

                <div className="text-center mb-8">
                    <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-2 leading-tight">
                        {t('gamification.newConnectionTitle', { defaultValue: 'Нова Връзка' })}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-accent block text-xl my-2 pb-1">{inviterName}</span>
                        {t('gamification.inviteText', { defaultValue: 'ви кани да се свържете в PodaryaVai, за да виждате по-лесно своите желания и подаръци!' })}
                    </p>
                </div>

                <button
                    onClick={handleConnect}
                    className="w-full bg-accent hover:bg-accent/90 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-accent/25 transition-all active:scale-[0.98]"
                >
                    {t('gamification.acceptInvite', { defaultValue: 'Приеми Поканата' })}
                </button>

                <button
                    onClick={() => navigate('/')}
                    className="w-full mt-3 py-3 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-semibold text-sm transition-colors"
                >
                    {t('gamification.decline', { defaultValue: 'Откажи' })}
                </button>
            </motion.div>
        </div>
    );
}
