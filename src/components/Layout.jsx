import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import Toast from './Toast'

export default function Layout() {
  return (
    <div className="min-h-screen bg-mine-bg">
      <Sidebar />
      <Topbar />
      <main className="ml-56 pt-14 min-h-screen">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
      <Toast />
    </div>
  )
}
