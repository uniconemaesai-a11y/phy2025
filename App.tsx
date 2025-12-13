import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './services/AppContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { ManageAssignments } from './pages/ManageAssignments';
import { ScoreRecording } from './pages/ScoreRecording';
import { AttendanceRecording } from './pages/AttendanceRecording';
import { StudentManagement } from './pages/StudentManagement';
import { StudentPortal } from './pages/StudentPortal';
import { HealthData } from './pages/HealthData';
import { Role } from './types';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRole }: React.PropsWithChildren<{ allowedRole?: Role }>) => {
  const { currentUser } = useApp();
  
  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (allowedRole && currentUser.role !== allowedRole) {
    // Redirect to their respective home if role doesn't match
    return <Navigate to={currentUser.role === Role.TEACHER ? '/teacher' : '/student'} />;
  }

  return <Layout>{children}</Layout>;
};

const AppRoutes = () => {
  const { currentUser } = useApp();

  return (
    <Routes>
      <Route path="/login" element={!currentUser ? <Login /> : <Navigate to={currentUser.role === Role.TEACHER ? '/teacher' : '/student'} />} />
      
      {/* Teacher Routes */}
      <Route path="/teacher" element={
        <ProtectedRoute allowedRole={Role.TEACHER}>
          <TeacherDashboard />
        </ProtectedRoute>
      } />
      <Route path="/teacher/assignments" element={
        <ProtectedRoute allowedRole={Role.TEACHER}>
          <ManageAssignments />
        </ProtectedRoute>
      } />
      <Route path="/teacher/scores" element={
        <ProtectedRoute allowedRole={Role.TEACHER}>
          <ScoreRecording />
        </ProtectedRoute>
      } />
      <Route path="/teacher/attendance" element={
        <ProtectedRoute allowedRole={Role.TEACHER}>
          <AttendanceRecording />
        </ProtectedRoute>
      } />
      <Route path="/teacher/health" element={
        <ProtectedRoute allowedRole={Role.TEACHER}>
          <HealthData />
        </ProtectedRoute>
      } />
      <Route path="/teacher/students" element={
        <ProtectedRoute allowedRole={Role.TEACHER}>
          <StudentManagement />
        </ProtectedRoute>
      } />

      {/* Student Routes */}
      <Route path="/student" element={
        <ProtectedRoute allowedRole={Role.STUDENT}>
          <StudentPortal />
        </ProtectedRoute>
      } />
      <Route path="/student/assignments" element={
        <ProtectedRoute allowedRole={Role.STUDENT}>
          <StudentPortal /> 
        </ProtectedRoute>
      } />

      {/* Default Redirect */}
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AppProvider>
  );
}