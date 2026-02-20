import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  ArrowRightOnRectangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

// Import Icons
import dashboardIcon from '../../assets/SidebarIcons/PMSidebarIcons/dashboard.svg';
import whiteDashboardIcon from '../../assets/SidebarIcons/PMSidebarIcons/Whitedashboard.svg';
import consultantIcon from '../../assets/SidebarIcons/PMSidebarIcons/consultant.svg';
import whiteConsultantIcon from '../../assets/SidebarIcons/PMSidebarIcons/Whiteconsultant.svg';
import clientIcon from '../../assets/SidebarIcons/PMSidebarIcons/client.svg';
import whiteClientIcon from '../../assets/SidebarIcons/PMSidebarIcons/Whiteclients.svg';
import projectIcon from '../../assets/SidebarIcons/PMSidebarIcons/projecticon.svg';
import whiteProjectIcon from '../../assets/SidebarIcons/PMSidebarIcons/Whiteprojects.svg';
import myTaskIcon from '../../assets/SidebarIcons/PMSidebarIcons/mytask.svg';
import whiteMyTaskIcon from '../../assets/SidebarIcons/PMSidebarIcons/Whitemytask.svg';
import teamTaskIcon from '../../assets/SidebarIcons/PMSidebarIcons/teamtask.svg';
import whiteTeamTaskIcon from '../../assets/SidebarIcons/PMSidebarIcons/Whiteteamtask.svg';
import createTeamIcon from '../../assets/SidebarIcons/PMSidebarIcons/createteam.svg';
import whiteCreateTeamIcon from '../../assets/SidebarIcons/PMSidebarIcons/Whitecreateteam.svg';
import trackerIcon from '../../assets/SidebarIcons/PMSidebarIcons/tracker.svg';
import whiteTrackerIcon from '../../assets/SidebarIcons/PMSidebarIcons/Whitetracker.svg';
import teamReportIcon from '../../assets/SidebarIcons/PMSidebarIcons/teamreport 1.svg';
import whiteTeamReportIcon from '../../assets/SidebarIcons/PMSidebarIcons/Whiteteamreport.svg';
import chatIcon from '../../assets/SidebarIcons/PMSidebarIcons/chat.svg';
import whiteChatIcon from '../../assets/SidebarIcons/PMSidebarIcons/Whitechat.svg';

const HIDE_CLIENTS_ROLES = ['BIM Lead', 'BIM Coordinator'];

export interface NavItem {
  name: string;
  path: string;
  iconSrc?: string;
  activeIconSrc?: string;
  isCustom?: boolean;
  isVisible?: boolean;
}

interface SidebarProps {
  onMenuClick?: () => void;
}

