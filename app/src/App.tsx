import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Header } from '@/components/Header'
import Chat from '@/Chat'
import LogPage from '@/pages/LogPage'
import LibraryPage from '@/pages/LibraryPage'
import LabelDetailPage from '@/pages/LabelDetailPage'
import SettingsPage from '@/pages/SettingsPage'
import RecipesPage from '@/pages/RecipesPage'
import RecipeDetailPage from '@/pages/RecipeDetailPage'

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
        <Route
          path="/library"
          element={
            <AppShell>
              <LibraryPage />
            </AppShell>
          }
        />
        <Route
          path="/library/:id"
          element={
            <AppShell>
              <LabelDetailPage />
            </AppShell>
          }
        />
        <Route
          path="/settings"
          element={
            <AppShell>
              <SettingsPage />
            </AppShell>
          }
        />
        <Route
          path="/recipes"
          element={
            <AppShell>
              <RecipesPage />
            </AppShell>
          }
        />
        <Route
          path="/recipes/:id"
          element={
            <AppShell>
              <RecipeDetailPage />
            </AppShell>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
