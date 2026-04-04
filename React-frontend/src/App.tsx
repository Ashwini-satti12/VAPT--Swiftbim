import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ClientProtectedRoute } from './components/ClientProtectedRoute';
import AppLayout from './components/AppLayout';

import Login from './pages/Login/Login';
import ClientLogin from './pages/Client/ClientLogin';
import DashboardPM from './pages/ProjectManager/DashboardPM';
import EmployeesPM from './pages/ProjectManager/EmployeesPM';
import Clients from './pages/Client/Clients';
import AddClient from './pages/Client/AddClient';
import EditClient from './pages/Client/EditClient';
import ViewClientDetails from './pages/Client/ViewClientDetails';
import ProjectsPM from './pages/ProjectManager/ProjectsPM';
import MyTasksPM from './pages/ProjectManager/MyTasksPM';
import AddTaskPM from './pages/ProjectManager/AddTaskPM';
import MytaskViewPM from './pages/ProjectManager/MytaskViewPM';
import CreateteamPM from './pages/ProjectManager/CreateteamPM';
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
import ManageLeavePM from './pages/ProjectManager/ManageLeavePM';

/*Technical Director */
import DashboardTD from './pages/TechnicalDirector/DashboardTD';
import ConsultantTD from './pages/TechnicalDirector/ConsultantTD';
import AddConsultantTD from './pages/TechnicalDirector/AddConsultantTD';
import ConsultantdetailsTD from './pages/TechnicalDirector/ConsultantdetailsTD';
import ClientTD from './pages/TechnicalDirector/ClientTD';
import AddClientTD from './pages/TechnicalDirector/AddClientTD';
import EditClientTD from './pages/TechnicalDirector/EditClientTD';
import ClientViewTD from './pages/TechnicalDirector/ClientViewTD';
import ProjectsTD from './pages/TechnicalDirector/ProjectsTD';
import MytaskTD from './pages/TechnicalDirector/MytaskTD';
import AddTaskTD from './pages/TechnicalDirector/AddTaskTD';
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
import CreateProposalTD from './pages/TechnicalDirector/CreateProposalTD';
import ViewProposalTD from './pages/TechnicalDirector/ViewProposalTD';
import ManageLeaveTD from './pages/TechnicalDirector/ManageLeaveTD';

/* Bim Lead */
import DashboardBL from './pages/BimLead/DashboardBL';
import ConsultantBL from './pages/BimLead/ConsultantBL';
import AddConsultantBL from './pages/BimLead/AddConsultantBL';
import EditConsultantBL from './pages/BimLead/EditConsultantBL';
import ConsultantdetailsBL from './pages/BimLead/ConsultantdetailsBL';
import ProjectsBL from './pages/BimLead/ProjectsBL';
import MytaskBL from './pages/BimLead/MytaskBL';
import AddTaskBL from './pages/BimLead/AddTaskBL';
import TeamtaskBL from './pages/BimLead/TeamtaskBL';
import CreateteamBL from './pages/BimLead/CreateteamBL';
import TrackerBL from './pages/BimLead/TrackerBL';
import TeamReportBL from './pages/BimLead/TeamReportBL';
import ChatBL from './pages/BimLead/ChatBL';
import MytaskViewBL from './pages/BimLead/MytaskViewBL';
import ClientBL from './pages/BimLead/ClientBL';
import PartnerBL from './pages/BimLead/PartnerBL';
import MangeLeaveBL from './pages/BimLead/MangeLeaveBL';

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
import ManageLeaveBC from './pages/BimCoordinator/ManageLeaveBC';
import AddConsultantBC from './pages/BimCoordinator/AddConsultantBC';
import EditConsultantBC from './pages/BimCoordinator/EditConsultantBC';
import AddTaskBC from './pages/BimCoordinator/AddTaskBC';

/* Bim Modeler */
import DashboardBM from './pages/BimModeler/DashboardBM';
import MytaskBM from './pages/BimModeler/MytaskBM';
import MytaskViewBM from './pages/BimModeler/MytaskViewBM';
import TeamReportBM from './pages/BimModeler/TeamReportBM';
import ManageLeave from './pages/BimModeler/ManageLeave';


