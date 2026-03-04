import { useState } from 'react';
import { motion } from 'framer-motion';
import { useSettings, SubscriptionPlan } from '../lib/SettingsContext';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { Check, Crown, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Upgrade() {
    const { plans, loading: plansLoading } = useSettings();
    const { user, subscriptionPlan } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [isAnnual, setIsAnnual] = useState(false);

    // Filter out inactive plans
    const displayPlans = plans.filter(plan => plan.is_active !== false);

    const handleSelectPlan = async (plan: SubscriptionPlan) => {
        if (!user) {
            // Unauthenticated users click 'Upgrade' -> send to login with intent
            navigate(`/login?returnTo=/upgrade`);
            return;
        }

        if (subscriptionPlan === plan.plan_key) {
            return; // Already on this plan
        }

        if (plan.price === 0) {
            // Free plan logic if they are downgrading? Often handled via customer portal
            alert(t('upgrade.managePortal'));
            return;
        }

        // Paid plan Checkout Flow
        if (plan.stripe_price_id) {
            setCheckoutLoading(plan.id);
            setCheckoutError(null);
            try {
                const { data: sessionData } = await supabase.auth.getSession();
                const token = sessionData.session?.access_token;
                
                const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create_subscription_session`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ planId: plan.id, interval: isAnnual && plan.price > 0 ? 'annual' : 'monthly' })
                });

                const responseData = await response.json();

                if (!response.ok) {
                    console.error("Full Stripe Error:", responseData);
                    throw new Error(responseData.error || JSON.stringify(responseData));
                }

                if (responseData?.url) {
                    window.location.href = responseData.url; // Redirect to Stripe
                }
            } catch (err: any) {
                console.error("Checkout error:", err);
                setCheckoutError(err.message || t('upgrade.failedStripe'));
            } finally {
                setCheckoutLoading(null);
            }
        } else {
            setCheckoutError(t('upgrade.notConfigured'));
        }
    };

    if (plansLoading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-accent animate-spin mb-4" />
                <p className="text-slate-500 font-medium">{t('upgrade.loadingPlans')}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 relative pb-20">
            {/* Header / Nav */}
            <header className="absolute top-0 w-full p-4 sm:p-6 flex items-center justify-between z-10">
                <button
                    onClick={() => navigate(-1)}
                    className="p-3 bg-white hover:bg-slate-100 rounded-full shadow-sm text-slate-700 transition"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                {user && (
                    <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100 flex items-center space-x-2">
                        <span className="text-xs text-slate-500">{t('upgrade.currentPlan')}</span>
                        <span className="text-sm font-bold text-accent uppercase tracking-wider">{subscriptionPlan}</span>
                    </div>
                )}
            </header>

            {/* Hero */}
            <section className="pt-24 pb-12 px-6 flex flex-col items-center text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-16 h-16 bg-gradient-to-tr from-accent to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-accent/20 mb-6"
                >
                    <Crown className="w-8 h-8 text-white" />
                </motion.div>
                <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-4"
                >
                    {t('upgrade.title')}
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-slate-500 text-lg max-w-md"
                >
                    {t('upgrade.subtitle')}
                </motion.p>
            </section>

            {/* Pricing Grid */}
            <section className="px-6 max-w-7xl mx-auto flex flex-col items-center">
                {/* Billing Toggle */}
                <div className="mb-10 bg-white p-1 rounded-full border border-slate-200 flex items-center shadow-sm">
                    <button 
                        onClick={() => setIsAnnual(false)}
                        className={`px-6 sm:px-8 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${!isAnnual ? 'bg-accent text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 bg-transparent'}`}
                    >
                        {t('upgrade.billedMonthly')}
                    </button>
                    <button 
                        onClick={() => setIsAnnual(true)}
                        className={`px-6 sm:px-8 py-2.5 rounded-full text-sm font-bold transition-all duration-300 flex items-center ${isAnnual ? 'bg-accent text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 bg-transparent'}`}
                    >
                        {t('upgrade.billedAnnually')} <span className={`${isAnnual ? 'bg-white text-accent' : 'bg-green-100 text-green-700'} text-[10px] uppercase ml-2 px-2 py-0.5 rounded-full font-black animate-pulse whitespace-nowrap`}>{t('upgrade.pay9get12')}</span>
                    </button>
                </div>

                {checkoutError && (
                    <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-xl max-w-2xl text-center font-medium border border-red-100 shadow-sm transition-all">
                        {checkoutError}
                    </div>
                )}
                <div className="flex flex-wrap justify-center gap-6 w-full">
                    {displayPlans.map((plan, index) => {
                        const isCurrentPlan = user && subscriptionPlan === plan.plan_key;
                        const isPopular = plan.is_popular === true;
                        
                        // Calculate display prices
                        const standardAnnualPrice = plan.price * 12;
                        const displayPrice = (isAnnual && plan.price > 0) ? plan.price_annual || standardAnnualPrice : plan.price;

                        return (
                            <motion.div
                                key={plan.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * index }}
                                className={`relative w-full md:w-80 bg-white rounded-[2rem] p-8 flex flex-col ${isPopular ? 'ring-2 ring-accent shadow-xl shadow-accent/10 transform md:-translate-y-4' : 'border border-slate-100 shadow-sm'}`}
                            >
                                {isPopular === true && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-accent text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-md">
                                        {t('upgrade.mostPopular')}
                                    </div>
                                )}

                                <h3 className="text-xl font-bold text-slate-800 mb-2">{plan.name}</h3>
                                
                                <div className="flex flex-col mb-6 min-h-[5rem] justify-center">
                                    {isAnnual && plan.price > 0 && standardAnnualPrice > 0 && plan.price_annual > 0 && (
                                        <div className="text-slate-400 font-medium line-through text-sm mb-1">
                                            €{standardAnnualPrice.toFixed(2)}{t('upgrade.perYear')}
                                        </div>
                                    )}
                                    <div className="flex items-baseline">
                                        <span className="text-4xl font-black text-slate-900">€{displayPrice}</span>
                                        {plan.price > 0 && <span className="text-slate-500 ml-2 font-medium">{isAnnual ? t('upgrade.perYear') : t('upgrade.perMonth')}</span>}
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleSelectPlan(plan)}
                                    disabled={isCurrentPlan || checkoutLoading === plan.id}
                                    className={`w-full py-4 rounded-xl flex items-center justify-center font-bold transition-all ${isCurrentPlan
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        : 'bg-accent text-white hover:bg-pink-600 shadow-lg shadow-accent/30 hover:shadow-xl hover:shadow-accent/40 disabled:opacity-70'
                                        }`}
                                >
                                    {checkoutLoading === plan.id ? <Loader2 className="w-5 h-5 animate-spin" /> :
                                        isCurrentPlan ? t('upgrade.btnCurrent') :
                                            plan.price === 0 ? t('upgrade.btnFree') : t('upgrade.btnUpgrade')
                                    }
                                </button>

                                <div className="mt-8 space-y-4 flex-1">
                                    {plan.features.map((feature, i) => (
                                        <div key={i} className="flex items-start">
                                            <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5 mr-3">
                                                <Check className="w-3 h-3 text-green-600" />
                                            </div>
                                            <span className="text-sm font-medium text-slate-600 leading-tight">{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
