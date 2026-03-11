import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { Share2, Plus, Trash2, ExternalLink, Loader2, X, Link as LinkIcon, DollarSign, Gift, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface WishlistItem {
    id: string;
    title: string;
    description: string;
    price_range: string;
    image_url: string;
    source_url: string;
    is_manual?: boolean;
    is_bought?: boolean;
}

export default function Wishlist() {
    const { user, refreshUserData } = useAuth();
    const { t } = useTranslation();
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
                    title: t('wishlist.shareTitle'),
                    text: t('wishlist.shareText'),
                    url: shareUrl,
                });
            } catch (err) {
                console.log('Error sharing:', err);
            }
        } else {
            navigator.clipboard.writeText(shareUrl);
            alert(t('wishlist.copied'));
        }
    };

    const removeItem = async (id: string) => {
        setItems(items.filter(i => i.id !== id));
        await supabase.from('gift_ideas').delete().eq('id', id);
    };

    const archiveItem = async (id: string) => {
        if (!user) return;
        try {
            const { data: res } = await supabase.rpc('archive_own_gift', {
                gift_id: id,
                owner_id: user.id
            });

            if (res?.success) {
                setItems(items.map(item => item.id === id ? { ...item, is_bought: true } : item));
                if (res.awarded > 0) {
                    await refreshUserData();
                }
            } else {
                console.error('Failed to archive:', res?.message);
            }
        } catch (error) {
            console.error('Error archiving item:', error);
        }
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

            // Award +5 Karma (up to 3x per day)
            try {
                const { data: karmaRes } = await supabase.rpc('award_wishlist_karma', { user_id: user.id });
                if (karmaRes?.success && karmaRes.awarded > 0) {
                    await refreshUserData();
                }
            } catch (kErr) {
                console.error('Failed to parse karma reward:', kErr);
            }

            // Reset form
            setNewItemTitle('');
            setNewItemPrice('');
            setNewItemUrl('');
            setNewItemImage('');
            setImageFile(null);
        } catch (err) {
            console.error('Failed to add item:', err);
            alert(t('wishlist.addError'));
        } finally {
            setAddingItem(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-background dark:bg-slate-900 relative overflow-hidden">
            <header className="px-6 pt-10 pb-6 bg-white dark:bg-slate-800/80 backdrop-blur-lg sticky top-0 z-10 border-b border-slate-100 dark:border-slate-700 shadow-sm flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-textMain dark:text-white tracking-tight">{t('wishlist.title')}</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('wishlist.subtitle')}</p>
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
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Plus className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-textMain dark:text-white mb-2">{t('wishlist.emptyTitle')}</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{t('wishlist.emptyDesc')}</p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-6 py-3 bg-white dark:bg-slate-800 text-textMain dark:text-white rounded-2xl font-medium shadow-soft active:scale-95 transition-transform border border-slate-200 dark:border-slate-600"
                        >
                            {t('wishlist.addCustom')}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Active Manual Items */}
                        {items.filter(i => i.is_manual && !i.is_bought).length > 0 && (
                            <section>
                                <div className="flex items-center space-x-2 mb-4">
                                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t('wishlist.myRequests')}</h2>
                                    <div className="h-px bg-slate-200 dark:bg-slate-600 flex-1"></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {items.filter(i => i.is_manual && !i.is_bought).map((item, i) => (
                                        <WishlistItemCard key={item.id} item={item} i={i} removeItem={removeItem} archiveItem={archiveItem} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Active Giftinder Saved Items */}
                        {items.filter(i => !i.is_manual && !i.is_bought).length > 0 && (
                            <section>
                                <div className="flex items-center space-x-2 mb-4 mt-2">
                                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t('wishlist.fromGiftinder')}</h2>
                                    <div className="h-px bg-slate-200 dark:bg-slate-600 flex-1"></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {items.filter(i => !i.is_manual && !i.is_bought).map((item, i) => (
                                        <WishlistItemCard key={item.id} item={item} i={i} removeItem={removeItem} archiveItem={archiveItem} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Archived/Bought Items */}
                        {items.filter(i => i.is_bought).length > 0 && (
                            <section className="opacity-75">
                                <div className="flex items-center space-x-2 mb-4 mt-8">
                                    <h2 className="text-lg font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                        <CheckCircle2 className="w-5 h-5" /> 
                                        Archived (Bought)
                                    </h2>
                                    <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 grayscale-[0.3]">
                                    {items.filter(i => i.is_bought).map((item, i) => (
                                        <WishlistItemCard key={item.id} item={item} i={i} removeItem={removeItem} archiveItem={archiveItem} />
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
                            className="bg-white dark:bg-slate-800 rounded-t-3xl pt-2 pb-safe shadow-t-xl relative z-10 pointer-events-auto h-[85vh] flex flex-col"
                        >
                            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full mx-auto my-3" />

                            <div className="px-6 flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-textMain dark:text-white">{t('wishlist.addToWishlist')}</h2>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full hover:bg-slate-200 dark:bg-slate-600 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 pb-6">
                                <form id="add-wishlist-item" onSubmit={handleAddItem} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">{t('wishlist.itemNameLabel')}</label>
                                        <div className="relative">
                                            <Gift className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input
                                                type="text"
                                                required
                                                value={newItemTitle}
                                                onChange={(e) => setNewItemTitle(e.target.value)}
                                                placeholder={t('wishlist.itemNamePlaceholder')}
                                                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-600 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">{t('wishlist.priceLabel')}</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                required
                                                value={newItemPrice}
                                                onChange={(e) => setNewItemPrice(e.target.value)}
                                                placeholder={t('wishlist.pricePlaceholder')}
                                                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-600 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">{t('wishlist.linkLabel')}</label>
                                        <div className="relative">
                                            <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input
                                                type="url"
                                                value={newItemUrl}
                                                onChange={handleUrlChange}
                                                placeholder={t('wishlist.linkPlaceholder')}
                                                className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-600 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                            />
                                            {isScraping && (
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                    <Loader2 className="w-5 h-5 text-accent animate-spin" />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">{t('wishlist.imageLabel')}</label>
                                        <div className="flex space-x-2">
                                            <input
                                                type="text"
                                                value={newItemImage}
                                                onChange={(e) => setNewItemImage(e.target.value)}
                                                placeholder={t('wishlist.imagePlaceholder')}
                                                className="flex-1 min-w-0 px-4 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-600 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                            />
                                            <label className="flex-shrink-0 flex items-center justify-center px-4 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl cursor-pointer hover:bg-slate-200 dark:bg-slate-600 transition-colors active:scale-95">
                                                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{t('wishlist.uploadFile')}</span>
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

                            <div className="p-6 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
                                <button
                                    type="submit"
                                    form="add-wishlist-item"
                                    disabled={addingItem || !newItemTitle.trim()}
                                    className="w-full py-4 bg-accent text-white rounded-2xl font-bold shadow-floating shadow-accent/20 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {addingItem ? <Loader2 className="w-6 h-6 animate-spin" /> : <span>{t('wishlist.addToWishlist')}</span>}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
function WishlistItemCard({ item, i, removeItem, archiveItem }: { item: WishlistItem, i: number, removeItem: (id: string) => void, archiveItem: (id: string) => void }) {
    const { t } = useTranslation();
    const [archiving, setArchiving] = useState(false);

    const handleArchive = async () => {
        setArchiving(true);
        await archiveItem(item.id);
        setArchiving(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft overflow-hidden border border-slate-100/50 dark:border-slate-700/50 flex flex-col"
        >
            <div className="h-32 bg-slate-100 dark:bg-slate-700 relative group">
                {item.image_url ? (
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">{t('wishlist.noImage')}</div>
                )}
                <button
                    onClick={() => removeItem(item.id)}
                    className="absolute top-2 right-2 p-1.5 bg-white dark:bg-slate-800/90 rounded-full text-slate-400 hover:text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
            <div className="p-3 flex-1 flex flex-col justify-between">
                <div>
                    <h3 className="font-semibold text-textMain dark:text-white text-sm line-clamp-2 leading-snug mb-1">{item.title}</h3>
                    <p className="text-xs font-medium text-accent dark:text-emerald-400">{item.price_range || t('wishlist.priceNA')}</p>
                </div>
                <div className="mt-3 flex flex-col gap-1.5">
                    {item.source_url && (
                        <a
                            href={item.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center space-x-1 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 py-1.5 rounded-lg hover:bg-slate-100 dark:bg-slate-700 transition-colors shadow-sm"
                        >
                            <span>{t('wishlist.originalLink')}</span>
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    )}
                    
                    {!item.is_bought && (
                        <>
                            <a
                                href={`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(item.title)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center space-x-1 text-[10px] sm:text-xs text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 py-1.5 px-1 rounded-lg hover:bg-slate-200 dark:bg-slate-600 transition-colors shadow-sm font-semibold truncate"
                            >
                                <span className="truncate">{t('wishlist.searchOnline')}</span>
                            </a>
                            <button
                                onClick={handleArchive}
                                disabled={archiving}
                                className="flex items-center justify-center space-x-1 text-[9px] sm:text-[10px] text-white bg-green-500 py-1.5 px-1 rounded-lg hover:bg-green-600 transition-colors shadow-sm font-bold uppercase tracking-normal sm:tracking-wide disabled:opacity-50 mt-1 truncate"
                            >
                                {archiving ? <Loader2 className="w-3 h-3 animate-spin shrink-0"/> : <><CheckCircle2 className="w-3 h-3 shrink-0" /><span className="truncate">{t('wishlist.archiveFound', { defaultValue: 'Archive (I got it)' })}</span></>}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
