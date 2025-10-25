const multer = require('multer')
const path = require('path')
const fs = require('fs')

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_PATH || 'uploads/'
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let subDir = 'general/'

    // Organize files by type
    if (req.baseUrl.includes('assignments')) {
      subDir = 'assignments/'
    } else if (req.baseUrl.includes('submissions')) {
      subDir = 'submissions/'
    } else if (req.baseUrl.includes('comments')) {
      subDir = 'comments/'
    }

    const fullPath = path.join(uploadDir, subDir)
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true })
    }

    cb(null, fullPath)
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    const name = path.basename(file.originalname, ext)
    const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_')

    cb(null, `${sanitizedName}_${uniqueSuffix}${ext}`)
  }
})

// File filter function
const fileFilter = (req, file, cb) => {
  const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || [
    'pdf',
    'doc',
    'docx',
    'txt',
    'jpg',
    'jpeg',
    'png'
  ]

  const ext = path.extname(file.originalname).toLowerCase().slice(1)

  if (allowedTypes.includes(ext)) {
    cb(null, true)
  } else {
    cb(
      new Error(
        `File type .${ext} is not allowed. Allowed types: ${allowedTypes.join(
          ', '
        )}`
      ),
      false
    )
  }
}

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB default
    files: 5 // Maximum 5 files per request
  }
})

// Middleware for single file upload
const uploadSingle = (fieldName = 'file') => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, err => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File too large' })
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ message: 'Unexpected field name' })
          }
        }
        return res.status(400).json({ message: err.message })
      }
      next()
    })
  }
}

// Middleware for multiple file upload
const uploadMultiple = (fieldName = 'files', maxCount = 5) => {
  return (req, res, next) => {
    upload.array(fieldName, maxCount)(req, res, err => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res
              .status(400)
              .json({ message: 'One or more files are too large' })
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res
              .status(400)
              .json({
                message: `Too many files. Maximum ${maxCount} files allowed`
              })
          }
        }
        return res.status(400).json({ message: err.message })
      }
      next()
    })
  }
}

// Utility function to delete file
const deleteFile = filePath => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      return true
    }
  } catch (error) {
    console.error('Error deleting file:', error)
  }
  return false
}

// Middleware to process uploaded files
const processUploadedFiles = (req, res, next) => {
  if (req.file) {
    req.uploadedFile = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/${path
        .relative(uploadDir, req.file.path)
        .replace(/\\/g, '/')}`
    }
  }

  if (req.files && req.files.length > 0) {
    req.uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: `/uploads/${path.relative(uploadDir, file.path).replace(/\\/g, '/')}`
    }))
  }

  next()
}

module.exports = {
  uploadSingle,
  uploadMultiple,
  processUploadedFiles,
  deleteFile
}
