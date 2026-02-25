import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Save, Settings as SettingsIcon, Globe, Zap, RotateCcw, CreditCard } from 'lucide-react';
import { useSettings, SubscriptionPlan } from '../../lib/SettingsContext';

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

    // AI Models per plan ('llama' or 'openai')
    { setting_key: 'MODEL_AI_FREE', setting_value: 'llama', description: 'AI Model for Free plan ("llama" or "openai")' },
    { setting_key: 'MODEL_AI_STANDARD', setting_value: 'llama', description: 'AI Model for Standard plan ("llama" or "openai")' },
    { setting_key: 'MODEL_AI_PRO', setting_value: 'openai', description: 'AI Model for Pro plan ("llama" or "openai")' },
    { setting_key: 'MODEL_AI_ULTRA', setting_value: 'openai', description: 'AI Model for Ultra plan ("llama" or "openai")' },
    { setting_key: 'MODEL_AI_BUSINESS', setting_value: 'openai', description: 'AI Model for Business plan ("llama" or "openai")' }
];

export default function AdminSettings() {
    const { refreshSettings, plans } = useSettings();
    const [settings, setSettings] = useState<PlatformSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editableValues, setEditableValues] = useState<Record<string, string>>({});

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
            console.error("Settings error:", error);
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
                    editedPlan.stripe_price_id !== originalPlan.stripe_price_id ||
                    JSON.stringify(editedPlan.features) !== JSON.stringify(originalPlan.features);

                if (isChanged) {
                    return supabase
                        .from('subscription_plans')
                        .update({
                            name: editedPlan.name,
                            price: editedPlan.price,
                            stripe_price_id: editedPlan.stripe_price_id,
                            features: editedPlan.features
                        })
                        .eq('id', originalPlan.id);
                }
                return null;
            }).filter(Boolean);

            const allUpdates = [...updates, ...planUpdates];

            if (allUpdates.length > 0) {
                await Promise.all(allUpdates);
                alert('Settings and Plans saved successfully!');
                await refreshSettings(); // Update the global context instantly
                await fetchAndInitializeSettings();
            } else {
                alert('No changes to save.');
            }
        } catch (error) {
            console.error(error);
            alert('Error saving data.');
        } finally {
            setSaving(false);
        }
    };

    // Filter categories
    const globalSettings = settings.filter(s => !s.setting_key.startsWith('LIMIT_AI') && !s.setting_key.startsWith('MODEL_AI'));
    const limitsSettings = settings.filter(s => s.setting_key.startsWith('LIMIT_AI'));
    const modelsSettings = settings.filter(s => s.setting_key.startsWith('MODEL_AI'));

    const renderSettingRow = (setting: PlatformSetting) => (
        <div key={setting.setting_key} className="p-5 sm:pl-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
            <div className="sm:w-1/2">
                <label className="flex flex-col">
                    <span className="font-bold text-slate-800 text-sm tracking-tight">{setting.setting_key.replace(/_/g, ' ')}</span>
                    <span className="text-xs font-medium text-slate-500 mt-0.5">{setting.description}</span>
                </label>
            </div>
            <div className="sm:w-1/2 flex items-center">
                <div className="relative w-full">
                    <SettingsIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input
                        type="text"
                        value={editableValues[setting.setting_key] !== undefined ? editableValues[setting.setting_key] : setting.setting_value}
                        onChange={(e) => handleValueChange(setting.setting_key, e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border outline-none focus:bg-white transition-colors text-sm font-semibold font-mono
                            ${editableValues[setting.setting_key] !== setting.setting_value ? 'border-accent/40 bg-accent/5 focus:border-accent text-accent' : 'border-slate-200 focus:border-slate-800 text-slate-700'}
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
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm sticky top-4 z-10">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <SettingsIcon className="w-5 h-5 text-accent" />
                        Platform Engine
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Configure global parameters, AI limits, and plan capabilities.</p>
                </div>

                <div className="flex space-x-3">
                    <button
                        onClick={fetchAndInitializeSettings}
                        disabled={saving || loading}
                        className="flex items-center space-x-2 bg-slate-50 text-slate-600 px-4 py-2 rounded-xl font-semibold hover:bg-slate-100 transition-colors disabled:opacity-70"
                    >
                        <RotateCcw className="w-4 h-4" />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="flex items-center space-x-2 bg-slate-900 text-white px-6 py-2 rounded-xl font-semibold hover:bg-slate-800 transition-colors disabled:opacity-70 shadow-soft"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>Save Changes</span>
                    </button>
                </div>
            </header>

            {/* Global Setting Section */}
            <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center space-x-2">
                    <Globe className="w-5 h-5 text-slate-400" />
                    <h3 className="font-bold text-slate-700">Global Settings</h3>
                </div>
                <div>
                    {globalSettings.map(renderSettingRow)}
                </div>
            </section>

            {/* Plans Limits Section */}
            <div className="grid md:grid-cols-2 gap-8">
                <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center space-x-2">
                        <Zap className="w-5 h-5 text-amber-500" />
                        <h3 className="font-bold text-slate-700">Daily Generative Limits</h3>
                    </div>
                    <div>
                        {limitsSettings.map(renderSettingRow)}
                    </div>
                </section>

                <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center space-x-2">
                        <SettingsIcon className="w-5 h-5 text-purple-500" />
                        <h3 className="font-bold text-slate-700">AI Model Routing</h3>
                    </div>
                    <div>
                        {modelsSettings.map(renderSettingRow)}
                    </div>
                </section>
            </div>

            {/* Subscription Plans Section */}
            <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center space-x-2">
                    <CreditCard className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-bold text-slate-700">Subscription Plans & Pricing</h3>
                </div>
                <div className="p-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {plans.map(plan => {
                        const edited = editablePlans[plan.id] || plan;
                        return (
                            <div key={plan.id} className="border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col space-y-4 relative">
                                {plan.is_popular && <span className="absolute -top-3 -right-3 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-full border-2 border-white shadow-sm uppercase">Popular</span>}

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Plan Name ({plan.plan_key})</label>
                                    <input
                                        type="text"
                                        value={edited.name}
                                        onChange={(e) => handlePlanChange(plan.id, 'name', e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-accent focus:bg-white"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Price (EUR/Month)</label>
                                    <input
                                        type="number"
                                        value={edited.price}
                                        onChange={(e) => handlePlanChange(plan.id, 'price', parseFloat(e.target.value))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-rose-500 outline-none focus:border-accent focus:bg-white"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stripe Price ID</label>
                                    <input
                                        type="text"
                                        value={edited.stripe_price_id || ''}
                                        onChange={(e) => handlePlanChange(plan.id, 'stripe_price_id', e.target.value)}
                                        placeholder="price_..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-600 outline-none focus:border-accent focus:bg-white"
                                    />
                                </div>

                                <div className="space-y-1 flex-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Features (1 per line)</label>
                                    <textarea
                                        value={edited.features.join('\n')}
                                        onChange={(e) => handlePlanChange(plan.id, 'features', e.target.value.split('\n').filter(f => f.trim() !== ''))}
                                        rows={4}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none focus:border-accent focus:bg-white resize-none"
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
