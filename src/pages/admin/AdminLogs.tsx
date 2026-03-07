import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Bell, CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminLogs() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data } = await supabase.from('notification_logs').select(`
                id, notification_type, trigger_days, status, sent_at,
                users (full_name, email),
                contacts (name),
                events (title)
            `).order('sent_at', { ascending: false }).limit(20);

            if (data) {
                setLogs(data);
            }
        } catch (err) {
            console.error('Error fetching admin logs:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="h-64 w-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-slate-800 dark:text-slate-100 font-sans mt-2"
        >
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Automated Notifications</h2>
                <button onClick={fetchData} className="text-sm font-semibold text-accent hover:underline flex items-center">
                    Refresh
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-600 shadow-sm min-h-[400px]">
                {logs.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 dark:text-slate-400">
                        <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p>No automated notifications sent yet.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {logs.map((log: any) => (
                            <div key={log.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
                                <div className="flex items-center space-x-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${log.status === 'SENT' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                        {log.status === 'SENT' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                                            {log.users?.full_name || log.users?.email} &rarr; {log.contacts?.name} ({log.events?.title})
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center space-x-2">
                                            <span className="font-semibold px-2 py-0.5 bg-slate-200 dark:bg-slate-600 rounded-md text-[10px]">{log.notification_type}</span>
                                            <span>Trigger: {log.trigger_days} days | {new Date(log.sent_at).toLocaleString()}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
