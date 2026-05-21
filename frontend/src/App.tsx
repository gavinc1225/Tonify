import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Upload from './pages/Upload'
import Result from './pages/Result'
import Library from './pages/Library'

export default function App() {
  return (
    <BrowserRouter>
      <header className="border-b border-neutral-200 px-6 py-4">
        <nav className="flex items-center gap-6">
          <span className="font-semibold text-lg">Tonify</span>
          <Link to="/upload" className="text-neutral-700 hover:text-black">Upload</Link>
          <Link to="/library" className="text-neutral-700 hover:text-black">Library</Link>
          <Link to="/login" className="ml-auto text-neutral-700 hover:text-black">Login</Link>
        </nav>
      </header>
      <main className="px-6 py-8 max-w-3xl mx-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/upload" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/result/:jobId" element={<Result />} />
          <Route path="/library" element={<Library />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
