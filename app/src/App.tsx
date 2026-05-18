import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Header } from '@/components/Header'
import Health from '@/Health'

function App() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white">
        <Header />
        <main>
          <Health />
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default App
