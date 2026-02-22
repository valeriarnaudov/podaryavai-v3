import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Plus, Edit2, Trash2, Search, Heart, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

// This interfaces with a 'global_gifts' table that should exist in the database.
interface GlobalGift {
    id: string;
    title: string;
    price: string;
    description: string;
    image_url: string;
    is_vip: boolean;
    created_at: string;
}

export default function AdminGifts() {
    const [gifts, setGifts] = useState<GlobalGift[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditing, setIsEditing] = useState<GlobalGift | null>(null);
    const [showForm, setShowForm] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        price: '',
        description: '',
        image_url: '',
        is_vip: false
    });

    useEffect(() => {
        fetchGifts();
    }, []);

    const fetchGifts = async () => {
        setLoading(true);
        // Fallback to empty array if table doesn't exist yet to avoid crashing
        const { data, error } = await supabase
            .from('global_gifts')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setGifts(data);
        } else if (error) {
            console.error(error);
        }
        setLoading(false);
    };

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

        await supabase.from('global_gifts').delete().eq('id', id);
        fetchGifts();
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            title: formData.title,
            price: formData.price,
            description: formData.description,
            image_url: formData.image_url,
            is_vip: formData.is_vip
        };

        if (isEditing) {
            await supabase.from('global_gifts').update(payload).eq('id', isEditing.id);
        } else {
            await supabase.from('global_gifts').insert([payload]);
        }

        setShowForm(false);
        setIsEditing(null);
        setFormData({ title: '', price: '', description: '', image_url: '', is_vip: false });
        fetchGifts();
    };

    const openEditForm = (gift: GlobalGift) => {
        setIsEditing(gift);
        setFormData({
            title: gift.title,
            price: gift.price || '',
            description: gift.description || '',
            image_url: gift.image_url || '',
            is_vip: gift.is_vip || false
        });
        setShowForm(true);
    };

    const filteredGifts = gifts.filter(g =>
        (g.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (g.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Giftinder Database</h2>
                    <p className="text-sm text-slate-500">Manage global gift ideas served by the AI</p>
                </div>

                <div className="flex space-x-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search gifts..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-slate-200 outline-none focus:border-slate-800 transition-colors text-sm"
                        />
                    </div>
                    <button
                        onClick={() => {
                            setShowForm(true);
                            setIsEditing(null);
                            setFormData({ title: '', price: '', description: '', image_url: '', is_vip: false });
                        }}
                        className="flex items-center space-x-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Add Gift</span>
                    </button>
                </div>
            </header>

            {showForm && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-white p-6 rounded-3xl shadow-soft border border-slate-200 mb-6"
                >
                    <h3 className="text-lg font-bold text-slate-800 mb-4">{isEditing ? 'Edit Gift Idea' : 'Add New Gift Idea'}</h3>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                                <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800" placeholder="e.g. Sony WH-1000XM5" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Price / Price Range</label>
                                <input required type="text" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800" placeholder="e.g. €350" />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                <textarea required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800" rows={2} placeholder="Brief description to show on the card"></textarea>
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Image URL</label>
                                <input required type="url" value={formData.image_url} onChange={e => setFormData({ ...formData, image_url: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800" placeholder="https://..." />
                            </div>
                            <div className="sm:col-span-2 flex items-center mt-2">
                                <input
                                    type="checkbox"
                                    id="isVip"
                                    checked={formData.is_vip}
                                    onChange={(e) => setFormData({ ...formData, is_vip: e.target.checked })}
                                    className="w-4 h-4 text-slate-900 border-gray-300 rounded focus:ring-slate-900"
                                />
                                <label htmlFor="isVip" className="ml-2 flex items-center text-sm font-medium text-slate-700">
                                    <Lock className="w-4 h-4 mr-1 text-amber-500" /> Mark as VIP / Luxury Item
                                </label>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 mt-4">
                            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-xl font-medium shadow-soft hover:bg-slate-800 transition-colors flex items-center">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Gift'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            )}

            {loading && !showForm ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredGifts.map((gift) => (
                        <div key={gift.id} className="bg-white rounded-3xl overflow-hidden shadow-soft border border-slate-100 flex flex-col">
                            <div className="h-48 w-full relative">
                                <img src={gift.image_url} alt={gift.title} className="w-full h-full object-cover" />
                                {gift.is_vip && (
                                    <div className="absolute top-3 right-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center">
                                        <Lock className="w-3 h-3 mr-1" /> VIP
                                    </div>
                                )}
                            </div>
                            <div className="p-5 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-slate-800 leading-tight">{gift.title}</h3>
                                    <span className="font-semibold text-accent whitespace-nowrap ml-2">{gift.price}</span>
                                </div>
                                <p className="text-sm text-slate-500 flex-1">{gift.description}</p>

                                <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-slate-100">
                                    <button
                                        onClick={() => openEditForm(gift)}
                                        className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(gift.id, gift.title)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredGifts.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-3xl border border-dashed border-slate-200">
                            <Heart className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                            <p>No gift ideas found.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
