import { Settings, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function MaintenanceScreen() {
    const { t } = useTranslation();
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center text-accent mb-6 shadow-soft relative">
                <Settings className="w-12 h-12 animate-spin-slow" />
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-white border-4 border-slate-50">
                    <ShieldAlert className="w-5 h-5" />
                </div>
            </div>

            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-3 tracking-tight">{t('maintenance.title')}</h1>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-lg">
                {t('maintenance.desc')}
            </p>

            <div className="mt-8 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm max-w-sm w-full">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">{t('maintenance.adminQ')}</p>
                <p className="text-xs text-slate-400 mb-4">{t('maintenance.adminDesc')}</p>
                <a
                    href="/login"
                    className="block w-full text-center bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 py-3 rounded-xl font-medium hover:bg-slate-200 dark:bg-slate-600 transition-colors"
                >
                    {t('maintenance.adminLogin')}
                </a>
            </div>
        </div>
    );
}
