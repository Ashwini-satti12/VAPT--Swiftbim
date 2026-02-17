import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Import Icons
import dashboardIcon from '../assets/SidebarIcons/PMSidebarIcons/dashboard.svg';
import consultantIcon from '../assets/SidebarIcons/PMSidebarIcons/consultant.svg';
import clientIcon from '../assets/SidebarIcons/PMSidebarIcons/client.svg';
import projectIcon from '../assets/SidebarIcons/PMSidebarIcons/projecticon.svg';
import myTaskIcon from '../assets/SidebarIcons/PMSidebarIcons/mytask.svg';
import teamTaskIcon from '../assets/SidebarIcons/PMSidebarIcons/teamtask.svg';
import createTeamIcon from '../assets/SidebarIcons/PMSidebarIcons/createteam.svg';
import trackerIcon from '../assets/SidebarIcons/PMSidebarIcons/tracker.svg';
import teamReportIcon from '../assets/SidebarIcons/PMSidebarIcons/teamreport 1.svg';
import chatIcon from '../assets/SidebarIcons/PMSidebarIcons/chat.svg';

const HIDE_CLIENTS_ROLES = ['BIM Lead', 'BIM Coordinator'];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-4 py-3 rounded-[12px] transition-all duration-200 ${isActive
    ? 'bg-[#DD4342] text-white shadow-lg shadow-red-200'
    : 'text-slate-600 hover:bg-slate-50 hover:text-[#DD4342]'
  }`;

const iconStyle = "w-6 h-6 shrink-0 object-contain";

const iconDashboard = <img src={dashboardIcon} className={iconStyle} alt="" />;
const iconConsultant = <img src={consultantIcon} className={iconStyle} alt="" />;
const iconClients = <img src={clientIcon} className={iconStyle} alt="" />;
const iconProjects = <img src={projectIcon} className={iconStyle} alt="" />;
const iconTask = <img src={myTaskIcon} className={iconStyle} alt="" />;
const iconTeamTask = <img src={teamTaskIcon} className={iconStyle} alt="" />;
const iconCreateTeam = <img src={createTeamIcon} className={iconStyle} alt="" />;
const iconTracker = <img src={trackerIcon} className={iconStyle} alt="" />;
const iconTeamReport = <img src={teamReportIcon} className={iconStyle} alt="" />;
const iconChat = <img src={chatIcon} className={iconStyle} alt="" />;

interface SidebarProps {
  onMenuClick?: () => void;
}

export default function Sidebar({ onMenuClick }: SidebarProps) {
  const { user } = useAuth();
  const panelType = user?.panel_type ?? 3;
  const userRole = user?.user_role || '';
  const isManagement = panelType === 1;
  const isTeamLeader = panelType === 2;
  const showClients = isManagement && !HIDE_CLIENTS_ROLES.includes(userRole);

  return (
    <aside
      className="h-full flex flex-col overflow-hidden"
      style={{ backgroundColor: '#FFFFFF00' }}
    >
      <div className="flex-1 p-4 space-y-2 overflow-y-auto">
        <NavLink to="/dashboard" onClick={onMenuClick} className={linkClass}>{iconDashboard}<span className="font-medium">Dashboard</span></NavLink>

        {isManagement && (
          <>
            <NavLink to="/employees" onClick={onMenuClick} className={linkClass}>{iconConsultant}<span className="font-medium">Consultant</span></NavLink>
            {showClients && <NavLink to="/clients" onClick={onMenuClick} className={linkClass}>{iconClients}<span className="font-medium">Clients</span></NavLink>}
          </>
        )}

        {(isManagement || isTeamLeader) && (
          <NavLink to="/projects" onClick={onMenuClick} className={linkClass}>{iconProjects}<span className="font-medium">Projects</span></NavLink>
        )}

        <NavLink to="/tasks" onClick={onMenuClick} className={linkClass}>{iconTask}<span className="font-medium">My Task</span></NavLink>

        {(isManagement || isTeamLeader) && (
          <NavLink to="/tasks/team" onClick={onMenuClick} className={linkClass}>{iconTeamTask}<span className="font-medium">Team Task</span></NavLink>
        )}

        {isManagement && (
          <NavLink to="/team" onClick={onMenuClick} className={linkClass}>{iconCreateTeam}<span className="font-medium">Create Team</span></NavLink>
        )}

        {isManagement && (
          <NavLink to="/tracker" onClick={onMenuClick} className={linkClass}>{iconTracker}<span className="font-medium">Tracker</span></NavLink>
        )}

        {(isManagement || isTeamLeader) && (
          <NavLink to="/timesheet" onClick={onMenuClick} className={linkClass}>{iconTeamReport}<span className="font-medium">Team Report</span></NavLink>
        )}

        {panelType === 3 && (
          <NavLink to="/timesheet" onClick={onMenuClick} className={linkClass}>{iconTeamReport}<span className="font-medium">Report</span></NavLink>
        )}

        {isManagement && (
          <NavLink to="/chat" onClick={onMenuClick} className={linkClass}>{iconChat}<span className="font-medium">Chat</span></NavLink>
        )}
      </div>
    </aside>
  );
}
