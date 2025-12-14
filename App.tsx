
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './services/AppContext';
import { Layout } from './components/Layout';
import { ToastContainer } from './components/ToastContainer';
import { Login } from './pages/Login';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { ManageAssignments } from './pages/ManageAssignments';
import { ScoreRecording } from './pages/ScoreRecording';
import { AttendanceRecording } from './pages/AttendanceRecording';
import { StudentManagement } from './pages/StudentManagement';
import { StudentPortal } from './pages/StudentPortal';
import { HealthData } from './pages/HealthData';
import { ManageQuizzes } from './pages/ManageQuizzes';
import { TakeQuiz } from './pages/TakeQuiz';
import { Role } from './types';
import { ErrorBoundary } from './components/ErrorBoundary';

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

const QuizRoute = ({ children }: React.PropsWithChildren) => {
  const { currentUser } = useApp();
  if (!currentUser || currentUser.role !== Role.STUDENT) return <Navigate to="/login" />;
  // Quiz doesn't use standard layout
  return <>{children}</>;
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
      <Route path="/teacher/quizzes" element={
        <ProtectedRoute allowedRole={Role.TEACHER}>
          <ManageQuizzes />
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
      
      {/* Quiz Interface (No Layout) */}
      <Route path="/student/quiz/:quizId" element={
        <QuizRoute>
           <TakeQuiz />
        </QuizRoute>
      } />

      {/* Default Redirect */}
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <HashRouter>
          <AppRoutes />
          <ToastContainer />
        </HashRouter>
      </AppProvider>
    </ErrorBoundary>
  );
}
