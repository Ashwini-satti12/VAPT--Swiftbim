import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ClientProtectedRoute } from './components/ClientProtectedRoute';
import LandingOrRedirect from './components/LandingOrRedirect';
import AppLayout from './components/AppLayout';

import Login from './pages/Login/Login';
import ClientLogin from './pages/Client/ClientLogin';
import Dashboard from './pages/ProjectManager/Dashboard';
import Employees from './pages/ProjectManager/Employees';
import Clients from './pages/Client/Clients';
import Projects from './pages/ProjectManager/Projects';
import Tasks from './pages/ProjectManager/Tasks';
import Team from './pages/ProjectManager/Team';
import Tracker from './pages/ProjectManager/Tracker';
import Timesheet from './pages/ProjectManager/Timesheet';
import Chat from './pages/ProjectManager/Chat';
import Profile from './pages/ProjectManager/Profile';
import Leave from './pages/ProjectManager/Leave';
import Welcome from './pages/ProjectManager/Welcome';
import ProjectDetail from './pages/ProjectManager/ProjectDetail';
import TaskDetail from './pages/ProjectManager/TaskDetail';
import EmployeeDetail from './pages/ProjectManager/EmployeeDetail';
import ClientDetail from './pages/Client/ClientDetail';
import ClientDashboard from './pages/Client/ClientDashboard';
import ClientProjectDetail from './pages/Client/ClientProjectDetail';
import ClientMilestones from './pages/Client/ClientMilestones';
import ClientChat from './pages/Client/ClientChat';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingOrRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/client-login" element={<ClientLogin />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route element={<ClientProtectedRoute><AppLayout /></ClientProtectedRoute>}>
            <Route path="client" element={<Navigate to="/client/dashboard" replace />} />
            <Route path="client/dashboard" element={<ClientDashboard />} />
            <Route path="client/projects/:id" element={<ClientProjectDetail />} />
            <Route path="client/projects/:id/milestones" element={<ClientMilestones />} />
            <Route path="client/chat" element={<ClientChat />} />
          </Route>
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="employees" element={<Employees />} />
            <Route path="employees/:id" element={<EmployeeDetail />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/:id" element={<ClientDetail />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="tasks/team" element={<Tasks />} />
            <Route path="tasks/:id" element={<TaskDetail />} />
            <Route path="team" element={<Team />} />
            <Route path="tracker" element={<Tracker />} />
            <Route path="timesheet" element={<Timesheet />} />
            <Route path="chat" element={<Chat />} />
            <Route path="leave" element={<Leave />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
