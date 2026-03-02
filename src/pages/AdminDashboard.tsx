import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, ShoppingBag, TrendingUp, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

type TimeRange = '1d' | '7d' | '30d' | '365d' | 'all';

export default function AdminDashboard() {
    const [stats, setStats] = useState({ 
        users: { current: 0, prev: 0 }, 
        premiumUsers: { current: 0, prev: 0 }, 
        revenue: { current: 0, prev: 0 } 
    });
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<TimeRange>('30d');

    useEffect(() => {
        fetchData(timeRange);
    }, [timeRange]);

    const fetchData = async (range: TimeRange) => {
        setLoading(true);
        try {
            const now = new Date();
            let startDate = new Date(0); // Epoch, i.e., "all time"
            let prevStartDate = new Date(0);
            let prevEndDate = new Date(0);

            if (range !== 'all') {
                const days = range === '1d' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : 365;
                startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
                
                // For trend, we look at the exact same previous period
                prevEndDate = new Date(startDate.getTime() - 1); 
                prevStartDate = new Date(prevEndDate.getTime() - (days * 24 * 60 * 60 * 1000));
            }

            // 1. Fetch Current Period Data
            let usersQuery = supabase.from('users').select('*', { count: 'exact', head: true });
            let premiumUsersQuery = supabase.from('users').select('*', { count: 'exact', head: true }).neq('subscription_plan', 'FREE');
            let allUsersQuery = supabase.from('users').select('subscription_plan, created_at');
            
            // 2. Fetch Previous Period Data (for trend)
            let prevUsersQuery = supabase.from('users').select('*', { count: 'exact', head: true });
            let prevPremiumUsersQuery = supabase.from('users').select('*', { count: 'exact', head: true }).neq('subscription_plan', 'FREE');
            let prevAllUsersQuery = supabase.from('users').select('subscription_plan, created_at');

            if (range !== 'all') {
                usersQuery = usersQuery.gte('created_at', startDate.toISOString());
                premiumUsersQuery = premiumUsersQuery.gte('created_at', startDate.toISOString());
                allUsersQuery = allUsersQuery.gte('created_at', startDate.toISOString());

                prevUsersQuery = prevUsersQuery.gte('created_at', prevStartDate.toISOString()).lte('created_at', prevEndDate.toISOString());
                prevPremiumUsersQuery = prevPremiumUsersQuery.gte('created_at', prevStartDate.toISOString()).lte('created_at', prevEndDate.toISOString());
                prevAllUsersQuery = prevAllUsersQuery.gte('created_at', prevStartDate.toISOString()).lte('created_at', prevEndDate.toISOString());
            }

            // Also fetch plans metadata so we know exactly how much each subscription_plan costs
            const plansPromise = supabase.from('subscription_plans').select('plan_key, price');

            const [
                { count: currentUsers },
                { count: currentPremiumUsers },
                { data: currentAllUsersData },
                { count: prevUsers },
                { count: prevPremiumUsers },
                { data: prevAllUsersData },
                { data: plansData }
            ] = await Promise.all([
                usersQuery,
                premiumUsersQuery,
                allUsersQuery,
                prevUsersQuery,
                prevPremiumUsersQuery,
                prevAllUsersQuery,
                plansPromise
            ]);

            // Calculate Subscription Revenue
            let currentSubRev = 0;
            let prevSubRev = 0;
            
            if (plansData) {
                const planPrices: Record<string, number> = {};
                plansData.forEach(p => planPrices[p.plan_key] = p.price || 0);
                
                (currentAllUsersData || []).forEach(u => {
                    const price = planPrices[u.subscription_plan] || 0;
                    currentSubRev += price;
                });

                (prevAllUsersData || []).forEach(u => {
                    const price = planPrices[u.subscription_plan] || 0;
                    prevSubRev += price;
                });
            }

            setStats({
                users: { current: currentUsers || 0, prev: prevUsers || 0 },
                premiumUsers: { current: currentPremiumUsers || 0, prev: prevPremiumUsers || 0 },
                revenue: { current: currentSubRev, prev: prevSubRev }
            });
        } catch (err) {
            console.error('Error fetching admin stats:', err);
        } finally {
            setLoading(false);
        }
    };

    const calculateTrend = (current: number, prev: number) => {
        if (prev === 0) return current > 0 ? '+100%' : '0%';
        const diff = current - prev;
        const percent = (diff / prev) * 100;
        return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`;
    };

    const isTrendPositive = (current: number, prev: number) => {
        if (prev === 0) return current >= 0;
        return (current - prev) >= 0;
    };

    return (
        <div className="text-slate-800 font-sans mt-2">
            <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">System Overview</h1>
                    <p className="text-slate-500 mt-1 font-medium">Podaryavai key metrics</p>
                </div>
                
                <div className="flex bg-slate-100 p-1 rounded-xl w-max overflow-x-auto max-w-full hide-scrollbar">
                    {(['1d', '7d', '30d', '365d', 'all'] as TimeRange[]).map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-3 md:px-4 py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all whitespace-nowrap ${timeRange === range ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {range === '1d' ? '1 Day' : range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '365d' ? '1 Year' : 'All Time'}
                        </button>
                    ))}
                </div>
            </header>

            {loading ? (
                <div className="h-64 w-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-accent animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
                    <StatCard 
                        icon={Users} 
                        label="New Users" 
                        value={stats.users.current.toString()} 
                        trend={timeRange !== 'all' ? calculateTrend(stats.users.current, stats.users.prev) : null} 
                        isPositive={isTrendPositive(stats.users.current, stats.users.prev)}
                        color="bg-blue-500" 
                    />
                    <StatCard 
                        icon={ShoppingBag} 
                        label="Premium Subscriptions" 
                        value={stats.premiumUsers.current.toString()} 
                        trend={timeRange !== 'all' ? calculateTrend(stats.premiumUsers.current, stats.premiumUsers.prev) : null}
                        isPositive={isTrendPositive(stats.premiumUsers.current, stats.premiumUsers.prev)} 
                        color="bg-accent" 
                    />
                    <StatCard 
                        icon={TrendingUp} 
                        label="Total Revenue (MRR)" 
                        value={`${stats.revenue.current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} лв.`} 
                        trend={timeRange !== 'all' ? calculateTrend(stats.revenue.current, stats.revenue.prev) : null} 
                        isPositive={isTrendPositive(stats.revenue.current, stats.revenue.prev)}
                        color="bg-emerald-500" 
                    />
                </div>
            )}

            {/* Additional Dashboard widgets could go here */}
        </div>
    );
}

function StatCard({ icon: Icon, label, value, trend, isPositive, color }: any) {
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
            {trend && (
                <div className={`mt-4 flex items-center text-sm font-bold w-max px-2 py-1 rounded-md ${isPositive ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
                    {trend} vs prev
                </div>
            )}
        </motion.div>
    );
}
