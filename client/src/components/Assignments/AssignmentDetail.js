import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { assignmentAPI, submissionAPI } from '../../utils/api'
import Loading from '../Common/Loading'

const AssignmentDetail = () => {
  const { id } = useParams()
  const { user } = useAuth()
  const [assignment, setAssignment] = useState(null)
  const [submission, setSubmission] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('details')

  useEffect(() => {
    loadAssignmentData()
  }, [id])

  const loadAssignmentData = async () => {
    setLoading(true)
    try {
      const result = await assignmentAPI.getAssignment(id)
      if (result.success) {
        setAssignment(result.data)
        setSubmission(result.data.userSubmission || null)

        // Set default tab based on user role and submission status
        if (user?.role === 'student' && !result.data.userSubmission) {
          setActiveTab('submit')
        } else if (user?.role === 'teacher') {
          setActiveTab('submissions')
        }
      }
    } catch (error) {
      console.error('Failed to load assignment:', error)
    } finally {
      setLoading(false)
    }
  }

  const isTeacher =
    user?.role === 'teacher' && assignment?.class?.teacher === user._id
  const isAdmin = user?.role === 'admin'
  const canManage = isTeacher || isAdmin

  const getStatusColor = () => {
    if (!assignment) return 'bg-gray-100 text-gray-800'

    const now = new Date()
    const dueDate = new Date(assignment.dueDate)
    const daysDiff = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24))

    if (daysDiff < 0) return 'bg-red-100 text-red-800'
    if (daysDiff <= 1) return 'bg-yellow-100 text-yellow-800'
    if (daysDiff <= 7) return 'bg-orange-100 text-orange-800'
    return 'bg-green-100 text-green-800'
  }

  const getStatusText = () => {
    if (!assignment) return 'Loading...'

    const now = new Date()
    const dueDate = new Date(assignment.dueDate)
    const daysDiff = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24))

    if (daysDiff < 0) return 'Overdue'
    if (daysDiff === 0) return 'Due Today'
    if (daysDiff === 1) return 'Due Tomorrow'
    if (daysDiff <= 7) return `Due in ${daysDiff} days`
    return 'Upcoming'
  }

  if (loading) {
    return <Loading message="Loading assignment..." />
  }

  if (!assignment) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Assignment Not Found</h2>
        <p className="text-secondary mb-4">
          The assignment you're looking for doesn't exist or you don't have
          access to it.
        </p>
        <Link to="/assignments" className="btn btn-primary">
          Back to Assignments
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Assignment Header */}
      <div className="card mb-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{assignment.title}</h1>
            <p className="text-secondary mb-4">{assignment.description}</p>

            <div className="flex items-center gap-4 text-sm text-secondary mb-4">
              <span>Class: {assignment.class?.title}</span>
              <span>•</span>
              <span>Points: {assignment.maxPoints}</span>
              <span>•</span>
              <span>Due: {new Date(assignment.dueDate).toLocaleString()}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded ${getStatusColor()}`}>
                {getStatusText()}
              </span>
              {assignment.allowedSubmissionTypes?.map(type => (
                <span
                  key={type}
                  className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                >
                  {type === 'file' ? 'File Upload' : 'Link Submission'}
                </span>
              ))}
            </div>
          </div>

          {canManage && (
            <div className="flex gap-2">
              <Link
                to={`/assignments/${id}/edit`}
                className="btn btn-secondary"
              >
                Edit Assignment
              </Link>
            </div>
          )}
        </div>

        {/* Student Submission Status */}
        {user?.role === 'student' && (
          <div className="border-t pt-4">
            {submission ? (
              <div className="bg-blue-50 p-4 rounded">
                <h3 className="font-semibold mb-2">Your Submission</h3>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm">
                      Status:{' '}
                      <span
                        className={`font-medium ${
                          submission.status === 'graded'
                            ? 'text-green-600'
                            : submission.status === 'submitted'
                            ? 'text-blue-600'
                            : 'text-gray-600'
                        }`}
                      >
                        {submission.status}
                      </span>
                    </p>
                    <p className="text-sm text-secondary">
                      Submitted:{' '}
                      {new Date(submission.createdAt).toLocaleString()}
                    </p>
                    {submission.grade !== null && (
                      <p className="text-sm">
                        Grade:{' '}
                        <span className="font-semibold">
                          {submission.grade}/{assignment.maxPoints}
                        </span>
                      </p>
                    )}
                  </div>
                  <Link
                    to={`/submissions/${submission._id}`}
                    className="btn btn-sm btn-primary"
                  >
                    View Submission
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 p-4 rounded">
                <h3 className="font-semibold mb-2">Not Submitted</h3>
                <p className="text-sm text-secondary mb-3">
                  You haven't submitted this assignment yet.
                </p>
                <button
                  onClick={() => setActiveTab('submit')}
                  className="btn btn-sm btn-primary"
                >
                  Submit Assignment
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => setActiveTab('details')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'details'
              ? 'border-b-2 border-primary text-primary'
              : 'text-secondary hover:text-primary'
          }`}
        >
          Assignment Details
        </button>

        {user?.role === 'student' && !submission && (
          <button
            onClick={() => setActiveTab('submit')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'submit'
                ? 'border-b-2 border-primary text-primary'
                : 'text-secondary hover:text-primary'
            }`}
          >
            Submit Assignment
          </button>
        )}

        {canManage && (
          <button
            onClick={() => setActiveTab('submissions')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'submissions'
                ? 'border-b-2 border-primary text-primary'
                : 'text-secondary hover:text-primary'
            }`}
          >
            Submissions ({assignment.submissionCount || 0})
          </button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && <DetailsTab assignment={assignment} />}

      {activeTab === 'submit' && user?.role === 'student' && !submission && (
        <SubmitTab
          assignment={assignment}
          onSubmissionSuccess={loadAssignmentData}
        />
      )}

      {activeTab === 'submissions' && canManage && (
        <SubmissionsTab assignmentId={id} assignment={assignment} />
      )}
    </div>
  )
}

