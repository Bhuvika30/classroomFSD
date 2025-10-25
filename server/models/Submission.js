const mongoose = require('mongoose')

const submissionSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: [true, 'Assignment ID is required']
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required']
    },
    submissionType: {
      type: String,
      enum: ['file', 'link', 'text'],
      required: [true, 'Submission type is required']
    },
    content: {
      // For file submissions
      files: [
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
      // For link submissions
      links: [
        {
          url: {
            type: String,
            validate: {
              validator: function (v) {
                return /^https?:\/\/.+/.test(v)
              },
              message: 'Please provide a valid URL'
            }
          },
          title: String,
          description: String
        }
      ],
      // For text submissions
      text: String
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'graded', 'returned'],
      default: 'submitted'
    },
    isLate: {
      type: Boolean,
      default: false
    },
    attemptNumber: {
      type: Number,
      default: 1
    },
    grade: {
      score: {
        type: Number,
        min: 0
      },
      maxScore: {
        type: Number,
        min: 0
      },
      percentage: Number,
      letterGrade: String,
      rubric: [
        {
          criterion: String,
          score: Number,
          maxScore: Number,
          feedback: String
        }
      ],
      gradedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      gradedAt: Date
    },
    feedback: {
      type: String,
      maxlength: [2000, 'Feedback cannot exceed 2000 characters']
    },
    teacherNotes: {
      type: String,
      maxlength: [1000, 'Teacher notes cannot exceed 1000 characters']
    },
    history: [
      {
        action: {
          type: String,
          enum: ['submitted', 'graded', 'returned', 'resubmitted']
        },
        timestamp: {
          type: Date,
          default: Date.now
        },
        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        details: String
      }
    ],
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

// Compound indexes for performance
submissionSchema.index({ assignmentId: 1, studentId: 1 })
submissionSchema.index({ studentId: 1, status: 1 })
submissionSchema.index({ assignmentId: 1, status: 1 })
submissionSchema.index({ submittedAt: -1 })

// Calculate percentage grade
submissionSchema.pre('save', function (next) {
  if (this.grade && this.grade.score !== undefined && this.grade.maxScore) {
    this.grade.percentage = Math.round(
      (this.grade.score / this.grade.maxScore) * 100
    )

    // Calculate letter grade
    const percentage = this.grade.percentage
    if (percentage >= 90) this.grade.letterGrade = 'A'
    else if (percentage >= 80) this.grade.letterGrade = 'B'
    else if (percentage >= 70) this.grade.letterGrade = 'C'
    else if (percentage >= 60) this.grade.letterGrade = 'D'
    else this.grade.letterGrade = 'F'
  }
  next()
})

// Method to check if submission is late
submissionSchema.methods.checkIfLate = async function () {
  const Assignment = mongoose.model('Assignment')
  const assignment = await Assignment.findById(this.assignmentId)

  if (assignment && this.submittedAt > assignment.dueAt) {
    this.isLate = true
  }

  return this.isLate
}

// Method to add history entry
submissionSchema.methods.addHistoryEntry = function (
  action,
  performedBy,
  details = ''
) {
  this.history.push({
    action,
    performedBy,
    details,
    timestamp: new Date()
  })
}

// Method to grade submission
submissionSchema.methods.gradeSubmission = function (gradeData, gradedBy) {
  this.grade = {
    ...gradeData,
    gradedBy,
    gradedAt: new Date()
  }

  this.status = 'graded'
  this.addHistoryEntry(
    'graded',
    gradedBy,
    `Scored ${gradeData.score}/${gradeData.maxScore}`
  )
}

// Static method to get submissions by status
submissionSchema.statics.getByStatus = function (assignmentId, status) {
  let query = { assignmentId }

  if (status && status !== 'all') {
    if (status === 'ungraded') {
      query.status = { $in: ['submitted', 'draft'] }
    } else if (status === 'missing') {
      // This would need to be handled differently as it involves finding students who haven't submitted
      query.status = { $exists: false }
    } else {
      query.status = status
    }
  }

  return this.find(query).populate('studentId', 'name email profile')
}

// Static method for grade distribution
submissionSchema.statics.getGradeDistribution = function (assignmentId) {
  return this.aggregate([
    {
      $match: {
        assignmentId: mongoose.Types.ObjectId(assignmentId),
        status: 'graded'
      }
    },
    {
      $bucket: {
        groupBy: '$grade.percentage',
        boundaries: [0, 60, 70, 80, 90, 100],
        default: 'Other',
        output: {
          count: { $sum: 1 },
          averageScore: { $avg: '$grade.score' }
        }
      }
    }
  ])
}

module.exports = mongoose.model('Submission', submissionSchema)
