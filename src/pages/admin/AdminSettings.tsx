import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Save, Settings as SettingsIcon, Globe, Zap, RotateCcw, CreditCard, Users } from 'lucide-react';
import { useSettings, SubscriptionPlan } from '../../lib/SettingsContext';
import { useTranslation } from 'react-i18next';

interface PlatformSetting {
    id: string; // optional for local creation
    setting_key: string;
    setting_value: string;
    description: string;
}

const DEFAULT_SETTINGS = [
    { setting_key: 'MAINTENANCE_MODE', setting_value: 'false', description: 'Enable to lock out non-admins ("true" | "false")' },
    { setting_key: 'REFERRAL_REWARD_BASE', setting_value: '50', description: 'Default Karma points given for a referral' },
    { setting_key: 'REFERRAL_REWARD_BOOSTED', setting_value: '100', description: 'Karma points given for a referral if referrer has an active boost' },

    // AI Limits per plan (-1 for unlimited)
    { setting_key: 'LIMIT_AI_FREE', setting_value: '1', description: 'Daily AI Giftinder limit for Free plan' },
    { setting_key: 'LIMIT_AI_STANDARD', setting_value: '10', description: 'Daily AI Giftinder limit for Standard plan' },
    { setting_key: 'LIMIT_AI_PRO', setting_value: '30', description: 'Daily AI Giftinder limit for Pro plan' },
    { setting_key: 'LIMIT_AI_ULTRA', setting_value: '100', description: 'Daily AI Giftinder limit for Ultra plan' },
    { setting_key: 'LIMIT_AI_BUSINESS', setting_value: '-1', description: 'Daily AI Giftinder limit for Business plan' },

    // AI Models per plan ('llama', 'openai', or 'gemini')
    { setting_key: 'MODEL_AI_FREE', setting_value: 'gemini', description: 'AI Model for Free plan ("llama", "openai", "gemini")' },
    { setting_key: 'MODEL_AI_STANDARD', setting_value: 'gemini', description: 'AI Model for Standard plan ("llama", "openai", "gemini")' },
    { setting_key: 'MODEL_AI_PRO', setting_value: 'gemini', description: 'AI Model for Pro plan ("llama", "openai", "gemini")' },
    { setting_key: 'MODEL_AI_ULTRA', setting_value: 'gemini', description: 'AI Model for Ultra plan ("llama", "openai", "gemini")' },
    { setting_key: 'MODEL_AI_BUSINESS', setting_value: 'gemini', description: 'AI Model for Business plan ("llama", "openai", "gemini")' },

    // Calendar Profile Generation
    { setting_key: 'CONTACT_GIFTS_ENABLED_FREE', setting_value: 'false', description: 'Enable Calendar AI Gifts for Free plan ("true" | "false")' },
    { setting_key: 'CONTACT_GIFTS_ENABLED_STANDARD', setting_value: 'false', description: 'Enable Calendar AI Gifts for Standard plan ("true" | "false")' },
    { setting_key: 'CONTACT_GIFTS_ENABLED_PRO', setting_value: 'true', description: 'Enable Calendar AI Gifts for Pro plan ("true" | "false")' },
    { setting_key: 'CONTACT_GIFTS_ENABLED_ULTRA', setting_value: 'true', description: 'Enable Calendar AI Gifts for Ultra plan ("true" | "false")' },
    { setting_key: 'CONTACT_GIFTS_ENABLED_BUSINESS', setting_value: 'true', description: 'Enable Calendar AI Gifts for Business plan ("true" | "false")' },

    { setting_key: 'CONTACT_GIFTS_MODEL_FREE', setting_value: 'gemini', description: 'Calendar AI Model for Free plan ("llama", "openai", "gemini")' },
    { setting_key: 'CONTACT_GIFTS_MODEL_STANDARD', setting_value: 'gemini', description: 'Calendar AI Model for Standard plan ("llama", "openai", "gemini")' },
    { setting_key: 'CONTACT_GIFTS_MODEL_PRO', setting_value: 'gemini', description: 'Calendar AI Model for Pro plan ("llama", "openai", "gemini")' },
    { setting_key: 'CONTACT_GIFTS_MODEL_ULTRA', setting_value: 'gemini', description: 'Calendar AI Model for Ultra plan ("llama", "openai", "gemini")' },
    { setting_key: 'CONTACT_GIFTS_MODEL_BUSINESS', setting_value: 'gemini', description: 'Calendar AI Model for Business plan ("llama", "openai", "gemini")' },

    { setting_key: 'LIMIT_CONTACTS_FREE', setting_value: '2', description: 'Maximum contacts allowed for Free plan' },
    { setting_key: 'LIMIT_CONTACTS_STANDARD', setting_value: '10', description: 'Maximum contacts allowed for Standard plan' },
    { setting_key: 'LIMIT_CONTACTS_PRO', setting_value: '50', description: 'Maximum contacts allowed for Pro plan' },
    { setting_key: 'LIMIT_CONTACTS_ULTRA', setting_value: '200', description: 'Maximum contacts allowed for Ultra plan' },
    { setting_key: 'LIMIT_CONTACTS_BUSINESS', setting_value: '-1', description: 'Maximum contacts allowed for Business plan' },

    // Karma points per swipe right (like) per plan
    { setting_key: 'KARMA_PER_SWIPE_FREE', setting_value: '1', description: 'Karma points awarded per Giftinder swipe (Free plan)' },
    { setting_key: 'KARMA_PER_SWIPE_STANDARD', setting_value: '2', description: 'Karma points awarded per Giftinder swipe (Standard plan)' },
    { setting_key: 'KARMA_PER_SWIPE_PRO', setting_value: '3', description: 'Karma points awarded per Giftinder swipe (Pro plan)' },
    { setting_key: 'KARMA_PER_SWIPE_ULTRA', setting_value: '4', description: 'Karma points awarded per Giftinder swipe (Ultra plan)' },
    { setting_key: 'KARMA_PER_SWIPE_BUSINESS', setting_value: '5', description: 'Karma points awarded per Giftinder swipe (Business plan)' }
];

