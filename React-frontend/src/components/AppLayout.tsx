import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./ProductSidebar/Sidebar";
import ProductNavbar from "./ProductNavbar/Navbar";
import BgImage from "../assets/Bg.png";

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
          className={`fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm lg:hidden ${sidebarOpen ? "block" : "hidden"}`}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />

        <div
          className={`fixed lg:static inset-y-0 left-0 z-[100] w-[280px] lg:w-62 shrink-0 transform transition-transform duration-300 lg:transform-none ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <Sidebar onMenuClick={() => setSidebarOpen(false)} />
        </div>

        {/* Page content */}
        <main className="flex-1 flex flex-col px-2 sm:px-4 pb-3 sm:pb-5 lg:overflow-hidden overflow-y-auto">
          <div className="h-auto min-h-full lg:min-h-0 lg:h-full rounded-lg bg-white border border-[#AEACAC52] p-3 sm:p-4 flex flex-col lg:overflow-hidden overflow-visible">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
