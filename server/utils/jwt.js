const jwt = require('jsonwebtoken')

// Generate JWT token
const generateToken = userId => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  })
}

// Generate refresh token
const generateRefreshToken = userId => {
  return jwt.sign({ userId, type: 'refresh' }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  })
}

// Verify token
const verifyToken = token => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET)
  } catch (error) {
    throw new Error('Invalid token')
  }
}

// Extract token from request header
const extractToken = req => {
  const authHeader = req.header('Authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  return null
}

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  extractToken
}
