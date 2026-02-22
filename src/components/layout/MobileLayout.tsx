import { Outlet } from 'react-router-dom';
import BottomNavigation from './BottomNavigation';
import Sidebar from './Sidebar';

export default function MobileLayout() {
    return (
        <div className="flex h-[100dvh] w-full bg-background overflow-hidden">
            {/* Desktop Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex flex-col flex-1 h-[100dvh] w-full relative sm:px-4 md:px-8 sm:py-4">
                <main className="flex-1 w-full max-w-2xl mx-auto overflow-y-auto pb-20 relative z-0 md:pb-4 md:bg-white/50 md:rounded-3xl md:shadow-soft lg:max-w-4xl">
                    <Outlet />
                </main>

                {/* Mobile Bottom Navigation Component (hidden on desktop internally) */}
                <div className="absolute bottom-0 w-full z-50 md:hidden left-0">
                    <BottomNavigation />
                </div>
            </div>
        </div>
    );
}
