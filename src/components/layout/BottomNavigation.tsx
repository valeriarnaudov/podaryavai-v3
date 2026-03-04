
import { NavLink } from 'react-router-dom';
import { Home, Heart, Gift, User, Users, Shield, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../lib/AuthContext';
import { useTranslation } from 'react-i18next';

export default function BottomNavigation() {
    const { isAdmin, karmaPoints } = useAuth();
    const { t } = useTranslation();

    const navItems = [
        { path: '/', icon: Home, label: t('nav.home') },
        { path: '/contacts', icon: Users, label: t('nav.contacts') },
        { path: '/giftinder', icon: Heart, label: t('nav.giftinder') },
        { path: '/wishlist', icon: Gift, label: t('nav.wishlist') },
        { path: '/profile', icon: User, label: t('nav.profile') }
    ];

    // Insert Karma before Profile
    navItems.splice(-1, 0, { path: '/karma', icon: Sparkles, label: `${karmaPoints} pts` });

    if (isAdmin) {
        navItems.push({ path: '/admin', icon: Shield, label: t('nav.admin') });
    }

    return (
        <div className="md:hidden bg-white/80 backdrop-blur-lg border-t border-slate-200/50 pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex justify-around items-center h-16 px-4">
                {navItems.map(({ path, icon: Icon, label }) => (
                    <NavLink
                        key={path}
                        to={path}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200 ${isActive ? 'text-accent' : 'text-slate-400'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <div className="relative">
                                    <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                                    {isActive && (
                                        <motion.div
                                            layoutId="nav-indicator"
                                            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent"
                                            initial={false}
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        />
                                    )}
                                </div>
                                <span className="text-[10px] font-medium">{label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </div>
    );
}