// Assignment Details Tab
const DetailsTab = ({ assignment }) => {
  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Instructions</h2>
        <div className="prose max-w-none">
          <p className="whitespace-pre-wrap">{assignment.description}</p>
        </div>
      </div>

      {assignment.attachments && assignment.attachments.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Attachments</h2>
          <div className="space-y-2">
            {assignment.attachments.map((attachment, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 border rounded"
              >
                <span className="text-sm font-medium">
                  {attachment.filename}
                </span>
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-secondary ml-auto"
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Assignment Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-2">Due Date</h3>
            <p className="text-secondary">
              {new Date(assignment.dueDate).toLocaleString()}
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-2">Points</h3>
            <p className="text-secondary">{assignment.maxPoints}</p>
          </div>
          <div>
            <h3 className="font-medium mb-2">Submission Types</h3>
            <div className="flex gap-2">
              {assignment.allowedSubmissionTypes?.map(type => (
                <span
                  key={type}
                  className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                >
                  {type === 'file' ? 'File Upload' : 'Link Submission'}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-medium mb-2">Late Submissions</h3>
            <p className="text-secondary">
              {assignment.settings?.allowLateSubmissions
                ? 'Allowed'
                : 'Not Allowed'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Submit Assignment Tab
const SubmitTab = ({ assignment, onSubmissionSuccess }) => {
  const [submissionType, setSubmissionType] = useState(
    assignment.allowedSubmissionTypes?.[0] || 'file'
  )
  const [linkUrl, setLinkUrl] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleFileChange = e => {
    setSelectedFile(e.target.files[0])
    setError('')
  }

  const handleSubmit = async e => {
    e.preventDefault()

    if (submissionType === 'file' && !selectedFile) {
      setError('Please select a file to upload')
      return
    }

    if (submissionType === 'link' && !linkUrl.trim()) {
      setError('Please enter a valid URL')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const submissionData = {
        assignmentId: assignment._id,
        submissionType,
        content: submissionType === 'link' ? { url: linkUrl.trim() } : {},
        comment: comment.trim()
      }

      // Handle file upload if needed
      if (submissionType === 'file' && selectedFile) {
        // This would typically involve uploading the file first
        // For now, we'll simulate it
        submissionData.content = {
          filename: selectedFile.name,
          size: selectedFile.size,
          type: selectedFile.type
        }
      }

      const result = await submissionAPI.createSubmission(submissionData)

      if (result.success) {
        onSubmissionSuccess()
      } else {
        setError(result.error)
      }
    } catch (error) {
      setError('Failed to submit assignment')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">Submit Assignment</h2>

      {error && (
        <div className="bg-red-100 text-red-800 p-3 rounded mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        {assignment.allowedSubmissionTypes?.length > 1 && (
          <div className="form-group">
            <label className="form-label">Submission Type</label>
            <div className="flex gap-4">
              {assignment.allowedSubmissionTypes.map(type => (
                <label key={type} className="flex items-center gap-2">
                  <input
                    type="radio"
                    value={type}
                    checked={submissionType === type}
                    onChange={e => setSubmissionType(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <span>
                    {type === 'file' ? 'File Upload' : 'Link Submission'}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {submissionType === 'file' && (
          <div className="form-group">
            <label className="form-label">Upload File</label>
            <input
              type="file"
              onChange={handleFileChange}
              className="form-input"
              disabled={isSubmitting}
            />
            {selectedFile && (
              <div className="text-sm text-secondary mt-2">
                Selected: {selectedFile.name} (
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
          </div>
        )}

        {submissionType === 'link' && (
          <div className="form-group">
            <label className="form-label">Submission URL</label>
            <input
              type="url"
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              className="form-input"
              placeholder="https://example.com/your-work"
              disabled={isSubmitting}
            />
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Comment (Optional)</label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            className="form-input"
            rows="3"
            placeholder="Add any comments about your submission..."
            disabled={isSubmitting}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Assignment'}
        </button>
      </form>
    </div>
  )
}

// Submissions Tab (for teachers)
const SubmissionsTab = ({ assignmentId, assignment }) => {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSubmissions()
  }, [assignmentId])

  const loadSubmissions = async () => {
    setLoading(true)
    try {
      const result = await assignmentAPI.getAssignmentSubmissions(assignmentId)
      if (result.success) {
        setSubmissions(result.data.submissions || [])
      }
    } catch (error) {
      console.error('Failed to load submissions:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Loading message="Loading submissions..." />
  }

  return (
    <div>
      {submissions.length > 0 ? (
        <div className="space-y-4">
          {submissions.map(submission => (
            <div key={submission._id} className="card">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold">{submission.student?.name}</h3>
                  <p className="text-sm text-secondary">
                    {submission.student?.email}
                  </p>
                  <p className="text-sm text-secondary">
                    Submitted: {new Date(submission.createdAt).toLocaleString()}
                  </p>
                  {submission.isLate && (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                      Late Submission
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm">
                      Status:{' '}
                      <span
                        className={`font-medium ${
                          submission.status === 'graded'
                            ? 'text-green-600'
                            : submission.status === 'submitted'
                            ? 'text-blue-600'
                            : 'text-gray-600'
                        }`}
                      >
                        {submission.status}
                      </span>
                    </p>
                    {submission.grade !== null && (
                      <p className="text-sm">
                        Grade: {submission.grade}/{assignment.maxPoints}
                      </p>
                    )}
                  </div>

                  <Link
                    to={`/submissions/${submission._id}`}
                    className="btn btn-sm btn-primary"
                  >
                    {submission.status === 'submitted' ? 'Grade' : 'View'}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold mb-2">No submissions yet</h3>
          <p className="text-secondary">
            Students haven't submitted their work yet.
          </p>
        </div>
      )}
    </div>
  )
}

export default AssignmentDetail
