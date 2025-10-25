import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { submissionAPI } from '../../utils/api'
import Loading from '../Common/Loading'

const Submissions = () => {
  const { user } = useAuth()
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('-createdAt')
  const [pagination, setPagination] = useState({})
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    loadSubmissions()
  }, [currentPage, filter, sortBy])

  const loadSubmissions = async () => {
    setLoading(true)
    try {
      const params = {
        page: currentPage,
        limit: 10,
        filter: filter !== 'all' ? filter : undefined,
        sort: sortBy
      }

      const result = await submissionAPI.getSubmissions(params)
      if (result.success) {
        setSubmissions(result.data.submissions || [])
        setPagination(result.data.pagination || {})
      }
    } catch (error) {
      console.error('Failed to load submissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = e => {
    setFilter(e.target.value)
    setCurrentPage(1)
  }

  const handleSortChange = e => {
    setSortBy(e.target.value)
    setCurrentPage(1)
  }

  const getStatusColor = submission => {
    switch (submission.status) {
      case 'graded':
        return 'bg-green-100 text-green-800'
      case 'submitted':
        return 'bg-blue-100 text-blue-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getGradeColor = submission => {
    if (!submission.grade || !submission.assignment?.maxPoints)
      return 'text-gray-600'

    const percentage =
      (submission.grade / submission.assignment.maxPoints) * 100
    if (percentage >= 90) return 'text-green-600'
    if (percentage >= 80) return 'text-blue-600'
    if (percentage >= 70) return 'text-yellow-600'
    return 'text-red-600'
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

  if (loading) {
    return <Loading message="Loading submissions..." />
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Submissions</h1>
        <p className="text-secondary">
          View and track all your assignment submissions
        </p>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="md:w-48">
            <select
              value={filter}
              onChange={handleFilterChange}
              className="form-input w-full"
            >
              <option value="all">All Submissions</option>
              <option value="submitted">Submitted</option>
              <option value="graded">Graded</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <div className="md:w-48">
            <select
              value={sortBy}
              onChange={handleSortChange}
              className="form-input w-full"
            >
              <option value="-createdAt">Newest First</option>
              <option value="createdAt">Oldest First</option>
              <option value="-updatedAt">Recently Updated</option>
              <option value="assignment.dueDate">Due Date</option>
              <option value="-grade">Highest Grade</option>
              <option value="grade">Lowest Grade</option>
            </select>
          </div>
        </div>
      </div>

      {/* Submissions List */}
      {submissions.length > 0 ? (
        <>
          <div className="space-y-4">
            {submissions.map(submission => (
              <div key={submission._id} className="card">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <Link
                      to={`/assignments/${submission.assignment._id}`}
                      className="text-xl font-semibold text-primary hover:underline"
                    >
                      {submission.assignment.title}
                    </Link>
                    <p className="text-sm text-secondary mt-1">
                      {submission.assignment.class?.title}
                    </p>
                    <p className="text-sm text-secondary">
                      Due:{' '}
                      {new Date(
                        submission.assignment.dueDate
                      ).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded ${getStatusColor(
                        submission
                      )}`}
                    >
                      {submission.status}
                    </span>
                    {submission.isLate && (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                        Late
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <h4 className="font-medium text-sm mb-1">
                      Submission Type
                    </h4>
                    <p className="text-sm text-secondary">
                      {submission.submissionType === 'file'
                        ? 'File Upload'
                        : 'Link Submission'}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-1">Submitted</h4>
                    <p className="text-sm text-secondary">
                      {new Date(submission.createdAt).toLocaleDateString()} at{' '}
                      {new Date(submission.createdAt).toLocaleTimeString()}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-1">Grade</h4>
                    {submission.grade !== null ? (
                      <p
                        className={`text-sm font-semibold ${getGradeColor(
                          submission
                        )}`}
                      >
                        {submission.grade}/{submission.assignment.maxPoints}
                        {submission.assignment.maxPoints > 0 && (
                          <span className="text-xs ml-1">
                            (
                            {Math.round(
                              (submission.grade /
                                submission.assignment.maxPoints) *
                                100
                            )}
                            %)
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="text-sm text-secondary">Not graded yet</p>
                    )}
                  </div>
                </div>

                {/* Submission Content Preview */}
                <div className="mb-4">
                  <h4 className="font-medium text-sm mb-2">Submission</h4>
                  {submission.submissionType === 'link' &&
                  submission.content?.url ? (
                    <a
                      href={submission.content.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      {submission.content.url}
                    </a>
                  ) : submission.submissionType === 'file' &&
                    submission.content?.filename ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {submission.content.filename}
                      </span>
                      {submission.content.size && (
                        <span className="text-xs text-secondary">
                          ({(submission.content.size / 1024 / 1024).toFixed(2)}{' '}
                          MB)
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-secondary">
                      No content available
                    </p>
                  )}

                  {submission.comment && (
                    <div className="mt-2">
                      <p className="text-sm text-secondary">
                        <strong>Comment:</strong> {submission.comment}
                      </p>
                    </div>
                  )}
                </div>

                {/* Teacher Feedback */}
                {submission.feedback && (
                  <div className="bg-blue-50 p-3 rounded mb-4">
                    <h4 className="font-medium text-sm mb-1">
                      Teacher Feedback
                    </h4>
                    <p className="text-sm">{submission.feedback}</p>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div className="text-xs text-secondary">
                    Last updated:{' '}
                    {new Date(submission.updatedAt).toLocaleDateString()}
                  </div>

                  <div className="flex gap-2">
                    <Link
                      to={`/submissions/${submission._id}`}
                      className="btn btn-sm btn-primary"
                    >
                      View Details
                    </Link>
                    <Link
                      to={`/assignments/${submission.assignment._id}`}
                      className="btn btn-sm btn-secondary"
                    >
                      View Assignment
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {renderPagination()}
        </>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold mb-2">No submissions found</h3>
          <p className="text-secondary mb-4">
            {filter !== 'all'
              ? 'Try adjusting your filter criteria.'
              : "You haven't submitted any assignments yet."}
          </p>
          <Link to="/assignments" className="btn btn-primary">
            Browse Assignments
          </Link>
        </div>
      )}

      {/* Summary Stats */}
      {submissions.length > 0 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card text-center">
            <h3 className="text-2xl font-bold text-primary">
              {submissions.length}
            </h3>
            <p className="text-secondary">Total Submissions</p>
          </div>
          <div className="card text-center">
            <h3 className="text-2xl font-bold text-green-600">
              {submissions.filter(s => s.status === 'graded').length}
            </h3>
            <p className="text-secondary">Graded</p>
          </div>
          <div className="card text-center">
            <h3 className="text-2xl font-bold text-blue-600">
              {submissions.filter(s => s.status === 'submitted').length}
            </h3>
            <p className="text-secondary">Pending Grade</p>
          </div>
          <div className="card text-center">
            <h3 className="text-2xl font-bold text-yellow-600">
              {submissions.filter(s => s.isLate).length}
            </h3>
            <p className="text-secondary">Late Submissions</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Submissions
