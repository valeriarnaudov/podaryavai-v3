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
    duration_days: number;
    is_active: boolean;
}

export default function AdminKarmaRewards() {
    const { plans } = useSettings();
    const [rewards, setRewards] = useState<KarmaReward[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<KarmaReward>>({});

    useEffect(() => {
        fetchRewards();
    }, []);

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

    const handleCreateNew = () => {
        setIsEditing('new');
        setEditForm({
            title: 'New Reward',
            description: '',
            cost_points: 100,
            reward_type: 'PLAN_UPGRADE',
            reward_value: plans.length > 0 ? plans[0].plan_key : 'PRO',
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
                    reward_value: editForm.reward_value,
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
                    reward_value: editForm.reward_value,
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
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm sticky top-4 z-10">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Karma Rewards Store</h2>
                    <p className="text-sm text-slate-500 mt-1">Manage what users can buy using their earned Karma points.</p>
                </div>
                {isEditing ? (
                    <div className="flex gap-2">
                        <button onClick={() => setIsEditing(null)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                        <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-accent text-white font-medium rounded-xl hover:bg-indigo-600 transition-colors flex items-center gap-2">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save Reward
                        </button>
                    </div>
                ) : (
                    <button onClick={handleCreateNew} className="flex items-center space-x-2 bg-accent text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-600 transition-colors shadow-soft">
                        <Plus className="w-4 h-4" />
                        <span>Add New Reward</span>
                    </button>
                )}
            </header>

            {isEditing && (
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-accent/20 border-l-4 border-l-accent animate-fade-in text-sm text-left align-middle mx-auto">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">{isEditing === 'new' ? 'Create New Reward' : 'Edit Reward'}</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Title</label>
                            <input type="text" value={editForm.title || ''} onChange={e => setEditForm({ ...editForm, title: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 outline-none focus:border-accent focus:bg-white" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Description (Optional)</label>
                            <input type="text" value={editForm.description || ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 outline-none focus:border-accent focus:bg-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cost (Karma Points)</label>
                            <input type="number" value={editForm.cost_points || 0} onChange={e => setEditForm({ ...editForm, cost_points: parseInt(e.target.value) || 0 })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 outline-none focus:border-accent focus:bg-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Duration (Days)</label>
                            <input type="number" value={editForm.duration_days || 0} onChange={e => setEditForm({ ...editForm, duration_days: parseInt(e.target.value) || 0 })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 outline-none focus:border-accent focus:bg-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Unlock Plan</label>
                            <select value={editForm.reward_value || ''} onChange={e => setEditForm({ ...editForm, reward_value: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 outline-none focus:border-accent focus:bg-white">
                                {plans.map(p => (
                                    <option key={p.id} value={p.plan_key}>{p.name} ({p.plan_key})</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center pt-6">
                            <label className="flex items-center cursor-pointer">
                                <span className={`w-10 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out ${editForm.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${editForm.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                                </span>
                                <span className="ml-3 text-sm font-semibold text-slate-700">{editForm.is_active ? 'Active' : 'Hidden'}</span>
                            </label>
                            <input type="checkbox" className="hidden" checked={editForm.is_active || false} onChange={e => setEditForm({ ...editForm, is_active: e.target.checked })} />
                        </div>
                    </div>
                </div>
            )}

            {!isEditing && rewards.length === 0 && (
                <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <p className="text-slate-500">No rewards configured yet. Create one to let users spend Karma.</p>
                </div>
            )}

            {!isEditing && rewards.length > 0 && (
                <div className="grid gap-4">
                    {rewards.map(reward => (
                        <div key={reward.id} className={`bg-white rounded-3xl shadow-sm border p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-accent/40 ${reward.is_active ? 'border-slate-100' : 'border-slate-100 opacity-60'}`}>
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center flex-shrink-0 text-amber-500 font-bold border border-amber-100/50">
                                    {reward.cost_points}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-800">{reward.title}</h3>
                                        {!reward.is_active && <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Hidden</span>}
                                    </div>
                                    <p className="text-sm text-slate-500 line-clamp-1">{reward.description || 'No description provided.'}</p>
                                    <div className="flex items-center gap-2 mt-2 text-xs font-semibold text-slate-400">
                                        <span className="bg-slate-50 px-2 py-1 rounded-md text-blue-600">Unlocks: {reward.reward_value}</span>
                                        <ArrowRight className="w-3 h-3" />
                                        <span className="bg-slate-50 px-2 py-1 rounded-md text-purple-600">Duration: {reward.duration_days} days</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 self-start md:self-auto">
                                <button onClick={() => handleEdit(reward)} className="p-2 text-slate-400 hover:text-accent bg-slate-50 hover:bg-accent/10 rounded-xl transition-colors">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(reward.id)} className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-xl transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
