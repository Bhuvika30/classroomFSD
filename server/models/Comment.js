const mongoose = require('mongoose')

const commentSchema = new mongoose.Schema(
  {
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission',
      required: [true, 'Submission ID is required']
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author ID is required']
    },
    text: {
      type: String,
      required: [true, 'Comment text is required'],
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null
    },
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: Date,
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: Date,
    attachments: [
      {
        filename: String,
        originalName: String,
        mimetype: String,
        size: Number,
        url: String
      }
    ],
    reactions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        type: {
          type: String,
          enum: ['like', 'helpful', 'question', 'resolved']
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
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

// Indexes for performance
commentSchema.index({ submissionId: 1, createdAt: 1 })
commentSchema.index({ authorId: 1 })
commentSchema.index({ parentId: 1 })

// Virtual for reply count
commentSchema.virtual('replyCount', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentId',
  count: true
})

// Method to get threaded replies
commentSchema.methods.getReplies = function () {
  return mongoose
    .model('Comment')
    .find({ parentId: this._id, isDeleted: false })
    .populate('authorId', 'name profile.avatar')
    .sort({ createdAt: 1 })
}

// Method to add reaction
commentSchema.methods.addReaction = function (userId, type) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(
    r => r.userId.toString() !== userId.toString()
  )

  // Add new reaction
  this.reactions.push({ userId, type })
}

// Method to remove reaction
commentSchema.methods.removeReaction = function (userId) {
  this.reactions = this.reactions.filter(
    r => r.userId.toString() !== userId.toString()
  )
}

// Static method to get comment thread
commentSchema.statics.getThread = function (submissionId) {
  return this.find({ submissionId, parentId: null, isDeleted: false })
    .populate('authorId', 'name profile.avatar')
    .populate({
      path: 'reactions.userId',
      select: 'name'
    })
    .sort({ createdAt: 1 })
}

module.exports = mongoose.model('Comment', commentSchema)
