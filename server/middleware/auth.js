const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Class = require('../models/Class')

// Verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')

    if (!token) {
      return res
        .status(401)
        .json({ message: 'Access denied. No token provided.' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId).select('-passwordHash')

    if (!user || !user.isActive) {
      return res
        .status(401)
        .json({ message: 'Invalid token or user inactive.' })
    }

    req.user = user
    next()
  } catch (error) {
    res.status(401).json({ message: 'Invalid token.' })
  }
}

// Role-based authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ message: 'Access denied. Please authenticate.' })
    }

    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: 'Access denied. Insufficient permissions.' })
    }

    next()
  }
}

// Check if user is admin
const isAdmin = authorize('admin')

// Check if user is teacher or admin
const isTeacherOrAdmin = authorize('teacher', 'admin')

// Check class membership and permissions
const checkClassPermission = (requiredRole = null) => {
  return async (req, res, next) => {
    try {
      const classId = req.params.classId || req.params.id

      if (!classId) {
        return res.status(400).json({ message: 'Class ID is required.' })
      }

      const classDoc = await Class.findById(classId)

      if (!classDoc) {
        return res.status(404).json({ message: 'Class not found.' })
      }

      // Admin has access to all classes
      if (req.user.role === 'admin') {
        req.class = classDoc
        return next()
      }

      // Check if user is the teacher of the class
      if (classDoc.teacherId.toString() === req.user._id.toString()) {
        req.class = classDoc
        return next()
      }

      // Check if user is enrolled in the class
      const userRole = classDoc.getUserRole(req.user._id)

      if (!userRole) {
        return res
          .status(403)
          .json({
            message: 'Access denied. You are not enrolled in this class.'
          })
      }

      // Check required role if specified
      if (
        requiredRole &&
        userRole !== requiredRole &&
        req.user.role !== 'admin'
      ) {
        return res
          .status(403)
          .json({ message: `Access denied. ${requiredRole} role required.` })
      }

      req.class = classDoc
      req.userRoleInClass = userRole
      next()
    } catch (error) {
      res
        .status(500)
        .json({ message: 'Server error checking class permissions.' })
    }
  }
}

// Check assignment permissions
const checkAssignmentPermission = (action = 'read') => {
  return async (req, res, next) => {
    try {
      const Assignment = require('../models/Assignment')
      const assignmentId = req.params.assignmentId || req.params.id

      if (!assignmentId) {
        return res.status(400).json({ message: 'Assignment ID is required.' })
      }

      const assignment = await Assignment.findById(assignmentId).populate(
        'classId'
      )

      if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found.' })
      }

      // Admin has full access
      if (req.user.role === 'admin') {
        req.assignment = assignment
        return next()
      }

      const classDoc = assignment.classId

      // Check if user is the teacher of the class
      if (classDoc.teacherId.toString() === req.user._id.toString()) {
        req.assignment = assignment
        return next()
      }

      // For students, check enrollment and assignment visibility
      if (req.user.role === 'student') {
        if (!classDoc.isUserEnrolled(req.user._id)) {
          return res
            .status(403)
            .json({
              message: 'Access denied. You are not enrolled in this class.'
            })
        }

        // Students can only read published assignments
        if (action === 'read' && assignment.visibility === 'published') {
          req.assignment = assignment
          return next()
        }

        if (action !== 'read') {
          return res
            .status(403)
            .json({
              message: 'Access denied. Students cannot modify assignments.'
            })
        }
      }

      res.status(403).json({ message: 'Access denied.' })
    } catch (error) {
      res
        .status(500)
        .json({ message: 'Server error checking assignment permissions.' })
    }
  }
}

// Check submission permissions
const checkSubmissionPermission = (action = 'read') => {
  return async (req, res, next) => {
    try {
      const Submission = require('../models/Submission')
      const submissionId = req.params.submissionId || req.params.id

      if (!submissionId) {
        return res.status(400).json({ message: 'Submission ID is required.' })
      }

      const submission = await Submission.findById(submissionId).populate({
        path: 'assignmentId',
        populate: { path: 'classId' }
      })

      if (!submission) {
        return res.status(404).json({ message: 'Submission not found.' })
      }

      // Admin has full access
      if (req.user.role === 'admin') {
        req.submission = submission
        return next()
      }

      const classDoc = submission.assignmentId.classId

      // Check if user is the teacher of the class
      if (classDoc.teacherId.toString() === req.user._id.toString()) {
        req.submission = submission
        return next()
      }

      // Students can only access their own submissions
      if (req.user.role === 'student') {
        if (submission.studentId.toString() !== req.user._id.toString()) {
          return res
            .status(403)
            .json({
              message:
                'Access denied. You can only access your own submissions.'
            })
        }

        req.submission = submission
        return next()
      }

      res.status(403).json({ message: 'Access denied.' })
    } catch (error) {
      res
        .status(500)
        .json({ message: 'Server error checking submission permissions.' })
    }
  }
}

module.exports = {
  authenticate,
  authorize,
  isAdmin,
  isTeacherOrAdmin,
  checkClassPermission,
  checkAssignmentPermission,
  checkSubmissionPermission
}
