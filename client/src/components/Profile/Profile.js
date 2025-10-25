import React, { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Loading from '../Common/Loading'

const Profile = () => {
  const { user, updateProfile, error, clearError } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || ''
      }))
    }
    clearError()
  }, [user, clearError])

  const handleChange = e => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Clear field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }

    // Clear success message when editing
    if (successMessage) {
      setSuccessMessage('')
    }
  }

  const validateProfileForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validatePasswordForm = () => {
    const newErrors = {}

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required'
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required'
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password'
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleProfileSubmit = async e => {
    e.preventDefault()

    if (!validateProfileForm()) {
      return
    }

    setIsSubmitting(true)
    const result = await updateProfile({
      name: formData.name,
      email: formData.email
    })

    if (result.success) {
      setSuccessMessage('Profile updated successfully!')
    }
    setIsSubmitting(false)
  }

  const handlePasswordSubmit = async e => {
    e.preventDefault()

    if (!validatePasswordForm()) {
      return
    }

    setIsSubmitting(true)
    const result = await updateProfile({
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword
    })

    if (result.success) {
      setSuccessMessage('Password updated successfully!')
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }))
    }
    setIsSubmitting(false)
  }

  if (!user) {
    return <Loading message="Loading profile..." />
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
        <p className="text-secondary">
          Manage your account information and preferences
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'profile'
              ? 'border-b-2 border-primary text-primary'
              : 'text-secondary hover:text-primary'
          }`}
        >
          Profile Information
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'password'
              ? 'border-b-2 border-primary text-primary'
              : 'text-secondary hover:text-primary'
          }`}
        >
          Change Password
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-100 text-green-800 p-3 rounded mb-4">
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-error text-white p-3 rounded mb-4">{error}</div>
      )}

      {/* Profile Information Tab */}
      {activeTab === 'profile' && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Profile Information</h2>

          <form onSubmit={handleProfileSubmit}>
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`form-input ${errors.name ? 'border-red-500' : ''}`}
                placeholder="Enter your full name"
                disabled={isSubmitting}
              />
              {errors.name && <div className="form-error">{errors.name}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`form-input ${errors.email ? 'border-red-500' : ''}`}
                placeholder="Enter your email"
                disabled={isSubmitting}
              />
              {errors.email && <div className="form-error">{errors.email}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Role</label>
              <input
                type="text"
                value={user.role}
                className="form-input bg-secondary"
                disabled
              />
              <div className="text-xs text-secondary mt-1">
                Role cannot be changed. Contact an administrator if needed.
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Member Since</label>
              <input
                type="text"
                value={new Date(user.createdAt).toLocaleDateString()}
                className="form-input bg-secondary"
                disabled
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="loading"></div>
                  Updating...
                </span>
              ) : (
                'Update Profile'
              )}
            </button>
          </form>
        </div>
      )}

      {/* Change Password Tab */}
      {activeTab === 'password' && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Change Password</h2>

          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label htmlFor="currentPassword" className="form-label">
                Current Password
              </label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                className={`form-input ${
                  errors.currentPassword ? 'border-red-500' : ''
                }`}
                placeholder="Enter your current password"
                disabled={isSubmitting}
              />
              {errors.currentPassword && (
                <div className="form-error">{errors.currentPassword}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="newPassword" className="form-label">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                className={`form-input ${
                  errors.newPassword ? 'border-red-500' : ''
                }`}
                placeholder="Enter your new password"
                disabled={isSubmitting}
              />
              {errors.newPassword && (
                <div className="form-error">{errors.newPassword}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`form-input ${
                  errors.confirmPassword ? 'border-red-500' : ''
                }`}
                placeholder="Confirm your new password"
                disabled={isSubmitting}
              />
              {errors.confirmPassword && (
                <div className="form-error">{errors.confirmPassword}</div>
              )}
            </div>

            <div className="bg-blue-50 p-4 rounded mb-4">
              <h4 className="font-semibold text-sm mb-2">
                Password Requirements:
              </h4>
              <ul className="text-sm text-secondary space-y-1">
                <li>• At least 6 characters long</li>
                <li>• Different from your current password</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="loading"></div>
                  Updating...
                </span>
              ) : (
                'Update Password'
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default Profile
