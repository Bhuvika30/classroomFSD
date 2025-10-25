import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { assignmentAPI, classAPI, submissionAPI } from '../../utils/api'
import Loading from '../Common/Loading'

const Dashboard = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState({
    classes: [],
    assignments: [],
    submissions: [],
    stats: {}
  })

  useEffect(() => {
    loadDashboardData()
  }, [user])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const promises = []

      // Load classes for all roles
      promises.push(classAPI.getClasses({ limit: 5 }))

      if (user?.role === 'student') {
        // Load recent assignments and submissions for students
        promises.push(
          assignmentAPI.getAssignments({ limit: 5, sort: '-dueDate' }),
          submissionAPI.getSubmissions({ limit: 5, sort: '-createdAt' })
        )
      } else if (user?.role === 'teacher') {
        // Load assignments created by teacher and recent submissions
        promises.push(
          assignmentAPI.getAssignments({ limit: 5, sort: '-createdAt' }),
          submissionAPI.getSubmissions({ status: 'submitted', limit: 5 })
        )
      }

      const results = await Promise.all(promises)

      setDashboardData({
        classes: results[0]?.success ? results[0].data.classes || [] : [],
        assignments: results[1]?.success
          ? results[1].data.assignments || []
          : [],
        submissions: results[2]?.success
          ? results[2].data.submissions || []
          : [],
        stats: results[0]?.success ? results[0].data.pagination || {} : {}
      })
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Loading message="Loading dashboard..." />
  }

  const renderStudentDashboard = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* My Classes */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">My Classes</h2>
          <Link to="/classes" className="text-primary hover:underline">
            View All
          </Link>
        </div>
        {dashboardData.classes.length > 0 ? (
          <div className="space-y-3">
            {dashboardData.classes.map(classItem => (
              <Link
                key={classItem._id}
                to={`/classes/${classItem._id}`}
                className="block p-3 border rounded hover:bg-secondary"
              >
                <h3 className="font-semibold">{classItem.title}</h3>
                <p className="text-sm text-secondary">
                  {classItem.description}
                </p>
                <p className="text-xs text-secondary mt-1">
                  Teacher: {classItem.teacher?.name}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-secondary">
            <p>No classes enrolled yet.</p>
            <Link to="/classes" className="text-primary hover:underline">
              Browse available classes
            </Link>
          </div>
        )}
      </div>

      {/* Recent Assignments */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Upcoming Assignments</h2>
          <Link to="/assignments" className="text-primary hover:underline">
            View All
          </Link>
        </div>
        {dashboardData.assignments.length > 0 ? (
          <div className="space-y-3">
            {dashboardData.assignments.map(assignment => (
              <Link
                key={assignment._id}
                to={`/assignments/${assignment._id}`}
                className="block p-3 border rounded hover:bg-secondary"
              >
                <h3 className="font-semibold">{assignment.title}</h3>
                <p className="text-sm text-secondary">
                  {assignment.class?.title}
                </p>
                <p className="text-xs text-secondary mt-1">
                  Due: {new Date(assignment.dueDate).toLocaleDateString()}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      assignment.status === 'overdue'
                        ? 'bg-red-100 text-red-800'
                        : assignment.status === 'due-soon'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {assignment.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-secondary">
            <p>No assignments available.</p>
          </div>
        )}
      </div>

      {/* Recent Submissions */}
      <div className="card lg:col-span-2">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Recent Submissions</h2>
          <Link to="/submissions" className="text-primary hover:underline">
            View All
          </Link>
        </div>
        {dashboardData.submissions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Assignment</th>
                  <th className="text-left py-2">Class</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Grade</th>
                  <th className="text-left py-2">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.submissions.map(submission => (
                  <tr key={submission._id} className="border-b">
                    <td className="py-2">
                      <Link
                        to={`/assignments/${submission.assignment._id}`}
                        className="text-primary hover:underline"
                      >
                        {submission.assignment.title}
                      </Link>
                    </td>
                    <td className="py-2 text-secondary">
                      {submission.assignment.class?.title}
                    </td>
                    <td className="py-2">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          submission.status === 'graded'
                            ? 'bg-green-100 text-green-800'
                            : submission.status === 'submitted'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {submission.status}
                      </span>
                    </td>
                    <td className="py-2">
                      {submission.grade
                        ? `${submission.grade}/${submission.assignment.maxPoints}`
                        : '-'}
                    </td>
                    <td className="py-2 text-secondary text-sm">
                      {new Date(submission.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-secondary">
            <p>No submissions yet.</p>
          </div>
        )}
      </div>
    </div>
  )

  const renderTeacherDashboard = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* My Classes */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">My Classes</h2>
          <Link to="/classes" className="text-primary hover:underline">
            View All
          </Link>
        </div>
        {dashboardData.classes.length > 0 ? (
          <div className="space-y-3">
            {dashboardData.classes.map(classItem => (
              <Link
                key={classItem._id}
                to={`/classes/${classItem._id}`}
                className="block p-3 border rounded hover:bg-secondary"
              >
                <h3 className="font-semibold">{classItem.title}</h3>
                <p className="text-sm text-secondary">
                  {classItem.description}
                </p>
                <p className="text-xs text-secondary mt-1">
                  {classItem.members?.length || 0} students enrolled
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-secondary">
            <p>No classes created yet.</p>
            <Link to="/classes" className="text-primary hover:underline">
              Create your first class
            </Link>
          </div>
        )}
      </div>

      {/* Recent Assignments */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Recent Assignments</h2>
          <Link to="/assignments" className="text-primary hover:underline">
            View All
          </Link>
        </div>
        {dashboardData.assignments.length > 0 ? (
          <div className="space-y-3">
            {dashboardData.assignments.map(assignment => (
              <Link
                key={assignment._id}
                to={`/assignments/${assignment._id}`}
                className="block p-3 border rounded hover:bg-secondary"
              >
                <h3 className="font-semibold">{assignment.title}</h3>
                <p className="text-sm text-secondary">
                  {assignment.class?.title}
                </p>
                <p className="text-xs text-secondary mt-1">
                  Due: {new Date(assignment.dueDate).toLocaleDateString()}
                </p>
                <p className="text-xs text-secondary">
                  {assignment.submissionCount || 0} submissions
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-secondary">
            <p>No assignments created yet.</p>
          </div>
        )}
      </div>

      {/* Pending Submissions */}
      <div className="card lg:col-span-2">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Submissions to Grade</h2>
        </div>
        {dashboardData.submissions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Student</th>
                  <th className="text-left py-2">Assignment</th>
                  <th className="text-left py-2">Class</th>
                  <th className="text-left py-2">Submitted</th>
                  <th className="text-left py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.submissions.map(submission => (
                  <tr key={submission._id} className="border-b">
                    <td className="py-2">{submission.student?.name}</td>
                    <td className="py-2">
                      <Link
                        to={`/assignments/${submission.assignment._id}`}
                        className="text-primary hover:underline"
                      >
                        {submission.assignment.title}
                      </Link>
                    </td>
                    <td className="py-2 text-secondary">
                      {submission.assignment.class?.title}
                    </td>
                    <td className="py-2 text-secondary text-sm">
                      {new Date(submission.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2">
                      <Link
                        to={`/submissions/${submission._id}`}
                        className="btn btn-sm btn-primary"
                      >
                        Grade
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-secondary">
            <p>No submissions to grade.</p>
          </div>
        )}
      </div>
    </div>
  )

  const renderAdminDashboard = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Quick Stats */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">System Overview</h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Total Classes:</span>
            <span className="font-semibold">
              {dashboardData.stats.total || 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Active Users:</span>
            <span className="font-semibold">-</span>
          </div>
          <div className="flex justify-between">
            <span>Total Assignments:</span>
            <span className="font-semibold">-</span>
          </div>
        </div>
        <Link to="/admin" className="btn btn-primary w-full mt-4">
          Admin Panel
        </Link>
      </div>

      {/* Recent Classes */}
      <div className="card lg:col-span-2">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Recent Classes</h2>
          <Link to="/classes" className="text-primary hover:underline">
            View All
          </Link>
        </div>
        {dashboardData.classes.length > 0 ? (
          <div className="space-y-3">
            {dashboardData.classes.map(classItem => (
              <div key={classItem._id} className="p-3 border rounded">
                <h3 className="font-semibold">{classItem.title}</h3>
                <p className="text-sm text-secondary">
                  {classItem.description}
                </p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-secondary">
                    Teacher: {classItem.teacher?.name}
                  </span>
                  <span className="text-xs text-secondary">
                    {classItem.members?.length || 0} students
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-secondary">
            <p>No classes in the system yet.</p>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name}!</h1>
        <p className="text-secondary">
          {user?.role === 'student' && "Here's your learning overview"}
          {user?.role === 'teacher' && 'Manage your classes and assignments'}
          {user?.role === 'admin' && 'System administration dashboard'}
        </p>
      </div>

      {user?.role === 'student' && renderStudentDashboard()}
      {user?.role === 'teacher' && renderTeacherDashboard()}
      {user?.role === 'admin' && renderAdminDashboard()}
    </div>
  )
}

export default Dashboard
