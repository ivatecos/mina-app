import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import Toast from './Toast'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-mine-bg">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Topbar onMenuToggle={() => setSidebarOpen(o => !o)} />
      <main className="lg:ml-60 pt-14 min-h-screen">
        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </main>
      <Toast />
    </div>
  )
}
