import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Gift, Heart, Star, CalendarDays, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Landing() {
    const { t } = useTranslation();
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
            icon: <Heart className="w-6 h-6 text-accent" />,
            title: t('landing.features.wishlists.title'),
            description: t('landing.features.wishlists.desc')
        },
        {
            icon: <Star className="w-6 h-6 text-accent" />,
            title: t('landing.features.karma.title'),
            description: t('landing.features.karma.desc')
        },
        {
            icon: <CalendarDays className="w-6 h-6 text-accent" />,
            title: t('landing.features.occasions.title'),
            description: t('landing.features.occasions.desc')
        }
    ];

    return (
        <div className="min-h-[100dvh] bg-background dark:bg-slate-900 relative overflow-hidden flex flex-col">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-accent/10 to-transparent pointer-events-none" />
            <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-accent/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-accent/10 rounded-full blur-[100px] pointer-events-none" />

            {/* Navigation (Simple) */}
            <nav className="relative z-10 flex items-center justify-between p-6 max-w-5xl mx-auto w-full">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl shadow-floating flex items-center justify-center">
                        <span className="font-bold text-textMain dark:text-white text-sm">PD</span>
                    </div>
                    <span className="font-bold text-textMain dark:text-white tracking-tight">Podaryavai</span>
                </div>
                <div className="flex space-x-4 items-center">
                    <Link to="/login" className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-textMain dark:text-white transition-colors">
                        {t('landing.nav.login')}
                    </Link>
                    <Link to="/register" className="px-4 py-2 bg-textMain text-white text-sm font-semibold rounded-full shadow-sm hover:scale-105 active:scale-95 transition-all">
                        {t('landing.nav.register')}
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="flex-1 relative z-10 flex flex-col items-center justify-center px-6 max-w-5xl mx-auto w-full pt-12 pb-24">
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={staggerContainer}
                    className="text-center w-full"
                >
                    <motion.div variants={fadeIn} className="inline-block mb-4 px-4 py-1.5 bg-accent/10 text-accent rounded-full text-sm font-semibold tracking-wide uppercase">
                        {t('landing.hero.badge')}
                    </motion.div>

                    <motion.h1 variants={fadeIn} className="text-5xl sm:text-7xl font-extrabold tracking-tight text-textMain dark:text-white mb-6 leading-[1.1]">
                        {t('landing.hero.title1')} <br className="hidden sm:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent/70">
                            {t('landing.hero.title2')}
                        </span>
                    </motion.h1>

                    <motion.p variants={fadeIn} className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                        {t('landing.hero.subtitle')}
                    </motion.p>

                    <motion.div variants={fadeIn} className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                        <Link to="/register" className="w-full sm:w-auto px-8 py-4 bg-accent text-white rounded-full font-bold shadow-floating shadow-accent/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center group">
                            <span>{t('landing.hero.startNow')}</span>
                            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link to="/login" className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-800 text-textMain dark:text-white rounded-full font-bold shadow-sm border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:bg-slate-900 active:scale-95 transition-all flex items-center justify-center">
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
                    className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-24 w-full"
                >
                    {features.map((feature, idx) => (
                        <motion.div
                            key={idx}
                            variants={fadeIn}
                            className="p-6 bg-white dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 shadow-sm hover:shadow-floating transition-all group"
                        >
                            <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-accent group-hover:text-white transition-all">
                                {React.cloneElement(feature.icon as React.ReactElement, { className: "w-6 h-6 transition-colors group-hover:text-white text-accent" })}
                            </div>
                            <h3 className="text-xl font-bold text-textMain dark:text-white mb-2">{feature.title}</h3>
                            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{feature.description}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </main>
        </div>
    );
}
