import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
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

  const isTechnicalDirector = userRole === 'Technical Director';
  const isBimLead = userRole === 'BIM Lead';
  const isBimCoordinator = userRole === 'BIM Coordinator';
  const isBimModeler = userRole === 'BIM Modeler';
  const isVendor =
    userRole === 'Vendor' ||
    userRole === 'Vendor Admin' ||
    userRole === 'Vendor PM' ||
    userRole === 'Vendor Employee' ||
    userRole === 'Vendor BIM Lead' ||
    userRole === 'Vendor Bim Lead';
  const isVendorAdmin = userRole === 'Vendor' || userRole === 'Vendor Admin';
  const isVendorPM = userRole === 'Vendor PM';
  const isVendorEmployee = userRole === 'Vendor Employee';
  const isVendorBimLead = userRole === 'Vendor BIM Lead' || userRole === 'Vendor Bim Lead';

  const getNavItems = (): NavItem[] => {
    if (isTechnicalDirector) {
      return [
        {
          name: "Dashboard",
          path: "/td/dashboard",
          iconSrc: dashboardIcon,
          activeIconSrc: whiteDashboardIcon,
          isVisible: true,
        },
        {
          name: "Consultant",
          path: "/td/consultants",
          iconSrc: consultantIcon,
          activeIconSrc: whiteConsultantIcon,
          isVisible: true,
        },
        // {
        //   name: "Clients",
        //   path: "/td/clients",
        //   iconSrc: clientIcon,
        //   activeIconSrc: whiteClientIcon,
        //   isVisible: true,
        // },
        {
          name: "Partners",
          path: "/td/partner",
          iconSrc: clientIcon,
          activeIconSrc: whiteClientIcon,
          isVisible: true,
        },
        {
          name: "Projects",
          path: "/td/projects",
          iconSrc: projectIcon,
          activeIconSrc: whiteProjectIcon,
          isVisible: true,
        },
        {
          name: "Bidding Process",
          path: "/td/bidding",
          iconSrc: projectIcon,
          activeIconSrc: whiteProjectIcon,
          isVisible: true,
        },
        {
          name: "Proposal",
          path: "/td/manage-proposal",
          iconSrc: projectIcon,
          activeIconSrc: whiteProjectIcon,
          isVisible: true,
        },
        {
          name: "My Task",
          path: "/td/mytasks",
          iconSrc: myTaskIcon,
          activeIconSrc: whiteMyTaskIcon,
          isVisible: true,
        },
        {
          name: "Team Task",
          path: "/td/teamtasks",
          iconSrc: teamTaskIcon,
          activeIconSrc: whiteTeamTaskIcon,
          isVisible: true,
        },
        {
          name: "Create Team",
          path: "/td/createteam",
          iconSrc: createTeamIcon,
          activeIconSrc: whiteCreateTeamIcon,
          isVisible: true,
        },
        {
          name: "Manage Leave",
          path: "/td/manage-leave",
          iconSrc: teamReportIcon,
          activeIconSrc: whiteTeamReportIcon,
          isVisible: true,
        },
        {
          name: "Tracker",
          path: "/td/tracker",
          iconSrc: trackerIcon,
          activeIconSrc: whiteTrackerIcon,
          isVisible: true,
        },
        {
          name: "Team Report",
          path: "/td/teamreport",
          iconSrc: teamReportIcon,
          activeIconSrc: whiteTeamReportIcon,
          isVisible: true,
        },
        {
          name: "Chat",
          path: "/td/chat",
          iconSrc: chatIcon,
          activeIconSrc: whiteChatIcon,
          isVisible: true,
        },
      ];
    }

    if (isBimLead) {
      return [
        {
          name: "Dashboard",
          path: "/bl/dashboard",
          iconSrc: dashboardIcon,
          activeIconSrc: whiteDashboardIcon,
          isVisible: true,
        },
        {
          name: "Consultant",
          path: "/bl/consultants",
          iconSrc: consultantIcon,
          activeIconSrc: whiteConsultantIcon,
          isVisible: true,
        },
        // {
        //   name: "Clients",
        //   path: "/bl/clients",
        //   iconSrc: clientIcon,
        //   activeIconSrc: whiteClientIcon,
        //   isVisible: true,
        // },
        {
          name: "Partners",
          path: "/bl/partner",
          iconSrc: clientIcon,
          activeIconSrc: whiteClientIcon,
          isVisible: true,
        },
        // {
        //   name: "Proposal",
        //   path: "/bl/manage-proposal",
        //   iconSrc: projectIcon,
        //   activeIconSrc: whiteProjectIcon,
        //   isVisible: true,
        // },
        // {
        //   name: "Bidding Process",
        //   path: "/bl/bidding",
        //   iconSrc: projectIcon,
        //   activeIconSrc: whiteProjectIcon,
        //   isVisible: true,
        // },
        {
          name: "Projects",
          path: "/bl/projects",
          iconSrc: projectIcon,
          activeIconSrc: whiteProjectIcon,
          isVisible: true,
        },
        {
          name: "My Task",
          path: "/bl/mytasks",
          iconSrc: myTaskIcon,
          activeIconSrc: whiteMyTaskIcon,
          isVisible: true,
        },
        {
          name: "Team Task",
          path: "/bl/teamtasks",
          iconSrc: teamTaskIcon,
          activeIconSrc: whiteTeamTaskIcon,
          isVisible: true,
        },
        {
          name: "Create Team",
          path: "/bl/createteam",
          iconSrc: createTeamIcon,
          activeIconSrc: whiteCreateTeamIcon,
          isVisible: true,
        },
        {
          name: "Manage Leave",
          path: "/bl/manage-leave",
          iconSrc: teamReportIcon,
          activeIconSrc: whiteTeamReportIcon,
          isVisible: true,
        },
        {
          name: "Tracker",
          path: "/bl/tracker",
          iconSrc: trackerIcon,
          activeIconSrc: whiteTrackerIcon,
          isVisible: true,
        },
        {
          name: "Team Report",
          path: "/bl/teamreport",
          iconSrc: teamReportIcon,
          activeIconSrc: whiteTeamReportIcon,
          isVisible: true,
        },
        {
          name: "Chat",
          path: "/bl/chat",
          iconSrc: chatIcon,
          activeIconSrc: whiteChatIcon,
          isVisible: true,
        },
      ];
    }

    if (isBimCoordinator) {
      return [
        {
          name: "Dashboard",
          path: "/bc/dashboard",
          iconSrc: dashboardIcon,
          activeIconSrc: whiteDashboardIcon,
          isVisible: true,
        },
        {
          name: "Consultant",
          path: "/bc/consultants",
          iconSrc: consultantIcon,
          activeIconSrc: whiteConsultantIcon,
          isVisible: true,
        },
        // {
        //   name: "Clients",
        //   path: "/bc/clients",
        //   iconSrc: clientIcon,
        //   activeIconSrc: whiteClientIcon,
        //   isVisible: true,
        // },
        {
          name: "Projects",
          path: "/bc/projects",
          iconSrc: projectIcon,
          activeIconSrc: whiteProjectIcon,
          isVisible: true,
        },
        {
          name: "My Task",
          path: "/bc/mytasks",
          iconSrc: myTaskIcon,
          activeIconSrc: whiteMyTaskIcon,
          isVisible: true,
        },
        {
          name: "Team Task",
          path: "/bc/teamtasks",
          iconSrc: teamTaskIcon,
          activeIconSrc: whiteTeamTaskIcon,
          isVisible: true,
        },
        {
          name: "Create Team",
          path: "/bc/createteam",
          iconSrc: createTeamIcon,
          activeIconSrc: whiteCreateTeamIcon,
          isVisible: true,
        },
        {
          name: "Manage Leave",
          path: "/bc/manage-leave",
          iconSrc: teamReportIcon,
          activeIconSrc: whiteTeamReportIcon,
          isVisible: true,
        },
        {
          name: "Tracker",
          path: "/bc/tracker",
          iconSrc: trackerIcon,
          activeIconSrc: whiteTrackerIcon,
          isVisible: true,
        },
        {
          name: "Team Report",
          path: "/bc/teamreport",
          iconSrc: teamReportIcon,
          activeIconSrc: whiteTeamReportIcon,
          isVisible: true,
        },
        {
          name: "Chat",
          path: "/bc/chat",
          iconSrc: chatIcon,
          activeIconSrc: whiteChatIcon,
          isVisible: true,
        },
      ];
    }

    if (isVendor) {
      // Specific vendor roles first
      if (isVendorBimLead) {
        return [
          { name: "Dashboard", path: "/vendor-bim-lead/dashboard", iconSrc: dashboardIcon, activeIconSrc: whiteDashboardIcon, isVisible: true },
          { name: "Projects", path: "/vendor-bim-lead/projects", iconSrc: projectIcon, activeIconSrc: whiteProjectIcon, isVisible: true },
          { name: "My Task", path: "/vendor-bim-lead/tasks", iconSrc: myTaskIcon, activeIconSrc: whiteMyTaskIcon, isVisible: true },
          // { name: "Bidding", path: "/vendor-bim-lead/opportunities", iconSrc: projectIcon, activeIconSrc: whiteProjectIcon, isVisible: true },
          { name: "Create Team", path: "/vendor-bim-lead/createteam", iconSrc: createTeamIcon, activeIconSrc: whiteCreateTeamIcon, isVisible: true },
          { name: "Resources", path: "/vendor-bim-lead/resources", iconSrc: consultantIcon, activeIconSrc: whiteConsultantIcon, isVisible: true },
          { name: "Team Task", path: "/vendor-bim-lead/teamtasks", iconSrc: teamTaskIcon, activeIconSrc: whiteTeamTaskIcon, isVisible: true },
          { name: "Communication", path: "/vendor-bim-lead/communication", iconSrc: chatIcon, activeIconSrc: whiteChatIcon, isVisible: true },
        ];
      }

      if (isVendorPM) {
        return [
          { name: "Dashboard", path: "/vpm/dashboard", iconSrc: dashboardIcon, activeIconSrc: whiteDashboardIcon, isVisible: true },
          { name: "Projects", path: "/vpm/projects", iconSrc: projectIcon, activeIconSrc: whiteProjectIcon, isVisible: true },
          { name: "Proposals", path: "/vpm/proposals", iconSrc: teamTaskIcon, activeIconSrc: whiteTeamTaskIcon, isVisible: true },
          { name: "My Task", path: "/vpm/mytasks", iconSrc: myTaskIcon, activeIconSrc: whiteMyTaskIcon, isVisible: true },
          { name: "Team Task", path: "/vpm/teamtasks", iconSrc: teamTaskIcon, activeIconSrc: whiteTeamTaskIcon, isVisible: true },
          { name: "Create Team", path: "/vpm/createteam", iconSrc: createTeamIcon, activeIconSrc: whiteCreateTeamIcon, isVisible: true },
          { name: "Resources", path: "/vpm/resources", iconSrc: consultantIcon, activeIconSrc: whiteConsultantIcon, isVisible: true },
          { name: "Bidding", path: "/vpm/opportunities", iconSrc: projectIcon, activeIconSrc: whiteProjectIcon, isVisible: true },
          { name: "Communication", path: "/vpm/communication", iconSrc: chatIcon, activeIconSrc: whiteChatIcon, isVisible: true },
        ];
      }

      if (isVendorEmployee) {
        return [
          { name: "Dashboard", path: "/ve/dashboard", iconSrc: dashboardIcon, activeIconSrc: whiteDashboardIcon, isVisible: true },
          { name: "My Task", path: "/ve/mytasks", iconSrc: myTaskIcon, activeIconSrc: whiteMyTaskIcon, isVisible: true },
          { name: "Team Task", path: "/ve/teamtasks", iconSrc: teamTaskIcon, activeIconSrc: whiteTeamTaskIcon, isVisible: true },
          { name: "Communication", path: "/ve/communication", iconSrc: chatIcon, activeIconSrc: whiteChatIcon, isVisible: true },
        ];
      }

      // Generic vendor admin/company owner menu
      if (isVendorAdmin) {
        return [
          { name: "Dashboard", path: "/v/dashboard", iconSrc: dashboardIcon, activeIconSrc: whiteDashboardIcon, isVisible: true },
          { name: "Bidding", path: "/v/opportunities", iconSrc: projectIcon, activeIconSrc: whiteProjectIcon, isVisible: true },
          { name: "Proposals", path: "/v/proposals", iconSrc: teamTaskIcon, activeIconSrc: whiteTeamTaskIcon, isVisible: true },
          { name: "Projects", path: "/v/projects", iconSrc: projectIcon, activeIconSrc: whiteProjectIcon, isVisible: true },
          { name: "My Task", path: "/v/mytasks", iconSrc: myTaskIcon, activeIconSrc: whiteMyTaskIcon, isVisible: true },
          { name: "Team Task", path: "/v/teamtasks", iconSrc: teamTaskIcon, activeIconSrc: whiteTeamTaskIcon, isVisible: true },
          { name: "Create Team", path: "/v/createteam", iconSrc: createTeamIcon, activeIconSrc: whiteCreateTeamIcon, isVisible: true },
          { name: "Resources", path: "/v/resources", iconSrc: consultantIcon, activeIconSrc: whiteConsultantIcon, isVisible: true },
          { name: "Company Profile", path: "/v/company-profile", iconSrc: consultantIcon, activeIconSrc: whiteConsultantIcon, isVisible: true },
          { name: "Milestones", path: "/v/milestones", iconSrc: trackerIcon, activeIconSrc: whiteTrackerIcon, isVisible: true },
          { name: "Communication", path: "/v/communication", iconSrc: chatIcon, activeIconSrc: whiteChatIcon, isVisible: true },
          { name: "Performance", path: "/v/performance", iconSrc: teamReportIcon, activeIconSrc: whiteTeamReportIcon, isVisible: true },
        ];
      }
    }

    if (isBimModeler) {
      return [
        {
          name: "Dashboard",
          path: "/bm/dashboard",
          iconSrc: dashboardIcon,
          activeIconSrc: whiteDashboardIcon,
          isVisible: true,
        },
        {
          name: "My Task",
          path: "/bm/mytasks",
          iconSrc: myTaskIcon,
          activeIconSrc: whiteMyTaskIcon,
          isVisible: true,
        },
        {
          name: "Team Report",
          path: "/bm/teamreport",
          iconSrc: teamReportIcon,
          activeIconSrc: whiteTeamReportIcon,
          isVisible: true,
        },
        {
          name: "Manage Leave",
          path: "/bm/manage-leave",
          iconSrc: teamReportIcon,
          activeIconSrc: whiteTeamReportIcon,
          isVisible: true,
        },


      ];
    }

    return [
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
      // {
      //   name: "Clients",
      //   path: "/clients",
      //   iconSrc: clientIcon,
      //   activeIconSrc: whiteClientIcon,
      //   isVisible: isManagement && showClients,
      // },
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
        path: "/teamtask",
        iconSrc: teamTaskIcon,
        activeIconSrc: whiteTeamTaskIcon,
        isVisible: isManagement || isTeamLeader,
      },
      {
        name: "Create Team",
        path: "/create-team",
        iconSrc: createTeamIcon,
        activeIconSrc: whiteCreateTeamIcon,
        isVisible: isManagement,
      },
      {
        name: "Manage Leave",
        path: "/pm/manage-leave",
        iconSrc: teamReportIcon,
        activeIconSrc: whiteTeamReportIcon,
        isVisible: true,
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
    ].filter((item) => item.isVisible);
  };

  const navItems = getNavItems();
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  const handleNavClick = (path: string) => {
    if (location.pathname === path) {
      onMenuClick?.();
      return;
    }
    setNavigatingTo(path);
    navigate(path);
    onMenuClick?.();
    setTimeout(() => setNavigatingTo(null), 800);
  };

  useEffect(() => {
    if (navigatingTo && location.pathname.startsWith(navigatingTo)) setNavigatingTo(null);
  }, [location.pathname, navigatingTo]);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    navigate('/login');
  };

  const isActive = (path: string, name: string) => {
    const normalizedCurrent = location.pathname.toLowerCase().replace(/\/+$/, '');
    const normalizedTarget = path.toLowerCase().replace(/\/+$/, '');

    if (normalizedCurrent === normalizedTarget) return true;
    
    // Special case for dashboard matching
    if (name === 'Dashboard' && (normalizedCurrent === '/dashboard' || normalizedCurrent === '')) return true;

    if (normalizedTarget !== '' && normalizedTarget !== '/') {
      return normalizedCurrent.startsWith(normalizedTarget + '/');
    }
    return false;
  };

  return (
    <div className="w-66 flex flex-col gap-4 sticky h-[calc(100vh-100px)] px-4">
      {/* Navigation Items Container */}
      <nav className="flex-1 flex flex-col bg-transparent backdrop-blur-sm rounded-2xl border border-[rgba(89,89,89,0.2)] overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 pb-4 pt-8 space-y-2 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
          {navItems.map((item) => {
            const active = isActive(item.path, item.name);
            const isNavigating = navigatingTo === item.path;

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleNavClick(item.path)}
                disabled={isNavigating}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${active
                  ? "bg-[#DD4342] text-white shadow-lg active-scale-95"
                  : "text-slate-700 hover:bg-white/20 hover:text-black"
                  } ${isNavigating ? "opacity-90" : ""}`}
              >
                {isNavigating ? (
                  <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" aria-hidden />
                  </span>
                ) : item.iconSrc ? (
                  <img
                    src={active ? item.activeIconSrc : item.iconSrc}
                    alt={item.name}
                    className="w-5 h-5 flex-shrink-0 object-contain transition-all duration-200"
                  />
                ) : null}
                <span className={`text-[15px] whitespace-nowrap overflow-hidden text-ellipsis ${active ? "text-white font-bold" : "text-slate-800 font-semibold"}`}>
                  {isNavigating ? 'Loading...' : item.name}
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
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
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
