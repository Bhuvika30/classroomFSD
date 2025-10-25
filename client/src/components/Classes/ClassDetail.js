import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { assignmentAPI, classAPI } from '../../utils/api'
import Loading from '../Common/Loading'

const ClassDetail = () => {
  const { id } = useParams()
  const { user } = useAuth()
  const [classData, setClassData] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('assignments')

  useEffect(() => {
    loadClassData()
  }, [id])

  const loadClassData = async () => {
    setLoading(true)
    try {
      const [classResult, assignmentsResult] = await Promise.all([
        classAPI.getClass(id),
        assignmentAPI.getClassAssignments(id, { limit: 10 })
      ])

      if (classResult.success) {
        setClassData(classResult.data)
      }

      if (assignmentsResult.success) {
        setAssignments(assignmentsResult.data.assignments || [])
      }
    } catch (error) {
      console.error('Failed to load class data:', error)
    } finally {
      setLoading(false)
    }
  }

  const isTeacher =
    user?.role === 'teacher' && classData?.teacher?._id === user._id
  const isAdmin = user?.role === 'admin'
  const canManage = isTeacher || isAdmin

  if (loading) {
    return <Loading message="Loading class details..." />
  }

  if (!classData) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Class Not Found</h2>
        <p className="text-secondary mb-4">
          The class you're looking for doesn't exist or you don't have access to
          it.
        </p>
        <Link to="/classes" className="btn btn-primary">
          Back to Classes
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Class Header */}
      <div className="card mb-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{classData.title}</h1>
            <p className="text-secondary mb-4">{classData.description}</p>
            <div className="flex items-center gap-4 text-sm text-secondary">
              <span>Teacher: {classData.teacher?.name}</span>
              <span>•</span>
              <span>{classData.members?.length || 0} students</span>
              <span>•</span>
              <span>
                Code:{' '}
                <code className="bg-secondary px-2 py-1 rounded">
                  {classData.code}
                </code>
              </span>
            </div>
          </div>

          {canManage && (
            <div className="flex gap-2">
              <Link to={`/classes/${id}/edit`} className="btn btn-secondary">
                Edit Class
              </Link>
              <Link
                to={`/assignments/create?classId=${id}`}
                className="btn btn-primary"
              >
                Create Assignment
              </Link>
            </div>
          )}
        </div>

        {classData.isArchived && (
          <div className="bg-yellow-100 text-yellow-800 p-3 rounded">
            This class is archived and no longer active.
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => setActiveTab('assignments')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'assignments'
              ? 'border-b-2 border-primary text-primary'
              : 'text-secondary hover:text-primary'
          }`}
        >
          Assignments ({assignments.length})
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'members'
              ? 'border-b-2 border-primary text-primary'
              : 'text-secondary hover:text-primary'
          }`}
        >
          Members ({classData.members?.length || 0})
        </button>
        {canManage && (
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'settings'
                ? 'border-b-2 border-primary text-primary'
                : 'text-secondary hover:text-primary'
            }`}
          >
            Settings
          </button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'assignments' && (
        <AssignmentsTab
          assignments={assignments}
          classId={id}
          canManage={canManage}
          onUpdate={loadClassData}
        />
      )}

      {activeTab === 'members' && (
        <MembersTab
          members={classData.members}
          teacher={classData.teacher}
          classId={id}
          canManage={canManage}
          onUpdate={loadClassData}
        />
      )}

      {activeTab === 'settings' && canManage && (
        <SettingsTab classData={classData} onUpdate={loadClassData} />
      )}
    </div>
  )
}

// Assignments Tab Component
const AssignmentsTab = ({ assignments, classId, canManage, onUpdate }) => {
  return (
    <div>
      {canManage && (
        <div className="mb-6">
          <Link
            to={`/assignments/create?classId=${classId}`}
            className="btn btn-primary"
          >
            Create New Assignment
          </Link>
        </div>
      )}

      {assignments.length > 0 ? (
        <div className="space-y-4">
          {assignments.map(assignment => (
            <div key={assignment._id} className="card">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <Link
                    to={`/assignments/${assignment._id}`}
                    className="text-xl font-semibold text-primary hover:underline"
                  >
                    {assignment.title}
                  </Link>
                  <p className="text-secondary mt-1">
                    {assignment.description}
                  </p>

                  <div className="flex items-center gap-4 mt-3 text-sm text-secondary">
                    <span>
                      Due: {new Date(assignment.dueDate).toLocaleDateString()}
                    </span>
                    <span>•</span>
                    <span>Points: {assignment.maxPoints}</span>
                    {assignment.submissionCount !== undefined && (
                      <>
                        <span>•</span>
                        <span>{assignment.submissionCount} submissions</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      assignment.status === 'published'
                        ? 'bg-green-100 text-green-800'
                        : assignment.status === 'draft'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {assignment.status}
                  </span>

                  {canManage && (
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
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold mb-2">No assignments yet</h3>
          <p className="text-secondary mb-4">
            {canManage
              ? 'Create your first assignment to get started.'
              : 'No assignments have been posted yet.'}
          </p>
          {canManage && (
            <Link
              to={`/assignments/create?classId=${classId}`}
              className="btn btn-primary"
            >
              Create Assignment
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

// Members Tab Component
const MembersTab = ({ members, teacher, classId, canManage, onUpdate }) => {
  const [showInviteModal, setShowInviteModal] = useState(false)

  const handleRemoveMember = async memberId => {
    if (!window.confirm('Are you sure you want to remove this member?')) {
      return
    }

    try {
      const result = await classAPI.unenrollStudent(classId, memberId)
      if (result.success) {
        onUpdate()
      }
    } catch (error) {
      console.error('Failed to remove member:', error)
    }
  }

  return (
    <div>
      {canManage && (
        <div className="mb-6">
          <button
            onClick={() => setShowInviteModal(true)}
            className="btn btn-primary"
          >
            Invite Students
          </button>
        </div>
      )}

      <div className="space-y-4">
        {/* Teacher */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
                {teacher?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold">{teacher?.name}</h3>
                <p className="text-sm text-secondary">{teacher?.email}</p>
              </div>
            </div>
            <span className="text-xs bg-primary text-white px-2 py-1 rounded">
              Teacher
            </span>
          </div>
        </div>

        {/* Students */}
        {members && members.length > 0 ? (
          members.map(member => (
            <div key={member.user._id} className="card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center font-semibold">
                    {member.user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold">{member.user.name}</h3>
                    <p className="text-sm text-secondary">
                      {member.user.email}
                    </p>
                    <p className="text-xs text-secondary">
                      Joined: {new Date(member.joinedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs bg-secondary px-2 py-1 rounded">
                    Student
                  </span>
                  {canManage && (
                    <button
                      onClick={() => handleRemoveMember(member.user._id)}
                      className="btn btn-sm btn-error"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold mb-2">No students enrolled</h3>
            <p className="text-secondary mb-4">
              Share the class code with students to let them join.
            </p>
          </div>
        )}
      </div>

      {showInviteModal && (
        <InviteModal
          classCode={classId}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  )
}

// Settings Tab Component
const SettingsTab = ({ classData, onUpdate }) => {
  const [formData, setFormData] = useState({
    title: classData.title || '',
    description: classData.description || '',
    allowLateSubmissions: classData.settings?.allowLateSubmissions || false,
    autoAcceptStudents: classData.settings?.autoAcceptStudents || true
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const result = await classAPI.updateClass(classData._id, {
        title: formData.title,
        description: formData.description,
        settings: {
          allowLateSubmissions: formData.allowLateSubmissions,
          autoAcceptStudents: formData.autoAcceptStudents
        }
      })

      if (result.success) {
        setMessage('Class updated successfully!')
        onUpdate()
      } else {
        setMessage(`Error: ${result.error}`)
      }
    } catch (error) {
      setMessage('Failed to update class')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl">
      {message && (
        <div
          className={`p-3 rounded mb-4 ${
            message.startsWith('Error')
              ? 'bg-red-100 text-red-800'
              : 'bg-green-100 text-green-800'
          }`}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Basic Information</h3>

          <div className="form-group">
            <label className="form-label">Class Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={e =>
                setFormData(prev => ({ ...prev, title: e.target.value }))
              }
              className="form-input"
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
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Class Settings</h3>

          <div className="form-group">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.allowLateSubmissions}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    allowLateSubmissions: e.target.checked
                  }))
                }
                disabled={isSubmitting}
              />
              <span>Allow late submissions</span>
            </label>
          </div>

          <div className="form-group">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.autoAcceptStudents}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    autoAcceptStudents: e.target.checked
                  }))
                }
                disabled={isSubmitting}
              />
              <span>
                Automatically accept students who join with class code
              </span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}

// Invite Modal Component
const InviteModal = ({ classCode, onClose }) => {
  const shareUrl = `${window.location.origin}/classes/join?code=${classCode}`

  const copyToClipboard = text => {
    navigator.clipboard.writeText(text)
    // You could add a toast notification here
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Invite Students</h2>

        <div className="space-y-4">
          <div>
            <label className="form-label">Class Code</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={classCode}
                className="form-input flex-1"
                readOnly
              />
              <button
                onClick={() => copyToClipboard(classCode)}
                className="btn btn-secondary"
              >
                Copy
              </button>
            </div>
          </div>

          <div>
            <label className="form-label">Share Link</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                className="form-input flex-1"
                readOnly
              />
              <button
                onClick={() => copyToClipboard(shareUrl)}
                className="btn btn-secondary"
              >
                Copy
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="btn btn-primary">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default ClassDetail