/* Vendor */
import DashboardV from './pages/Vendor/DashboardV';
import ConsultantV from './pages/Vendor/ConsultantV';
import ConsultantdetailsV from './pages/Vendor/ConsultantdetailsV';
import ClientV from './pages/Vendor/ClientV';
import ProjectsV from './pages/Vendor/ProjectsV';
import MytaskV from './pages/Vendor/MytaskV';
import AddTaskV from './pages/Vendor/AddTaskV';
import TeamtaskV from './pages/Vendor/TeamtaskV';
import CreateteamV from './pages/Vendor/CreateteamV';
import TrackerV from './pages/Vendor/TrackerV';
import ResourcesV from './pages/Vendor/ResourcesV';
import TeamReportV from './pages/Vendor/TeamReportV';
import ChatV from './pages/Vendor/ChatV';
import MytaskViewV from './pages/Vendor/MytaskViewV';
import BiddingV from './pages/Vendor/BiddingV';
import ProposalsV from './pages/Vendor/ProposalsV';
import CompanyProfileV from './pages/Vendor/CompanyProfileV';
import CompanyProfileEditV from './pages/Vendor/CompanyProfileEditV';
import MilestonesV from './pages/Vendor/MilestonesV';
import CommunicationV from './pages/Vendor/CommunicationV';
import PerformanceV from './pages/Vendor/PerformanceV';

/* Vendor PM */
import DashboardPMV from './pages/Vendor/ProjectManager/DashboardPMV';
import ProjectsPMV from './pages/Vendor/ProjectManager/ProjectsPMV';
import MytaskPMV from './pages/Vendor/ProjectManager/MytaskPMV';
import AddEditTaskPMV from './pages/Vendor/ProjectManager/AddEditTaskPMV';
import TeamtaskPMV from './pages/Vendor/ProjectManager/TeamtaskPMV';
import CreateteamPMV from './pages/Vendor/ProjectManager/CreateteamPMV';
import ChatPMV from './pages/Vendor/ProjectManager/ChatPMV';
import ProposalsPMV from './pages/Vendor/ProjectManager/ProposalsPMV';



/* Vendor Employee */
import DashboardEV from './pages/Vendor/Employee/DashboardEV';
import MytaskEV from './pages/Vendor/Employee/MytaskEV';
import MyTaskViewEV from './pages/Vendor/Employee/MyTaskViewEV';
import AddEditTaskEV from './pages/Vendor/Employee/AddEditTaskEV';
import TeamtaskEV from './pages/Vendor/Employee/TeamtaskEV';
import ChatEV from './pages/Vendor/Employee/ChatEV';

