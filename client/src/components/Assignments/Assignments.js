import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { assignmentAPI } from '../../utils/api'
import Loading from '../Common/Loading'

const Assignments = () => {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('-dueDate')
  const [pagination, setPagination] = useState({})
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    loadAssignments()
  }, [currentPage, searchTerm, filter, sortBy])

  const loadAssignments = async () => {
    setLoading(true)
    try {
      const params = {
        page: currentPage,
        limit: 12,
        search: searchTerm || undefined,
        filter: filter !== 'all' ? filter : undefined,
        sort: sortBy
      }

      const result = await assignmentAPI.getAssignments(params)
      if (result.success) {
        setAssignments(result.data.assignments || [])
        setPagination(result.data.pagination || {})
      }
    } catch (error) {
      console.error('Failed to load assignments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = e => {
    setSearchTerm(e.target.value)
    setCurrentPage(1)
  }

  const handleFilterChange = e => {
    setFilter(e.target.value)
    setCurrentPage(1)
  }

  const handleSortChange = e => {
    setSortBy(e.target.value)
    setCurrentPage(1)
  }

  const getStatusColor = assignment => {
    const now = new Date()
    const dueDate = new Date(assignment.dueDate)
    const daysDiff = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24))

    if (daysDiff < 0) return 'bg-red-100 text-red-800'
    if (daysDiff <= 1) return 'bg-yellow-100 text-yellow-800'
    if (daysDiff <= 7) return 'bg-orange-100 text-orange-800'
    return 'bg-green-100 text-green-800'
  }

  const getStatusText = assignment => {
    const now = new Date()
    const dueDate = new Date(assignment.dueDate)
    const daysDiff = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24))

    if (daysDiff < 0) return 'Overdue'
    if (daysDiff === 0) return 'Due Today'
    if (daysDiff === 1) return 'Due Tomorrow'
    if (daysDiff <= 7) return `Due in ${daysDiff} days`
    return 'Upcoming'
  }

  const renderPagination = () => {
    if (!pagination.totalPages || pagination.totalPages <= 1) return null

    const pages = []
    const maxVisible = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2))
    let endPage = Math.min(pagination.totalPages, startPage + maxVisible - 1)

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          className={`px-3 py-1 mx-1 rounded ${
            i === currentPage
              ? 'bg-primary text-white'
              : 'bg-secondary hover:bg-primary hover:text-white'
          }`}
        >
          {i}
        </button>
      )
    }

    return (
      <div className="flex justify-center items-center mt-6">
        <button
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 mx-1 rounded bg-secondary hover:bg-primary hover:text-white disabled:opacity-50"
        >
          Previous
        </button>
        {pages}
        <button
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={currentPage === pagination.totalPages}
          className="px-3 py-1 mx-1 rounded bg-secondary hover:bg-primary hover:text-white disabled:opacity-50"
        >
          Next
        </button>
      </div>
    )
  }

  const renderAssignmentCard = assignment => (
    <div key={assignment._id} className="card">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <Link
            to={`/assignments/${assignment._id}`}
            className="text-lg font-semibold text-primary hover:underline"
          >
            {assignment.title}
          </Link>
          <p className="text-sm text-secondary mt-1">
            {assignment.class?.title}
          </p>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded ${getStatusColor(assignment)}`}
        >
          {getStatusText(assignment)}
        </span>
      </div>

      <p className="text-secondary text-sm mb-4 line-clamp-2">
        {assignment.description}
      </p>

      <div className="flex justify-between items-center text-sm text-secondary mb-4">
        <div>
          <p>Due: {new Date(assignment.dueDate).toLocaleDateString()}</p>
          <p>Points: {assignment.maxPoints}</p>
        </div>
        <div className="text-right">
          {user?.role === 'student' && assignment.submission && (
            <div>
              <p className="font-medium">
                Status:{' '}
                <span
                  className={`${
                    assignment.submission.status === 'graded'
                      ? 'text-green-600'
                      : assignment.submission.status === 'submitted'
                      ? 'text-blue-600'
                      : 'text-gray-600'
                  }`}
                >
                  {assignment.submission.status}
                </span>
              </p>
              {assignment.submission.grade && (
                <p>
                  Grade: {assignment.submission.grade}/{assignment.maxPoints}
                </p>
              )}
            </div>
          )}
          {user?.role === 'teacher' && (
            <div>
              <p>{assignment.submissionCount || 0} submissions</p>
              <p>{assignment.gradedCount || 0} graded</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {assignment.allowedSubmissionTypes?.includes('file') && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              File Upload
            </span>
          )}
          {assignment.allowedSubmissionTypes?.includes('link') && (
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
              Link Submission
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <Link
            to={`/assignments/${assignment._id}`}
            className="btn btn-sm btn-primary"
          >
            View Details
          </Link>
          {user?.role === 'teacher' &&
            assignment.class?.teacher === user._id && (
              <Link
                to={`/assignments/${assignment._id}/edit`}
                className="btn btn-sm btn-secondary"
              >
                Edit
              </Link>
            )}
        </div>
      </div>
    </div>
  )

  if (loading) {
    return <Loading message="Loading assignments..." />
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Assignments</h1>
          <p className="text-secondary">
            {user?.role === 'student' && 'View and submit your assignments'}
            {user?.role === 'teacher' && 'Manage your assignments and grading'}
            {user?.role === 'admin' && 'All assignments in the system'}
          </p>
        </div>

        {(user?.role === 'teacher' || user?.role === 'admin') && (
          <Link to="/assignments/create" className="btn btn-primary">
            Create Assignment
          </Link>
        )}
      </div>

      {/* Search and Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <input
              type="text"
              placeholder="Search assignments..."
              value={searchTerm}
              onChange={handleSearch}
              className="form-input w-full"
            />
          </div>

          <div>
            <select
              value={filter}
              onChange={handleFilterChange}
              className="form-input w-full"
            >
              <option value="all">All Assignments</option>
              {user?.role === 'student' && (
                <>
                  <option value="pending">Pending Submission</option>
                  <option value="submitted">Submitted</option>
                  <option value="graded">Graded</option>
                  <option value="overdue">Overdue</option>
                </>
              )}
              {user?.role === 'teacher' && (
                <>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="needs-grading">Needs Grading</option>
                </>
              )}
            </select>
          </div>

          <div>
            <select
              value={sortBy}
              onChange={handleSortChange}
              className="form-input w-full"
            >
              <option value="-dueDate">Due Date (Latest First)</option>
              <option value="dueDate">Due Date (Earliest First)</option>
              <option value="-createdAt">Created (Newest First)</option>
              <option value="createdAt">Created (Oldest First)</option>
              <option value="title">Title (A-Z)</option>
              <option value="-title">Title (Z-A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assignments Grid */}
      {assignments.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignments.map(renderAssignmentCard)}
          </div>
          {renderPagination()}
        </>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold mb-2">No assignments found</h3>
          <p className="text-secondary mb-4">
            {searchTerm || filter !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : user?.role === 'student'
              ? 'No assignments available yet.'
              : 'No assignments created yet.'}
          </p>
          {!searchTerm &&
            filter === 'all' &&
            (user?.role === 'teacher' || user?.role === 'admin') && (
              <Link to="/assignments/create" className="btn btn-primary">
                Create Your First Assignment
              </Link>
            )}
        </div>
      )}

      {/* Quick Stats for Teachers */}
      {user?.role === 'teacher' && assignments.length > 0 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card text-center">
            <h3 className="text-2xl font-bold text-primary">
              {assignments.length}
            </h3>
            <p className="text-secondary">Total Assignments</p>
          </div>
          <div className="card text-center">
            <h3 className="text-2xl font-bold text-blue-600">
              {assignments.filter(a => a.status === 'published').length}
            </h3>
            <p className="text-secondary">Published</p>
          </div>
          <div className="card text-center">
            <h3 className="text-2xl font-bold text-yellow-600">
              {assignments.reduce(
                (sum, a) => sum + (a.submissionCount || 0),
                0
              )}
            </h3>
            <p className="text-secondary">Total Submissions</p>
          </div>
          <div className="card text-center">
            <h3 className="text-2xl font-bold text-green-600">
              {assignments.reduce((sum, a) => sum + (a.gradedCount || 0), 0)}
            </h3>
            <p className="text-secondary">Graded</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Assignments
