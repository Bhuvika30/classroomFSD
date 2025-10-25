const express = require('express')
const Submission = require('../models/Submission')
const Assignment = require('../models/Assignment')
const {
  authenticate,
  checkAssignmentPermission,
  checkSubmissionPermission
} = require('../middleware/auth')
const {
  validateSubmissionCreation,
  validateGrading,
  validatePagination,
  validateObjectId
} = require('../middleware/validation')

const router = express.Router()

// @route   POST /api/assignments/:assignmentId/submissions
// @desc    Create/Submit assignment submission (Student only)
// @access  Private/Student
router.post(
  '/:assignmentId/submissions',
  authenticate,
  validateObjectId('assignmentId'),
  checkAssignmentPermission('read'),
  validateSubmissionCreation,
  async (req, res) => {
    try {
      // Only students can submit
      if (req.user.role !== 'student') {
        return res
          .status(403)
          .json({ message: 'Only students can submit assignments' })
      }

      const assignment = req.assignment

      // Check if assignment allows submissions
      if (!assignment.canSubmit()) {
        return res
          .status(400)
          .json({ message: 'Submissions are not allowed for this assignment' })
      }

      // Check if student is enrolled in the class
      if (!assignment.classId.isUserEnrolled(req.user._id)) {
        return res
          .status(403)
          .json({ message: 'You are not enrolled in this class' })
      }

      const { submissionType, content } = req.body

      // Check if submission type is allowed
      if (!assignment.submissionTypes.includes(submissionType)) {
        return res
          .status(400)
          .json({
            message: 'This submission type is not allowed for this assignment'
          })
      }

      // Check for existing submission
      let existingSubmission = await Submission.findOne({
        assignmentId: req.params.assignmentId,
        studentId: req.user._id
      })

      // Check if resubmissions are allowed
      if (existingSubmission && !assignment.settings.allowResubmissions) {
        return res
          .status(400)
          .json({
            message: 'Resubmissions are not allowed for this assignment'
          })
      }

      // Check attempt limit
      const attemptNumber = existingSubmission
        ? existingSubmission.attemptNumber + 1
        : 1
      if (
        assignment.settings.maxAttempts &&
        attemptNumber > assignment.settings.maxAttempts
      ) {
        return res
          .status(400)
          .json({ message: 'Maximum submission attempts exceeded' })
      }

      // Check if submission is late
      const isLate = new Date() > assignment.dueAt
      if (isLate && !assignment.settings.allowLateSubmissions) {
        return res
          .status(400)
          .json({
            message: 'Late submissions are not allowed for this assignment'
          })
      }

      let submission
      if (existingSubmission) {
        // Update existing submission
        existingSubmission.submissionType = submissionType
        existingSubmission.content = content
        existingSubmission.submittedAt = new Date()
        existingSubmission.isLate = isLate
        existingSubmission.attemptNumber = attemptNumber
        existingSubmission.status = 'submitted'

        existingSubmission.addHistoryEntry(
          'resubmitted',
          req.user._id,
          `Attempt ${attemptNumber}`
        )

        submission = await existingSubmission.save()
      } else {
        // Create new submission
        submission = new Submission({
          assignmentId: req.params.assignmentId,
          studentId: req.user._id,
          submissionType,
          content,
          isLate,
          attemptNumber
        })

        submission.addHistoryEntry(
          'submitted',
          req.user._id,
          'Initial submission'
        )
        await submission.save()
      }

      await submission.populate('studentId', 'name email')

      res.status(201).json({
        message: 'Submission successful',
        submission
      })
    } catch (error) {
      console.error('Create submission error:', error)
      res.status(500).json({ message: 'Server error creating submission' })
    }
  }
)

// @route   GET /api/submissions/me
// @desc    Get current user's submissions with pagination
// @access  Private
router.get('/me', authenticate, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 10, classId, status } = req.query
    const skip = (page - 1) * limit

    let query = { studentId: req.user._id }

    // Filter by class
    if (classId) {
      // Verify user is enrolled in the class
      const Class = require('../models/Class')
      const classDoc = await Class.findById(classId)
      if (!classDoc || !classDoc.isUserEnrolled(req.user._id)) {
        return res.status(403).json({ message: 'Access denied to this class' })
      }

      // Get assignments for this class
      const assignments = await Assignment.find({ classId }).select('_id')
      const assignmentIds = assignments.map(a => a._id)
      query.assignmentId = { $in: assignmentIds }
    }

    // Filter by status
    if (status && status !== 'all') {
      query.status = status
    }

    const submissions = await Submission.find(query)
      .populate({
        path: 'assignmentId',
        select: 'title dueAt maxScore classId',
        populate: {
          path: 'classId',
          select: 'title code'
        }
      })
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    const total = await Submission.countDocuments(query)
    const pages = Math.ceil(total / limit)

    res.json({
      submissions,
      pagination: {
        page: parseInt(page),
        pages,
        total,
        limit: parseInt(limit)
      }
    })
  } catch (error) {
    console.error('Get user submissions error:', error)
    res.status(500).json({ message: 'Server error fetching submissions' })
  }
})

