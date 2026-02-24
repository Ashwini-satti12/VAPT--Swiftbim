import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ClientProtectedRoute } from './components/ClientProtectedRoute';
import LandingOrRedirect from './components/LandingOrRedirect';
import AppLayout from './components/AppLayout';

import Login from './pages/Login/Login';
import ClientLogin from './pages/Client/ClientLogin';
import DashboardPM from './pages/ProjectManager/DashboardPM';
import EmployeesPM from './pages/ProjectManager/EmployeesPM';
import Clients from './pages/Client/Clients';
import ProjectsPM from './pages/ProjectManager/ProjectsPM';
import MyTasksPM from './pages/ProjectManager/MyTasksPM';
import MytaskViewPM from './pages/ProjectManager/MytaskViewPM';
import TeamPM from './pages/ProjectManager/TeamtaskPM';
import TrackerPM from './pages/ProjectManager/TrackerPM';
import TimesheetPM from './pages/ProjectManager/TeamreportPM';
import ChatPM from './pages/ProjectManager/ChatPM';
import ProfilePM from './pages/ProjectManager/ProfilePM';
import LeavePM from './pages/ProjectManager/LeavePM';
import WelcomePM from './pages/ProjectManager/Welcome';
import ProjectDetailPM from './pages/ProjectManager/ProjectDetailPM';
import TaskDetailPM from './pages/ProjectManager/TaskDetailPM';
import EmployeeDetailPM from './pages/ProjectManager/EmployeeDetailPM';
import ClientDetail from './pages/Client/ClientDetail';
import ClientDashboard from './pages/Client/ClientDashboard';
import ClientProjectDetail from './pages/Client/ClientProjectDetail';
import ClientMilestones from './pages/Client/ClientMilestones';
import ClientChat from './pages/Client/ClientChat';

/*Technical Director */
/* Bim Lead */
import DashboardBL from './pages/BimLead/DashboardBL';
import ConsultantBL from './pages/BimLead/ConsultantBL';
import ConsultantdetailsBL from './pages/BimLead/ConsultantdetailsBL';
import ClientBL from './pages/BimLead/ClientBL';
import ProjectsBL from './pages/BimLead/ProjectsBL';
import MytaskBL from './pages/BimLead/MytaskBL';
import TeamtaskBL from './pages/BimLead/TeamtaskBL';
import CreateteamBL from './pages/BimLead/CreateteamBL';
import TrackerBL from './pages/BimLead/TrackerBL';
import TeamReportBL from './pages/BimLead/TeamReportBL';
import ChatBL from './pages/BimLead/ChatBL';
import MytaskViewBL from './pages/BimLead/MytaskViewBL';

/* Bim Coordinator */
import DashboardBC from './pages/BimCoordinator/DashboardBC';
import ConsultantBC from './pages/BimCoordinator/ConsultantBC';
import ConsultantdetailsBC from './pages/BimCoordinator/ConsultantdetailsBC';
import ClientBC from './pages/BimCoordinator/ClientBC';
import ProjectsBC from './pages/BimCoordinator/ProjectsBC';
import MytaskBC from './pages/BimCoordinator/MytaskBC';
import TeamtaskBC from './pages/BimCoordinator/TeamtaskBC';
import CreateteamBC from './pages/BimCoordinator/CreateteamBC';
import TrackerBC from './pages/BimCoordinator/TrackerBC';
import TeamReportBC from './pages/BimCoordinator/TeamReportBC';
import ChatBC from './pages/BimCoordinator/ChatBC';
import MytaskViewBC from './pages/BimCoordinator/MytaskViewBC';

/* Bim Modeler */
import DashboardBM from './pages/BimModeler/DashboardBM';
import ConsultantBM from './pages/BimModeler/ConsultantBM';
import ConsultantdetailsBM from './pages/BimModeler/ConsultantdetailsBM';
import ClientBM from './pages/BimModeler/ClientBM';
import ProjectsBM from './pages/BimModeler/ProjectsBM';
import MytaskBM from './pages/BimModeler/MytaskBM';
import TeamtaskBM from './pages/BimModeler/TeamtaskBM';
import CreateteamBM from './pages/BimModeler/CreateteamBM';
import TrackerBM from './pages/BimModeler/TrackerBM';
import TeamReportBM from './pages/BimModeler/TeamReportBM';
import ChatBM from './pages/BimModeler/ChatBM';
import MytaskViewBM from './pages/BimModeler/MytaskViewBM';

