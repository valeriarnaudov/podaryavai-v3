import { Settings, ShieldAlert } from 'lucide-react';

export default function MaintenanceScreen() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center text-accent mb-6 shadow-soft relative">
                <Settings className="w-12 h-12 animate-spin-slow" />
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-white border-4 border-slate-50">
                    <ShieldAlert className="w-5 h-5" />
                </div>
            </div>

            <h1 className="text-3xl font-bold text-slate-800 mb-3 tracking-tight">System Update in Progress</h1>
            <p className="text-slate-500 max-w-md mx-auto text-lg">
                Podaryavai is currently undergoing scheduled maintenance to bring you exciting new features.
            </p>

            <div className="mt-8 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm max-w-sm w-full">
                <p className="text-sm font-semibold text-slate-700 mb-1">Are you an Admin?</p>
                <p className="text-xs text-slate-400 mb-4">Admins can bypass this screen to test changes.</p>
                <a
                    href="/login"
                    className="block w-full text-center bg-slate-100 text-slate-700 py-3 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                >
                    Admin Login
                </a>
            </div>
        </div>
    );
}
