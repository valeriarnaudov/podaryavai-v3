import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Bell, CheckCircle2, XCircle, ShoppingBag, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminLogs() {
    const [activeTab, setActiveTab] = useState<'notifications' | 'karma'>('notifications');
    const [logs, setLogs] = useState<any[]>([]);
    const [karmaLogs, setKarmaLogs] = useState<any[]>([]);
    const [karmaTimeFilter, setKarmaTimeFilter] = useState<'30' | '7' | 'today'>('30');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (activeTab === 'notifications') {
            fetchNotifications();
        } else {
            fetchKarmaLogs();
        }
    }, [activeTab, karmaTimeFilter]);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const { data } = await supabase.rpc('get_admin_notification_logs');
            if (data) setLogs(data);
        } catch (err) {
            console.error('Error fetching admin logs:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchKarmaLogs = async () => {
        setLoading(true);
        try {
            let startDate = new Date();
            if (karmaTimeFilter === '30') {
                startDate.setDate(startDate.getDate() - 30);
            } else if (karmaTimeFilter === '7') {
                startDate.setDate(startDate.getDate() - 7);
            } else if (karmaTimeFilter === 'today') {
                startDate.setHours(0, 0, 0, 0);
            }

            const { data, error } = await supabase
                .from('user_karma_history')
                .select(`
                    id,
                    action_type,
                    points,
                    description,
                    created_at,
                    users ( full_name, email )
                `)
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: false })
                .limit(200);
                
            if (error) throw error;
            if (data) setKarmaLogs(data);
        } catch (err) {
            console.error('Error fetching karma logs:', err);
        } finally {
            setLoading(false);
        }
    };

    const refreshData = () => {
        if (activeTab === 'notifications') fetchNotifications();
        else fetchKarmaLogs();
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-slate-800 dark:text-slate-100 font-sans mt-2"
        >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
                <div className="flex space-x-6">
                    <button
                        onClick={() => setActiveTab('notifications')}
                        className={`text-lg font-bold transition-colors relative pb-2 ${activeTab === 'notifications' ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                    >
                        Automated Notifications
                        {activeTab === 'notifications' && <motion.div layoutId="activetab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('karma')}
                        className={`text-lg font-bold transition-colors relative pb-2 ${activeTab === 'karma' ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                    >
                        Karma History
                        {activeTab === 'karma' && <motion.div layoutId="activetab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full" />}
                    </button>
                </div>
                <button onClick={refreshData} className="text-sm font-semibold text-accent hover:underline flex items-center shrink-0">
                    Refresh
                </button>
            </div>

            {activeTab === 'karma' && (
                <div className="flex space-x-2 mb-6 sm:justify-end">
                    {(['today', '7', '30'] as const).map(filter => (
                        <button
                            key={filter}
                            onClick={() => setKarmaTimeFilter(filter)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${karmaTimeFilter === filter ? 'bg-accent text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-700'}`}
                        >
                            {filter === 'today' ? 'Днес' : `Последни ${filter} дни`}
                        </button>
                    ))}
                </div>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-600 shadow-sm min-h-[400px]">
                {loading ? (
                    <div className="h-64 w-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-accent animate-spin" />
                    </div>
                ) : activeTab === 'notifications' ? (
                    logs.length === 0 ? (
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
                                                {log.user_full_name || log.user_email} &rarr; {log.contact_name ? log.contact_name : 'System Account Event'} {log.event_title ? `(${log.event_title})` : ''}
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
                    )
                ) : (
                    karmaLogs.length === 0 ? (
                        <div className="text-center py-10 text-slate-500 dark:text-slate-400">
                            <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                            <p>No karma history logs found.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {karmaLogs.map((log: any) => (
                                <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 gap-4">
                                    <div className="flex items-center space-x-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${log.action_type === 'EARNED' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                            {log.action_type === 'EARNED' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                                                {log.users?.full_name || log.users?.email || 'Unknown User'}
                                            </h4>
                                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
                                                {log.description}
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-1 font-semibold uppercase tracking-wider">
                                                {new Date(log.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="sm:text-right shrink-0">
                                         <span className={`text-lg font-black tracking-tight ${log.action_type === 'EARNED' ? 'text-emerald-500' : 'text-slate-500 dark:text-slate-300'}`}>
                                            {log.action_type === 'EARNED' ? '+' : '-'}{log.points}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>
        </motion.div>
    );
}