/* Vendor */
import DashboardV from './pages/Vendor/DashboardV';
import ConsultantV from './pages/Vendor/ConsultantV';
import ConsultantdetailsV from './pages/Vendor/ConsultantdetailsV';
import ClientV from './pages/Vendor/ClientV';
import ProjectsV from './pages/Vendor/ProjectsV';
import MytaskV from './pages/Vendor/MytaskV';
import TeamtaskV from './pages/Vendor/TeamtaskV';
import CreateteamV from './pages/Vendor/CreateteamV';
import TrackerV from './pages/Vendor/TrackerV';
import TeamReportV from './pages/Vendor/TeamReportV';
import ChatV from './pages/Vendor/ChatV';
import MytaskViewV from './pages/Vendor/MytaskViewV';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingOrRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/client-login" element={<ClientLogin />} />
          <Route path="/welcome" element={<WelcomePM />} />
          <Route element={<ClientProtectedRoute><AppLayout /></ClientProtectedRoute>}>
            <Route path="client" element={<Navigate to="/client/dashboard" replace />} />
            <Route path="client/dashboard" element={<ClientDashboard />} />
            <Route path="client/projects/:id" element={<ClientProjectDetail />} />
            <Route path="client/projects/:id/milestones" element={<ClientMilestones />} />
            <Route path="client/chat" element={<ClientChat />} />
          </Route>
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="dashboard" element={<DashboardPM />} />
            <Route path="employees" element={<EmployeesPM />} />
            <Route path="employees/:id" element={<EmployeeDetailPM />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/:id" element={<ClientDetail />} />
            <Route path="projects" element={<ProjectsPM />} />
            <Route path="projects/:id" element={<ProjectDetailPM />} />
            <Route path="tasks" element={<MyTasksPM />} />
            <Route path="tasks/taskview" element={<TaskViewPM />} />
            <Route path="tasks/team" element={<MyTasksPM />} />
            <Route path="tasks/:id" element={<TaskDetailPM />} />
            <Route path="team" element={<TeamPM />} />
            <Route path="tracker" element={<TrackerPM />} />
            <Route path="timesheet" element={<TimesheetPM />} />
            <Route path="chat" element={<ChatPM />} />
            <Route path="leave" element={<LeavePM />} />
            <Route path="profile" element={<ProfilePM />} />

            {/* Bim Lead Routes */}
            <Route path="bl/dashboard" element={<DashboardBL />} />
            <Route path="bl/consultants" element={<ConsultantBL />} />
            <Route path="bl/consultants/:id" element={<ConsultantdetailsBL />} />
            <Route path="bl/clients" element={<ClientBL />} />
            <Route path="bl/projects" element={<ProjectsBL />} />
            <Route path="bl/mytasks" element={<MytaskBL />} />
            <Route path="bl/teamtasks" element={<TeamtaskBL />} />
            <Route path="bl/createteam" element={<CreateteamBL />} />
            <Route path="bl/tracker" element={<TrackerBL />} />
            <Route path="bl/teamreport" element={<TeamReportBL />} />
            <Route path="bl/chat" element={<ChatBL />} />
            <Route path="bl/mytasks/view" element={<MytaskViewBL />} />

            {/* Bim Coordinator Routes */}
            <Route path="bc/dashboard" element={<DashboardBC />} />
            <Route path="bc/consultants" element={<ConsultantBC />} />
            <Route path="bc/consultants/:id" element={<ConsultantdetailsBC />} />
            <Route path="bc/clients" element={<ClientBC />} />
            <Route path="bc/projects" element={<ProjectsBC />} />
            <Route path="bc/mytasks" element={<MytaskBC />} />
            <Route path="bc/teamtasks" element={<TeamtaskBC />} />
            <Route path="bc/createteam" element={<CreateteamBC />} />
            <Route path="bc/tracker" element={<TrackerBC />} />
            <Route path="bc/teamreport" element={<TeamReportBC />} />
            <Route path="bc/chat" element={<ChatBC />} />
            <Route path="bc/mytasks/view" element={<MytaskViewBC />} />

            {/* Bim Modeler Routes */}
            <Route path="bm/dashboard" element={<DashboardBM />} />
            <Route path="bm/consultants" element={<ConsultantBM />} />
            <Route path="bm/consultants/:id" element={<ConsultantdetailsBM />} />
            <Route path="bm/clients" element={<ClientBM />} />
            <Route path="bm/projects" element={<ProjectsBM />} />
            <Route path="bm/mytasks" element={<MytaskBM />} />
            <Route path="bm/teamtasks" element={<TeamtaskBM />} />
            <Route path="bm/createteam" element={<CreateteamBM />} />
            <Route path="bm/tracker" element={<TrackerBM />} />
            <Route path="bm/teamreport" element={<TeamReportBM />} />
            <Route path="bm/chat" element={<ChatBM />} />
            <Route path="bm/mytasks/view" element={<MytaskViewBM />} />

            {/* Vendor Routes */}
            <Route path="v/dashboard" element={<DashboardV />} />
            <Route path="v/consultants" element={<ConsultantV />} />
            <Route path="v/consultants/:id" element={<ConsultantdetailsV />} />
            <Route path="v/clients" element={<ClientV />} />
            <Route path="v/projects" element={<ProjectsV />} />
            <Route path="v/mytasks" element={<MytaskV />} />
            <Route path="v/teamtasks" element={<TeamtaskV />} />
            <Route path="v/createteam" element={<CreateteamV />} />
            <Route path="v/tracker" element={<TrackerV />} />
            <Route path="v/teamreport" element={<TeamReportV />} />
            <Route path="v/chat" element={<ChatV />} />
            <Route path="v/mytasks/view" element={<MytaskViewV />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