export default function ProductSidebar({ onMenuClick }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const panelType = user?.panel_type ?? 3;
  const userRole = user?.user_role || '';
  const isManagement = panelType === 1;
  const isTeamLeader = panelType === 2;
  const showClients = isManagement && !HIDE_CLIENTS_ROLES.includes(userRole);

  const navItems: NavItem[] = [
    {
      name: "Dashboard",
      path: "/dashboard",
      iconSrc: dashboardIcon,
      activeIconSrc: whiteDashboardIcon,
      isVisible: true,
    },
    {
      name: "Consultant",
      path: "/employees",
      iconSrc: consultantIcon,
      activeIconSrc: whiteConsultantIcon,
      isVisible: isManagement,
    },
    {
      name: "Clients",
      path: "/clients",
      iconSrc: clientIcon,
      activeIconSrc: whiteClientIcon,
      isVisible: isManagement && showClients,
    },
    {
      name: "Projects",
      path: "/projects",
      iconSrc: projectIcon,
      activeIconSrc: whiteProjectIcon,
      isVisible: isManagement || isTeamLeader,
    },
    {
      name: "My Task",
      path: "/tasks",
      iconSrc: myTaskIcon,
      activeIconSrc: whiteMyTaskIcon,
      isVisible: true,
    },
    {
      name: "Team Task",
      path: "/tasks/team",
      iconSrc: teamTaskIcon,
      activeIconSrc: whiteTeamTaskIcon,
      isVisible: isManagement || isTeamLeader,
    },
    {
      name: "Create Team",
      path: "/team",
      iconSrc: createTeamIcon,
      activeIconSrc: whiteCreateTeamIcon,
      isVisible: isManagement,
    },
    {
      name: "Tracker",
      path: "/tracker",
      iconSrc: trackerIcon,
      activeIconSrc: whiteTrackerIcon,
      isVisible: isManagement,
    },
    {
      name: "Team Report",
      path: "/timesheet",
      iconSrc: teamReportIcon,
      activeIconSrc: whiteTeamReportIcon,
      isVisible: isManagement || isTeamLeader,
    },
    {
      name: "Report",
      path: "/timesheet",
      iconSrc: teamReportIcon,
      activeIconSrc: whiteTeamReportIcon,
      isVisible: panelType === 3,
    },
    {
      name: "Chat",
      path: "/chat",
      iconSrc: chatIcon,
      activeIconSrc: whiteChatIcon,
      isVisible: isManagement,
    },
  ].filter(item => item.isVisible);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (location.pathname === path) return true;
    // Special handling for tasks to avoid overlapping highlighting
    if (path === '/tasks') {
      return location.pathname === '/tasks';
    }
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="w-60 flex flex-col gap-4 sticky h-[calc(100vh-100px)] px-4">
      {/* Navigation Items Container */}
      <nav className="flex-1 flex flex-col bg-transparent backdrop-blur-sm rounded-2xl border border-[rgba(89,89,89,0.2)] overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
          {navItems.map((item) => {
            const active = isActive(item.path);

            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  onMenuClick?.();
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${active
                  ? "bg-[#DD4342] text-white shadow-lg active-scale-95"
                  : "text-slate-700 hover:bg-white/20 hover:text-black"
                  }`}
              >
                {item.iconSrc && (
                  <img
                    src={active ? item.activeIconSrc : item.iconSrc}
                    alt={item.name}
                    className="w-5 h-5 flex-shrink-0 object-contain transition-all duration-200"
                  />
                )}
                <span className={`text-[15px] whitespace-nowrap overflow-hidden text-ellipsis ${active ? "text-white font-bold" : "text-slate-800 font-semibold"}`}>
                  {item.name}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Log Out Button Container */}
      <div className="mt-auto">
        <button
          type="button"
          onClick={() => setShowLogoutModal(true)}
          className="flex w-full bg-transparent backdrop-blur-md items-center font-semibold font-gantari justify-center gap-3 px-4 py-3 rounded-lg border border-[rgba(89,89,89,0.2)] text-[#E00100] transition-all shadow-lg active:scale-95"
        >
          <ArrowRightOnRectangleIcon className="w-6 h-6 text-[#E00100]" />
          <span>Log Out</span>
        </button>
      </div>

      {showLogoutModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl p-10 max-w-lg w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setShowLogoutModal(false)}
              className="absolute top-6 left-6 p-1.5 bg-[#F2F2F2] rounded-lg text-black hover:bg-slate-200 transition-colors"
            >
              <XMarkIcon className="w-5 h-5 stroke-[2.5]" />
            </button>

            {/* Content */}
            <div className="text-center mt-2">
              {/* <h2 className="text-[28px] font-bold text-slate-900 mb-4">Logout</h2> */}
              <p className="text-[17px] font-medium text-slate-800 mb-10">
                Are you sure, you want to logout?
              </p>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="px-6 py-2 bg-[#F2F2F2] text-slate-700 rounded-md text-base font-semibold hover:bg-slate-200 transition-all min-w-[120px]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="px-6 py-2 bg-[#FFE5E5] text-[#E00100] rounded-md text-base font-semibold hover:bg-red-100 transition-all min-w-[120px]"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
