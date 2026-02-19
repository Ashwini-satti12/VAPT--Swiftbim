import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

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

interface SidebarProps {
  onMenuClick?: () => void;
}

export default function Sidebar({ onMenuClick }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const panelType = user?.panel_type ?? 3;
  const userRole = user?.user_role || '';
  const isManagement = panelType === 1;
  const isTeamLeader = panelType === 2;
  const showClients = isManagement && !HIDE_CLIENTS_ROLES.includes(userRole);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-150 text-[13.5px] font-medium w-full ${isActive
      ? 'bg-[#DD4342] text-white'
      : 'text-slate-600 hover:bg-slate-100 hover:text-[#DD4342]'
    }`;

  const Icon = ({ src, isActive }: { src: string; isActive: boolean }) => (
    <img
      src={src}
      alt=""
      className="w-5 h-5 shrink-0 object-contain"
      style={isActive ? { filter: 'brightness(0) invert(1)' } : {}}
    />
  );

  return (
    <div
      className="flex flex-col mt-4 w-44 rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.95)',
        boxShadow: '0 2px 20px rgba(0,0,0,0.08)',
      }}
    >
      {/* Nav links */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        <NavLink to="/dashboard" onClick={onMenuClick} className={linkClass}>
          {({ isActive }) => <><Icon src={dashboardIcon} isActive={isActive} /><span>Dashboard</span></>}
        </NavLink>

        {isManagement && (
          <NavLink to="/employees" onClick={onMenuClick} className={linkClass}>
            {({ isActive }) => <><Icon src={consultantIcon} isActive={isActive} /><span>Consultant</span></>}
          </NavLink>
        )}

        {isManagement && showClients && (
          <NavLink to="/clients" onClick={onMenuClick} className={linkClass}>
            {({ isActive }) => <><Icon src={clientIcon} isActive={isActive} /><span>Clients</span></>}
          </NavLink>
        )}

        {(isManagement || isTeamLeader) && (
          <NavLink to="/projects" onClick={onMenuClick} className={linkClass}>
            {({ isActive }) => <><Icon src={projectIcon} isActive={isActive} /><span>Projects</span></>}
          </NavLink>
        )}

        <NavLink to="/tasks" onClick={onMenuClick} className={linkClass}>
          {({ isActive }) => <><Icon src={myTaskIcon} isActive={isActive} /><span>My Task</span></>}
        </NavLink>

        {(isManagement || isTeamLeader) && (
          <NavLink to="/tasks/team" onClick={onMenuClick} className={linkClass}>
            {({ isActive }) => <><Icon src={teamTaskIcon} isActive={isActive} /><span>Team Task</span></>}
          </NavLink>
        )}

        {isManagement && (
          <NavLink to="/team" onClick={onMenuClick} className={linkClass}>
            {({ isActive }) => <><Icon src={createTeamIcon} isActive={isActive} /><span>Create Team</span></>}
          </NavLink>
        )}

        {isManagement && (
          <NavLink to="/tracker" onClick={onMenuClick} className={linkClass}>
            {({ isActive }) => <><Icon src={trackerIcon} isActive={isActive} /><span>Tracker</span></>}
          </NavLink>
        )}

        {(isManagement || isTeamLeader) && (
          <NavLink to="/timesheet" onClick={onMenuClick} className={linkClass}>
            {({ isActive }) => <><Icon src={teamReportIcon} isActive={isActive} /><span>Team Report</span></>}
          </NavLink>
        )}

        {panelType === 3 && (
          <NavLink to="/timesheet" onClick={onMenuClick} className={linkClass}>
            {({ isActive }) => <><Icon src={teamReportIcon} isActive={isActive} /><span>Report</span></>}
          </NavLink>
        )}

        {isManagement && (
          <NavLink to="/chat" onClick={onMenuClick} className={linkClass}>
            {({ isActive }) => <><Icon src={chatIcon} isActive={isActive} /><span>Chat</span></>}
          </NavLink>
        )}
      </nav>

      {/* Divider */}
      <div className="mx-3 border-t border-slate-100" />

      {/* Log Out */}
      <div className="p-2">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl w-full text-[13.5px] font-medium text-[#DD4342] hover:bg-red-50 transition-all duration-150"
        >
          {/* Logout icon — matches reference exactly */}
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="#DD4342" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
}