/* Vendor BIM Lead */
import VendorBimLeadDashboard from './pages/Vendor/VendorBimLead/VendorBimLeadDashboard';
import VendorBimLeadProjects from './pages/Vendor/VendorBimLead/VendorBimLeadProjects';
import VendorBimLeadTasks from './pages/Vendor/VendorBimLead/VendorBimLeadTasks';
import VendorBimLeadCreateTeam from './pages/Vendor/VendorBimLead/VendorBimLeadCreateTeam';
import VendorBimLeadTeamTasks from './pages/Vendor/VendorBimLead/VendorBimLeadTeamTasks';
import VendorBimLeadCommunication from './pages/Vendor/VendorBimLead/VendorBimLeadCommunication';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* <Route path="/" element={<Login />} /> */}
          <Route path="/" element={<Navigate to="/login" />} />
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
            <Route path="clients/add" element={<AddClient />} />
            <Route path="clients/:id/edit" element={<EditClient />} />
            <Route path="clients/:id/view" element={<ViewClientDetails />} />
            <Route path="clients/:id" element={<ClientDetail />} />
            <Route path="projects" element={<ProjectsPM />} />
            <Route path="projects/:id" element={<ProjectDetailPM />} />
            <Route path="tasks" element={<MyTasksPM />} />
            <Route path="tasks/add" element={<AddTaskPM />} />
            <Route path="tasks/taskview" element={<MytaskViewPM />} />
            <Route path="tasks/team" element={<MyTasksPM />} />
            <Route path="tasks/:id" element={<TaskDetailPM />} />
            <Route path="teamtask" element={<TeamtaskPM />} />
            <Route path="create-team" element={<CreateteamPM />} />
            <Route path="tracker" element={<TrackerPM />} />
            <Route path="timesheet" element={<TimesheetPM />} />
            <Route path="chat" element={<ChatPM />} />
            <Route path="leave" element={<LeavePM />} />
            <Route path="profile" element={<ProfilePM />} />
            <Route path="pm/manage-leave" element={<ManageLeavePM />} />

            {/* Technical Director Routes */}
            <Route path="td/dashboard" element={<DashboardTD />} />
            <Route path="td/consultants" element={<ConsultantTD />} />
            <Route path="td/consultants/add" element={<AddConsultantTD />} />
            <Route path="td/consultants/:id" element={<ConsultantdetailsTD />} />
            <Route path="td/clients" element={<ClientTD />} />
            <Route path="td/clients/add" element={<AddClientTD />} />
            <Route path="td/clients/:id/view" element={<ClientViewTD />} />
            <Route path="td/clients/:id/edit" element={<EditClientTD />} />
            <Route path="td/projects" element={<ProjectsTD />} />
            <Route path="td/mytasks" element={<MytaskTD />} />
            <Route path="td/mytasks/add" element={<AddTaskTD />} />
            <Route path="td/teamtasks/add" element={<AddTaskTD />} />
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
            <Route path="td/proposals" element={<ProposalTD />} />
            <Route path="td/create-proposal" element={<CreateProposalTD />} />
            <Route path="td/view-proposal" element={<ViewProposalTD />} />
            <Route path="td/manage-leave" element={<ManageLeaveTD />} />
            {/* Bim Lead Routes */}
            <Route path="bl/dashboard" element={<DashboardBL />} />
            <Route path="bl/consultants" element={<ConsultantBL />} />
            <Route path="bl/consultants/add" element={<AddConsultantBL />} />
            <Route path="bl/consultants/:id/edit" element={<EditConsultantBL />} />
            <Route path="bl/consultants/:id" element={<ConsultantdetailsBL />} />
            <Route path="bl/clients" element={<ClientBL />} />
            <Route path="bl/projects" element={<ProjectsBL />} />
            <Route path="bl/mytasks" element={<MytaskBL />} />
            <Route path="bl/mytasks/add" element={<AddTaskBL />} />
            <Route path="bl/teamtasks/add" element={<AddTaskBL />} />
            <Route path="bl/teamtasks" element={<TeamtaskBL />} />
            <Route path="bl/createteam" element={<CreateteamBL />} />
            <Route path="bl/tracker" element={<TrackerBL />} />
            <Route path="bl/teamreport" element={<TeamReportBL />} />
            <Route path="bl/chat" element={<ChatBL />} />
            <Route path="bl/mytasks/view" element={<MytaskViewBL />} />
            <Route path="bl/partner" element={<PartnerBL />} />
            <Route path="bl/partner/:id" element={<PartnerView />} />
            <Route path="bl/bidding" element={<BiddingTD />} />
            <Route path="bl/manage-leave" element={<MangeLeaveBL />} />

            {/* Bim Coordinator Routes */}
            <Route path="bc/dashboard" element={<DashboardBC />} />
            <Route path="bc/consultants" element={<ConsultantBC />} />
            <Route path="bc/consultants/add" element={<AddConsultantBC />} />
            <Route path="bc/consultants/edit/:id" element={<EditConsultantBC />} />
            <Route path="bc/consultants/:id" element={<ConsultantdetailsBC />} />
            <Route path="bc/projects" element={<ProjectsBC />} />
            <Route path="bc/mytasks" element={<MytaskBC />} />
            <Route path="bc/mytasks/add" element={<AddTaskBC />} />
            <Route path="bc/teamtasks/add" element={<AddTaskBC />} />
            <Route path="bc/teamtasks" element={<TeamtaskBC />} />
            <Route path="bc/createteam" element={<CreateteamBC />} />
            <Route path="bc/tracker" element={<TrackerBC />} />
            <Route path="bc/teamreport" element={<TeamReportBC />} />
            <Route path="bc/chat" element={<ChatBC />} />
            <Route path="bc/mytasks/view" element={<MytaskViewBC />} />
            <Route path="bc/manage-leave" element={<ManageLeaveBC />} />

            {/* Bim Modeler Routes */}
            <Route path="bm/dashboard" element={<DashboardBM />} />
            <Route path="bm/mytasks" element={<MytaskBM />} />
            <Route path="bm/mytasks/view/:id" element={<MytaskViewBM />} />
            <Route path="bm/teamreport" element={<TeamReportBM />} />
            <Route path="bm/manage-leave" element={<ManageLeave />} />


            {/* Vendor Routes */}
            <Route path="v/dashboard" element={<DashboardV />} />
            <Route path="v/opportunities" element={<BiddingV />} />
            <Route path="v/mybids" element={<BiddingV />} />
            <Route path="v/proposals" element={<ProposalsV />} />
            <Route path="v/consultants" element={<ConsultantV />} />
            <Route path="v/consultants/:id" element={<ConsultantdetailsV />} />
            <Route path="v/clients" element={<ClientV />} />
            <Route path="v/projects" element={<ProjectsV />} />
            <Route path="v/mytasks" element={<MytaskV />} />
            <Route path="v/mytasks/add" element={<AddTaskV />} />
            <Route path="v/mytasks/edit" element={<AddTaskV />} />
            <Route path="v/teamtasks" element={<TeamtaskV />} />
            <Route path="v/createteam" element={<CreateteamV />} />
            <Route path="v/tracker" element={<TrackerV />} />
            <Route path="v/teamreport" element={<TeamReportV />} />
            <Route path="v/chat" element={<ChatV />} />
            <Route path="v/mytasks/view/:id" element={<MytaskViewV />} />
            <Route path="v/company-profile" element={<CompanyProfileV />} />
            <Route path="v/company-profile/edit" element={<CompanyProfileEditV />} />
            <Route path="v/milestones" element={<MilestonesV />} />
            <Route path="v/communication" element={<CommunicationV />} />
            <Route path="v/performance" element={<PerformanceV />} />
            <Route path="v/resources" element={<ResourcesV />} />

            {/* Vendor PM Routes */}
            <Route path="vpm/dashboard" element={<DashboardPM />} />
            <Route path="vpm/projects" element={<ProjectsPMV />} />
            <Route path="vpm/mytasks" element={<MytaskPMV />} />
            <Route path="vpm/mytasks/view/:id" element={<MytaskViewV />} />
            <Route path="/vpm/mytasks/add" element={<AddEditTaskPMV />} />
            <Route path="/vpm/mytasks/edit" element={<AddEditTaskPMV />} />
            <Route path="/vpm/teamtasks" element={<TeamtaskPMV />} />
            <Route path="vpm/teamtasks/view/:id" element={<MytaskViewV />} />
            <Route path="vpm/teamtasks/add" element={<AddEditTaskPMV />} />
            <Route path="vpm/teamtasks/edit" element={<AddEditTaskPMV />} />
            <Route path="vpm/opportunities" element={<BiddingV />} />
            <Route path="vpm/proposals" element={<ProposalsPMV />} />
            <Route path="vpm/createteam" element={<CreateteamPMV />} />
            <Route path="vpm/resources" element={<ResourcesV />} />
            <Route path="vpm/communication" element={<ChatPMV />} />

            {/* Vendor Employee Routes */}
            <Route path="ve/dashboard" element={<DashboardEV />} />
            <Route path="ve/mytasks/add" element={<AddEditTaskEV />} />
            <Route path="ve/mytasks/view/:id" element={<MyTaskViewEV />} />
            <Route path="ve/mytasks/edit/:id" element={<AddEditTaskEV />} />
            <Route path="ve/mytasks" element={<MytaskEV />} />
            <Route path="ve/teamtasks/add" element={<AddEditTaskEV />} />
            <Route path="ve/teamtasks/edit/:id" element={<AddEditTaskEV />} />
            <Route path="ve/teamtasks" element={<TeamtaskEV />} />
            <Route path="ve/communication" element={<ChatEV />} />

            {/* Vendor BIM Lead Routes */}
            <Route path="vendor-bim-lead/dashboard" element={<VendorBimLeadDashboard />} />
            <Route path="vendor-bim-lead/projects" element={<VendorBimLeadProjects />} />
            <Route path="vendor-bim-lead/tasks" element={<VendorBimLeadTasks />} />
            <Route path="vendor-bim-lead/opportunities" element={<BiddingV />} />
            <Route path="vendor-bim-lead/mybids" element={<BiddingV />} />
            <Route path="vendor-bim-lead/createteam" element={<VendorBimLeadCreateTeam />} />
            <Route path="vendor-bim-lead/resources" element={<ResourcesV />} />
            <Route path="vendor-bim-lead/communication" element={<VendorBimLeadCommunication />} />
            <Route path="vendor-bim-lead/teamtasks" element={<VendorBimLeadTeamTasks />} />
            <Route path="vendor-bim-lead/tasks/view/:id" element={<MytaskViewV />} />
            {/* <Route path="ve/mytasks" element={<MytaskEV />} />
            <Route path="ve/teamtasks" element={<TeamtaskV />} /> */}
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
