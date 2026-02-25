import { NavLink } from 'react-router-dom';
import { Home, Heart, Gift, User, Users, Shield, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../lib/AuthContext';

const baseNavItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/contacts', icon: Users, label: 'Contacts' },
    { path: '/giftinder', icon: Heart, label: 'Giftinder' },
    { path: '/wishlist', icon: Gift, label: 'Wishlist' },
    { path: '/profile', icon: User, label: 'Profile' }
];

export default function Sidebar() {
    const { isAdmin, karmaPoints } = useAuth();

    const navItems = [...baseNavItems];
    if (isAdmin) {
        navItems.push({ path: '/admin', icon: Shield, label: 'Admin' });
    }

    return (
        <div className="hidden md:flex flex-col w-20 hover:w-64 shrink-0 transition-all duration-300 ease-in-out bg-white/80 backdrop-blur-lg border-r border-slate-200/50 shadow-soft z-50 overflow-hidden group">
            <div className="flex items-center justify-center sm:justify-start sm:px-6 h-20 mb-4 flex-shrink-0">
                <div className="w-10 h-10 bg-accent rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Gift className="w-5 h-5 text-white" />
                </div>
                <span className="ml-4 font-bold text-xl text-textMain opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                    Podaryavai
                </span>
            </div>

            <div className="flex-1 flex flex-col space-y-2 px-3">
                {navItems.map(({ path, icon: Icon, label }) => (
                    <NavLink
                        key={path}
                        to={path}
                        className={({ isActive }) =>
                            `flex items-center w-full px-3 py-4 rounded-xl transition-all duration-200 relative ${isActive ? 'bg-accent/10 text-accent' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <div className="relative flex items-center justify-center w-8 h-8 flex-shrink-0">
                                    <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                                </div>
                                <span className="ml-4 font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                                    {label}
                                </span>
                                {isActive && (
                                    <motion.div
                                        layoutId="sidebar-indicator"
                                        className="absolute left-0 w-1 h-8 rounded-r-full bg-accent"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </div>

            <div className="mt-auto p-3 mb-4">
                <NavLink
                    to="/karma"
                    className={({ isActive }) =>
                        `flex items-center w-full p-2 lg:p-3 rounded-2xl transition-all duration-200 border ${isActive
                            ? 'bg-amber-100 border-amber-200 text-amber-700 shadow-sm'
                            : 'bg-amber-50/50 border-amber-100/50 text-amber-600 hover:bg-amber-50 hover:border-amber-200 hover:shadow-sm'
                        }`
                    }
                >
                    <div className="relative flex items-center justify-center w-8 h-8 flex-shrink-0 bg-white rounded-xl shadow-sm">
                        <Sparkles className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="ml-3 flex flex-col justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600/80 leading-none mb-0.5">Karma</span>
                        <span className="font-black text-sm sm:text-base leading-none text-amber-700">{karmaPoints} <span className="text-[10px] sm:text-xs font-semibold text-amber-600/70">pts</span></span>
                    </div>
                </NavLink>
            </div>
        </div>
    );
}
