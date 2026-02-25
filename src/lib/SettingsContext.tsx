import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

export interface PlatformSettings {
    MAINTENANCE_MODE: string;
    REFERRAL_REWARD_BASE: string;
    REFERRAL_REWARD_BOOSTED: string;

    LIMIT_AI_FREE: string;
    MODEL_AI_FREE: string;

    LIMIT_AI_STANDARD: string;
    MODEL_AI_STANDARD: string;

    LIMIT_AI_PRO: string;
    MODEL_AI_PRO: string;

    LIMIT_AI_ULTRA: string;
    MODEL_AI_ULTRA: string;

    LIMIT_AI_BUSINESS: string;
    MODEL_AI_BUSINESS: string;

    LIMIT_CONTACTS_FREE: string;
    LIMIT_CONTACTS_STANDARD: string;
    LIMIT_CONTACTS_PRO: string;
    LIMIT_CONTACTS_ULTRA: string;
    LIMIT_CONTACTS_BUSINESS: string;

    [key: string]: string; // Fallback for dynamic keys
}

// Default fallback settings in case DB is completely empty and hasn't seeded yet
const defaultSettings: PlatformSettings = {
    MAINTENANCE_MODE: 'false',
    REFERRAL_REWARD_BASE: '50',
    REFERRAL_REWARD_BOOSTED: '100',
    LIMIT_AI_FREE: '1',
    MODEL_AI_FREE: 'llama',
    LIMIT_AI_STANDARD: '10',
    MODEL_AI_STANDARD: 'llama',
    LIMIT_AI_PRO: '30',
    MODEL_AI_PRO: 'openai',
    LIMIT_AI_ULTRA: '100',
    MODEL_AI_ULTRA: 'openai',
    LIMIT_AI_BUSINESS: '-1',
    MODEL_AI_BUSINESS: 'openai',
    LIMIT_CONTACTS_FREE: '2',
    LIMIT_CONTACTS_STANDARD: '10',
    LIMIT_CONTACTS_PRO: '50',
    LIMIT_CONTACTS_ULTRA: '200',
    LIMIT_CONTACTS_BUSINESS: '-1'
};

export interface PlatformSetting {
    setting_key: string;
    setting_value: string;
    description: string;
    updated_at: string;
}

export interface SubscriptionPlan {
    id: string;
    plan_key: string;
    name: string;
    price: number;
    price_annual: number;
    stripe_price_id: string | null;
    stripe_price_id_annual: string | null;
    features: string[];
    is_popular: boolean;
    is_active: boolean;
}

interface SettingsContextType {
    settings: PlatformSettings;
    plans: SubscriptionPlan[];
    loading: boolean;
    refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType>({
    settings: defaultSettings,
    plans: [],
    loading: true,
    refreshSettings: async () => { },
});

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
    const [settings, setSettings] = useState<PlatformSettings>(defaultSettings);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);

    const refreshSettings = async () => {
        setLoading(true);
        try {
            // Fetch platform settings and subscription plans in parallel
            const [settingsRes, plansRes] = await Promise.all([
                supabase.from('platform_settings').select('setting_key, setting_value'),
                supabase.from('subscription_plans').select('*').order('price', { ascending: true })
            ]);

            if (settingsRes.error) {
                console.error("Failed to fetch platform settings:", settingsRes.error);
            } else if (settingsRes.data && settingsRes.data.length > 0) {
                const newSettings = { ...defaultSettings };
                settingsRes.data.forEach(item => {
                    newSettings[item.setting_key as keyof PlatformSettings] = item.setting_value;
                });
                setSettings(newSettings);
            }

            if (plansRes.error) {
                console.error("Failed to fetch subscription plans:", plansRes.error);
            } else if (plansRes.data) {
                setPlans(plansRes.data);
            }
        } catch (err) {
            console.error("Error reading platform settings:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshSettings();
    }, []);

    return (
        <SettingsContext.Provider value={{ settings, plans, loading, refreshSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);
