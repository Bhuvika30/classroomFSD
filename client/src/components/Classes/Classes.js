import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { classAPI } from '../../utils/api'
import Loading from '../Common/Loading'

const Classes = () => {
  const { user } = useAuth()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all')
  const [pagination, setPagination] = useState({})
  const [currentPage, setCurrentPage] = useState(1)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)

  useEffect(() => {
    loadClasses()
  }, [currentPage, searchTerm, filter])

  const loadClasses = async () => {
    setLoading(true)
    try {
      const params = {
        page: currentPage,
        limit: 10,
        search: searchTerm || undefined,
        filter: filter !== 'all' ? filter : undefined
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

  const handleSearch = e => {
    setSearchTerm(e.target.value)
    setCurrentPage(1)
  }

  const handleFilterChange = e => {
    setFilter(e.target.value)
    setCurrentPage(1)
  }

  const handlePageChange = page => {
    setCurrentPage(page)
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
          onClick={() => handlePageChange(i)}
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
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 mx-1 rounded bg-secondary hover:bg-primary hover:text-white disabled:opacity-50"
        >
          Previous
        </button>
        {pages}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === pagination.totalPages}
          className="px-3 py-1 mx-1 rounded bg-secondary hover:bg-primary hover:text-white disabled:opacity-50"
        >
          Next
        </button>
      </div>
    )
  }

  const renderClassCard = classItem => (
    <div key={classItem._id} className="card">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <Link
            to={`/classes/${classItem._id}`}
            className="text-xl font-semibold text-primary hover:underline"
          >
            {classItem.title}
          </Link>
          <p className="text-secondary mt-1">{classItem.description}</p>
        </div>
        <span className="text-xs bg-secondary px-2 py-1 rounded ml-4">
          {classItem.code}
        </span>
      </div>

      <div className="flex justify-between items-center text-sm text-secondary">
        <div>
          <p>Teacher: {classItem.teacher?.name}</p>
          <p>{classItem.members?.length || 0} students enrolled</p>
        </div>
        <div className="text-right">
          <p>Created: {new Date(classItem.createdAt).toLocaleDateString()}</p>
          {classItem.isArchived && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
              Archived
            </span>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center mt-4">
        <Link
          to={`/classes/${classItem._id}`}
          className="btn btn-primary btn-sm"
        >
          View Details
        </Link>

        {user?.role === 'teacher' && classItem.teacher?._id === user._id && (
          <div className="flex gap-2">
            <Link
              to={`/classes/${classItem._id}/edit`}
              className="btn btn-secondary btn-sm"
            >
              Edit
            </Link>
          </div>
        )}
      </div>
    </div>
  )

  if (loading) {
    return <Loading message="Loading classes..." />
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Classes</h1>
          <p className="text-secondary">
            {user?.role === 'student' && 'Browse and join classes'}
            {user?.role === 'teacher' && 'Manage your classes'}
            {user?.role === 'admin' && 'All classes in the system'}
          </p>
        </div>

        <div className="flex gap-2">
          {user?.role === 'student' && (
            <button
              onClick={() => setShowJoinModal(true)}
              className="btn btn-secondary"
            >
              Join Class
            </button>
          )}
          {(user?.role === 'teacher' || user?.role === 'admin') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
            >
              Create Class
            </button>
          )}
        </div>
      </div>

      {/* Search and Filter */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search classes..."
              value={searchTerm}
              onChange={handleSearch}
              className="form-input w-full"
            />
          </div>
          <div className="md:w-48">
            <select
              value={filter}
              onChange={handleFilterChange}
              className="form-input w-full"
            >
              <option value="all">All Classes</option>
              {user?.role === 'student' && (
                <>
                  <option value="enrolled">My Classes</option>
                  <option value="available">Available to Join</option>
                </>
              )}
              {user?.role === 'teacher' && (
                <>
                  <option value="teaching">Teaching</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Classes Grid */}
      {classes.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map(renderClassCard)}
          </div>
          {renderPagination()}
        </>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold mb-2">No classes found</h3>
          <p className="text-secondary mb-4">
            {searchTerm || filter !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : user?.role === 'student'
              ? 'No classes available to join yet.'
              : 'No classes created yet.'}
          </p>
          {!searchTerm && filter === 'all' && (
            <>
              {user?.role === 'student' && (
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="btn btn-primary"
                >
                  Join a Class
                </button>
              )}
              {(user?.role === 'teacher' || user?.role === 'admin') && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn btn-primary"
                >
                  Create Your First Class
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Create Class Modal */}
      {showCreateModal && (
        <CreateClassModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            loadClasses()
          }}
        />
      )}

      {/* Join Class Modal */}
      {showJoinModal && (
        <JoinClassModal
          onClose={() => setShowJoinModal(false)}
          onSuccess={() => {
            setShowJoinModal(false)
            loadClasses()
          }}
        />
      )}
    </div>
  )
}

// Create Class Modal Component
const CreateClassModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    if (!formData.title.trim()) {
      setError('Class title is required')
      return
    }

    setIsSubmitting(true)
    const result = await classAPI.createClass(formData)

    if (result.success) {
      onSuccess()
    } else {
      setError(result.error)
    }
    setIsSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Create New Class</h2>

        {error && (
          <div className="bg-error text-white p-3 rounded mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Class Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={e =>
                setFormData(prev => ({ ...prev, title: e.target.value }))
              }
              className="form-input"
              placeholder="Enter class title"
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              value={formData.description}
              onChange={e =>
                setFormData(prev => ({ ...prev, description: e.target.value }))
              }
              className="form-input"
              rows="3"
              placeholder="Enter class description"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Join Class Modal Component
const JoinClassModal = ({ onClose, onSuccess }) => {
  const [classCode, setClassCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    if (!classCode.trim()) {
      setError('Class code is required')
      return
    }

    setIsSubmitting(true)
    const result = await classAPI.joinByCode(classCode.trim())

    if (result.success) {
      onSuccess()
    } else {
      setError(result.error)
    }
    setIsSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Join Class</h2>

        {error && (
          <div className="bg-error text-white p-3 rounded mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Class Code</label>
            <input
              type="text"
              value={classCode}
              onChange={e => setClassCode(e.target.value)}
              className="form-input"
              placeholder="Enter class code"
              disabled={isSubmitting}
            />
            <div className="text-xs text-secondary mt-1">
              Ask your teacher for the class code
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Joining...' : 'Join Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Classes
