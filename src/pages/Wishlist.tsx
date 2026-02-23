import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { Share2, Plus, Trash2, ExternalLink, Loader2, X, Link as LinkIcon, DollarSign, Gift } from 'lucide-react';

interface WishlistItem {
    id: string;
    title: string;
    description: string;
    price_range: string;
    image_url: string;
    source_url: string;
    is_manual?: boolean;
}

export default function Wishlist() {
    const { user } = useAuth();
    const [items, setItems] = useState<WishlistItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newItemTitle, setNewItemTitle] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');
    const [newItemUrl, setNewItemUrl] = useState('');
    const [newItemImage, setNewItemImage] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [addingItem, setAddingItem] = useState(false);
    const [isScraping, setIsScraping] = useState(false);

    useEffect(() => {
        fetchWishlist();
    }, []);

    const fetchWishlist = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('gift_ideas')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_saved', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setItems(data as any);
        } catch (error) {
            console.error('Error fetching wishlist:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        const shareUrl = `${window.location.origin}/wishlist/${user?.id}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'My Podaryavai Wishlist',
                    text: 'Check out my gift ideas!',
                    url: shareUrl,
                });
            } catch (err) {
                console.log('Error sharing:', err);
            }
        } else {
            navigator.clipboard.writeText(shareUrl);
            alert('Wishlist link copied to clipboard!');
        }
    };

    const removeItem = async (id: string) => {
        setItems(items.filter(i => i.id !== id));
        await supabase.from('gift_ideas').delete().eq('id', id);
    };

    const handleUrlChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const url = e.target.value;
        setNewItemUrl(url);

        if (url.startsWith('http') && !newItemTitle.trim() && !newItemImage.trim()) {
            setIsScraping(true);
            try {
                const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
                const json = await res.json();
                if (json.status === 'success' && json.data) {
                    if (json.data.title) setNewItemTitle(json.data.title);
                    if (json.data.image?.url) setNewItemImage(json.data.image.url);
                }
            } catch (err) {
                console.error("Failed to auto-extract url metadata", err);
            } finally {
                setIsScraping(false);
            }
        }
    };

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newItemTitle.trim() || !newItemPrice) return;

        setAddingItem(true);
        try {
            let finalImageUrl = newItemImage.trim();

            // 1. Upload file if user selected one
            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
                const filePath = `${user.id}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('wishlist_images')
                    .upload(filePath, imageFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('wishlist_images')
                    .getPublicUrl(filePath);

                finalImageUrl = publicUrl;
            }

            // 2. Format price cleanly
            const numericPrice = parseFloat(newItemPrice);
            const formattedPrice = isNaN(numericPrice) ? '€0.00' : `€${numericPrice.toFixed(2)}`;

            // 3. Save to database
            const { data, error } = await supabase.from('gift_ideas').insert([{
                user_id: user.id,
                title: newItemTitle.trim(),
                price_range: formattedPrice,
                source_url: newItemUrl.trim(),
                image_url: finalImageUrl,
                is_saved: true,
                is_manual: true
            }]).select().single();

            if (error) throw error;

            setItems([data as any, ...items]);
            setIsModalOpen(false);

            // Reset form
            setNewItemTitle('');
            setNewItemPrice('');
            setNewItemUrl('');
            setNewItemImage('');
            setImageFile(null);
        } catch (err) {
            console.error('Failed to add item:', err);
            alert('Failed to add item to wishlist. (Did you create the wishlist_images bucket?)');
        } finally {
            setAddingItem(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-background relative overflow-hidden">
            <header className="px-6 pt-10 pb-6 bg-white/80 backdrop-blur-lg sticky top-0 z-10 border-b border-slate-100 shadow-sm flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-textMain tracking-tight">My Wishlist</h1>
                    <p className="text-sm text-slate-500 mt-1">Gifts you actually want.</p>
                </div>
                <button
                    onClick={handleShare}
                    className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center text-accent hover:bg-accent/20 transition-colors"
                >
                    <Share2 className="w-5 h-5" />
                </button>
            </header>

            <main className="flex-1 overflow-y-auto p-6 pb-24">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Plus className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-textMain mb-2">Your wishlist is empty</h3>
                        <p className="text-slate-500 text-sm mb-6">Swipe right on Giftinder to save ideas or add your own.</p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-6 py-3 bg-white text-textMain rounded-2xl font-medium shadow-soft active:scale-95 transition-transform border border-slate-200"
                        >
                            Add Custom Item
                        </button>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Manually Added Items */}
                        {items.filter(i => i.is_manual).length > 0 && (
                            <section>
                                <div className="flex items-center space-x-2 mb-4">
                                    <h2 className="text-lg font-bold text-slate-800">My Requests</h2>
                                    <div className="h-px bg-slate-200 flex-1"></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {items.filter(i => i.is_manual).map((item, i) => (
                                        <WishlistItemCard key={item.id} item={item} i={i} removeItem={removeItem} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Giftinder Saved Items */}
                        {items.filter(i => !i.is_manual).length > 0 && (
                            <section>
                                <div className="flex items-center space-x-2 mb-4 mt-2">
                                    <h2 className="text-lg font-bold text-slate-800">From AI Giftinder</h2>
                                    <div className="h-px bg-slate-200 flex-1"></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {items.filter(i => !i.is_manual).map((item, i) => (
                                        <WishlistItemCard key={item.id} item={item} i={i} removeItem={removeItem} />
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </main>

            {/* Floating Add Button */}
            <button
                onClick={() => setIsModalOpen(true)}
                className="absolute bottom-6 right-6 w-14 h-14 bg-accent text-white rounded-full shadow-floating flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
            >
                <Plus className="w-6 h-6" />
            </button>

            {/* Add Item Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="absolute inset-0 z-50 flex flex-col justify-end pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto"
                            onClick={() => setIsModalOpen(false)}
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="bg-white rounded-t-3xl pt-2 pb-safe shadow-t-xl relative z-10 pointer-events-auto h-[85vh] flex flex-col"
                        >
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3" />

                            <div className="px-6 flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-textMain">Add to Wishlist</h2>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 pb-6">
                                <form id="add-wishlist-item" onSubmit={handleAddItem} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Item Name</label>
                                        <div className="relative">
                                            <Gift className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input
                                                type="text"
                                                required
                                                value={newItemTitle}
                                                onChange={(e) => setNewItemTitle(e.target.value)}
                                                placeholder="e.g. Sony Wireless Headphones"
                                                className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border border-slate-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Estimated Price (€)</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                required
                                                value={newItemPrice}
                                                onChange={(e) => setNewItemPrice(e.target.value)}
                                                placeholder="e.g. 150.00"
                                                className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border border-slate-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Link (Optional)</label>
                                        <div className="relative">
                                            <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input
                                                type="url"
                                                value={newItemUrl}
                                                onChange={handleUrlChange}
                                                placeholder="https://..."
                                                className="w-full pl-12 pr-12 py-4 bg-slate-50 rounded-2xl border border-slate-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                            />
                                            {isScraping && (
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                    <Loader2 className="w-5 h-5 text-accent animate-spin" />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Image (Optional)</label>
                                        <div className="flex space-x-2">
                                            <input
                                                type="text"
                                                value={newItemImage}
                                                onChange={(e) => setNewItemImage(e.target.value)}
                                                placeholder="https://.../image.png"
                                                className="flex-1 min-w-0 px-4 py-4 bg-slate-50 rounded-2xl border border-slate-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                            />
                                            <label className="flex-shrink-0 flex items-center justify-center px-4 bg-slate-100 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-200 transition-colors active:scale-95">
                                                <span className="text-sm font-semibold text-slate-600">Upload File</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        if (e.target.files && e.target.files[0]) {
                                                            setImageFile(e.target.files[0]);
                                                            setNewItemImage(e.target.files[0].name);
                                                        }
                                                    }}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </form>
                            </div>

                            <div className="p-6 bg-white border-t border-slate-100">
                                <button
                                    type="submit"
                                    form="add-wishlist-item"
                                    disabled={addingItem || !newItemTitle.trim()}
                                    className="w-full py-4 bg-accent text-white rounded-2xl font-bold shadow-floating shadow-accent/20 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {addingItem ? <Loader2 className="w-6 h-6 animate-spin" /> : <span>Add to Wishlist</span>}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function WishlistItemCard({ item, i, removeItem }: { item: WishlistItem, i: number, removeItem: (id: string) => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl shadow-soft overflow-hidden border border-slate-100/50 flex flex-col"
        >
            <div className="h-32 bg-slate-100 relative group">
                {item.image_url ? (
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">No Image</div>
                )}
                <button
                    onClick={() => removeItem(item.id)}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-slate-400 hover:text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
            <div className="p-3 flex-1 flex flex-col justify-between">
                <div>
                    <h3 className="font-semibold text-textMain text-sm line-clamp-2 leading-snug mb-1">{item.title}</h3>
                    <p className="text-xs font-medium text-accent">{item.price_range || 'Price N/A'}</p>
                </div>
                {item.source_url && (
                    <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 flex items-center justify-center space-x-1 text-xs text-slate-500 bg-slate-50 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                    </a>
                )}
            </div>
        </motion.div>
    );
}
