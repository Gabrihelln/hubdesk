import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DashboardProvider } from './contexts/DashboardContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Mail from './pages/Mail';
import Calendar from './pages/Calendar';
import Drive from './pages/Drive';
import Tasks from './pages/Tasks';
import Notes from './pages/Notes';
import { ErrorBoundary } from './components/ErrorBoundary';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <DashboardProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/mail" element={<Mail />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/drive" element={<Drive />} />
          <Route path="/docs" element={<Drive filter="docs" title="Documents" />} />
          <Route path="/sheets" element={<Drive filter="sheets" title="Spreadsheets" />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </DashboardProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
