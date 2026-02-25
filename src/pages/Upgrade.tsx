import { useState } from 'react';
import { motion } from 'framer-motion';
import { useSettings, SubscriptionPlan } from '../lib/SettingsContext';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { Check, Crown, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Upgrade() {
    const { plans, loading: plansLoading } = useSettings();
    const { user, subscriptionPlan } = useAuth();
    const navigate = useNavigate();
    const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);

    // Filter out internal hidden plans if necessary, but here we just show all
    const displayPlans = plans;

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
            alert('To manage your subscription or downgrade, please visit the billing portal.');
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
                    body: JSON.stringify({ planId: plan.id })
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
                setCheckoutError(err.message || 'Failed to initialize Stripe Checkout session.');
            } finally {
                setCheckoutLoading(null);
            }
        } else {
            setCheckoutError('This plan is not fully configured for payments yet.');
        }
    };

    if (plansLoading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-accent animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Loading subscription plans...</p>
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
                        <span className="text-xs text-slate-500">Current Plan:</span>
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
                    Elevate Your Gifting
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-slate-500 text-lg max-w-md"
                >
                    Choose the perfect engine power. Generate more tailored ideas, access premium AI, and unlock concierge perks.
                </motion.p>
            </section>

            {/* Pricing Grid */}
            <section className="px-6 max-w-7xl mx-auto flex flex-col items-center">
                {checkoutError && (
                    <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-xl max-w-2xl text-center font-medium border border-red-100 shadow-sm transition-all">
                        {checkoutError}
                    </div>
                )}
                <div className="flex flex-wrap justify-center gap-6 w-full">
                    {displayPlans.map((plan, index) => {
                        const isCurrentPlan = user && subscriptionPlan === plan.plan_key;
                        const isPopular = plan.is_popular === true;

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
                                        Most Popular
                                    </div>
                                )}

                                <h3 className="text-xl font-bold text-slate-800 mb-2">{plan.name}</h3>
                                <div className="flex items-baseline mb-6">
                                    <span className="text-4xl font-black text-slate-900">€{plan.price}</span>
                                    {plan.price > 0 && <span className="text-slate-500 ml-2 font-medium">/mo</span>}
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
                                        isCurrentPlan ? 'Current Plan' :
                                            plan.price === 0 ? 'Start Free' : 'Upgrade Now'
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