// @route   GET /api/submissions/:id
// @desc    Get submission by ID
// @access  Private
router.get(
  '/:id',
  authenticate,
  validateObjectId('id'),
  checkSubmissionPermission('read'),
  async (req, res) => {
    try {
      const submission = await Submission.findById(req.params.id)
        .populate('studentId', 'name email profile')
        .populate({
          path: 'assignmentId',
          select: 'title description dueAt maxScore classId',
          populate: {
            path: 'classId',
            select: 'title code teacherId'
          }
        })
        .populate('grade.gradedBy', 'name email')

      res.json({ submission })
    } catch (error) {
      console.error('Get submission error:', error)
      res.status(500).json({ message: 'Server error fetching submission' })
    }
  }
)

// @route   PATCH /api/submissions/:id/grade
// @desc    Grade a submission (Teacher/Admin only)
// @access  Private/Teacher/Admin
router.patch(
  '/:id/grade',
  authenticate,
  validateObjectId('id'),
  checkSubmissionPermission('write'),
  validateGrading,
  async (req, res) => {
    try {
      // Only teachers and admins can grade
      if (req.user.role === 'student') {
        return res
          .status(403)
          .json({ message: 'Students cannot grade submissions' })
      }

      const { score, maxScore, feedback, rubric } = req.body

      const submission = req.submission

      // Validate score against assignment max score
      const assignment = await Assignment.findById(submission.assignmentId)
      if (maxScore && maxScore !== assignment.maxScore) {
        return res
          .status(400)
          .json({ message: 'Max score must match assignment max score' })
      }

      if (score > (maxScore || assignment.maxScore)) {
        return res
          .status(400)
          .json({ message: 'Score cannot exceed max score' })
      }

      // Grade the submission
      submission.gradeSubmission(
        {
          score,
          maxScore: maxScore || assignment.maxScore,
          rubric
        },
        req.user._id
      )

      if (feedback) {
        submission.feedback = feedback
      }

      await submission.save()
      await submission.populate('grade.gradedBy', 'name email')

      res.json({
        message: 'Submission graded successfully',
        submission
      })
    } catch (error) {
      console.error('Grade submission error:', error)
      res.status(500).json({ message: 'Server error grading submission' })
    }
  }
)

// @route   PATCH /api/submissions/:id
// @desc    Update submission (Student - own submissions only)
// @access  Private/Student
router.patch(
  '/:id',
  authenticate,
  validateObjectId('id'),
  checkSubmissionPermission('write'),
  async (req, res) => {
    try {
      // Only the student who submitted can update (before grading)
      if (req.submission.studentId.toString() !== req.user._id.toString()) {
        return res
          .status(403)
          .json({ message: 'You can only update your own submissions' })
      }

      if (req.submission.status === 'graded') {
        return res
          .status(400)
          .json({ message: 'Cannot update graded submissions' })
      }

      // Check if assignment still allows submissions
      const assignment = await Assignment.findById(req.submission.assignmentId)
      if (
        !assignment.canSubmit() &&
        !assignment.settings.allowLateSubmissions
      ) {
        return res
          .status(400)
          .json({ message: 'Submission deadline has passed' })
      }

      const allowedUpdates = ['content', 'submissionType']
      const updates = {}

      Object.keys(req.body).forEach(key => {
        if (allowedUpdates.includes(key)) {
          updates[key] = req.body[key]
        }
      })

      // Validate submission type
      if (
        updates.submissionType &&
        !assignment.submissionTypes.includes(updates.submissionType)
      ) {
        return res
          .status(400)
          .json({ message: 'This submission type is not allowed' })
      }

      updates.submittedAt = new Date()
      updates.isLate = new Date() > assignment.dueAt

      const submission = await Submission.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true, runValidators: true }
      )

      submission.addHistoryEntry('updated', req.user._id, 'Submission updated')
      await submission.save()

      res.json({
        message: 'Submission updated successfully',
        submission
      })
    } catch (error) {
      console.error('Update submission error:', error)
      res.status(500).json({ message: 'Server error updating submission' })
    }
  }
)

// @route   DELETE /api/submissions/:id
// @desc    Delete submission (Student - own submissions only, before grading)
// @access  Private/Student
router.delete(
  '/:id',
  authenticate,
  validateObjectId('id'),
  checkSubmissionPermission('write'),
  async (req, res) => {
    try {
      // Only the student who submitted can delete (before grading)
      if (req.submission.studentId.toString() !== req.user._id.toString()) {
        return res
          .status(403)
          .json({ message: 'You can only delete your own submissions' })
      }

      if (req.submission.status === 'graded') {
        return res
          .status(400)
          .json({ message: 'Cannot delete graded submissions' })
      }

      await Submission.findByIdAndDelete(req.params.id)

      res.json({ message: 'Submission deleted successfully' })
    } catch (error) {
      console.error('Delete submission error:', error)
      res.status(500).json({ message: 'Server error deleting submission' })
    }
  }
)

module.exports = router
