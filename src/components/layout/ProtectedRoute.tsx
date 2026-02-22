
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { Loader2 } from 'lucide-react';
import Landing from '../../pages/Landing';

export default function ProtectedRoute() {
    const { session, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="h-[100dvh] w-full flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
            </div>
        );
    }

    if (!session) {
        if (location.pathname === '/') {
            return <Landing />;
        }

        if (location.search.includes('error=')) {
            // Extract error description from search params since Supabase puts it there
            const params = new URLSearchParams(location.search);
            const errorDesc = params.get('error_description') || params.get('error') || 'Error with Google Auth';
            return <Navigate to={`/login?error=${encodeURIComponent(errorDesc)}`} replace />;
        }
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}
