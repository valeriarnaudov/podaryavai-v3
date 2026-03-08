import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Plus, Trash2, Edit2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { useSettings } from '../lib/SettingsContext';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation();

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
        if (confirm(t('contacts.deleteConfirm'))) {
            await supabase.from('contacts').delete().eq('id', id);
            setContacts(contacts.filter(c => c.id !== id));
        }
    };

    return (
        <div className="bg-background dark:bg-slate-900 min-h-[100dvh] pb-safe sm:h-[90dvh] relative">
            <header className="bg-white dark:bg-slate-800/80 backdrop-blur-lg sticky top-0 z-10 px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-700 shadow-sm">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="text-lg font-bold text-textMain dark:text-white">{t('contacts.title')}</h1>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">
                        {limit === -1 ? t('contacts.added', { count: contacts.length }) : t('contacts.max', { count: contacts.length, limit })}
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
                        <p className="text-slate-500 dark:text-slate-400 mb-4">{t('contacts.empty')}</p>
                        <button
                            onClick={handleAddContact}
                            className="px-6 py-3 bg-accent text-white rounded-2xl font-medium shadow-soft active:scale-95 transition-transform"
                        >
                            {t('contacts.addFirst')}
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
                                className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-soft border border-slate-100/50 dark:border-slate-700/50 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:bg-slate-900 transition-colors group"
                            >
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-400 text-lg border border-slate-200 dark:border-slate-600 overflow-hidden shadow-sm">
                                        {contact.avatar_url ? (
                                            <img src={contact.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <span>
                                                {(contact.first_name?.[0] || '') + (contact.last_name?.[0] || '')}
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-textMain dark:text-white group-hover:text-accent dark:group-hover:text-emerald-400 transition-colors">{contact.first_name} {contact.last_name}</h3>
                                        <p className="text-xs text-slate-400">
                                            {contact.relationship ? t(`contactForm.relationships.${contact.relationship.toLowerCase()}`, { defaultValue: contact.relationship }) : t('contacts.defaultRelationship')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/contacts/${contact.id}/edit`);
                                        }}
                                        className="p-2 text-slate-400 hover:text-accent rounded-full hover:bg-white dark:bg-slate-800"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteContact(contact.id);
                                        }}
                                        className="p-2 text-slate-400 hover:text-red-500 rounded-full hover:bg-white dark:bg-slate-800"
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
                {isAtLimit ? t('contacts.upgradeToAdd') : <Plus className="w-6 h-6" />}
            </button>
        </div>
    );
}
