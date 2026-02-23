import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2, User as UserIcon } from 'lucide-react';

export default function Register() {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const ref = params.get('ref');
        if (ref) {
            localStorage.setItem('referral_id', ref);
        }
    }, [location]);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
                },
            },
        });

        if (signUpError) {
            setError(signUpError.message);
            setLoading(false);
        } else {
            // Require email confirmation
            navigate('/check-email');
        }
    };

    const handleGoogleRegister = async () => {
        setLoading(true);
        setError(null);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] flex flex-col justify-center px-6 bg-background relative overflow-hidden sm:h-[90dvh] sm:min-h-0 sm:rounded-3xl sm:max-w-md sm:mx-auto sm:mt-[5vh] shadow-2xl">
            {/* Decorative Blur Orbs */}
            <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
            <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-accent/5 rounded-full blur-3xl" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 w-full"
            >
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold tracking-tight text-textMain">Create Account</h1>
                    <p className="text-sm text-slate-500 mt-2">Join Podaryavai & Social Ecosystem</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100/50">
                            {error}
                        </div>
                    )}

                    <div className="flex space-x-2">
                        <div className="relative flex-1">
                            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder="First Name"
                                required
                                className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-slate-200/50 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all shadow-sm placeholder:text-slate-400"
                            />
                        </div>
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                placeholder="Last Name"
                                required
                                className="w-full px-4 py-4 bg-white rounded-2xl border border-slate-200/50 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all shadow-sm placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email address"
                            required
                            className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-slate-200/50 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all shadow-sm placeholder:text-slate-400"
                        />
                    </div>

                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Create Password"
                            required
                            minLength={6}
                            className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-slate-200/50 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all shadow-sm placeholder:text-slate-400"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-accent text-white rounded-2xl font-semibold shadow-floating shadow-accent/20 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Sign Up</span>}
                    </button>
                </form>

                <div className="mt-6">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-background text-slate-500">Or continue with</span>
                        </div>
                    </div>

                    <button
                        onClick={handleGoogleRegister}
                        disabled={loading}
                        className="mt-6 w-full py-4 bg-white text-slate-700 rounded-2xl font-semibold shadow-sm border border-slate-200 hover:bg-slate-50 active:scale-[0.98] transition-all flex items-center justify-center space-x-3 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        <span>Google</span>
                    </button>
                </div>

                <p className="text-center text-sm text-slate-500 mt-8">
                    Already have an account?{' '}
                    <Link to="/login" className="font-semibold text-accent hover:underline">
                        Sign In
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}
