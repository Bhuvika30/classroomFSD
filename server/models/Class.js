const mongoose = require('mongoose')

const classSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Class title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    code: {
      type: String,
      required: [true, 'Class code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [
        /^[A-Z0-9]{6,10}$/,
        'Class code must be 6-10 alphanumeric characters'
      ]
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Teacher is required']
    },
    members: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        roleInClass: {
          type: String,
          enum: ['student', 'teacher', 'assistant'],
          default: 'student'
        },
        enrolledAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    settings: {
      allowLateSubmissions: {
        type: Boolean,
        default: true
      },
      autoGrading: {
        type: Boolean,
        default: false
      },
      maxFileSize: {
        type: Number,
        default: 10485760 // 10MB
      }
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
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
classSchema.index({ code: 1 })
classSchema.index({ teacherId: 1 })
classSchema.index({ 'members.userId': 1 })
classSchema.index({ createdAt: -1 })

// Generate unique class code
classSchema.statics.generateClassCode = function () {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Check if user is enrolled in class
classSchema.methods.isUserEnrolled = function (userId) {
  return this.members.some(
    member => member.userId.toString() === userId.toString()
  )
}

// Get user's role in class
classSchema.methods.getUserRole = function (userId) {
  const member = this.members.find(
    member => member.userId.toString() === userId.toString()
  )
  return member ? member.roleInClass : null
}

// Add member to class
classSchema.methods.addMember = function (userId, role = 'student') {
  if (!this.isUserEnrolled(userId)) {
    this.members.push({
      userId,
      roleInClass: role,
      enrolledAt: new Date()
    })
  }
}

// Remove member from class
classSchema.methods.removeMember = function (userId) {
  this.members = this.members.filter(
    member => member.userId.toString() !== userId.toString()
  )
}

module.exports = mongoose.model('Class', classSchema)