export default function AdminSettings() {
    const { refreshSettings, plans } = useSettings();
    const [settings, setSettings] = useState<PlatformSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editableValues, setEditableValues] = useState<Record<string, string>>({});
    const { t } = useTranslation();

    // Manage local editable copies of plans
    const [editablePlans, setEditablePlans] = useState<Record<string, SubscriptionPlan>>({});

    useEffect(() => {
        fetchAndInitializeSettings();
    }, []);

    // Sync plans from context to local editable state when they load
    useEffect(() => {
        if (plans && plans.length > 0) {
            const planMap: Record<string, SubscriptionPlan> = {};
            plans.forEach(p => planMap[p.id] = { ...p });
            setEditablePlans(planMap);
        }
    }, [plans]);

    const fetchAndInitializeSettings = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('platform_settings').select('*');

        if (error) {
            console.error(t('adminSettings.errLoad'), error);
            setLoading(false);
            return;
        }

        const dbSettings = data || [];
        const missingSettings = DEFAULT_SETTINGS.filter(ds => !dbSettings.some(db => db.setting_key === ds.setting_key));

        if (missingSettings.length > 0) {
            // Upsert missing default settings into db
            const { data: inserted, error: insertError } = await supabase
                .from('platform_settings')
                .insert(missingSettings)
                .select('*');

            if (insertError) {
                console.error("Error inserting defaults:", insertError);
            } else if (inserted) {
                dbSettings.push(...inserted);
            }
        }

        const sortedSettings = [...dbSettings].sort((a, b) => a.setting_key.localeCompare(b.setting_key));
        setSettings(sortedSettings);

        const vals: Record<string, string> = {};
        sortedSettings.forEach(s => {
            vals[s.setting_key] = s.setting_value;
        });
        setEditableValues(vals);
        setLoading(false);
    };

    const handleValueChange = (key: string, value: string) => {
        setEditableValues(prev => ({ ...prev, [key]: value }));
    };

    const handlePlanChange = (planId: string, field: keyof SubscriptionPlan, value: any) => {
        setEditablePlans(prev => ({
            ...prev,
            [planId]: {
                ...prev[planId],
                [field]: value
            }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // 1. Save Platform Settings
            const updates = settings.map(setting => {
                const newValue = editableValues[setting.setting_key];
                if (newValue !== setting.setting_value) {
                    return supabase
                        .from('platform_settings')
                        .update({ setting_value: newValue })
                        .eq('setting_key', setting.setting_key);
                }
                return null;
            }).filter(Boolean);

            // 2. Save Subscription Plans
            const planUpdates = plans.map(originalPlan => {
                const editedPlan = editablePlans[originalPlan.id];
                if (!editedPlan) return null;

                // Compare to see if changes exist
                const isChanged =
                    editedPlan.name !== originalPlan.name ||
                    editedPlan.price !== originalPlan.price ||
                    editedPlan.price_annual !== originalPlan.price_annual ||
                    editedPlan.stripe_price_id !== originalPlan.stripe_price_id ||
                    editedPlan.stripe_price_id_annual !== originalPlan.stripe_price_id_annual ||
                    editedPlan.is_active !== originalPlan.is_active ||
                    JSON.stringify(editedPlan.features) !== JSON.stringify(originalPlan.features);

                if (isChanged) {
                    return supabase
                        .from('subscription_plans')
                        .update({
                            name: editedPlan.name,
                            price: editedPlan.price,
                            price_annual: editedPlan.price_annual,
                            stripe_price_id: editedPlan.stripe_price_id,
                            stripe_price_id_annual: editedPlan.stripe_price_id_annual,
                            is_active: editedPlan.is_active,
                            features: editedPlan.features
                        })
                        .eq('id', originalPlan.id);
                }
                return null;
            }).filter(Boolean);

            const allUpdates = [...updates, ...planUpdates];

            if (allUpdates.length > 0) {
                await Promise.all(allUpdates);
                alert(t('adminSettings.successSave'));
                await refreshSettings(); // Update the global context instantly
                await fetchAndInitializeSettings();
            } else {
                alert(t('adminSettings.noChanges'));
            }
        } catch (error) {
            console.error(error);
            alert(t('adminSettings.errSave'));
        } finally {
            setSaving(false);
        }
    };

    // Filter categories
    const globalSettings = settings.filter(s => 
        !s.setting_key.startsWith('LIMIT_AI') && 
        !s.setting_key.startsWith('MODEL_AI') && 
        !s.setting_key.startsWith('CONTACT_GIFTS_ENABLED') && 
        !s.setting_key.startsWith('CONTACT_GIFTS_MODEL') && 
        !s.setting_key.startsWith('LIMIT_CONTACTS') &&
        !s.setting_key.startsWith('KARMA_PER_SWIPE')
    );

    const renderSettingRow = (setting: PlatformSetting) => (
        <div key={setting.setting_key} className="p-5 sm:pl-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-50/50 dark:bg-slate-900/50 transition-colors">
            <div className="sm:w-1/2">
                <label className="flex flex-col">
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-sm tracking-tight">{setting.setting_key.replace(/_/g, ' ')}</span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{setting.description}</span>
                </label>
            </div>
            <div className="sm:w-1/2 flex items-center">
                <div className="relative w-full">
                    <SettingsIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input
                        type="text"
                        value={editableValues[setting.setting_key] !== undefined ? editableValues[setting.setting_key] : setting.setting_value}
                        onChange={(e) => handleValueChange(setting.setting_key, e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 rounded-xl border outline-none focus:bg-white dark:bg-slate-800 transition-colors text-sm font-semibold font-mono
                            ${editableValues[setting.setting_key] !== setting.setting_value ? 'border-accent/40 bg-accent/5 focus:border-accent text-accent' : 'border-slate-200 dark:border-slate-600 focus:border-slate-800 text-slate-700 dark:text-slate-200'}
                        `}
                    />
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-4xl pb-10">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm sticky top-4 z-10">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                        <SettingsIcon className="w-5 h-5 text-accent" />
                        {t('adminSettings.title')}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('adminSettings.subtitle')}</p>
                </div>

                <div className="flex space-x-3">
                    <button
                        onClick={fetchAndInitializeSettings}
                        disabled={saving || loading}
                        className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl font-semibold hover:bg-slate-100 dark:bg-slate-700 transition-colors disabled:opacity-70"
                    >
                        <RotateCcw className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('adminSettings.refresh')}</span>
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="flex items-center space-x-2 bg-slate-900 text-white px-6 py-2 rounded-xl font-semibold hover:bg-slate-800 transition-colors disabled:opacity-70 shadow-soft"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>{t('adminSettings.save')}</span>
                    </button>
                </div>
            </header>

            {/* Global Setting Section */}
            <section className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center space-x-2">
                    <Globe className="w-5 h-5 text-slate-400" />
                    <h3 className="font-bold text-slate-700 dark:text-slate-200">{t('adminSettings.globalTitle')}</h3>
                </div>
                <div>
                    {globalSettings.map(renderSettingRow)}
                </div>
            </section>

            {/* Subscription Plans Section */}
            <section className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center space-x-2">
                    <CreditCard className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-bold text-slate-700 dark:text-slate-200">{t('adminSettings.plansTitle')}</h3>
                </div>
                <div className="p-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {plans.map(plan => {
                        const edited = editablePlans[plan.id] || plan;
                        return (
                            <div key={plan.id} className={`border border-slate-200 dark:border-slate-600 rounded-2xl p-5 flex flex-col space-y-4 relative ${edited.is_active === false ? 'bg-slate-50 dark:bg-slate-900 opacity-75' : 'bg-white dark:bg-slate-800 shadow-sm'}`}>
                                {plan.is_popular && <span className="absolute -top-3 -right-3 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-full border-2 border-white shadow-sm uppercase">{t('adminSettings.popular')}</span>}

                                <div className="flex justify-between items-center bg-slate-100/50 dark:bg-slate-700/50 -mx-5 -mt-5 p-4 rounded-t-2xl mb-2 border-b border-slate-100 dark:border-slate-700">
                                    <label className="flex items-center space-x-3 cursor-pointer">
                                        <div className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${edited.is_active !== false ? 'bg-green-500' : 'bg-slate-300'}`}>
                                            <div className={`bg-white dark:bg-slate-800 w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${edited.is_active !== false ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={edited.is_active !== false}
                                            onChange={(e) => handlePlanChange(plan.id, 'is_active', e.target.checked)}
                                        />
                                        <span className={`text-sm font-bold ${edited.is_active !== false ? 'text-green-700' : 'text-slate-500 dark:text-slate-400'}`}>
                                            {edited.is_active !== false ? t('adminSettings.planActive') : t('adminSettings.planHidden')}
                                        </span>
                                    </label>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('adminSettings.planName')} ({plan.plan_key})</label>
                                    <input
                                        type="text"
                                        value={edited.name}
                                        onChange={(e) => handlePlanChange(plan.id, 'name', e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-accent focus:bg-white dark:bg-slate-800"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('adminSettings.priceMonthly')}</label>
                                    <input
                                        type="number"
                                        value={edited.price}
                                        onChange={(e) => handlePlanChange(plan.id, 'price', parseFloat(e.target.value))}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm font-bold text-rose-500 outline-none focus:border-accent focus:bg-white dark:bg-slate-800"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('adminSettings.priceAnnual')}</label>
                                    <input
                                        type="number"
                                        value={edited.price_annual || 0}
                                        onChange={(e) => handlePlanChange(plan.id, 'price_annual', parseFloat(e.target.value))}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm font-bold text-rose-500 outline-none focus:border-accent focus:bg-white dark:bg-slate-800"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('adminSettings.stripeIdMonthly')}</label>
                                    <input
                                        type="text"
                                        value={edited.stripe_price_id || ''}
                                        onChange={(e) => handlePlanChange(plan.id, 'stripe_price_id', e.target.value)}
                                        placeholder="price_..."
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-xs font-mono text-slate-600 dark:text-slate-300 outline-none focus:border-accent focus:bg-white dark:bg-slate-800"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('adminSettings.stripeIdAnnual')}</label>
                                    <input
                                        type="text"
                                        value={edited.stripe_price_id_annual || ''}
                                        onChange={(e) => handlePlanChange(plan.id, 'stripe_price_id_annual', e.target.value)}
                                        placeholder="price_..."
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-xs font-mono text-slate-600 dark:text-slate-300 outline-none focus:border-accent focus:bg-white dark:bg-slate-800"
                                    />
                                </div>

                                {/* Platform Settings for this Plan */}
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-blue-600 flex items-center gap-1"><Users className="w-3 h-3"/> {t('adminSettings.maxContacts')}</label>
                                        <input
                                            type="number"
                                            value={editableValues[`LIMIT_CONTACTS_${plan.plan_key}`] !== undefined ? editableValues[`LIMIT_CONTACTS_${plan.plan_key}`] : ''}
                                            onChange={(e) => handleValueChange(`LIMIT_CONTACTS_${plan.plan_key}`, e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 focus:bg-white dark:bg-slate-800"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-amber-600 flex items-center gap-1"><Zap className="w-3 h-3"/> {t('adminSettings.aiLimit')}</label>
                                        <input
                                            type="number"
                                            value={editableValues[`LIMIT_AI_${plan.plan_key}`] !== undefined ? editableValues[`LIMIT_AI_${plan.plan_key}`] : ''}
                                            onChange={(e) => handleValueChange(`LIMIT_AI_${plan.plan_key}`, e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-amber-500 focus:bg-white dark:bg-slate-800"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-rose-500 flex items-center gap-1">♥️ {t('adminSettings.karmaPerSwipe')}</label>
                                        <input
                                            type="number"
                                            value={editableValues[`KARMA_PER_SWIPE_${plan.plan_key}`] !== undefined ? editableValues[`KARMA_PER_SWIPE_${plan.plan_key}`] : ''}
                                            onChange={(e) => handleValueChange(`KARMA_PER_SWIPE_${plan.plan_key}`, e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm font-semibold text-rose-600 outline-none focus:border-rose-500 focus:bg-white dark:bg-slate-800"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-purple-600 flex items-center gap-1"><SettingsIcon className="w-3 h-3"/> {t('adminSettings.aiModel')}</label>
                                        <select
                                            value={editableValues[`MODEL_AI_${plan.plan_key}`] !== undefined ? editableValues[`MODEL_AI_${plan.plan_key}`] : 'llama'}
                                            onChange={(e) => handleValueChange(`MODEL_AI_${plan.plan_key}`, e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500 focus:bg-white dark:bg-slate-800"
                                        >
                                            <option value="llama">{t('adminSettings.modelLlama')}</option>
                                            <option value="openai">{t('adminSettings.modelOpenAI')}</option>
                                            <option value="gemini">{t('adminSettings.modelGemini')}</option>
                                        </select>
                                    </div>

                                    {/* Calendar Profile Gifts Settings */}
                                    <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-teal-600">{t('adminSettings.calendarAIOptions')}</span>
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <span className="text-xs font-bold text-slate-400">{t('adminSettings.enabled')}</span>
                                            <div className={`w-8 h-4 flex items-center rounded-full p-0.5 transition-colors duration-300 ${editableValues[`CONTACT_GIFTS_ENABLED_${plan.plan_key}`] === 'true' ? 'bg-teal-500' : 'bg-slate-300'}`}>
                                                <div className={`bg-white dark:bg-slate-800 w-3 h-3 rounded-full shadow-md transform transition-transform duration-300 ${editableValues[`CONTACT_GIFTS_ENABLED_${plan.plan_key}`] === 'true' ? 'translate-x-4' : 'translate-x-0'}`} />
                                            </div>
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={editableValues[`CONTACT_GIFTS_ENABLED_${plan.plan_key}`] === 'true'}
                                                onChange={(e) => handleValueChange(`CONTACT_GIFTS_ENABLED_${plan.plan_key}`, e.target.checked ? 'true' : 'false')}
                                            />
                                        </label>
                                    </div>
                                    <div className="space-y-1">
                                        <select
                                            value={editableValues[`CONTACT_GIFTS_MODEL_${plan.plan_key}`] !== undefined ? editableValues[`CONTACT_GIFTS_MODEL_${plan.plan_key}`] : 'gemini'}
                                            onChange={(e) => handleValueChange(`CONTACT_GIFTS_MODEL_${plan.plan_key}`, e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-teal-500 focus:bg-white dark:bg-slate-800"
                                        >
                                            <option value="llama">{t('adminSettings.modelLlama')}</option>
                                            <option value="openai">{t('adminSettings.modelOpenAI')}</option>
                                            <option value="gemini">{t('adminSettings.modelGemini')}</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1 flex-1 pt-4 border-t border-slate-100 dark:border-slate-700">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('adminSettings.features')}</label>
                                    <textarea
                                        value={edited.features.join('\n')}
                                        onChange={(e) => handlePlanChange(plan.id, 'features', e.target.value.split('\n').filter(f => f.trim() !== ''))}
                                        rows={4}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-200 outline-none focus:border-accent focus:bg-white dark:bg-slate-800 resize-none"
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </section>
        </div>
    );
}
