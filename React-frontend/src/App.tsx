import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ClientProtectedRoute } from './components/ClientProtectedRoute';
import LandingOrRedirect from './components/LandingOrRedirect';
import AppLayout from './components/AppLayout';
import ClientLayout from './components/ClientLayout';
import Login from './pages/Login';
import ClientLogin from './pages/ClientLogin';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Clients from './pages/Clients';
import Projects from './pages/Projects';
import Tasks from './pages/Tasks';
import Team from './pages/Team';
import Tracker from './pages/Tracker';
import Timesheet from './pages/Timesheet';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import Leave from './pages/Leave';
import Welcome from './pages/Welcome';
import ProjectDetail from './pages/ProjectDetail';
import TaskDetail from './pages/TaskDetail';
import EmployeeDetail from './pages/EmployeeDetail';
import ClientDetail from './pages/ClientDetail';
import ClientDashboard from './pages/ClientDashboard';
import ClientProjectDetail from './pages/ClientProjectDetail';
import ClientMilestones from './pages/ClientMilestones';
import ClientChat from './pages/ClientChat';
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
          <Route element={<ClientProtectedRoute><ClientLayout /></ClientProtectedRoute>}>
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
