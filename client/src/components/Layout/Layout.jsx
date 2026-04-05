import Sidebar from "./Sidebar"
import Navbar from "./Navbar"

const Layout = ({ title, children }) => {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar title={title} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}

export default Layout
