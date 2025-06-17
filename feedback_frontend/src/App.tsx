import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/Layout/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FeedbackManagement from './pages/FeedbackManagement';
import QALogs from './pages/QALogs';
import LowRelevanceAnalysis from './pages/LowRelevanceAnalysis';
import NoResultAnalysis from './pages/NoResultAnalysis';
import UserManagement from './pages/UserManagement';

// Ant Design theme configuration
const theme = {
  token: {
    colorPrimary: '#1890ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    borderRadius: 8,
    colorBgContainer: '#ffffff',
  },
};

function App() {
  return (
    <ConfigProvider theme={theme}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="feedback" element={<FeedbackManagement />} />
              <Route path="qa-logs" element={<QALogs />} />
              <Route path="low-relevance" element={<LowRelevanceAnalysis />} />
              <Route path="no-result" element={<NoResultAnalysis />} />
              <Route path="users" element={<UserManagement />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;