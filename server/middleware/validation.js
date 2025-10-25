const { body, param, query, validationResult } = require('express-validator')

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array()
    })
  }
  next()
}

// User validation rules
const validateUserRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .optional()
    .isIn(['student', 'teacher', 'admin'])
    .withMessage('Role must be student, teacher, or admin'),
  handleValidationErrors
]

const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
]

// Class validation rules
const validateClassCreation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Class title must be between 3 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('code')
    .optional()
    .trim()
    .matches(/^[A-Z0-9]{6,10}$/)
    .withMessage('Class code must be 6-10 alphanumeric characters'),
  handleValidationErrors
]

// Assignment validation rules
const validateAssignmentCreation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Assignment title must be between 3 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters'),
  body('dueAt')
    .isISO8601()
    .toDate()
    .custom(value => {
      if (new Date(value) <= new Date()) {
        throw new Error('Due date must be in the future')
      }
      return true
    }),
  body('maxScore')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Max score must be a positive number'),
  body('submissionTypes')
    .optional()
    .isArray()
    .custom(value => {
      const validTypes = ['file', 'link', 'text']
      return value.every(type => validTypes.includes(type))
    })
    .withMessage('Invalid submission types'),
  handleValidationErrors
]

// Submission validation rules
const validateSubmissionCreation = [
  body('submissionType')
    .isIn(['file', 'link', 'text'])
    .withMessage('Submission type must be file, link, or text'),
  body('content.links.*.url')
    .optional()
    .isURL()
    .withMessage('Please provide valid URLs'),
  body('content.text')
    .optional()
    .trim()
    .isLength({ max: 10000 })
    .withMessage('Text submission cannot exceed 10000 characters'),
  handleValidationErrors
]

// Grading validation rules
const validateGrading = [
  body('score')
    .isFloat({ min: 0 })
    .withMessage('Score must be a positive number'),
  body('maxScore')
    .isFloat({ min: 0 })
    .withMessage('Max score must be a positive number'),
  body('feedback')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Feedback cannot exceed 2000 characters'),
  handleValidationErrors
]

// Comment validation rules
const validateComment = [
  body('text')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters'),
  handleValidationErrors
]

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('q')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query cannot exceed 100 characters'),
  handleValidationErrors
]

// MongoDB ObjectId validation
const validateObjectId = field => [
  param(field)
    .isMongoId()
    .withMessage(`${field} must be a valid MongoDB ObjectId`),
  handleValidationErrors
]

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validateClassCreation,
  validateAssignmentCreation,
  validateSubmissionCreation,
  validateGrading,
  validateComment,
  validatePagination,
  validateObjectId
}
