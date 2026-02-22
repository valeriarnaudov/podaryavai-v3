import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, CreditCard, Truck, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

export default function Checkout() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const { freeDeliveriesCount } = useAuth();

    // Hardcoded for demo purposes. In a real app this comes via state/context for the selected Concierge Order.
    const baseOrderDetails = {
        id: 'demo-order-123',
        title: 'Sony WH-1000XM5 Headphones',
        price: 350.00,
        base_delivery_fee: 5.90,
    };

    const hasFreeDelivery = freeDeliveriesCount > 0;
    const deliveryFee = hasFreeDelivery ? 0 : baseOrderDetails.base_delivery_fee;
    const total = baseOrderDetails.price + deliveryFee;

    const handleStripeCheckout = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('create_checkout_session', {
                body: {
                    title: baseOrderDetails.title,
                    price: total,
                    orderId: baseOrderDetails.id
                }
            });

            if (error) throw error;

            if (data?.url) {
                window.location.href = data.url; // Redirect to Stripe
            }
        } catch (err) {
            console.error('Checkout error:', err);
            alert('Failed to initialize checkout.');
            setLoading(false);
        }
    };

    return (
        <div className="bg-background min-h-[100dvh] pb-safe sm:h-[90dvh]">
            <header className="bg-white/80 backdrop-blur-lg sticky top-0 z-10 px-6 py-4 flex items-center border-b border-slate-100 shadow-sm">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 mr-4"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-lg font-bold text-textMain">Concierge Checkout</h1>
            </header>

            <main className="p-6 pb-32">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 rounded-3xl shadow-soft border border-slate-100/50 mb-6"
                >
                    <h2 className="font-bold text-textMain mb-4 border-b border-slate-100 pb-4">Order Summary</h2>

                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Item</span>
                            <span className="font-medium text-textMain text-right max-w-[60%]">{baseOrderDetails.title}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Price</span>
                            <span className="font-medium text-textMain">€{baseOrderDetails.price.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center group relative">
                            <span className="text-slate-500 flex items-center">
                                Concierge Delivery
                                {hasFreeDelivery && <span className="ml-2 text-[10px] font-bold bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full uppercase tracking-wider">Free (Karma)</span>}
                            </span>
                            <span className="font-medium text-textMain">
                                {hasFreeDelivery ? (
                                    <span className="text-green-500 font-bold">€0.00</span>
                                ) : (
                                    `€${baseOrderDetails.base_delivery_fee.toFixed(2)}`
                                )}
                            </span>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex justify-between items-center mt-4">
                            <span className="font-bold text-textMain">Total</span>
                            <span className="text-xl font-black text-rose-500">€{total.toFixed(2)}</span>
                        </div>
                    </div>
                </motion.div>

                <div className="space-y-4">
                    <h3 className="font-bold text-textMain px-2">Payment Method</h3>

                    <button
                        onClick={handleStripeCheckout}
                        disabled={loading}
                        className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-accent/20 shadow-sm active:scale-98 transition-all hover:border-accent"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-textMain">Pay with Card</p>
                                <p className="text-xs text-slate-500">Secure payment via Stripe</p>
                            </div>
                        </div>
                        <ShieldCheck className="w-5 h-5 text-green-500" />
                    </button>

                    <button
                        onClick={() => alert('Cash on Delivery selected. Order placed!')}
                        className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-sm active:scale-98 transition-all hover:border-slate-300 opacity-80"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                                <Truck className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-textMain">Cash on Delivery</p>
                                <p className="text-xs text-slate-500">Pay when you receive the gift</p>
                            </div>
                        </div>
                    </button>
                </div>
            </main>
        </div>
    );
}
