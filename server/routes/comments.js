const express = require('express')
const Comment = require('../models/Comment')
const {
  authenticate,
  checkSubmissionPermission
} = require('../middleware/auth')
const {
  validateComment,
  validatePagination,
  validateObjectId
} = require('../middleware/validation')

const router = express.Router()

// @route   POST /api/submissions/:submissionId/comments
// @desc    Add comment to submission
// @access  Private
router.post(
  '/:submissionId/comments',
  authenticate,
  validateObjectId('submissionId'),
  checkSubmissionPermission('read'),
  validateComment,
  async (req, res) => {
    try {
      const { text, parentId } = req.body

      // Verify parent comment exists if provided
      if (parentId) {
        const parentComment = await Comment.findById(parentId)
        if (
          !parentComment ||
          parentComment.submissionId.toString() !== req.params.submissionId
        ) {
          return res.status(400).json({ message: 'Invalid parent comment' })
        }
      }

      const comment = new Comment({
        submissionId: req.params.submissionId,
        authorId: req.user._id,
        text,
        parentId: parentId || null
      })

      await comment.save()
      await comment.populate('authorId', 'name profile.avatar')

      res.status(201).json({
        message: 'Comment added successfully',
        comment
      })
    } catch (error) {
      console.error('Create comment error:', error)
      res.status(500).json({ message: 'Server error creating comment' })
    }
  }
)

// @route   GET /api/submissions/:submissionId/comments
// @desc    Get comments for submission with threading
// @access  Private
router.get(
  '/:submissionId/comments',
  authenticate,
  validateObjectId('submissionId'),
  checkSubmissionPermission('read'),
  validatePagination,
  async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query
      const skip = (page - 1) * limit

      // Get top-level comments
      const comments = await Comment.find({
        submissionId: req.params.submissionId,
        parentId: null,
        isDeleted: false
      })
        .populate('authorId', 'name profile.avatar')
        .populate({
          path: 'reactions.userId',
          select: 'name'
        })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(parseInt(limit))

      // Get replies for each comment
      const commentsWithReplies = await Promise.all(
        comments.map(async comment => {
          const replies = await comment.getReplies()
          return {
            ...comment.toObject(),
            replies
          }
        })
      )

      const total = await Comment.countDocuments({
        submissionId: req.params.submissionId,
        parentId: null,
        isDeleted: false
      })
      const pages = Math.ceil(total / limit)

      res.json({
        comments: commentsWithReplies,
        pagination: {
          page: parseInt(page),
          pages,
          total,
          limit: parseInt(limit)
        }
      })
    } catch (error) {
      console.error('Get comments error:', error)
      res.status(500).json({ message: 'Server error fetching comments' })
    }
  }
)

// @route   PATCH /api/comments/:id
// @desc    Update comment (Author only)
// @access  Private
router.patch(
  '/:id',
  authenticate,
  validateObjectId('id'),
  validateComment,
  async (req, res) => {
    try {
      const comment = await Comment.findById(req.params.id)

      if (!comment || comment.isDeleted) {
        return res.status(404).json({ message: 'Comment not found' })
      }

      // Only author can edit
      if (comment.authorId.toString() !== req.user._id.toString()) {
        return res
          .status(403)
          .json({ message: 'You can only edit your own comments' })
      }

      const { text } = req.body

      comment.text = text
      comment.isEdited = true
      comment.editedAt = new Date()

      await comment.save()
      await comment.populate('authorId', 'name profile.avatar')

      res.json({
        message: 'Comment updated successfully',
        comment
      })
    } catch (error) {
      console.error('Update comment error:', error)
      res.status(500).json({ message: 'Server error updating comment' })
    }
  }
)

// @route   DELETE /api/comments/:id
// @desc    Delete comment (Author only)
// @access  Private
router.delete(
  '/:id',
  authenticate,
  validateObjectId('id'),
  async (req, res) => {
    try {
      const comment = await Comment.findById(req.params.id)

      if (!comment || comment.isDeleted) {
        return res.status(404).json({ message: 'Comment not found' })
      }

      // Only author can delete
      if (comment.authorId.toString() !== req.user._id.toString()) {
        return res
          .status(403)
          .json({ message: 'You can only delete your own comments' })
      }

      // Soft delete
      comment.isDeleted = true
      comment.deletedAt = new Date()
      comment.text = '[Comment deleted]'

      await comment.save()

      res.json({ message: 'Comment deleted successfully' })
    } catch (error) {
      console.error('Delete comment error:', error)
      res.status(500).json({ message: 'Server error deleting comment' })
    }
  }
)

// @route   POST /api/comments/:id/reactions
// @desc    Add reaction to comment
// @access  Private
router.post(
  '/:id/reactions',
  authenticate,
  validateObjectId('id'),
  async (req, res) => {
    try {
      const { type } = req.body

      if (
        !type ||
        !['like', 'helpful', 'question', 'resolved'].includes(type)
      ) {
        return res
          .status(400)
          .json({ message: 'Valid reaction type is required' })
      }

      const comment = await Comment.findById(req.params.id)

      if (!comment || comment.isDeleted) {
        return res.status(404).json({ message: 'Comment not found' })
      }

      comment.addReaction(req.user._id, type)
      await comment.save()

      res.json({
        message: 'Reaction added successfully',
        reactions: comment.reactions
      })
    } catch (error) {
      console.error('Add reaction error:', error)
      res.status(500).json({ message: 'Server error adding reaction' })
    }
  }
)

// @route   DELETE /api/comments/:id/reactions
// @desc    Remove reaction from comment
// @access  Private
router.delete(
  '/:id/reactions',
  authenticate,
  validateObjectId('id'),
  async (req, res) => {
    try {
      const comment = await Comment.findById(req.params.id)

      if (!comment || comment.isDeleted) {
        return res.status(404).json({ message: 'Comment not found' })
      }

      comment.removeReaction(req.user._id)
      await comment.save()

      res.json({
        message: 'Reaction removed successfully',
        reactions: comment.reactions
      })
    } catch (error) {
      console.error('Remove reaction error:', error)
      res.status(500).json({ message: 'Server error removing reaction' })
    }
  }
)

module.exports = router
