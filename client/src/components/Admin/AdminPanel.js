import React, { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { classAPI, userAPI } from '../../utils/api'
import Loading from '../Common/Loading'

const AdminPanel = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('users')
  const [loading, setLoading] = useState(false)

  // Redirect if not admin
  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
        <p className="text-secondary">
          You don't have permission to access this page.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
        <p className="text-secondary">
          Manage users, classes, and system settings
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'users'
              ? 'border-b-2 border-primary text-primary'
              : 'text-secondary hover:text-primary'
          }`}
        >
          User Management
        </button>
        <button
          onClick={() => setActiveTab('classes')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'classes'
              ? 'border-b-2 border-primary text-primary'
              : 'text-secondary hover:text-primary'
          }`}
        >
          Class Management
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'stats'
              ? 'border-b-2 border-primary text-primary'
              : 'text-secondary hover:text-primary'
          }`}
        >
          System Statistics
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && <UserManagement />}
      {activeTab === 'classes' && <ClassManagement />}
      {activeTab === 'stats' && <SystemStats />}
    </div>
  )
}

// User Management Tab
const UserManagement = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [pagination, setPagination] = useState({})
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    loadUsers()
  }, [currentPage, searchTerm, roleFilter])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const params = {
        page: currentPage,
        limit: 10,
        search: searchTerm || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined
      }

      const result = await userAPI.getUsers(params)
      if (result.success) {
        setUsers(result.data.users || [])
        setPagination(result.data.pagination || {})
      }
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId, newRole) => {
    try {
      const result = await userAPI.updateUserRole(userId, newRole)
      if (result.success) {
        loadUsers()
      }
    } catch (error) {
      console.error('Failed to update user role:', error)
    }
  }

  const handleStatusToggle = async (userId, isActive) => {
    try {
      const result = await userAPI.updateUserStatus(userId, !isActive)
      if (result.success) {
        loadUsers()
      }
    } catch (error) {
      console.error('Failed to update user status:', error)
    }
  }

  const handleDeleteUser = async userId => {
    if (
      !window.confirm(
        'Are you sure you want to delete this user? This action cannot be undone.'
      )
    ) {
      return
    }

    try {
      const result = await userAPI.deleteUser(userId)
      if (result.success) {
        loadUsers()
      }
    } catch (error) {
      console.error('Failed to delete user:', error)
    }
  }

  if (loading) {
    return <Loading message="Loading users..." />
  }

  return (
    <div>
      {/* Search and Filter */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="form-input w-full"
            />
          </div>
          <div className="md:w-48">
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="form-input w-full"
            >
              <option value="all">All Roles</option>
              <option value="student">Students</option>
              <option value="teacher">Teachers</option>
              <option value="admin">Admins</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      {users.length > 0 ? (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2">User</th>
                <th className="text-left py-3 px-2">Role</th>
                <th className="text-left py-3 px-2">Status</th>
                <th className="text-left py-3 px-2">Joined</th>
                <th className="text-left py-3 px-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user._id} className="border-b">
                  <td className="py-3 px-2">
                    <div>
                      <p className="font-semibold">{user.name}</p>
                      <p className="text-sm text-secondary">{user.email}</p>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <select
                      value={user.role}
                      onChange={e => handleRoleChange(user._id, e.target.value)}
                      className="text-sm border rounded px-2 py-1"
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="py-3 px-2">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        user.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-sm text-secondary">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          handleStatusToggle(user._id, user.isActive)
                        }
                        className={`btn btn-sm ${
                          user.isActive ? 'btn-secondary' : 'btn-primary'
                        }`}
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user._id)}
                        className="btn btn-sm btn-error"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold mb-2">No users found</h3>
          <p className="text-secondary">Try adjusting your search criteria.</p>
        </div>
      )}
    </div>
  )
}

// Class Management Tab
const ClassManagement = () => {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [pagination, setPagination] = useState({})
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    loadClasses()
  }, [currentPage, searchTerm])

  const loadClasses = async () => {
    setLoading(true)
    try {
      const params = {
        page: currentPage,
        limit: 10,
        search: searchTerm || undefined
      }

      const result = await classAPI.getClasses(params)
      if (result.success) {
        setClasses(result.data.classes || [])
        setPagination(result.data.pagination || {})
      }
    } catch (error) {
      console.error('Failed to load classes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClass = async classId => {
    if (
      !window.confirm(
        'Are you sure you want to delete this class? This action cannot be undone.'
      )
    ) {
      return
    }

    try {
      const result = await classAPI.deleteClass(classId)
      if (result.success) {
        loadClasses()
      }
    } catch (error) {
      console.error('Failed to delete class:', error)
    }
  }

  if (loading) {
    return <Loading message="Loading classes..." />
  }

  return (
    <div>
      {/* Search */}
      <div className="card mb-6">
        <input
          type="text"
          placeholder="Search classes..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="form-input w-full"
        />
      </div>

      {/* Classes Table */}
      {classes.length > 0 ? (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2">Class</th>
                <th className="text-left py-3 px-2">Teacher</th>
                <th className="text-left py-3 px-2">Students</th>
                <th className="text-left py-3 px-2">Created</th>
                <th className="text-left py-3 px-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {classes.map(classItem => (
                <tr key={classItem._id} className="border-b">
                  <td className="py-3 px-2">
                    <div>
                      <p className="font-semibold">{classItem.title}</p>
                      <p className="text-sm text-secondary">
                        {classItem.description}
                      </p>
                      <p className="text-xs text-secondary">
                        Code: {classItem.code}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <div>
                      <p className="font-medium">{classItem.teacher?.name}</p>
                      <p className="text-sm text-secondary">
                        {classItem.teacher?.email}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    {classItem.members?.length || 0}
                  </td>
                  <td className="py-3 px-2 text-sm text-secondary">
                    {new Date(classItem.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          window.open(`/classes/${classItem._id}`, '_blank')
                        }
                        className="btn btn-sm btn-secondary"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDeleteClass(classItem._id)}
                        className="btn btn-sm btn-error"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold mb-2">No classes found</h3>
          <p className="text-secondary">Try adjusting your search criteria.</p>
        </div>
      )}
    </div>
  )
}

// System Statistics Tab
const SystemStats = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setLoading(true)
    try {
      const result = await userAPI.getUserStats()
      if (result.success) {
        setStats(result.data)
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Loading message="Loading statistics..." />
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <h3 className="text-3xl font-bold text-primary mb-2">
            {stats?.totalUsers || 0}
          </h3>
          <p className="text-secondary">Total Users</p>
        </div>
        <div className="card text-center">
          <h3 className="text-3xl font-bold text-blue-600 mb-2">
            {stats?.activeUsers || 0}
          </h3>
          <p className="text-secondary">Active Users</p>
        </div>
        <div className="card text-center">
          <h3 className="text-3xl font-bold text-green-600 mb-2">
            {stats?.totalClasses || 0}
          </h3>
          <p className="text-secondary">Total Classes</p>
        </div>
        <div className="card text-center">
          <h3 className="text-3xl font-bold text-yellow-600 mb-2">
            {stats?.totalAssignments || 0}
          </h3>
          <p className="text-secondary">Total Assignments</p>
        </div>
      </div>

      {/* Role Distribution */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">User Role Distribution</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-blue-600">
              {stats?.roleDistribution?.student || 0}
            </h3>
            <p className="text-secondary">Students</p>
          </div>
          <div className="text-center">
            <h3 className="text-2xl font-bold text-green-600">
              {stats?.roleDistribution?.teacher || 0}
            </h3>
            <p className="text-secondary">Teachers</p>
          </div>
          <div className="text-center">
            <h3 className="text-2xl font-bold text-purple-600">
              {stats?.roleDistribution?.admin || 0}
            </h3>
            <p className="text-secondary">Admins</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-secondary rounded">
            <span>New users registered today</span>
            <span className="font-semibold">
              {stats?.todayRegistrations || 0}
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-secondary rounded">
            <span>Classes created this week</span>
            <span className="font-semibold">{stats?.weeklyClasses || 0}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-secondary rounded">
            <span>Assignments created this week</span>
            <span className="font-semibold">
              {stats?.weeklyAssignments || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminPanel
