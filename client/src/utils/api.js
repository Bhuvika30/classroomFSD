import axios from 'axios'

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 10000
})

// Request interceptor to add auth token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
  response => {
    return response
  },
  async error => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (refreshToken) {
          const response = await axios.post(
            `${
              process.env.REACT_APP_API_URL || 'http://localhost:5000/api'
            }/auth/refresh`,
            { refreshToken }
          )

          const { token } = response.data
          localStorage.setItem('token', token)

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// API helper functions
export const apiRequest = async (method, url, data = null, config = {}) => {
  try {
    const response = await api({
      method,
      url,
      data,
      ...config
    })
    return { success: true, data: response.data }
  } catch (error) {
    const message =
      error.response?.data?.message || error.message || 'An error occurred'
    return { success: false, error: message }
  }
}

// Auth API functions
export const authAPI = {
  login: credentials => apiRequest('POST', '/auth/login', credentials),
  register: userData => apiRequest('POST', '/auth/register', userData),
  logout: () => apiRequest('POST', '/auth/logout'),
  getProfile: () => apiRequest('GET', '/auth/profile'),
  updateProfile: data => apiRequest('PUT', '/auth/profile', data),
  refreshToken: refreshToken =>
    apiRequest('POST', '/auth/refresh', { refreshToken })
}

// User API functions
export const userAPI = {
  getUsers: params => apiRequest('GET', '/users', null, { params }),
  getUser: id => apiRequest('GET', `/users/${id}`),
  updateUserRole: (id, role) =>
    apiRequest('PUT', `/users/${id}/role`, { role }),
  updateUserStatus: (id, isActive) =>
    apiRequest('PUT', `/users/${id}/status`, { isActive }),
  deleteUser: id => apiRequest('DELETE', `/users/${id}`),
  getUserStats: () => apiRequest('GET', '/users/stats')
}

// Class API functions
export const classAPI = {
  getClasses: params => apiRequest('GET', '/classes', null, { params }),
  getClass: id => apiRequest('GET', `/classes/${id}`),
  createClass: data => apiRequest('POST', '/classes', data),
  updateClass: (id, data) => apiRequest('PUT', `/classes/${id}`, data),
  deleteClass: id => apiRequest('DELETE', `/classes/${id}`),
  enrollStudent: (id, studentId) =>
    apiRequest('POST', `/classes/${id}/enroll`, { studentId }),
  unenrollStudent: (id, studentId) =>
    apiRequest('DELETE', `/classes/${id}/members/${studentId}`),
  joinByCode: code => apiRequest('POST', '/classes/join', { code })
}

// Assignment API functions
export const assignmentAPI = {
  getAssignments: params => apiRequest('GET', '/assignments', null, { params }),
  getAssignment: id => apiRequest('GET', `/assignments/${id}`),
  createAssignment: data => apiRequest('POST', '/assignments', data),
  updateAssignment: (id, data) => apiRequest('PUT', `/assignments/${id}`, data),
  deleteAssignment: id => apiRequest('DELETE', `/assignments/${id}`),
  getClassAssignments: (classId, params) =>
    apiRequest('GET', `/classes/${classId}/assignments`, null, { params }),
  getAssignmentSubmissions: (id, params) =>
    apiRequest('GET', `/assignments/${id}/submissions`, null, { params }),
  getAssignmentAnalytics: id =>
    apiRequest('GET', `/assignments/${id}/analytics`)
}

// Submission API functions
export const submissionAPI = {
  getSubmissions: params => apiRequest('GET', '/submissions', null, { params }),
  getSubmission: id => apiRequest('GET', `/submissions/${id}`),
  createSubmission: data => apiRequest('POST', '/submissions', data),
  updateSubmission: (id, data) => apiRequest('PUT', `/submissions/${id}`, data),
  deleteSubmission: id => apiRequest('DELETE', `/submissions/${id}`),
  gradeSubmission: (id, gradeData) =>
    apiRequest('PUT', `/submissions/${id}/grade`, gradeData),
  getAssignmentSubmissions: (assignmentId, params) =>
    apiRequest('GET', `/assignments/${assignmentId}/submissions`, null, {
      params
    })
}

// Comment API functions
export const commentAPI = {
  getComments: (submissionId, params) =>
    apiRequest('GET', `/submissions/${submissionId}/comments`, null, {
      params
    }),
  createComment: (submissionId, data) =>
    apiRequest('POST', `/submissions/${submissionId}/comments`, data),
  updateComment: (id, data) => apiRequest('PUT', `/comments/${id}`, data),
  deleteComment: id => apiRequest('DELETE', `/comments/${id}`),
  addReaction: (id, type) =>
    apiRequest('POST', `/comments/${id}/reactions`, { type }),
  removeReaction: (id, type) =>
    apiRequest('DELETE', `/comments/${id}/reactions/${type}`)
}

// File upload function
export const uploadFile = async (file, type = 'assignment') => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', type)

  try {
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return { success: true, data: response.data }
  } catch (error) {
    const message =
      error.response?.data?.message || error.message || 'Upload failed'
    return { success: false, error: message }
  }
}

export default api
