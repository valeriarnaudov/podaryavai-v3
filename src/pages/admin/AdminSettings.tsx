import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Save, Settings, AlertCircle } from 'lucide-react';

interface PlatformSetting {
    id: string;
    setting_key: string;
    setting_value: string;
    description: string;
}

export default function AdminSettings() {
    const [settings, setSettings] = useState<PlatformSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editableValues, setEditableValues] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('platform_settings')
            .select('*')
            .order('setting_key');

        if (!error && data) {
            setSettings(data);
            const vals: Record<string, string> = {};
            data.forEach(s => {
                vals[s.setting_key] = s.setting_value;
            });
            setEditableValues(vals);
        } else if (error) {
            console.error("Settings error:", error);
        }
        setLoading(false);
    };

    const handleValueChange = (key: string, value: string) => {
        setEditableValues(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Update all settings that changed
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

            if (updates.length > 0) {
                await Promise.all(updates);
                alert('Settings saved successfully!');
                await fetchSettings();
            } else {
                alert('No changes to save.');
            }
        } catch (error) {
            console.error(error);
            alert('Error saving settings.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-3xl">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Platform Settings</h2>
                    <p className="text-sm text-slate-500">Configure global app parameters & economy</p>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving || loading}
                    className="flex items-center space-x-2 bg-slate-900 text-white px-6 py-2 rounded-xl font-semibold hover:bg-slate-800 transition-colors disabled:opacity-70 shadow-soft"
                >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    <span>Save Changes</span>
                </button>
            </header>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
                </div>
            ) : settings.length === 0 ? (
                <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100 flex items-start space-x-4">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 text-amber-500">
                        <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-amber-800 md:text-lg">No settings found in DB</h3>
                        <p className="text-amber-700/80 mt-1 text-sm md:text-base">
                            The `platform_settings` table might be empty. Please ensure the SQL payload was executed and default settings inserted.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-3xl shadow-soft border border-slate-100 divide-y divide-slate-100">
                    {settings.map((setting) => (
                        <div key={setting.id} className="p-6 sm:pl-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="sm:w-1/2">
                                <label className="flex flex-col">
                                    <span className="font-bold text-slate-800 text-sm">{setting.setting_key.replace(/_/g, ' ').toUpperCase()}</span>
                                    <span className="text-xs font-medium text-slate-500 mt-0.5">{setting.description}</span>
                                </label>
                            </div>
                            <div className="sm:w-1/2 flex items-center">
                                <div className="relative w-full">
                                    <Settings className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                    <input
                                        type="text"
                                        value={editableValues[setting.setting_key] !== undefined ? editableValues[setting.setting_key] : setting.setting_value}
                                        onChange={(e) => handleValueChange(setting.setting_key, e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-slate-800 focus:bg-white transition-colors text-sm font-semibold text-slate-700 font-mono"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
