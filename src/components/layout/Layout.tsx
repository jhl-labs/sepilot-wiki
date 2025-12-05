import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useSidebar } from '../../context/SidebarContext';
import clsx from 'clsx';

export function Layout() {
  const { isOpen } = useSidebar();

  return (
    <div className={clsx('app-layout', isOpen && 'sidebar-open')}>
      <Header />
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
