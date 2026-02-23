import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import MobileLayout from './components/layout/MobileLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Home from './pages/Home';
import Giftinder from './pages/Giftinder';
import Wishlist from './pages/Wishlist';
import Karma from './pages/Karma';
import Login from './pages/Login';
import Register from './pages/Register';
import CheckEmail from './pages/CheckEmail';
import ContactsList from './pages/ContactsList';
import NewContact from './pages/NewContact';
import Checkout from './pages/Checkout';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import EditContact from './pages/EditContact';
import SharedWishlist from './pages/SharedWishlist';
import AdminLayout from './components/layout/AdminLayout';
import AdminOrders from './pages/admin/AdminOrders';
import AdminLogs from './pages/admin/AdminLogs';
import AdminUsers from './pages/admin/AdminUsers';
import AdminGifts from './pages/admin/AdminGifts';
import AdminSettings from './pages/admin/AdminSettings';

// Component to handle redirecting authenticated users away from auth pages
const AuthRoute = ({ children }: { children: React.ReactNode }) => {
    const { session, loading } = useAuth();

    // Check if we are in an OAuth callback flow (URL has code or error search params)
    // If so, we shouldn't render anything or redirect until Supabase processes it
    const isOAuthCallback = window.location.search.includes('code=') || window.location.search.includes('error=');

    if (loading || isOAuthCallback) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            </div>
        );
    }

    if (session) return <Navigate to="/" replace />;
    return <>{children}</>;
};

// Component to protect Admin routes
const ProtectedAdminRoute = ({ children }: { children: React.ReactNode }) => {
    const { session, loading, isAdmin } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            </div>
        );
    }

    if (!session) return <Navigate to="/login" replace />;

    if (!isAdmin) {
        // Not an admin, redirect to home
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

const router = createBrowserRouter([
    {
        path: '/login',
        element: (
            <AuthRoute>
                <Login />
            </AuthRoute>
        ),
    },
    {
        path: '/register',
        element: (
            <AuthRoute>
                <Register />
            </AuthRoute>
        ),
    },
    {
        path: '/check-email',
        element: (
            <AuthRoute>
                <CheckEmail />
            </AuthRoute>
        ),
    },
    {
        path: '/wishlist/:userId',
        element: <SharedWishlist />
    },
    {
        path: '/',
        element: <ProtectedRoute />, // Wrap everything in ProtectedRoute
        children: [
            {
                path: '/',
                element: <MobileLayout />,
                children: [
                    { index: true, element: <Home /> },
                    { path: 'giftinder', element: <Giftinder /> },
                    { path: 'wishlist', element: <Wishlist /> },
                    { path: 'karma', element: <Karma /> },
                    { path: 'contacts', element: <ContactsList /> },
                    { path: 'profile', element: <Profile /> }
                ],
            },
            { path: 'contacts/new', element: <NewContact /> },
            { path: 'contacts/:id/edit', element: <EditContact /> },
            { path: 'checkout', element: <Checkout /> }
        ],
    },
    {
        path: '/admin',
        element: (
            <ProtectedAdminRoute>
                <AdminLayout />
            </ProtectedAdminRoute>
        ),
        children: [
            { index: true, element: <AdminDashboard /> },
            { path: 'orders', element: <AdminOrders /> },
            { path: 'logs', element: <AdminLogs /> },
            { path: 'users', element: <AdminUsers /> },
            { path: 'gifts', element: <AdminGifts /> },
            { path: 'settings', element: <AdminSettings /> }
        ]
    }
]);

export default function App() {
    return (
        <AuthProvider>
            <RouterProvider router={router} />
        </AuthProvider>
    );
}
