import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Plus, Edit2, Trash2, ArrowRight } from 'lucide-react';
import { useSettings } from '../../lib/SettingsContext';

interface KarmaReward {
    id: string;
    title: string;
    description: string;
    cost_points: number;
    reward_type: string;
    reward_value: string;
    reward_metadata?: Record<string, any>;
    duration_days: number;
    is_active: boolean;
}

const REWARD_TYPES = [
    { value: 'PLAN_UPGRADE', label: 'Plan Upgrade' },
    { value: 'ADD_FREE_DELIVERIES', label: 'Add Free Deliveries' },
    { value: 'KARMA_BOOST', label: 'Karma Boost (Double Points)' },
    { value: 'UNLOCK_GOLDEN_AURA', label: 'Unlock Golden Aura profile ring' },
    { value: 'UNLOCK_VIP_GIFTINDER', label: 'Unlock VIP Giftinder (Permanent)' },
    { value: 'CUSTOM_SERVICE', label: 'Custom Service / Consultation (Manual)' }
];

export default function AdminKarmaRewards() {
    const { plans } = useSettings();
    const [rewards, setRewards] = useState<KarmaReward[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<KarmaReward>>({});
    
    // History State
    const [activeTab, setActiveTab] = useState<'rewards' | 'history'>('rewards');
    const [historyLogs, setHistoryLogs] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Sorting State
    const [sortBy, setSortBy] = useState<'cost_asc' | 'cost_desc' | 'name_asc' | 'name_desc' | 'status_active' | 'status_inactive'>('cost_asc');

    useEffect(() => {
        if (activeTab === 'rewards') {
            fetchRewards();
        } else {
            fetchHistory();
        }
    }, [activeTab]);

    const fetchRewards = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('karma_rewards')
            .select('*')
            .order('cost_points', { ascending: true });

        if (!error && data) {
            setRewards(data);
        }
        setLoading(false);
    };

    const fetchHistory = async () => {
        setLoadingHistory(true);
        const { data, error } = await supabase.rpc('get_karma_claims_history');

        if (!error && data) {
            // Map the RPC response to the existing history format expected by the UI
            const mappedData = data.map((item: any) => ({
                id: item.id,
                user_id: item.user_id,
                action_type: item.action_type,
                points: item.points,
                description: item.description,
                created_at: item.created_at,
                users: {
                    email: item.user_email,
                    full_name: item.user_full_name
                }
            }));
            setHistoryLogs(mappedData);
        } else {
            console.error("Error fetching history through RPC:", error);
            // Fallback in case RPC fails
            const { data: fallbackData } = await supabase
                .from('user_karma_history')
                .select('*')
                .eq('action_type', 'SPENT')
                .order('created_at', { ascending: false })
                .limit(100);
            if (fallbackData) setHistoryLogs(fallbackData);
        }
        setLoadingHistory(false);
    };

    const handleCreateNew = () => {
        setIsEditing('new');
        setEditForm({
            title: 'New Reward',
            description: '',
            cost_points: 100,
            reward_type: 'PLAN_UPGRADE',
            reward_value: plans.length > 0 ? plans[0].plan_key : 'PRO',
            reward_metadata: {},
            duration_days: 30,
            is_active: true
        });
    };

    const handleEdit = (reward: KarmaReward) => {
        setIsEditing(reward.id);
        setEditForm(reward);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (isEditing === 'new') {
                const { error } = await supabase.from('karma_rewards').insert({
                    title: editForm.title,
                    description: editForm.description,
                    cost_points: editForm.cost_points,
                    reward_type: editForm.reward_type,
                    reward_value: editForm.reward_value || '',
                    reward_metadata: editForm.reward_metadata || {},
                    duration_days: editForm.duration_days,
                    is_active: editForm.is_active
                });
                if (error) throw error;
            } else if (isEditing) {
                const { error } = await supabase.from('karma_rewards').update({
                    title: editForm.title,
                    description: editForm.description,
                    cost_points: editForm.cost_points,
                    reward_type: editForm.reward_type,
                    reward_value: editForm.reward_value || '',
                    reward_metadata: editForm.reward_metadata || {},
                    duration_days: editForm.duration_days,
                    is_active: editForm.is_active
                }).eq('id', isEditing);
                if (error) throw error;
            }
            await fetchRewards();
            setIsEditing(null);
            setEditForm({});
        } catch (error: any) {
            console.error("Error saving reward", error);
            alert("Error saving: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (reward: KarmaReward) => {
        const newValue = !reward.is_active;
        
        // Optimistic update
        setRewards(rewards.map(r => r.id === reward.id ? { ...r, is_active: newValue } : r));
        
        const { error } = await supabase.from('karma_rewards').update({
            is_active: newValue
        }).eq('id', reward.id);

        if (error) {
            alert('Error toggling reward: ' + error.message);
            // Revert on error
            setRewards(rewards.map(r => r.id === reward.id ? { ...r, is_active: !newValue } : r));
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to completely delete this reward? To just hide it, edit it and set Is Active to false.')) return;
        
        const { error } = await supabase.from('karma_rewards').delete().eq('id', id);
        if (!error) {
            setRewards(rewards.filter(r => r.id !== id));
        } else {
            alert('Error deleting: ' + error.message);
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

    return (
        <div className="space-y-6 max-w-4xl pb-10">
            <header className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm sticky top-4 z-10 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Karma Rewards Store</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage what users can buy using their earned Karma points.</p>
                    </div>

                    {activeTab === 'rewards' && (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
                            {!isEditing && (
                                <select 
                                    value={sortBy} 
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 cursor-pointer shadow-sm transition-all"
                                >
                                    <option value="cost_asc">Cost (Low to High)</option>
                                    <option value="cost_desc">Cost (High to Low)</option>
                                    <option value="name_asc">Name (A to Z)</option>
                                    <option value="name_desc">Name (Z to A)</option>
                                    <option value="status_active">Status (Active First)</option>
                                    <option value="status_inactive">Status (Hidden First)</option>
                                </select>
                            )}

                            {isEditing ? (
                                <>
                                    <button onClick={() => setIsEditing(null)} className="px-5 py-2.5 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:bg-slate-700 rounded-xl transition-colors">Cancel</button>
                                    <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-accent text-white font-medium rounded-xl hover:bg-indigo-600 transition-colors flex items-center gap-2 shadow-soft">
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save Reward
                                    </button>
                                </>
                            ) : (
                                <button onClick={handleCreateNew} className="flex items-center space-x-2 bg-accent text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-600 transition-colors shadow-soft">
                                    <Plus className="w-5 h-5" />
                                    <span>Add New Reward</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
                
                <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('rewards')}
                        className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'rewards' ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'}`}
                    >
                        Store Rewards
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'history' ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'}`}
                    >
                        Claim History
                    </button>
                </div>
            </header>

            {activeTab === 'rewards' ? (
                <>
                    {isEditing && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-accent/20 border-l-4 border-l-accent animate-fade-in text-sm text-left align-middle mx-auto">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">{isEditing === 'new' ? 'Create New Reward' : 'Edit Reward'}</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Title</label>
                            <input type="text" value={editForm.title || ''} onChange={e => setEditForm({ ...editForm, title: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-200 outline-none focus:border-accent focus:bg-white dark:bg-slate-800" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Description (Optional)</label>
                            <input type="text" value={editForm.description || ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-200 outline-none focus:border-accent focus:bg-white dark:bg-slate-800" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Cost (Karma Points)</label>
                            <input type="number" value={editForm.cost_points || 0} onChange={e => setEditForm({ ...editForm, cost_points: parseInt(e.target.value) || 0 })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-200 outline-none focus:border-accent focus:bg-white dark:bg-slate-800" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Reward Type</label>
                            <select value={editForm.reward_type || 'PLAN_UPGRADE'} onChange={e => setEditForm({ ...editForm, reward_type: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-200 outline-none focus:border-accent focus:bg-white dark:bg-slate-800">
                                {REWARD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        
                        {/* Dynamic Fields Based on Type */}
                        {(editForm.reward_type === 'PLAN_UPGRADE' || editForm.reward_type === 'KARMA_BOOST' || editForm.reward_type === 'UNLOCK_GOLDEN_AURA') && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Duration (Days)</label>
                                <input type="number" value={editForm.duration_days || 0} onChange={e => setEditForm({ ...editForm, duration_days: parseInt(e.target.value) || 0 })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-200 outline-none focus:border-accent focus:bg-white dark:bg-slate-800" />
                            </div>
                        )}
                        
                        {editForm.reward_type === 'PLAN_UPGRADE' && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Unlock Plan</label>
                                <select value={editForm.reward_value || ''} onChange={e => setEditForm({ ...editForm, reward_value: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-200 outline-none focus:border-accent focus:bg-white dark:bg-slate-800">
                                    {plans.map(p => (
                                        <option key={p.id} value={p.plan_key}>{p.name} ({p.plan_key})</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {editForm.reward_type === 'ADD_FREE_DELIVERIES' && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Amount to Add</label>
                                <input type="number" value={editForm.reward_metadata?.amount || 1} onChange={e => setEditForm({ ...editForm, reward_metadata: { ...editForm.reward_metadata, amount: parseInt(e.target.value) || 1 } })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-200 outline-none focus:border-accent focus:bg-white dark:bg-slate-800" />
                            </div>
                        )}

                        {editForm.reward_type === 'CUSTOM_SERVICE' && (
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Instructions for Admin (Metadata)</label>
                                <input type="text" placeholder="e.g. Schedule 30m call" value={editForm.reward_metadata?.instructions || ''} onChange={e => setEditForm({ ...editForm, reward_metadata: { ...editForm.reward_metadata, instructions: e.target.value } })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-200 outline-none focus:border-accent focus:bg-white dark:bg-slate-800" />
                            </div>
                        )}

                        <div className="flex items-center pt-6 col-span-2 md:col-span-1">
                            <label className="flex items-center cursor-pointer">
                                <input type="checkbox" className="hidden" checked={editForm.is_active || false} onChange={e => setEditForm({ ...editForm, is_active: e.target.checked })} />
                                <span className={`w-10 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out ${editForm.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                    <div className={`bg-white dark:bg-slate-800 w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${editForm.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                                </span>
                                <span className="ml-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{editForm.is_active ? 'Active' : 'Hidden'}</span>
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {!isEditing && rewards.length === 0 && (
                <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <p className="text-slate-500 dark:text-slate-400">No rewards configured yet. Create one to let users spend Karma.</p>
                </div>
            )}

            {!isEditing && rewards.length > 0 && (
                <div className="grid gap-4">
                    {[...rewards].sort((a, b) => {
                        if (sortBy === 'cost_asc') return a.cost_points - b.cost_points;
                        if (sortBy === 'cost_desc') return b.cost_points - a.cost_points;
                        if (sortBy === 'name_asc') return a.title.localeCompare(b.title);
                        if (sortBy === 'name_desc') return b.title.localeCompare(a.title);
                        if (sortBy === 'status_active') return a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1;
                        if (sortBy === 'status_inactive') return a.is_active === b.is_active ? 0 : a.is_active ? 1 : -1;
                        return 0;
                    }).map(reward => (
                        <div key={reward.id} className={`bg-white dark:bg-slate-800 rounded-3xl shadow-sm border p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-accent/40 ${reward.is_active ? 'border-slate-100 dark:border-slate-700' : 'border-slate-100 dark:border-slate-700 opacity-60'}`}>
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center flex-shrink-0 text-amber-500 font-bold border border-amber-100/50">
                                    {reward.cost_points}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-800 dark:text-slate-100">{reward.title}</h3>
                                        {!reward.is_active && <span className="text-[10px] uppercase font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">Hidden</span>}
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">{reward.description || 'No description provided.'}</p>
                                    <div className="flex items-center gap-2 mt-2 text-xs font-semibold text-slate-400">
                                        <span className="bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded-md text-blue-600">
                                            {reward.reward_type === 'PLAN_UPGRADE' ? `Unlocks: ${reward.reward_value}` : 
                                             reward.reward_type === 'ADD_FREE_DELIVERIES' ? `+${reward.reward_metadata?.amount || 1} Deliveries` : 
                                             reward.reward_type.replace(/_/g, ' ')}
                                        </span>
                                        {reward.duration_days > 0 && (
                                            <>
                                                <ArrowRight className="w-3 h-3" />
                                                <span className="bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded-md text-purple-600">Duration: {reward.duration_days} days</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                                <label className="flex items-center cursor-pointer mr-2" title={reward.is_active ? "Deactivate" : "Activate"}>
                                    <input 
                                        type="checkbox" 
                                        className="hidden" 
                                        checked={reward.is_active} 
                                        onChange={() => handleToggleActive(reward)} 
                                    />
                                    <span className={`w-9 h-5 flex items-center rounded-full p-1 duration-300 ease-in-out ${reward.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                        <div className={`bg-white dark:bg-slate-800 w-3 h-3 rounded-full shadow-md transform duration-300 ease-in-out ${reward.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </span>
                                </label>
                                <button onClick={() => handleEdit(reward)} className="p-2 text-slate-400 hover:text-accent bg-slate-50 dark:bg-slate-900 hover:bg-accent/10 rounded-xl transition-colors">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(reward.id)} className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 dark:bg-slate-900 hover:bg-red-50 rounded-xl transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            </>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Claim History</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Recent rewards claimed by users.</p>
                    </div>
                    {loadingHistory ? (
                        <div className="flex justify-center p-10"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
                    ) : historyLogs.length === 0 ? (
                        <div className="text-center py-12"><p className="text-slate-500 dark:text-slate-400">No rewards claimed yet.</p></div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {historyLogs.map(log => {
                                const userEmail = log.users?.email || 'Unknown User';
                                const userName = log.users?.full_name || log.users?.first_name || '';
                                const userDisplay = userName && userName.trim() !== 'null' ? `${userName} (${userEmail})` : userEmail;
                                return (
                                    <div key={log.id} className="p-4 hover:bg-slate-50 dark:bg-slate-900 flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row transition-colors">
                                        <div>
                                            <p className="font-bold text-slate-800 dark:text-slate-100">{log.description}</p>
                                            <div className="flex flex-wrap items-center gap-2 mt-1 -mb-1 text-sm text-slate-500 dark:text-slate-400">
                                                <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md font-medium text-slate-600 dark:text-slate-300 truncate max-w-[200px] sm:max-w-xs" title={userDisplay}>{userDisplay}</span>
                                                <span>•</span>
                                                <span className="text-xs uppercase font-semibold text-slate-400">{new Date(log.created_at).toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <span className="font-black text-slate-400 text-lg">-{log.points} pts</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
