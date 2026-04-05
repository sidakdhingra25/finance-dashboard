import { NavLink } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"

const navItems = [
  { label: "Dashboard", path: "/dashboard", roles: ["admin", "analyst", "viewer"] },
  { label: "Transactions", path: "/transactions", roles: ["admin", "analyst", "viewer"] },
  { label: "Users", path: "/users", roles: ["admin"] }
]

const Sidebar = () => {
  const { user, logout } = useAuth()

  const visibleItems = navItems.filter((item) => item.roles.includes(user?.role))

  return (
    <aside className="w-56 min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="px-6 py-5 border-b border-gray-700">
        <h1 className="text-lg font-bold">FinanceDash</h1>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `block px-4 py-2 rounded-lg text-sm transition ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-700">
        <p className="text-sm font-medium text-white truncate">{user?.name}</p>
        <p className="text-xs text-gray-400 capitalize mb-3">{user?.role}</p>
        <button
          type="button"
          onClick={logout}
          className="w-full text-left text-xs text-gray-400 hover:text-white transition"
        >
          Sign out →
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
