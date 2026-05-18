import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Header } from '@/components/Header'
import Chat from '@/Chat'
import LogPage from '@/pages/LogPage'

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex flex-col h-dvh bg-white">
        <Header />
        {children}
      </div>
    </ProtectedRoute>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <AppShell>
              <Chat />
            </AppShell>
          }
        />
        <Route path="/log" element={<Navigate to={`/log/${todayStr()}`} replace />} />
        <Route
          path="/log/:date"
          element={
            <AppShell>
              <LogPage />
            </AppShell>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
