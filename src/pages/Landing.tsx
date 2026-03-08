import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Gift, Heart, Star, CalendarDays, ArrowRight, Sun, Moon, Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

export default function Landing() {
    const { t, i18n } = useTranslation();
    const { theme, setTheme } = useTheme();

    const fadeIn = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
    };

    const staggerContainer = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const features = [
        {
            icon: <Gift className="w-6 h-6 text-accent" />,
            title: t('landing.features.smartGifts.title'),
            description: t('landing.features.smartGifts.desc')
        },
        {
            icon: <Heart className="w-6 h-6 text-rose-500" />,
            title: t('landing.features.wishlists.title'),
            description: t('landing.features.wishlists.desc')
        },
        {
            icon: <Star className="w-6 h-6 text-amber-500" />,
            title: t('landing.features.karma.title'),
            description: t('landing.features.karma.desc')
        },
        {
            icon: <CalendarDays className="w-6 h-6 text-emerald-500" />,
            title: t('landing.features.occasions.title'),
            description: t('landing.features.occasions.desc')
        }
    ];

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    return (
        <div className="min-h-[100dvh] bg-background dark:bg-slate-900 relative overflow-hidden flex flex-col transition-colors duration-300">
            {/* Background Decorations - Glassmorphic Orbs */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-accent/10 to-transparent pointer-events-none" />
            <div className="absolute top-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-accent/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[30rem] h-[30rem] bg-rose-500/15 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-[40%] left-[20%] w-[20rem] h-[20rem] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none hidden md:block" />

            {/* Navigation */}
            <nav className="relative z-50 flex items-center justify-between px-4 py-4 sm:p-6 max-w-7xl mx-auto w-full">
                
                {/* Logo & Brand */}
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-tr from-accent via-rose-500 to-purple-600 rounded-xl shadow-lg flex items-center justify-center p-2 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-white/20 blur-md group-hover:bg-white/30 transition-all" />
                        <img src="/favicon.svg" alt="Podaryavai Logo" className="w-full h-full object-contain relative z-10 drop-shadow-md" />
                    </div>
                    <span className="hidden sm:inline-block font-extrabold text-xl text-textMain dark:text-white tracking-tight">
                        Podaryavai
                    </span>
                </div>

                {/* Controls & App Links */}
                <div className="flex space-x-3 sm:space-x-4 items-center">
                    
                    {/* Theme & Lang Toggles (Desktop only side-by-side, mobile stacked or just icons) */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 backdrop-blur-md rounded-full p-1 border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
                        <button 
                            onClick={() => changeLanguage('en')}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${i18n.language === 'en' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow drop-shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        >
                            EN
                        </button>
                        <button 
                            onClick={() => changeLanguage('bg')}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${i18n.language === 'bg' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow drop-shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        >
                            БГ
                        </button>
                    </div>

                    <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800/80 backdrop-blur-md rounded-full p-1 border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
                        <button onClick={() => setTheme('light')} className={`p-1.5 rounded-full transition-all ${theme === 'light' ? 'bg-white dark:bg-slate-700 text-amber-500 shadow drop-shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                            <Sun className="w-4 h-4" />
                        </button>
                        <button onClick={() => setTheme('dark')} className={`p-1.5 rounded-full transition-all ${theme === 'dark' ? 'bg-white dark:bg-slate-700 text-indigo-400 shadow drop-shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                            <Moon className="w-4 h-4" />
                        </button>
                        <button onClick={() => setTheme('system')} className={`p-1.5 rounded-full transition-all ${theme === 'system' ? 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow drop-shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                            <Monitor className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Mobile Theme Toggle (Simple loop) */}
                    <button 
                        className="sm:hidden p-2 bg-slate-100 dark:bg-slate-800/80 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                        onClick={() => {
                            if (theme === 'light') setTheme('dark');
                            else if (theme === 'dark') setTheme('system');
                            else setTheme('light');
                        }}
                    >
                        {theme === 'light' ? <Sun className="w-4 h-4 text-amber-500" /> : theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Monitor className="w-4 h-4" />}
                    </button>

                    <Link to="/login" className="hidden sm:block text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-accent dark:hover:text-white transition-colors">
                        {t('landing.nav.login')}
                    </Link>
                    <Link to="/register" className="px-5 py-2.5 bg-accent text-white text-sm font-bold rounded-full shadow-floating shadow-accent/30 hover:bg-accent/90 active:scale-95 transition-all text-center">
                        {t('landing.nav.register')}
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="flex-1 relative z-10 flex flex-col items-center justify-center px-4 sm:px-6 max-w-5xl mx-auto w-full pt-8 sm:pt-16 pb-24">
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={staggerContainer}
                    className="text-center w-full"
                >
                    <motion.div variants={fadeIn} className="inline-flex items-center space-x-2 mb-6 px-4 py-2 bg-gradient-to-r from-accent/10 to-rose-500/10 dark:from-indigo-500/20 dark:to-rose-500/20 border border-accent/20 dark:border-indigo-500/30 rounded-full shadow-sm">
                        <Sparkles className="w-4 h-4 text-accent dark:text-indigo-400" />
                        <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-accent to-rose-500 dark:from-indigo-400 dark:to-rose-400">
                            {t('landing.hero.badge')}
                        </span>
                    </motion.div>

                    <motion.h1 variants={fadeIn} className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-textMain dark:text-white mb-6 leading-[1.15]">
                        {t('landing.hero.title1')} <br className="hidden sm:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-rose-500 to-purple-600 dark:from-indigo-400 dark:via-rose-400 dark:to-purple-400 inline-block pl-2">
                            {t('landing.hero.title2')}
                        </span>
                    </motion.h1>

                    <motion.p variants={fadeIn} className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
                        {t('landing.hero.subtitle')}
                    </motion.p>

                    <motion.div variants={fadeIn} className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                        <Link to="/register" className="w-full sm:w-64 px-8 py-4 bg-accent text-white rounded-2xl sm:rounded-full font-bold shadow-floating shadow-accent/30 hover:bg-accent/90 active:scale-95 transition-all flex items-center justify-center group text-lg">
                            <span>{t('landing.hero.startNow')}</span>
                            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link to="/login" className="w-full sm:w-64 px-8 py-4 bg-white dark:bg-slate-800/80 backdrop-blur-md text-textMain dark:text-white rounded-2xl sm:rounded-full font-bold shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center text-lg">
                            {t('landing.hero.alreadyHaveAccount')}
                        </Link>
                    </motion.div>
                </motion.div>

                {/* Features Grid */}
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                    variants={staggerContainer}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-20 sm:mt-32 w-full relative z-20"
                >
                    {features.map((feature, idx) => (
                        <motion.div
                            key={idx}
                            variants={fadeIn}
                            className="p-6 bg-white/80 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-soft hover:shadow-floating transition-all group"
                        >
                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:shadow-md transition-all shadow-sm">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold text-textMain dark:text-white mb-3 tracking-tight">{feature.title}</h3>
                            <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{feature.description}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </main>
        </div>
    );
}

// Sparkles Icon fallback
function Sparkles(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            <path d="M5 3v4" />
            <path d="M19 17v4" />
            <path d="M3 5h4" />
            <path d="M17 19h4" />
        </svg>
    );
}
