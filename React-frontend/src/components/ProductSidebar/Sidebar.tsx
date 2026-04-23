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

// Technical Director Icons
import blackBiddingIcon from '../../assets/TechnicalDirector/Sidebaricons/BlackBidding.svg';
import redBiddingIcon from '../../assets/TechnicalDirector/Sidebaricons/RedBidding.svg';
import blackProposalIcon from '../../assets/TechnicalDirector/Sidebaricons/BlackProposal.svg';
import redProposalIcon from '../../assets/TechnicalDirector/Sidebaricons/RedProposal.svg';
import blackPartnerIcon from '../../assets/TechnicalDirector/Sidebaricons/RedVector.svg';
import redPartnerIcon from '../../assets/TechnicalDirector/Sidebaricons/RedPartner.svg';

// const HIDE_CLIENTS_ROLES = ['BIM Lead', 'BIM Coordinator'];

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
  // const showClients = isManagement && !HIDE_CLIENTS_ROLES.includes(userRole);

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
          iconSrc: blackPartnerIcon,
          activeIconSrc: redPartnerIcon,
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
          iconSrc: blackBiddingIcon,
          activeIconSrc: redBiddingIcon,
          isVisible: true,
        },
        {
          name: "Proposals",
          path: "/td/manage-proposal",
          iconSrc: blackProposalIcon,
          activeIconSrc: redProposalIcon,
          isVisible: true,
        },
        // {
        //   name: "Payment Milestones",
        //   path: "/td/payment-milestones",
        //   iconSrc: trackerIcon,
        //   activeIconSrc: whiteTrackerIcon,
        //   isVisible: true,
        // },
        // {
        //   name: "Invoices",
        //   path: "/td/invoices",
        //   iconSrc: teamReportIcon,
        //   activeIconSrc: whiteTeamReportIcon,
        //   isVisible: true,
        // },
        {
          name: "Work Order",
          path: "/td/workorder",
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
          iconSrc: blackPartnerIcon,
          activeIconSrc: redPartnerIcon,
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
          // { name: "Communication Hub", path: "/vendor-bim-lead/communication", iconSrc: chatIcon, activeIconSrc: whiteChatIcon, isVisible: true },
        ];
      }

      if (isVendorPM) {
        return [
          { name: "Dashboard", path: "/vpm/dashboard", iconSrc: dashboardIcon, activeIconSrc: whiteDashboardIcon, isVisible: true },
          { name: "Projects", path: "/vpm/projects", iconSrc: projectIcon, activeIconSrc: whiteProjectIcon, isVisible: true },
          // { name: "Proposals", path: "/vpm/proposals", iconSrc: blackProposalIcon, activeIconSrc: redProposalIcon, isVisible: true },
          { name: "My Task", path: "/vpm/mytasks", iconSrc: myTaskIcon, activeIconSrc: whiteMyTaskIcon, isVisible: true },
          { name: "Team Task", path: "/vpm/teamtasks", iconSrc: teamTaskIcon, activeIconSrc: whiteTeamTaskIcon, isVisible: true },
          { name: "Create Team", path: "/vpm/createteam", iconSrc: createTeamIcon, activeIconSrc: whiteCreateTeamIcon, isVisible: true },
          { name: "Resources", path: "/vpm/resources", iconSrc: consultantIcon, activeIconSrc: whiteConsultantIcon, isVisible: true },
          {name: "Company Profile", path: "/vpm/company-profile", iconSrc: consultantIcon, activeIconSrc: whiteConsultantIcon, isVisible: true },
          // { name: "Bidding", path: "/vpm/opportunities", iconSrc: blackBiddingIcon, activeIconSrc: redBiddingIcon, isVisible: true },
          // { name: "Communication Hub", path: "/vpm/communication", iconSrc: chatIcon, activeIconSrc: whiteChatIcon, isVisible: true },
        ];
      }

      if (isVendorEmployee) {
        return [
          { name: "Dashboard", path: "/ve/dashboard", iconSrc: dashboardIcon, activeIconSrc: whiteDashboardIcon, isVisible: true },
          { name: "Projects", path: "/ve/projects", iconSrc: projectIcon, activeIconSrc: whiteProjectIcon, isVisible: true },
          { name: "My Task", path: "/ve/mytasks", iconSrc: myTaskIcon, activeIconSrc: whiteMyTaskIcon, isVisible: true },
          { name: "Team Task", path: "/ve/teamtasks", iconSrc: teamTaskIcon, activeIconSrc: whiteTeamTaskIcon, isVisible: true },
          // { name: "Communication", path: "/ve/communication", iconSrc: chatIcon, activeIconSrc: whiteChatIcon, isVisible: true },
        ];
      }

      // Generic vendor admin/company owner menu
      if (isVendorAdmin) {
        return [
          { name: "Dashboard", path: "/v/dashboard", iconSrc: dashboardIcon, activeIconSrc: whiteDashboardIcon, isVisible: true },
          { name: "Bidding", path: "/v/opportunities", iconSrc: blackBiddingIcon, activeIconSrc: redBiddingIcon, isVisible: true },
          { name: "Proposals", path: "/v/proposals", iconSrc: blackProposalIcon, activeIconSrc: redProposalIcon, isVisible: true },
          { name: "Work Order", path: "/v/workorder", iconSrc: projectIcon, activeIconSrc: whiteProjectIcon, isVisible: true },
          { name: "Projects", path: "/v/projects", iconSrc: projectIcon, activeIconSrc: whiteProjectIcon, isVisible: true },
          { name: "My Task", path: "/v/mytasks", iconSrc: myTaskIcon, activeIconSrc: whiteMyTaskIcon, isVisible: true },
          { name: "Team Task", path: "/v/teamtasks", iconSrc: teamTaskIcon, activeIconSrc: whiteTeamTaskIcon, isVisible: true },
          { name: "Create Team", path: "/v/createteam", iconSrc: createTeamIcon, activeIconSrc: whiteCreateTeamIcon, isVisible: true },
          { name: "Resources", path: "/v/resources", iconSrc: consultantIcon, activeIconSrc: whiteConsultantIcon, isVisible: true },
          { name: "Company Profile", path: "/v/company-profile", iconSrc: consultantIcon, activeIconSrc: whiteConsultantIcon, isVisible: true },
          { name: "Milestones", path: "/v/milestones", iconSrc: trackerIcon, activeIconSrc: whiteTrackerIcon, isVisible: true },
          { name: "Invoices", path: "/v/invoices", iconSrc: teamReportIcon, activeIconSrc: whiteTeamReportIcon, isVisible: true },
          // { name: "Communication", path: "/v/communication", iconSrc: chatIcon, activeIconSrc: whiteChatIcon, isVisible: true },
          // { name: "Performance", path: "/v/performance", iconSrc: teamReportIcon, activeIconSrc: whiteTeamReportIcon, isVisible: true },
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
    const fromState = (location.state as { from?: string } | null)?.from;
    const openedFromTeamTask = fromState === "teamtask" || fromState === "teamtasks";
    const fromTeamTaskView =
      openedFromTeamTask &&
      (normalizedCurrent === "/tasks/taskview" ||
        normalizedCurrent.includes("/mytasks/view") ||
        normalizedCurrent.includes("/mytasks/add") ||
        normalizedCurrent.includes("/mytasks/edit") ||
        normalizedCurrent.includes("/teamtasks/view") ||
        normalizedCurrent.includes("/teamtasks/add") ||
        normalizedCurrent.includes("/teamtasks/edit"));

    if (fromTeamTaskView) {
      if (name === "Team Task" && (normalizedTarget === "/teamtask" || normalizedTarget.endsWith("/teamtasks"))) return true;
      if (name === "My Task" && (normalizedTarget === "/tasks" || normalizedTarget.endsWith("/mytasks"))) return false;
    }

    // Vendor employee task detail: dedicated view route or legacy /tasks/taskview
    if (
      normalizedCurrent.startsWith("/ve/mytasks/view") ||
      (fromState === "ve" && normalizedCurrent === "/tasks/taskview")
    ) {
      return name === "My Task" && normalizedTarget === "/ve/mytasks";
    }

    if (fromState === "ve-team" && normalizedCurrent === "/tasks/taskview") {
      return name === "Team Task" && normalizedTarget === "/ve/teamtasks";
    }

    if (normalizedCurrent === normalizedTarget) return true;

    // Technical Director Proposals: same app routes as legacy proposal URLs
    if (name === "Proposals" && normalizedTarget === "/td/manage-proposal") {
      const workOrderSubRoutes = ["/td/proposals", "/td/create-proposal", "/td/view-proposal"];
      if (workOrderSubRoutes.includes(normalizedCurrent)) return true;
    }
    
    // Special case for dashboard matching
    if (name === 'Dashboard' && (normalizedCurrent === '/dashboard' || normalizedCurrent === '')) return true;

    if (normalizedTarget !== '' && normalizedTarget !== '/') {
      return normalizedCurrent.startsWith(normalizedTarget + '/');
    }
    return false;
  };

  return (
    <div className="w-full lg:w-66 flex flex-col gap-4 sticky lg:h-[calc(100vh-100px)] h-[calc(100vh-32px)] px-3 sm:px-4 py-4 lg:py-0">
      {/* Navigation Items Container - Glass Effect on Responsive */}
      <nav className="flex-1 flex flex-col lg:bg-transparent bg-[#FFFFFF]/70 backdrop-blur-xl lg:backdrop-blur-sm rounded-lg lg:rounded-lg border border-white/40 lg:border-[rgba(89,89,89,0.2)] overflow-hidden shadow-2xl lg:shadow-none transition-all duration-300">
        <div className="flex-1 overflow-y-auto px-4 pb-4 pt-4 space-y-2 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
          {navItems.map((item) => {
            const active = isActive(item.path, item.name);
            const isNavigating = navigatingTo === item.path;

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleNavClick(item.path)}
                disabled={isNavigating}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md lg:rounded-md transition-all duration-200 font-medium cursor-pointer ${active
                  ? "bg-[#DD4342] text-white shadow-lg active-scale-95 scale-[1.02]"
                  : "text-slate-700 hover:bg-white/40 lg:hover:bg-white/20 hover:text-black"
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

      {/* Log Out Button Container - Consistent Glass Effect */}
      <div className="mt-auto">
        <button
          type="button"
          onClick={() => setShowLogoutModal(true)}
          className="flex w-full lg:bg-transparent bg-[#FFFFFF]/70 backdrop-blur-xl lg:backdrop-blur-md items-center font-semibold font-gantari justify-center gap-3 px-4 py-3.5 rounded-lg lg:rounded-lg border border-white/40 lg:border-[rgba(89,89,89,0.2)] text-[#E00100] transition-all shadow-xl lg:shadow-lg active:scale-95 cursor-pointer hover:bg-white/90 lg:hover:bg-transparent"
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
              className="absolute top-6 left-6 p-1.5 bg-[#F2F2F2] rounded-lg text-black cursor-pointer"
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
                  className="px-6 py-2 bg-[#F2F2F2] text-slate-700 rounded-md text-base font-semibold transition-all min-w-[120px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="px-6 py-2 bg-[#FFE5E5] text-[#E00100] rounded-md text-base font-semibold transition-all min-w-[120px] cursor-pointer"
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
