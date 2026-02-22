import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Search, UserMinus, ShieldAlert, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface UserData {
    id: string;
    email: string;
    full_name: string;
    karma_points: number;
    is_admin: boolean;
    is_banned: boolean;
    last_giftinder_generation: string | null;
    created_at: string;
}

export default function AdminUsers() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

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

    const filteredUsers = users.filter(u =>
        (u.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Users Management</h2>
                    <p className="text-sm text-slate-500">View and manage all registered accounts</p>
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
                            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Karma Points</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">AI Filter</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredUsers.map((user) => {
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
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700">
                                                    {user.karma_points || 0} pts
                                                </span>
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
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button
                                                    onClick={() => toggleAdmin(user.id, user.is_admin)}
                                                    className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                                                    title={user.is_admin ? "Revoke Admin" : "Make Admin"}
                                                >
                                                    <ShieldAlert className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => toggleBan(user.id, user.is_banned)}
                                                    className={`p-2 rounded-lg transition-colors ${user.is_banned ? 'text-green-600 hover:bg-green-100' : 'text-red-400 hover:bg-red-50 hover:text-red-600'}`}
                                                    title={user.is_banned ? "Unban User" : "Ban User"}
                                                >
                                                    <UserMinus className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </motion.tr>
                                    )
                                })}
                            </tbody>
                        </table>

                        {filteredUsers.length === 0 && (
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
