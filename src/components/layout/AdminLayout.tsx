import { Outlet, NavLink } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNavigation from './BottomNavigation';
import { LayoutDashboard, Package, Bell, Users, Heart, Settings, Award, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AdminLayout() {
    const { t } = useTranslation();
    return (
        <div className="flex h-[100dvh] w-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
            {/* Desktop Sidebar (Main Navigation) */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex flex-col flex-1 h-[100dvh] w-full relative sm:px-4 md:px-8 sm:py-4">

                {/* Secondary Admin Navigation */}
                <div className="sticky top-0 z-40 bg-slate-50/80 backdrop-blur-md pt-4 pb-2 px-6 border-b border-slate-200 dark:border-slate-600/50 mb-4 md:bg-white dark:bg-slate-800/80 md:rounded-t-3xl md:mt-0 md:pt-6 md:px-8">
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-4">{t('admin.title')}</h1>

                    <div className="flex space-x-1 overflow-x-auto no-scrollbar pb-2">
                        <NavLink
                            to="/admin"
                            end
                            className={({ isActive }) =>
                                `flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${isActive
                                    ? 'bg-slate-900 text-white shadow-soft'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:bg-slate-600 hover:text-slate-800 dark:text-slate-100'
                                }`
                            }
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            <span>{t('admin.dashboard')}</span>
                        </NavLink>
                        <NavLink
                            to="/admin/orders"
                            className={({ isActive }) =>
                                `flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${isActive
                                    ? 'bg-slate-900 text-white shadow-soft'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:bg-slate-600 hover:text-slate-800 dark:text-slate-100'
                                }`
                            }
                        >
                            <Package className="w-4 h-4" />
                            <span>{t('admin.orders')}</span>
                        </NavLink>
                        <NavLink
                            to="/admin/logs"
                            className={({ isActive }) =>
                                `flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${isActive
                                    ? 'bg-slate-900 text-white shadow-soft'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:bg-slate-600 hover:text-slate-800 dark:text-slate-100'
                                }`
                            }
                        >
                            <Bell className="w-4 h-4" />
                            <span>{t('admin.logs')}</span>
                        </NavLink>
                        <NavLink
                            to="/admin/users"
                            className={({ isActive }) =>
                                `flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${isActive
                                    ? 'bg-slate-900 text-white shadow-soft'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:bg-slate-600 hover:text-slate-800 dark:text-slate-100'
                                }`
                            }
                        >
                            <Users className="w-4 h-4" />
                            <span>{t('admin.users')}</span>
                        </NavLink>
                        <NavLink
                            to="/admin/gifts"
                            className={({ isActive }) =>
                                `flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${isActive
                                    ? 'bg-slate-900 text-white shadow-soft'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:bg-slate-600 hover:text-slate-800 dark:text-slate-100'
                                }`
                            }
                        >
                            <Heart className="w-4 h-4" />
                            <span>{t('admin.gifts')}</span>
                        </NavLink>
                        <NavLink
                            to="/admin/settings"
                            className={({ isActive }) =>
                                `flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${isActive
                                    ? 'bg-slate-900 text-white shadow-soft'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:bg-slate-600 hover:text-slate-800 dark:text-slate-100'
                                }`
                            }
                        >
                            <Settings className="w-4 h-4" />
                            <span>{t('admin.settings')}</span>
                        </NavLink>
                        <NavLink
                            to="/admin/emails"
                            className={({ isActive }) =>
                                `flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${isActive
                                    ? 'bg-slate-900 text-white shadow-soft'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:bg-slate-600 hover:text-slate-800 dark:text-slate-100'
                                }`
                            }
                        >
                            <Mail className="w-4 h-4 text-blue-500" />
                            <span>{t('admin.emails')}</span>
                        </NavLink>
                        <NavLink
                            to="/admin/karma"
                            className={({ isActive }) =>
                                `flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${isActive
                                    ? 'bg-slate-900 text-white shadow-soft'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:bg-slate-600 hover:text-slate-800 dark:text-slate-100'
                                }`
                            }
                        >
                            <Award className="w-4 h-4 text-emerald-500" />
                            <span>{t('admin.karmaStore')}</span>
                        </NavLink>
                    </div>
                </div>

                {/* Outlet for Admin Pages */}
                <main className="flex-1 w-full max-w-5xl mx-auto overflow-y-auto pb-24 px-4 sm:px-0 relative z-0 md:pb-8 md:bg-white dark:bg-slate-800/50 md:rounded-b-3xl md:shadow-soft">
                    <Outlet />
                </main>

                {/* Mobile Bottom Navigation Component (Main Navigation) */}
                <div className="absolute bottom-0 w-full z-50 md:hidden left-0">
                    <BottomNavigation />
                </div>
            </div>
        </div>
    );
}
