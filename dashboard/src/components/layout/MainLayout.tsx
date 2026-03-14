import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="min-h-screen" style={{ background: '#06080e' }}>
      <Sidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      <div className="pl-64 transition-[padding] duration-300 max-lg:pl-0">
        <TopBar onMenuClick={() => setSidebarOpen((o) => !o)} />
        <main className="p-6 page-enter" style={{ background: '#06080e', padding: '24px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
