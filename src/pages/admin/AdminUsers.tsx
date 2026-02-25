import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Search, UserMinus, ShieldAlert, RefreshCw, Edit2, Check, X, ChevronUp, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';

interface UserData {
    id: string;
    email: string;
    full_name: string;
    karma_points: number;
    is_admin: boolean;
    is_banned: boolean;
    last_giftinder_generation: string | null;
    subscription_plan?: string;
    subscription_expires_at?: string | null;
    created_at: string;
}

export default function AdminUsers() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [editingKarmaId, setEditingKarmaId] = useState<string | null>(null);
    const [editKarmaValue, setEditKarmaValue] = useState<number>(0);

    // Subscription editing state
    const [editingSubId, setEditingSubId] = useState<string | null>(null);
    const [editSubPlan, setEditSubPlan] = useState<string>('FREE');
    const [editSubExpires, setEditSubExpires] = useState<string>('');

    type SortKey = 'full_name' | 'karma_points' | 'is_admin' | 'last_giftinder_generation';
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'is_admin', direction: 'desc' });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setUsers(data);
        }
        setLoading(false);
    };

    const toggleAdmin = async (userId: string, currentStatus: boolean) => {
        await supabase.from('users').update({ is_admin: !currentStatus }).eq('id', userId);
        fetchUsers();
    };

    const toggleBan = async (userId: string, currentStatus: boolean) => {
        const { error } = await supabase.from('users').update({ is_banned: !currentStatus }).eq('id', userId);
        if (error) {
            console.error('Failed to update ban status:', error);
        } else {
            fetchUsers();
        }
    };

    const resetGiftinder = async (e: React.MouseEvent, userId: string) => {
        e.preventDefault();
        e.stopPropagation();

        const { error } = await supabase.from('users').update({ last_giftinder_generation: null }).eq('id', userId);
        if (error) {
            console.error('Failed to reset counter:', error);
        } else {
            fetchUsers();
        }
    };

    const saveKarma = async (userId: string) => {
        const { error } = await supabase.from('users').update({ karma_points: editKarmaValue }).eq('id', userId);
        if (error) {
            console.error('Failed to update karma:', error);
        } else {
            setEditingKarmaId(null);
            fetchUsers();
        }
    };

    const saveSubscription = async (userId: string) => {
        const { error } = await supabase.from('users').update({
            subscription_plan: editSubPlan,
            subscription_expires_at: editSubExpires || null
        }).eq('id', userId);
        
        if (error) {
            console.error('Failed to update subscription:', error);
            alert('Failed to update subscription: ' + error.message);
        } else {
            setEditingSubId(null);
            fetchUsers();
        }
    };

    const filteredUsers = users.filter(u =>
        (u.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    const sortedUsers = [...filteredUsers].sort((a, b) => {
        let aVal: any = a[sortConfig.key];
        let bVal: any = b[sortConfig.key];

        if (sortConfig.key === 'full_name') {
            aVal = (a.full_name || a.email || '').toLowerCase();
            bVal = (b.full_name || b.email || '').toLowerCase();
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        }

        if (sortConfig.key === 'is_admin') {
            aVal = a.is_admin ? 1 : 0;
            bVal = b.is_admin ? 1 : 0;
            return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        if (sortConfig.key === 'last_giftinder_generation') {
            const aDate = a.last_giftinder_generation ? new Date(a.last_giftinder_generation).getTime() : 0;
            const bDate = b.last_giftinder_generation ? new Date(b.last_giftinder_generation).getTime() : 0;
            return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate;
        }

        if (sortConfig.key === 'karma_points') {
            aVal = a.karma_points || 0;
            bVal = b.karma_points || 0;
            return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        return 0;
    });

    const handleSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
        if (sortConfig.key !== columnKey) return <ChevronDown className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-50 transition-opacity" />;
        return sortConfig.direction === 'asc'
            ? <ChevronUp className="w-4 h-4 text-accent" />
            : <ChevronDown className="w-4 h-4 text-accent" />;
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center space-x-3">
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Users Management</h2>
                        {!loading && (
                            <span className="px-3 py-1 bg-accent/10 text-accent text-sm font-bold rounded-full border border-accent/20">
                                {users.length} Total
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">View and manage all registered accounts</p>
                </div>

                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-slate-200 outline-none focus:border-slate-800 transition-colors text-sm"
                    />
                </div>
            </header>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
                </div>
            ) : (
                <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 select-none">
                                <tr>
                                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors group" onClick={() => handleSort('full_name')}>
                                        <div className="flex items-center space-x-1">
                                            <span>User</span>
                                            <SortIcon columnKey="full_name" />
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors group" onClick={() => handleSort('karma_points')}>
                                        <div className="flex items-center space-x-1">
                                            <span>Karma Points</span>
                                            <SortIcon columnKey="karma_points" />
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors group">
                                        <div className="flex items-center space-x-1">
                                            <span>Subscription</span>
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors group" onClick={() => handleSort('is_admin')}>
                                        <div className="flex items-center space-x-1">
                                            <span>Role</span>
                                            <SortIcon columnKey="is_admin" />
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors group" onClick={() => handleSort('last_giftinder_generation')}>
                                        <div className="flex items-center space-x-1">
                                            <span>AI Filter</span>
                                            <SortIcon columnKey="last_giftinder_generation" />
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sortedUsers.map((user) => {
                                    const isGeneratedToday = user.last_giftinder_generation
                                        ? new Date(user.last_giftinder_generation).toDateString() === new Date().toDateString()
                                        : false;

                                    return (
                                        <motion.tr
                                            key={user.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className={`hover:bg-slate-50 transition-colors ${user.is_banned ? 'opacity-50' : ''}`}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-slate-800">{user.full_name || 'Anonymous'}</div>
                                                <div className="text-xs text-slate-500">{user.email}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {editingKarmaId === user.id ? (
                                                    <div className="flex items-center space-x-2">
                                                        <input
                                                            type="number"
                                                            value={editKarmaValue}
                                                            onChange={(e) => setEditKarmaValue(Number(e.target.value))}
                                                            className="w-24 px-2 py-1 text-sm border border-slate-200 rounded-lg outline-none focus:border-amber-400"
                                                        />
                                                        <button
                                                            onClick={() => saveKarma(user.id)}
                                                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                            title="Save"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingKarmaId(null)}
                                                            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                                                            title="Cancel"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center space-x-2 group">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700">
                                                            {user.karma_points || 0} pts
                                                        </span>
                                                        <button
                                                            onClick={() => { setEditingKarmaId(user.id); setEditKarmaValue(user.karma_points || 0); }}
                                                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                                            title="Edit Karma"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {editingSubId === user.id ? (
                                                    <div className="flex flex-col space-y-2">
                                                        <select
                                                            value={editSubPlan}
                                                            onChange={(e) => setEditSubPlan(e.target.value)}
                                                            className="w-full max-w-[150px] px-2 py-1 text-sm border border-slate-200 rounded-lg outline-none focus:border-accent"
                                                        >
                                                            <option value="FREE">FREE</option>
                                                            <option value="STANDARD">STANDARD</option>
                                                            <option value="PRO">PRO</option>
                                                            <option value="ULTRA">ULTRA</option>
                                                            <option value="BUSINESS">BUSINESS</option>
                                                        </select>
                                                        <div className="flex items-center space-x-2">
                                                            <input
                                                                type="date"
                                                                value={editSubExpires ? new Date(editSubExpires).toISOString().split('T')[0] : ''}
                                                                onChange={(e) => setEditSubExpires(e.target.value ? new Date(e.target.value).toISOString() : '')}
                                                                className="w-full max-w-[120px] px-2 py-1 text-xs border border-slate-200 rounded-lg outline-none focus:border-accent"
                                                            />
                                                            <button onClick={() => saveSubscription(user.id)} className="p-1 text-green-600 hover:bg-green-50 rounded-lg">
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => setEditingSubId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg">
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center space-x-2 group">
                                                        <div>
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${
                                                                user.subscription_plan && user.subscription_plan !== 'FREE' 
                                                                ? 'bg-purple-100 text-purple-700' 
                                                                : 'bg-slate-100 text-slate-600'
                                                            }`}>
                                                                {user.subscription_plan || 'FREE'}
                                                            </span>
                                                            {(user.subscription_plan && user.subscription_plan !== 'FREE') && (
                                                                <div className="text-[10px] text-slate-400 mt-1 font-medium">
                                                                    {user.subscription_expires_at 
                                                                        ? `Valid til ${new Date(user.subscription_expires_at).toLocaleDateString()}` 
                                                                        : 'Lifetime/Active'}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => { 
                                                                setEditingSubId(user.id); 
                                                                setEditSubPlan(user.subscription_plan || 'FREE');
                                                                setEditSubExpires(user.subscription_expires_at || '');
                                                            }}
                                                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                                                            title="Edit Subscription"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {user.is_admin ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-800 text-white">Admin</span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600">User</span>
                                                )}
                                                {user.is_banned && (
                                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-red-100 text-red-600">Banned</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-2">
                                                    {isGeneratedToday ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700">Generated</span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500">Ready</span>
                                                    )}

                                                    <button
                                                        onClick={(e) => resetGiftinder(e, user.id)}
                                                        className="p-1.5 text-slate-400 hover:text-accent bg-white border border-slate-200 hover:border-accent hover:bg-accent/5 rounded-lg transition-all"
                                                        title="Reset Daily Limit"
                                                    >
                                                        <RefreshCw className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <button
                                                        onClick={() => toggleAdmin(user.id, user.is_admin)}
                                                        className={`p-2 rounded-lg transition-colors flex items-center space-x-1 text-xs font-semibold ${user.is_admin ? 'text-slate-400 hover:bg-slate-100' : 'text-accent hover:bg-accent/10'}`}
                                                        title={user.is_admin ? "Revoke Admin Role" : "Grant Admin Role"}
                                                    >
                                                        <ShieldAlert className="w-3.5 h-3.5" />
                                                        <span>{user.is_admin ? "Demote" : "Make Admin"}</span>
                                                    </button>
                                                    <button
                                                        onClick={() => toggleBan(user.id, user.is_banned)}
                                                        className={`p-2 rounded-lg transition-colors ${user.is_banned ? 'text-green-600 hover:bg-green-100' : 'text-red-400 hover:bg-red-50 hover:text-red-600'}`}
                                                        title={user.is_banned ? "Unban User" : "Ban User"}
                                                    >
                                                        <UserMinus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    )
                                })}
                            </tbody>
                        </table>

                        {sortedUsers.length === 0 && (
                            <div className="p-8 text-center text-slate-500">
                                No users found matching "{searchTerm}"
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
