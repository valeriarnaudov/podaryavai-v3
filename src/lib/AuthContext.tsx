import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    isAdmin: boolean;
    karmaPoints: number;
    hasGoldenAura: boolean;
    freeDeliveriesCount: number;
    hasVipGiftinder: boolean;
    karmaBoostUntil: string | null;
    lastGiftinderGeneration: string | null;
    dailyGenerationsCount: number;
    subscriptionPlan: 'FREE' | 'STANDARD' | 'PRO' | 'ULTRA' | 'BUSINESS';
    refreshUserData: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    isAdmin: false,
    karmaPoints: 0,
    hasGoldenAura: false,
    freeDeliveriesCount: 0,
    hasVipGiftinder: false,
    karmaBoostUntil: null,
    lastGiftinderGeneration: null,
    dailyGenerationsCount: 0,
    subscriptionPlan: 'FREE',
    refreshUserData: async () => { },
    signOut: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [karmaPoints, setKarmaPoints] = useState(0);
    const [hasGoldenAura, setHasGoldenAura] = useState(false);
    const [freeDeliveriesCount, setFreeDeliveriesCount] = useState(0);
    const [hasVipGiftinder, setHasVipGiftinder] = useState(false);
    const [karmaBoostUntil, setKarmaBoostUntil] = useState<string | null>(null);
    const [lastGiftinderGeneration, setLastGiftinderGeneration] = useState<string | null>(null);
    const [dailyGenerationsCount, setDailyGenerationsCount] = useState(0);
    const [subscriptionPlan, setSubscriptionPlan] = useState<'FREE' | 'STANDARD' | 'PRO' | 'ULTRA' | 'BUSINESS'>('FREE');

    const checkUserData = async (userId: string, isMounted: boolean = true) => {
        if (!userId) {
            if (isMounted) {
                setIsAdmin(false);
                setKarmaPoints(0);
                setHasGoldenAura(false);
                setFreeDeliveriesCount(0);
                setHasVipGiftinder(false);
                setKarmaBoostUntil(null);
                setDailyGenerationsCount(0);
            }
            return;
        }

        try {
            const { data, error } = await supabase.from('users').select('is_admin, karma_points, has_golden_aura, free_deliveries_count, has_vip_giftinder, karma_boost_until, subscription_plan, last_giftinder_generation, daily_generations_count').eq('id', userId).maybeSingle();
            if (error) console.warn("Could not fetch user data:", error);

            if (isMounted) {
                setIsAdmin(true === data?.is_admin);
                setKarmaPoints(data?.karma_points || 0);
                setHasGoldenAura(true === data?.has_golden_aura);
                setFreeDeliveriesCount(data?.free_deliveries_count || 0);
                setHasVipGiftinder(true === data?.has_vip_giftinder);
                setKarmaBoostUntil(data?.karma_boost_until || null);
                setSubscriptionPlan(data?.subscription_plan as any || 'FREE');
                setLastGiftinderGeneration(data?.last_giftinder_generation || null);
                setDailyGenerationsCount(data?.daily_generations_count || 0);
            }
        } catch (err) {
            console.error("Error fetching user data", err);
            if (isMounted) {
                setIsAdmin(false);
                setKarmaPoints(0);
                setHasGoldenAura(false);
                setFreeDeliveriesCount(0);
                setHasVipGiftinder(false);
                setKarmaBoostUntil(null);
                setSubscriptionPlan('FREE');
                setLastGiftinderGeneration(null);
                setDailyGenerationsCount(0);
            }
        }
    };

    const refreshUserData = async () => {
        if (user?.id) {
            await checkUserData(user.id);
        }
    };

    useEffect(() => {
        let mounted = true;

        const initializeAuth = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                if (mounted) {
                    setSession(session);
                    setUser(session?.user ?? null);
                    if (session?.user) {
                        await checkUserData(session.user.id, mounted);
                    } else {
                        await checkUserData('', mounted);
                    }
                }
            } catch (error) {
                console.error("Error getting session:", error);
                if (mounted) await checkUserData('', mounted);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (mounted) {
                setSession(session);
                setUser(session?.user ?? null);

                // Do not 'await' this to prevent Supabase lock deadlocks
                if (session?.user) {
                    checkUserData(session.user.id, mounted);
                } else {
                    checkUserData('', mounted);
                }
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{
            user, session, loading, isAdmin, karmaPoints,
            hasGoldenAura, freeDeliveriesCount, hasVipGiftinder, karmaBoostUntil,
            lastGiftinderGeneration, dailyGenerationsCount, subscriptionPlan,
            refreshUserData, signOut
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
