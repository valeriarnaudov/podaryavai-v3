import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Crown, Sparkles, Infinity as InfinityIcon, Truck, Check, Loader2 } from 'lucide-react';
import { useSettings, SubscriptionPlan } from '../lib/SettingsContext';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';

export default function CheckoutCancel() {
    const navigate = useNavigate();
    const { plans, loading: plansLoading } = useSettings();
    const { user, subscriptionPlan } = useAuth();
    const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [isAnnual, setIsAnnual] = useState(false);

    const handleSelectPlan = async (plan: SubscriptionPlan) => {
        if (!user) {
            navigate(`/login?returnTo=/checkout-cancel`);
            return;
        }

        if (subscriptionPlan === plan.plan_key) {
            return;
        }

        if (plan.price === 0) {
            navigate('/');
            return;
        }

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
                    throw new Error(responseData.error || 'Failed to initialize Stripe Checkout session.');
                }

                if (responseData?.url) {
                    window.location.href = responseData.url;
                }
            } catch (err: any) {
                console.error("Checkout error:", err);
                setCheckoutError(err.message || 'Error connecting to payment provider.');
            } finally {
                setCheckoutLoading(null);
            }
        } else {
            setCheckoutError('This plan is not fully configured for payments yet.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 relative pb-20 pt-12 flex flex-col items-center">
            
            {/* Warning / Retention Hero */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-xl w-full bg-white rounded-[2rem] p-8 md:p-12 shadow-xl border border-slate-100 text-center relative overflow-hidden mb-16 mx-6"
            >
                {/* Decorative background blob */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-pink-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

                <div className="w-20 h-20 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner relative z-10">
                    <AlertTriangle className="w-10 h-10" />
                </div>

                <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-4 relative z-10">
                    Upgrade Cancelled
                </h1>
                
                <p className="text-slate-500 text-lg mb-8 leading-relaxed relative z-10">
                    You're missing out on the ultimate personalized gifting experience! 
                    Upgrading your account unlocks the true power of our AI concierge.
                </p>

                {/* Benefits List */}
                <div className="text-left space-y-4 mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-100 relative z-10">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                        <Crown className="w-5 h-5 mr-2 text-accent" /> Why You Should Reconsider
                    </h3>
                    <div className="flex items-start">
                        <Sparkles className="w-5 h-5 text-purple-500 mr-3 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-slate-800 text-sm">Premium AI Engine (GPT-4o)</p>
                            <p className="text-xs text-slate-500">Get significantly smarter, highly-tailored gift suggestions instead of basic ones.</p>
                        </div>
                    </div>
                    <div className="flex items-start">
                        <InfinityIcon className="w-5 h-5 text-blue-500 mr-3 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-slate-800 text-sm">Unlimited Swipes & Saves</p>
                            <p className="text-xs text-slate-500">Don't hit daily limits. Generate up to 100 ideas per day and save them forever.</p>
                        </div>
                    </div>
                    <div className="flex items-start">
                        <Truck className="w-5 h-5 text-green-500 mr-3 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-slate-800 text-sm">Free Concierge Delivery</p>
                            <p className="text-xs text-slate-500">Let us buy, wrap, and deliver the gift for you completely free of charge.</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => navigate('/')}
                    className="w-full py-4 bg-red-50 text-red-600 font-bold hover:bg-red-100 hover:text-red-700 rounded-xl transition-all relative z-10 border border-red-100 shadow-sm"
                >
                    I'm sure, continue to homepage
                </button>
            </motion.div>

            {/* Pricing Grid */}
            <div className="w-full max-w-7xl px-6 flex flex-col items-center">
                <h2 className="text-2xl font-black text-slate-800 mb-8 text-center">Give it another try</h2>
                
                {/* Billing Toggle */}
                <div className="mb-10 bg-white p-1 rounded-full border border-slate-200 flex items-center shadow-sm">
                    <button 
                        onClick={() => setIsAnnual(false)}
                        className={`px-6 sm:px-8 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${!isAnnual ? 'bg-accent text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 bg-transparent'}`}
                    >
                        Billed Monthly
                    </button>
                    <button 
                        onClick={() => setIsAnnual(true)}
                        className={`px-6 sm:px-8 py-2.5 rounded-full text-sm font-bold transition-all duration-300 flex items-center ${isAnnual ? 'bg-accent text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 bg-transparent'}`}
                    >
                        Billed Annually <span className={`${isAnnual ? 'bg-white text-accent' : 'bg-green-100 text-green-700'} text-[10px] uppercase ml-2 px-2 py-0.5 rounded-full font-black animate-pulse whitespace-nowrap`}>Pay 9 months, get 12</span>
                    </button>
                </div>

                {checkoutError && (
                    <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-xl max-w-2xl text-center font-medium border border-red-100 shadow-sm w-full">
                        {checkoutError}
                    </div>
                )}
                
                {plansLoading ? (
                    <div className="flex justify-center items-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-accent" />
                    </div>
                ) : (
                    <div className="flex flex-wrap justify-center gap-6 w-full">
                        {plans.filter(plan => plan.is_active !== false).map((plan, index) => {
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
                                            Most Popular
                                        </div>
                                    )}

                                    <h3 className="text-xl font-bold text-slate-800 mb-2">{plan.name}</h3>
                                    
                                    <div className="flex flex-col mb-6 min-h-[5rem] justify-center">
                                        {isAnnual && plan.price > 0 && standardAnnualPrice > 0 && plan.price_annual > 0 && (
                                            <div className="text-slate-400 font-medium line-through text-sm mb-1">
                                                €{standardAnnualPrice.toFixed(2)}/yr
                                            </div>
                                        )}
                                        <div className="flex items-baseline">
                                            <span className="text-4xl font-black text-slate-900">€{displayPrice}</span>
                                            {plan.price > 0 && <span className="text-slate-500 ml-2 font-medium">{isAnnual ? '/yr' : '/mo'}</span>}
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
                )}
            </div>
        </div>
    );
}
