import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, ShoppingBag, TrendingUp, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
    const [stats, setStats] = useState({ users: 0, orders: 0, revenue: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [{ count: userCount }, { count: orderCount }] = await Promise.all([
                supabase.from('users').select('*', { count: 'exact', head: true }),
                supabase.from('concierge_orders').select('*', { count: 'exact', head: true })
            ]);

            setStats({
                users: userCount || 0,
                orders: orderCount || 0,
                revenue: (orderCount || 0) * 85 // dummy avg order value
            });
        } catch (err) {
            console.error('Error fetching admin stats:', err);
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
        <div className="text-slate-800 font-sans mt-2">
            <header className="mb-8">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">System Overview</h1>
                <p className="text-slate-500 mt-1 font-medium">Podaryavai key metrics</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
                <StatCard icon={Users} label="Total Users" value={stats.users.toString()} trend="+12%" color="bg-blue-500" />
                <StatCard icon={ShoppingBag} label="Concierge Orders" value={stats.orders.toString()} trend="+5%" color="bg-accent" />
                <StatCard icon={TrendingUp} label="Est. Revenue" value={`€${stats.revenue}`} trend="+18%" color="bg-emerald-500" />
            </div>

            {/* Additional Dashboard widgets could go here */}
        </div>
    );
}

function StatCard({ icon: Icon, label, value, trend, color }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group"
        >
            <div className={`absolute -right-6 -top-6 w-24 h-24 ${color} opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500`}></div>
            <div className={`w-12 h-12 rounded-2xl ${color} bg-opacity-10 flex items-center justify-center mb-4`}>
                <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
            </div>
            <div>
                <p className="text-slate-500 font-medium text-sm mb-1">{label}</p>
                <h3 className="text-3xl font-black text-slate-900">{value}</h3>
            </div>
            <div className="mt-4 flex items-center text-emerald-500 text-sm font-bold bg-emerald-50 w-max px-2 py-1 rounded-md">
                {trend}
            </div>
        </motion.div>
    );
}
