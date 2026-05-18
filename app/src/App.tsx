import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Header } from '@/components/Header'
import Chat from '@/Chat'

function App() {
  return (
    <ProtectedRoute>
      <div className="flex flex-col h-dvh bg-white">
        <Header />
        <Chat />
      </div>
    </ProtectedRoute>
  )
}

export default App
