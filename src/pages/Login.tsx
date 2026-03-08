import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2, Heart, Gift, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Login() {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const location = useLocation();

    // Check if there was an error passed via URL query params (from OAuth redirect)
    const initialError = new URLSearchParams(location.search).get('error');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(initialError);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            navigate('/');
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        }
    };

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[100dvh] bg-background dark:bg-slate-900 w-full overflow-hidden">
            
            {/* Left Side: Marketing / Branding (Desktop Only) */}
            <div className="hidden lg:flex flex-col justify-between p-16 bg-slate-900 relative">
                {/* Abstract Visual Elements */}
                <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-accent/30 rounded-full blur-[100px] opacity-60 pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-rose-500/30 rounded-full blur-[100px] opacity-60 pointer-events-none" />
                
                <div className="relative z-10 flex items-center space-x-3 mb-10">
                    <img src="/favicon.svg" alt="Podaryavai Logo" className="w-12 h-12 drop-shadow-lg" />
                    <span className="text-3xl font-extrabold text-white tracking-tight">Podaryavai</span>
                </div>

                <div className="relative z-10 my-auto max-w-xl pr-8">
                    <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-5xl font-black text-white leading-[1.1] mb-6"
                    >
                        {t('marketing.heroTitle')}
                    </motion.h1>
                    <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-xl text-slate-300 mb-12 leading-relaxed"
                    >
                        {t('marketing.heroSubtitle')}
                    </motion.p>

                    <div className="space-y-8">
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="flex items-start space-x-4">
                            <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center shrink-0 border border-accent/20 shadow-inner">
                                <Zap className="w-7 h-7 text-accent" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">{t('marketing.feature1Title')}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">{t('marketing.feature1Desc')}</p>
                            </div>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="flex items-start space-x-4">
                            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 flex items-center justify-center shrink-0 border border-rose-500/20 shadow-inner">
                                <Gift className="w-7 h-7 text-rose-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">{t('marketing.feature2Title')}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">{t('marketing.feature2Desc')}</p>
                            </div>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="flex items-start space-x-4">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/20 shadow-inner">
                                <Heart className="w-7 h-7 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">{t('marketing.feature3Title')}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">{t('marketing.feature3Desc')}</p>
                            </div>
                        </motion.div>
                    </div>
                </div>

                <div className="relative z-10 text-slate-500 text-sm mt-12">
                     Podaryavai &copy; {new Date().getFullYear()} Social Ecosystem Software.
                </div>
            </div>

            {/* Right Side: Auth Form & Language Switcher */}
            <div className="flex flex-col px-6 sm:px-12 py-8 bg-background dark:bg-slate-900 min-h-[100dvh] lg:min-h-0 relative">
                
                {/* Mobile Orbs - Upgraded Glassmorphism */}
                <div className="lg:hidden absolute inset-0 overflow-hidden pointer-events-none z-0">
                    <div className="absolute top-[-5%] left-[-10%] w-80 h-80 bg-accent/20 rounded-full blur-[80px]" />
                    <div className="absolute top-[20%] right-[-10%] w-72 h-72 bg-rose-500/20 rounded-full blur-[80px]" />
                    <div className="absolute bottom-[-10%] left-[10%] w-96 h-96 bg-purple-500/15 rounded-full blur-[100px]" />
                </div>

                {/* Top Center Language Switcher */}
                <div className="flex justify-center lg:justify-end items-center mb-12 relative z-20">
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-1 border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
                        <button 
                            onClick={() => changeLanguage('en')}
                            className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${i18n.language === 'en' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow drop-shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        >
                            EN
                        </button>
                        <button 
                            onClick={() => changeLanguage('bg')}
                            className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${i18n.language === 'bg' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow drop-shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        >
                            БГ
                        </button>
                    </div>
                </div>

                {/* Main Auth Form Container */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative z-10 w-full max-w-sm mx-auto my-auto"
                >
                    <div className="text-center mb-10">
                        {/* Mobile Premium Welcome */}
                        <div className="lg:hidden flex flex-col items-center mb-10">
                            <div className="w-24 h-24 bg-gradient-to-tr from-accent via-rose-500 to-purple-600 rounded-[2rem] shadow-2xl shadow-accent/30 flex items-center justify-center p-5 mb-6 relative overflow-hidden">
                                <div className="absolute inset-0 bg-white/20 blur-xl" />
                                <img src="/favicon.svg" alt="Podaryavai Logo" className="w-full h-full object-contain relative z-10 drop-shadow-xl" />
                            </div>
                            <h2 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-accent to-rose-500 mb-3 tracking-tight">
                                Podaryavai
                            </h2>
                            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium px-4 leading-relaxed">
                                {t('marketing.heroTitle')}
                            </p>
                        </div>

                        <h1 className="text-3xl font-extrabold tracking-tight text-textMain dark:text-white mb-2">{t('auth.login.title')}</h1>
                        <p className="text-slate-500 dark:text-slate-400">{t('auth.login.subtitle')}</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        {error && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100 shadow-sm">
                                {error}
                            </div>
                        )}

                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={t('auth.login.emailPlaceholder')}
                                required
                                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-600/50 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all shadow-sm placeholder:text-slate-400 font-medium"
                            />
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={t('auth.login.passwordPlaceholder')}
                                required
                                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-600/50 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all shadow-sm placeholder:text-slate-400 font-medium"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-accent text-white rounded-2xl font-bold shadow-floating shadow-accent/20 active:scale-[0.98] hover:bg-accent/90 transition-all flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4 border border-accent/10"
                        >
                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <span>{t('auth.login.submit')}</span>}
                        </button>
                    </form>

                    <div className="mt-8">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200 dark:border-slate-600/50"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-background dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-medium">{t('auth.login.orContinueWith')}</span>
                            </div>
                        </div>

                        <button
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="mt-8 w-full py-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl font-bold shadow-soft border border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 active:scale-[0.98] transition-all flex items-center justify-center space-x-3 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                           <svg className="w-6 h-6" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            <span>Google</span>
                        </button>
                    </div>

                    <p className="text-center text-[15px] text-slate-500 dark:text-slate-400 mt-10 font-medium">
                        {t('auth.login.noAccount')}{' '}
                        <Link to="/register" className="font-bold text-accent hover:text-accent/80 transition-colors">
                            {t('auth.login.createOne')}
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
