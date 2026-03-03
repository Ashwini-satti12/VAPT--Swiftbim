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
import CreateTeamPM from './pages/ProjectManager/CreateTeamPM';
import TeamtaskPM from './pages/ProjectManager/TeamtaskPM';
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
import DashboardTD from './pages/TechnicalDirector/DashboardTD';
import ConsultantTD from './pages/TechnicalDirector/ConsultantTD';
import ConsultantdetailsTD from './pages/TechnicalDirector/ConsultantdetailsTD';
import ClientTD from './pages/TechnicalDirector/ClientTD';
import ProjectsTD from './pages/TechnicalDirector/ProjectsTD';
import MytaskTD from './pages/TechnicalDirector/MytaskTD';
import TeamtaskTD from './pages/TechnicalDirector/TeamtaskTD';
import CreateteamTD from './pages/TechnicalDirector/CreateteamTD';
import TrackerTD from './pages/TechnicalDirector/TrackerTD';
import TeamReportTD from './pages/TechnicalDirector/TeamReportTD';
import ChatTD from './pages/TechnicalDirector/ChatTD';
import MytaskViewTD from './pages/TechnicalDirector/MytaskViewTD';
import PartnerTD from './pages/TechnicalDirector/PartnerTD';
import PartnerView from './pages/TechnicalDirector/PartnerView/PartnerView';
import BiddingTD from './pages/TechnicalDirector/BiddingTD';
import ProposalTD from './pages/TechnicalDirector/ProposalTD';

/* Bim Lead */
import DashboardBL from './pages/BimLead/DashboardBL';
import ConsultantBL from './pages/BimLead/ConsultantBL';
import ConsultantdetailsBL from './pages/BimLead/ConsultantdetailsBL';
import ProjectsBL from './pages/BimLead/ProjectsBL';
import MytaskBL from './pages/BimLead/MytaskBL';
import TeamtaskBL from './pages/BimLead/TeamtaskBL';
import CreateteamBL from './pages/BimLead/CreateteamBL';
import TrackerBL from './pages/BimLead/TrackerBL';
import TeamReportBL from './pages/BimLead/TeamReportBL';
import ChatBL from './pages/BimLead/ChatBL';
import MytaskViewBL from './pages/BimLead/MytaskViewBL';
import ClientBL from './pages/BimLead/ClientBL';
import PartnerBL from './pages/BimLead/PartnerBL';

/* Bim Coordinator */
import DashboardBC from './pages/BimCoordinator/DashboardBC';
import ConsultantBC from './pages/BimCoordinator/ConsultantBC';
import ConsultantdetailsBC from './pages/BimCoordinator/ConsultantdetailsBC';
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
import MytaskBM from './pages/BimModeler/MytaskBM';
import TeamReportBM from './pages/BimModeler/TeamReportBM';


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
            <Route path="tasks/taskview" element={<MytaskViewPM />} />
            <Route path="tasks/team" element={<MyTasksPM />} />
            <Route path="tasks/:id" element={<TaskDetailPM />} />
            <Route path="teamtask" element={<TeamtaskPM />} />
            <Route path="create-team" element={<CreateTeamPM />} />
            <Route path="tracker" element={<TrackerPM />} />
            <Route path="timesheet" element={<TimesheetPM />} />
            <Route path="chat" element={<ChatPM />} />
            <Route path="leave" element={<LeavePM />} />
            <Route path="profile" element={<ProfilePM />} />

            {/* Technical Director Routes */}
            <Route path="td/dashboard" element={<DashboardTD />} />
            <Route path="td/consultants" element={<ConsultantTD />} />
            <Route path="td/consultants/:id" element={<ConsultantdetailsTD />} />
            <Route path="td/clients" element={<ClientTD />} />
            <Route path="td/projects" element={<ProjectsTD />} />
            <Route path="td/mytasks" element={<MytaskTD />} />
            <Route path="td/teamtasks" element={<TeamtaskTD />} />
            <Route path="td/createteam" element={<CreateteamTD />} />
            <Route path="td/tracker" element={<TrackerTD />} />
            <Route path="td/teamreport" element={<TeamReportTD />} />
            <Route path="td/chat" element={<ChatTD />} />
            <Route path="td/mytasks/view" element={<MytaskViewTD />} />
            <Route path="td/partner" element={<PartnerTD />} />
            <Route path="td/partner/:id" element={<PartnerView />} />
            <Route path="td/bidding" element={<BiddingTD />} />
            <Route path="td/manage-proposal" element={<ProposalTD />} />
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
            <Route path="bl/partner" element={<PartnerBL />} />
            <Route path="bl/partner/:id" element={<PartnerView />} />
            <Route path="bl/bidding" element={<BiddingTD />} />
            <Route path="bl/manage-proposal" element={<ProposalTD />} />

            {/* Bim Coordinator Routes */}
            <Route path="bc/dashboard" element={<DashboardBC />} />
            <Route path="bc/consultants" element={<ConsultantBC />} />
            <Route path="bc/consultants/:id" element={<ConsultantdetailsBC />} />
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
            <Route path="bm/mytasks" element={<MytaskBM />} />
            <Route path="bm/teamreport" element={<TeamReportBM />} />


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
