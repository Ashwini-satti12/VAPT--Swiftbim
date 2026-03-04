import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './ProductSidebar/Sidebar';
import ProductNavbar from './ProductNavbar/Navbar';
import BgImage from '../assets/Bg.png';



export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      className="h-screen flex flex-col overflow-hidden bg-cover bg-top bg-no-repeat"
      style={{ backgroundImage: `url(${BgImage})` }}
    >
      {/* Navbar — fixed height */}
      <ProductNavbar onMenuClick={() => setSidebarOpen(true)} />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Mobile overlay */}
        <div
          className={`fixed inset-0 z-40 bg-black/40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />

        <div
          className={`fixed lg:static inset-y-0 left-0 z-50 w-62 shrink-0 transform transition-transform duration-300 lg:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            }`}
        >
          <Sidebar onMenuClick={() => setSidebarOpen(false)} />
        </div>

        {/* Page content */}
        <main className="flex-1 px-4 pb-5 min-w-0 min-h-0 overflow-hidden">
          <div className="h-full min-h-0 rounded-[15px] bg-white border border-[#AEACAC52] p-4 flex flex-col overflow-hidden">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
