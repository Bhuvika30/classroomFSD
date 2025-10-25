const express = require('express')
const Assignment = require('../models/Assignment')
const Class = require('../models/Class')
const {
  authenticate,
  checkClassPermission,
  checkAssignmentPermission
} = require('../middleware/auth')
const {
  validateAssignmentCreation,
  validatePagination,
  validateObjectId
} = require('../middleware/validation')

const router = express.Router()

// @route   POST /api/classes/:classId/assignments
// @desc    Create a new assignment (Teacher/Admin only)
// @access  Private/Teacher/Admin
router.post(
  '/:classId/assignments',
  authenticate,
  validateObjectId('classId'),
  checkClassPermission(),
  validateAssignmentCreation,
  async (req, res) => {
    try {
      // Only teacher or admin can create assignments
      if (
        req.user.role !== 'admin' &&
        req.class.teacherId.toString() !== req.user._id.toString()
      ) {
        return res
          .status(403)
          .json({
            message: 'Only the class teacher or admin can create assignments'
          })
      }

      const {
        title,
        description,
        instructions,
        dueAt,
        maxScore,
        submissionTypes,
        settings
      } = req.body

      const assignment = new Assignment({
        classId: req.params.classId,
        title,
        description,
        instructions,
        dueAt: new Date(dueAt),
        maxScore: maxScore || 100,
        submissionTypes: submissionTypes || ['file'],
        settings: settings || {},
        createdBy: req.user._id
      })

      await assignment.save()
      await assignment.populate('createdBy', 'name email')

      res.status(201).json({
        message: 'Assignment created successfully',
        assignment
      })
    } catch (error) {
      console.error('Create assignment error:', error)
      res.status(500).json({ message: 'Server error creating assignment' })
    }
  }
)

// @route   GET /api/classes/:classId/assignments
// @desc    Get assignments for a class with pagination and filtering
// @access  Private
router.get(
  '/:classId/assignments',
  authenticate,
  validateObjectId('classId'),
  checkClassPermission(),
  validatePagination,
  async (req, res) => {
    try {
      const { page = 1, limit = 10, q, statusFilter } = req.query
      const skip = (page - 1) * limit

      let query = { classId: req.params.classId }

      // Students can only see published assignments
      if (req.user.role === 'student') {
        query.visibility = 'published'
      }

      // Search functionality
      if (q) {
        query.$or = [
          { title: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } }
        ]
      }

      // Status filtering
      if (statusFilter) {
        const now = new Date()
        switch (statusFilter) {
          case 'upcoming':
            const weekFromNow = new Date(
              now.getTime() + 7 * 24 * 60 * 60 * 1000
            )
            query.dueAt = { $gt: now, $lte: weekFromNow }
            break
          case 'overdue':
            query.dueAt = { $lt: now }
            break
          case 'active':
            query.dueAt = { $gte: now }
            break
          case 'draft':
            if (req.user.role !== 'student') {
              query.visibility = 'draft'
            }
            break
        }
      }

      const assignments = await Assignment.find(query)
        .populate('createdBy', 'name email')
        .sort({ dueAt: 1 })
        .skip(skip)
        .limit(parseInt(limit))

      const total = await Assignment.countDocuments(query)
      const pages = Math.ceil(total / limit)

      res.json({
        assignments,
        pagination: {
          page: parseInt(page),
          pages,
          total,
          limit: parseInt(limit)
        }
      })
    } catch (error) {
      console.error('Get assignments error:', error)
      res.status(500).json({ message: 'Server error fetching assignments' })
    }
  }
)

// @route   GET /api/assignments/:id
// @desc    Get assignment by ID
// @access  Private
router.get(
  '/:id',
  authenticate,
  validateObjectId('id'),
  checkAssignmentPermission('read'),
  async (req, res) => {
    try {
      const assignment = await Assignment.findById(req.params.id)
        .populate('classId', 'title code teacherId')
        .populate('createdBy', 'name email')

      res.json({ assignment })
    } catch (error) {
      console.error('Get assignment error:', error)
      res.status(500).json({ message: 'Server error fetching assignment' })
    }
  }
)

// @route   PATCH /api/assignments/:id
// @desc    Update assignment (Teacher/Admin only)
// @access  Private/Teacher/Admin
router.patch(
  '/:id',
  authenticate,
  validateObjectId('id'),
  checkAssignmentPermission('write'),
  async (req, res) => {
    try {
      const allowedUpdates = [
        'title',
        'description',
        'instructions',
        'dueAt',
        'maxScore',
        'submissionTypes',
        'settings',
        'visibility'
      ]
      const updates = {}

      Object.keys(req.body).forEach(key => {
        if (allowedUpdates.includes(key)) {
          if (key === 'dueAt') {
            updates[key] = new Date(req.body[key])
          } else {
            updates[key] = req.body[key]
          }
        }
      })

      // Validate due date if being updated
      if (updates.dueAt && updates.dueAt <= new Date()) {
        return res
          .status(400)
          .json({ message: 'Due date must be in the future' })
      }

      updates.updatedBy = req.user._id

      const assignment = await Assignment.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true, runValidators: true }
      ).populate('createdBy updatedBy', 'name email')

      res.json({
        message: 'Assignment updated successfully',
        assignment
      })
    } catch (error) {
      console.error('Update assignment error:', error)
      res.status(500).json({ message: 'Server error updating assignment' })
    }
  }
)

