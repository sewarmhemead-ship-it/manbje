import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function MainLayout() {
  return (
    <div className="min-h-screen" style={{ background: '#06080e' }}>
      <Sidebar />
      <div className="pl-64 transition-[padding] duration-300 max-lg:pl-0">
        <TopBar />
        <main className="p-6" style={{ background: '#06080e', padding: '24px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
