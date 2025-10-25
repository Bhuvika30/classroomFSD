import axios from 'axios'
import React, { createContext, useContext, useEffect, useReducer } from 'react'

const AuthContext = createContext()

const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  loading: true,
  error: null
}

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
    case 'REGISTER_SUCCESS':
      localStorage.setItem('token', action.payload.token)
      if (action.payload.refreshToken) {
        localStorage.setItem('refreshToken', action.payload.refreshToken)
      }
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        error: null
      }

    case 'LOGIN_FAIL':
    case 'REGISTER_FAIL':
    case 'AUTH_ERROR':
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload
      }

    case 'LOGOUT':
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null
      }

    case 'USER_LOADED':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false,
        error: null
      }

    case 'SET_LOADING':
      return { ...state, loading: action.payload }

    case 'CLEAR_ERROR':
      return { ...state, error: null }

    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.payload } }

    default:
      return state
  }
}

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Set axios auth token safely
  const setAuthToken = token => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete axios.defaults.headers.common['Authorization']
    }
  }

  // Load user once when app mounts
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        dispatch({ type: 'SET_LOADING', payload: false })
        return
      }

      setAuthToken(token)
      try {
        const res = await axios.get('/api/auth/me')
        // ✅ dispatch only if user is different or not loaded yet
        if (!state.user || state.user._id !== res.data.user._id) {
          dispatch({ type: 'USER_LOADED', payload: res.data.user })
        } else {
          dispatch({ type: 'SET_LOADING', payload: false })
        }
      } catch (error) {
        dispatch({ type: 'AUTH_ERROR', payload: 'Failed to load user' })
      }
    }

    loadUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // run only once

  // Update axios headers only when token changes
  useEffect(() => {
    setAuthToken(state.token)
  }, [state.token])

  // REGISTER
  const register = async userData => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const res = await axios.post('/api/auth/register', userData)
      dispatch({ type: 'REGISTER_SUCCESS', payload: res.data })
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed'
      dispatch({ type: 'REGISTER_FAIL', payload: message })
      return { success: false, error: message }
    }
  }

  // LOGIN
  const login = async credentials => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const res = await axios.post('/api/auth/login', credentials)
      dispatch({ type: 'LOGIN_SUCCESS', payload: res.data })
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed'
      dispatch({ type: 'LOGIN_FAIL', payload: message })
      return { success: false, error: message }
    }
  }

  // LOGOUT
  const logout = async () => {
    try {
      await axios.post('/api/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    }
    dispatch({ type: 'LOGOUT' })
  }

  // UPDATE PROFILE
  const updateProfile = async profileData => {
    try {
      const res = await axios.patch('/api/auth/me', profileData)
      dispatch({ type: 'UPDATE_USER', payload: res.data.user })
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed'
      return { success: false, error: message }
    }
  }

  // REFRESH TOKEN
  const refreshToken = async () => {
    const refresh = localStorage.getItem('refreshToken')
    if (!refresh) {
      dispatch({ type: 'AUTH_ERROR', payload: 'No refresh token' })
      return false
    }

    try {
      const res = await axios.post('/api/auth/refresh', { refreshToken: refresh })
      dispatch({ type: 'LOGIN_SUCCESS', payload: res.data })
      return true
    } catch (error) {
      dispatch({ type: 'AUTH_ERROR', payload: 'Token refresh failed' })
      return false
    }
  }

  // CLEAR ERROR
  const clearError = () => dispatch({ type: 'CLEAR_ERROR' })

  const value = {
    ...state,
    register,
    login,
    logout,
    updateProfile,
    refreshToken,
    clearError
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export default AuthContext
