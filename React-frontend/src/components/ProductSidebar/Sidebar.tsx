import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

// Import Icons
import dashboardIcon from '../../assets/SidebarIcons/PMSidebarIcons/dashboard.svg';
import consultantIcon from '../../assets/SidebarIcons/PMSidebarIcons/consultant.svg';
import clientIcon from '../../assets/SidebarIcons/PMSidebarIcons/client.svg';
import projectIcon from '../../assets/SidebarIcons/PMSidebarIcons/projecticon.svg';
import myTaskIcon from '../../assets/SidebarIcons/PMSidebarIcons/mytask.svg';
import teamTaskIcon from '../../assets/SidebarIcons/PMSidebarIcons/teamtask.svg';
import createTeamIcon from '../../assets/SidebarIcons/PMSidebarIcons/createteam.svg';
import trackerIcon from '../../assets/SidebarIcons/PMSidebarIcons/tracker.svg';
import teamReportIcon from '../../assets/SidebarIcons/PMSidebarIcons/teamreport 1.svg';
import chatIcon from '../../assets/SidebarIcons/PMSidebarIcons/chat.svg';

const HIDE_CLIENTS_ROLES = ['BIM Lead', 'BIM Coordinator'];

export interface NavItem {
  name: string;
  path: string;
  iconSrc?: string;
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
      isVisible: true,
    },
    {
      name: "Consultant",
      path: "/employees",
      iconSrc: consultantIcon,
      isVisible: isManagement,
    },
    {
      name: "Clients",
      path: "/clients",
      iconSrc: clientIcon,
      isVisible: isManagement && showClients,
    },
    {
      name: "Projects",
      path: "/projects",
      iconSrc: projectIcon,
      isVisible: isManagement || isTeamLeader,
    },
    {
      name: "My Task",
      path: "/tasks",
      iconSrc: myTaskIcon,
      isVisible: true,
    },
    {
      name: "Team Task",
      path: "/tasks/team",
      iconSrc: teamTaskIcon,
      isVisible: isManagement || isTeamLeader,
    },
    {
      name: "Create Team",
      path: "/team",
      iconSrc: createTeamIcon,
      isVisible: isManagement,
    },
    {
      name: "Tracker",
      path: "/tracker",
      iconSrc: trackerIcon,
      isVisible: isManagement,
    },
    {
      name: "Team Report",
      path: "/timesheet",
      iconSrc: teamReportIcon,
      isVisible: isManagement || isTeamLeader,
    },
    {
      name: "Report",
      path: "/timesheet",
      iconSrc: teamReportIcon,
      isVisible: panelType === 3,
    },
    {
      name: "Chat",
      path: "/chat",
      iconSrc: chatIcon,
      isVisible: isManagement,
    },
  ].filter(item => item.isVisible);

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to log out?")) {
      await logout();
      navigate('/login');
    }
  };

  const isActive = (path: string) => {
    if (location.pathname === path) return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="w-64 flex flex-col gap-4 sticky h-[calc(100vh-100px)] px-4">
      {/* Navigation Items Container */}
      <nav className="flex-1 flex flex-col bg-transparent backdrop-blur-sm rounded-2xl border border-[rgba(89,89,89,0.2)] shadow-lg overflow-hidden">
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
                  ? "bg-[#DD4342] text-white shadow-md active-scale-95"
                  : "text-slate-600 hover:bg-white/40 hover:text-black"
                  }`}
              >
                {item.iconSrc && (
                  <img
                    src={item.iconSrc}
                    alt={item.name}
                    className={`w-5 h-5 flex-shrink-0 object-contain transition-all duration-200 ${active ? "brightness-0 invert" : ""
                      }`}
                  />
                )}
                <span className={`text-[15px] whitespace-nowrap overflow-hidden text-ellipsis ${active ? "text-white" : "text-slate-700 font-semibold"}`}>
                  {item.name}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Log Out Button Container */}
      <div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full bg-[#FFFAFA] items-center font-bold justify-center gap-3 px-4 py-4 rounded-xl border border-[rgba(89,89,89,0.2)] text-[#E00100] transition-colors shadow-sm hover:bg-red-50/50"
        >
          <ArrowRightOnRectangleIcon className="w-6 h-6 text-[#E00100]" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
}
