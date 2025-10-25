const mongoose = require('mongoose')

const assignmentSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class ID is required']
    },
    title: {
      type: String,
      required: [true, 'Assignment title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      required: [true, 'Assignment description is required'],
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters']
    },
    instructions: {
      type: String,
      trim: true,
      maxlength: [10000, 'Instructions cannot exceed 10000 characters']
    },
    dueAt: {
      type: Date,
      required: [true, 'Due date is required']
    },
    maxScore: {
      type: Number,
      default: 100,
      min: [0, 'Max score cannot be negative']
    },
    attachments: [
      {
        filename: String,
        originalName: String,
        mimetype: String,
        size: Number,
        url: String,
        uploadedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    submissionTypes: [
      {
        type: String,
        enum: ['file', 'link', 'text'],
        default: 'file'
      }
    ],
    settings: {
      allowLateSubmissions: {
        type: Boolean,
        default: true
      },
      allowResubmissions: {
        type: Boolean,
        default: true
      },
      maxAttempts: {
        type: Number,
        default: 1
      },
      gradingRubric: String
    },
    visibility: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
)

// Indexes for performance
assignmentSchema.index({ classId: 1, dueAt: 1 })
assignmentSchema.index({ createdBy: 1 })
assignmentSchema.index({ visibility: 1 })
assignmentSchema.index({ dueAt: 1 })

// Virtual for checking if assignment is overdue
assignmentSchema.virtual('isOverdue').get(function () {
  return new Date() > this.dueAt
})

// Virtual for checking if assignment is upcoming (due within 7 days)
assignmentSchema.virtual('isUpcoming').get(function () {
  const now = new Date()
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  return this.dueAt > now && this.dueAt <= weekFromNow
})

// Method to check if submissions are allowed
assignmentSchema.methods.canSubmit = function () {
  if (this.visibility !== 'published') return false

  const now = new Date()
  if (now > this.dueAt && !this.settings.allowLateSubmissions) {
    return false
  }

  return true
}

// Method to get time remaining until due date
assignmentSchema.methods.getTimeRemaining = function () {
  const now = new Date()
  const timeDiff = this.dueAt - now

  if (timeDiff <= 0) return null

  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
  const hours = Math.floor(
    (timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  )
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))

  return { days, hours, minutes }
}

// Static method to get assignments by status
assignmentSchema.statics.getByStatus = function (classId, status) {
  const now = new Date()
  let query = { classId, visibility: 'published' }

  switch (status) {
    case 'upcoming':
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      query.dueAt = { $gt: now, $lte: weekFromNow }
      break
    case 'overdue':
      query.dueAt = { $lt: now }
      break
    case 'active':
      query.dueAt = { $gte: now }
      break
  }

  return this.find(query)
}

module.exports = mongoose.model('Assignment', assignmentSchema)
