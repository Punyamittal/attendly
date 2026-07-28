import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { AdminRoute, StudentRoute } from '@/components/ProtectedRoute'
import { AdminLayout } from '@/layouts/AdminLayout'
import { LandingPage } from '@/pages/LandingPage'
import { StudentLoginPage } from '@/pages/StudentLoginPage'
import { AdminLoginPage } from '@/pages/AdminLoginPage'
import { StudentDashboardPage } from '@/pages/StudentDashboardPage'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { StudentsPage } from '@/pages/admin/StudentsPage'
import { AttendancePage } from '@/pages/admin/AttendancePage'
import { ScannerPage } from '@/pages/admin/ScannerPage'
import { ReportsPage } from '@/pages/admin/ReportsPage'
import { AnalyticsPage } from '@/pages/admin/AnalyticsPage'
import { SettingsPage } from '@/pages/admin/SettingsPage'

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/student/login" element={<StudentLoginPage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />

              <Route
                path="/student"
                element={
                  <StudentRoute>
                    <StudentDashboardPage />
                  </StudentRoute>
                }
              />

              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminLayout />
                  </AdminRoute>
                }
              >
                <Route index element={<AdminDashboardPage />} />
                <Route path="students" element={<StudentsPage />} />
                <Route path="attendance" element={<AttendancePage />} />
                <Route path="scanner" element={<ScannerPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              className: 'font-mono text-xs font-bold uppercase tracking-wide',
              style: {
                borderRadius: '0',
                background: 'var(--surface)',
                color: 'var(--fg)',
                border: '3px solid var(--glass-border)',
                boxShadow: '4px 4px 0 var(--ring)',
              },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
