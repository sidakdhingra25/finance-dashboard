import { useAuth } from "../context/AuthContext"

const RoleGuard = ({ roles, children }) => {
  const { user } = useAuth()

  if (!user || !roles.includes(user.role)) {
    return null
  }

  return children
}

export default RoleGuard
