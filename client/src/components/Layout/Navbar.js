import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const isActive = path => {
    return (
      location.pathname === path || location.pathname.startsWith(path + '/')
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const getNavItems = () => {
    const items = [
      {
        path: '/dashboard',
        label: 'Dashboard',
        roles: ['student', 'teacher', 'admin']
      },
      {
        path: '/classes',
        label: 'Classes',
        roles: ['student', 'teacher', 'admin']
      }
    ]

    if (user?.role === 'student') {
      items.push(
        { path: '/assignments', label: 'Assignments', roles: ['student'] },
        { path: '/submissions', label: 'My Submissions', roles: ['student'] }
      )
    }

    if (user?.role === 'teacher') {
      items.push({
        path: '/assignments',
        label: 'Assignments',
        roles: ['teacher']
      })
    }

    if (user?.role === 'admin') {
      items.push({ path: '/admin', label: 'Admin Panel', roles: ['admin'] })
    }

    return items.filter(item => item.roles.includes(user?.role))
  }

  const navItems = getNavItems()

  return (
    <nav className="navbar">
      <div className="container">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link to="/dashboard" className="text-2xl font-bold text-primary">
            ClassroomPortal
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2">
              <span className="text-sm text-secondary">
                Welcome, {user?.name}
              </span>
              <span className="text-xs bg-secondary px-2 py-1 rounded">
                {user?.role}
              </span>
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-2 p-2 rounded hover:bg-secondary"
              >
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <span className="hidden md:block">▼</span>
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded shadow-lg border z-50">
                  <div className="py-1">
                    <div className="px-4 py-2 border-b">
                      <p className="font-semibold">{user?.name}</p>
                      <p className="text-sm text-secondary">{user?.email}</p>
                      <p className="text-xs text-secondary capitalize">
                        {user?.role}
                      </p>
                    </div>
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm hover:bg-secondary"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Profile Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-secondary text-error"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2"
            >
              ☰
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t">
            <div className="flex flex-col gap-2 mt-4">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Overlay for mobile menu */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-40 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </nav>
  )
}

export default Navbar
