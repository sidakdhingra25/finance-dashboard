import { useAuth } from "../../context/AuthContext"

const Navbar = ({ title }) => {
  const { user } = useAuth()

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <h2 className="text-base font-semibold text-gray-700">{title}</h2>
      <div className="flex items-center gap-2">
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full capitalize font-medium">
          {user?.role}
        </span>
        <span className="text-sm text-gray-500">{user?.email}</span>
      </div>
    </header>
  )
}

export default Navbar
