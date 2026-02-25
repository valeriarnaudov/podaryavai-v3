import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Plus, Trash2, Edit2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { useSettings } from '../lib/SettingsContext';

interface Contact {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string;
    relationship: string;
}

export default function ContactsList() {
    const navigate = useNavigate();
    const { subscriptionPlan } = useAuth();
    const { settings } = useSettings();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);

    // Calculate limit
    let limitStr = '-1';
    if (subscriptionPlan === 'FREE') limitStr = settings.LIMIT_CONTACTS_FREE;
    else if (subscriptionPlan === 'STANDARD') limitStr = settings.LIMIT_CONTACTS_STANDARD;
    else if (subscriptionPlan === 'PRO') limitStr = settings.LIMIT_CONTACTS_PRO;
    else if (subscriptionPlan === 'ULTRA') limitStr = settings.LIMIT_CONTACTS_ULTRA;
    else if (subscriptionPlan === 'BUSINESS') limitStr = settings.LIMIT_CONTACTS_BUSINESS;
    
    const limit = parseInt(limitStr || '-1', 10);
    const isAtLimit = limit !== -1 && contacts.length >= limit;

    const handleAddContact = () => {
        if (isAtLimit) {
            navigate('/upgrade');
        } else {
            navigate('/contacts/new');
        }
    };

    useEffect(() => {
        fetchContacts();
    }, []);

    const fetchContacts = async () => {
        const { data, error } = await supabase
            .from('contacts')
            .select('*')
            .order('first_name', { ascending: true });

        if (!error && data) {
            setContacts(data);
        }
        setLoading(false);
    };

    const deleteContact = async (id: string) => {
        if (confirm('Are you sure you want to delete this contact?')) {
            await supabase.from('contacts').delete().eq('id', id);
            setContacts(contacts.filter(c => c.id !== id));
        }
    };

    return (
        <div className="bg-background min-h-[100dvh] pb-safe sm:h-[90dvh] relative">
            <header className="bg-white/80 backdrop-blur-lg sticky top-0 z-10 px-6 py-4 flex items-center justify-between border-b border-slate-100 shadow-sm">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="text-lg font-bold text-textMain">My Contacts</h1>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-0.5">
                        {limit === -1 ? `${contacts.length} added` : `${contacts.length} / ${limit} Max`}
                    </span>
                </div>
                <div className="w-10"></div> {/* Spacer for alignment */}
            </header>

            <main className="p-6">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
                    </div>
                ) : contacts.length === 0 ? (
                    <div className="text-center py-10">
                        <p className="text-slate-500 mb-4">You haven't added any contacts yet.</p>
                        <button
                            onClick={handleAddContact}
                            className="px-6 py-3 bg-accent text-white rounded-2xl font-medium shadow-soft active:scale-95 transition-transform"
                        >
                            Add First Contact
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {contacts.map((contact) => (
                            <motion.div
                                key={contact.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => navigate(`/contacts/${contact.id}/edit`)}
                                className="bg-white p-4 rounded-2xl shadow-soft border border-slate-100/50 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors group"
                            >
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-lg border border-slate-200 overflow-hidden shadow-sm">
                                        {contact.avatar_url ? (
                                            <img src={contact.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <span>
                                                {(contact.first_name?.[0] || '') + (contact.last_name?.[0] || '')}
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-textMain group-hover:text-accent transition-colors">{contact.first_name} {contact.last_name}</h3>
                                        <p className="text-xs text-slate-400">{contact.relationship || 'Contact'}</p>
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/contacts/${contact.id}/edit`);
                                        }}
                                        className="p-2 text-slate-400 hover:text-accent rounded-full hover:bg-white"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteContact(contact.id);
                                        }}
                                        className="p-2 text-slate-400 hover:text-red-500 rounded-full hover:bg-white"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>

            {/* Floating Add Button */}
            <button
                onClick={handleAddContact}
                className={`absolute bottom-6 right-6 ${isAtLimit ? 'px-6 h-14 bg-amber-500 rounded-full' : 'w-14 h-14 bg-accent rounded-full'} text-white shadow-floating flex items-center justify-center hover:scale-105 active:scale-95 transition-all outline-none font-bold`}
            >
                {isAtLimit ? 'Upgrade to Add' : <Plus className="w-6 h-6" />}
            </button>
        </div>
    );
}