// @route   DELETE /api/assignments/:id
// @desc    Delete assignment (Teacher/Admin only)
// @access  Private/Teacher/Admin
router.delete(
  '/:id',
  authenticate,
  validateObjectId('id'),
  checkAssignmentPermission('write'),
  async (req, res) => {
    try {
      // Check if assignment has submissions
      const Submission = require('../models/Submission')
      const submissionCount = await Submission.countDocuments({
        assignmentId: req.params.id
      })

      if (submissionCount > 0) {
        // Archive instead of delete if has submissions
        await Assignment.findByIdAndUpdate(req.params.id, {
          visibility: 'archived'
        })
        res.json({
          message: 'Assignment archived successfully (contains submissions)'
        })
      } else {
        await Assignment.findByIdAndDelete(req.params.id)
        res.json({ message: 'Assignment deleted successfully' })
      }
    } catch (error) {
      console.error('Delete assignment error:', error)
      res.status(500).json({ message: 'Server error deleting assignment' })
    }
  }
)

// @route   GET /api/assignments/:id/submissions
// @desc    Get submissions for an assignment (Teacher/Admin only)
// @access  Private/Teacher/Admin
router.get(
  '/:id/submissions',
  authenticate,
  validateObjectId('id'),
  checkAssignmentPermission('read'),
  validatePagination,
  async (req, res) => {
    try {
      // Only teachers and admins can view all submissions
      if (req.user.role === 'student') {
        return res
          .status(403)
          .json({ message: 'Students cannot view all submissions' })
      }

      const { page = 1, limit = 10, status } = req.query
      const skip = (page - 1) * limit

      const Submission = require('../models/Submission')

      let query = { assignmentId: req.params.id }

      // Filter by status
      if (status && status !== 'all') {
        if (status === 'ungraded') {
          query.status = { $in: ['submitted', 'draft'] }
        } else if (status === 'graded') {
          query.status = 'graded'
        } else if (status === 'late') {
          query.isLate = true
        } else {
          query.status = status
        }
      }

      const submissions = await Submission.find(query)
        .populate('studentId', 'name email profile')
        .populate('grade.gradedBy', 'name email')
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))

      const total = await Submission.countDocuments(query)
      const pages = Math.ceil(total / limit)

      // Get class members to identify missing submissions
      const assignment = await Assignment.findById(req.params.id).populate(
        'classId'
      )
      const classMembers = assignment.classId.members.filter(
        m => m.roleInClass === 'student'
      )
      const submittedStudentIds = submissions.map(s =>
        s.studentId._id.toString()
      )

      const missingSubmissions = classMembers.filter(
        member => !submittedStudentIds.includes(member.userId.toString())
      )

      res.json({
        submissions,
        missingSubmissions: missingSubmissions.length,
        pagination: {
          page: parseInt(page),
          pages,
          total,
          limit: parseInt(limit)
        }
      })
    } catch (error) {
      console.error('Get submissions error:', error)
      res.status(500).json({ message: 'Server error fetching submissions' })
    }
  }
)

// @route   GET /api/assignments/:id/analytics
// @desc    Get assignment analytics (Teacher/Admin only)
// @access  Private/Teacher/Admin
router.get(
  '/:id/analytics',
  authenticate,
  validateObjectId('id'),
  checkAssignmentPermission('read'),
  async (req, res) => {
    try {
      // Only teachers and admins can view analytics
      if (req.user.role === 'student') {
        return res
          .status(403)
          .json({ message: 'Students cannot view assignment analytics' })
      }

      const Submission = require('../models/Submission')

      // Get basic stats
      const totalSubmissions = await Submission.countDocuments({
        assignmentId: req.params.id
      })
      const gradedSubmissions = await Submission.countDocuments({
        assignmentId: req.params.id,
        status: 'graded'
      })
      const lateSubmissions = await Submission.countDocuments({
        assignmentId: req.params.id,
        isLate: true
      })

      // Get grade distribution
      const gradeDistribution = await Submission.aggregate([
        { $match: { assignmentId: req.assignment._id, status: 'graded' } },
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

      // Get average score
      const avgScoreResult = await Submission.aggregate([
        { $match: { assignmentId: req.assignment._id, status: 'graded' } },
        {
          $group: {
            _id: null,
            avgScore: { $avg: '$grade.score' },
            avgPercentage: { $avg: '$grade.percentage' }
          }
        }
      ])

      const avgScore =
        avgScoreResult.length > 0
          ? avgScoreResult[0]
          : { avgScore: 0, avgPercentage: 0 }

      res.json({
        totalSubmissions,
        gradedSubmissions,
        lateSubmissions,
        averageScore: Math.round(avgScore.avgScore * 100) / 100,
        averagePercentage: Math.round(avgScore.avgPercentage * 100) / 100,
        gradeDistribution
      })
    } catch (error) {
      console.error('Get assignment analytics error:', error)
      res
        .status(500)
        .json({ message: 'Server error fetching assignment analytics' })
    }
  }
)

module.exports = router
