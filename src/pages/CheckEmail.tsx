import { Mail, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function CheckEmail() {
    return (
        <div className="min-h-screen bg-background flex flex-col justify-center px-6 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm mx-auto text-center"
            >
                <div className="w-20 h-20 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto mb-6">
                    <Mail className="w-10 h-10" />
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-textMain mb-3">
                    Check your email
                </h1>

                <p className="text-slate-500 mb-8">
                    We've sent you a confirmation link. Please check your inbox and click the link to verify your account before logging in.
                </p>

                <div className="space-y-4">
                    <Link
                        to="/login"
                        className="w-full py-4 bg-accent text-white rounded-2xl font-bold shadow-floating shadow-accent/20 active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
                    >
                        <span>Back to Login</span>
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
