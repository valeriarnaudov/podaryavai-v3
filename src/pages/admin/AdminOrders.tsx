import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Package, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminOrders() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // Note: Update to actual orders logic when ready
            const { data } = await supabase.from('concierge_orders').select('*');
            if (data) {
                setOrders(data);
            }
        } catch (err) {
            console.error('Error fetching admin orders:', err);
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
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Concierge Requests</h2>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-600 shadow-sm min-h-[400px]">
                {orders.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 dark:text-slate-400">
                        <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p>No orders in the system yet.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((o) => (
                            <div key={o.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm">
                                        <Package className="w-6 h-6 text-accent" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white">#ORD-{o.id.substring(0, 6).toUpperCase()}</h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Status: {o.status}</p>
                                    </div>
                                </div>
                                <span className="px-3 py-1 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg">{o.status}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
