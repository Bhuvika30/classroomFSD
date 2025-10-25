const express = require('express')
const Class = require('../models/Class')
const User = require('../models/User')
const {
  authenticate,
  isTeacherOrAdmin,
  checkClassPermission
} = require('../middleware/auth')
const {
  validateClassCreation,
  validatePagination,
  validateObjectId
} = require('../middleware/validation')

const router = express.Router()

// @route   POST /api/classes
// @desc    Create a new class (Teacher/Admin only)
// @access  Private/Teacher/Admin
router.post(
  '/',
  authenticate,
  isTeacherOrAdmin,
  validateClassCreation,
  async (req, res) => {
    try {
      const { title, description, code } = req.body

      // Generate unique class code if not provided
      let classCode = code
      if (!classCode) {
        let isUnique = false
        while (!isUnique) {
          classCode = Class.generateClassCode()
          const existingClass = await Class.findOne({ code: classCode })
          if (!existingClass) isUnique = true
        }
      } else {
        // Check if provided code is unique
        const existingClass = await Class.findOne({ code: classCode })
        if (existingClass) {
          return res.status(400).json({ message: 'Class code already exists' })
        }
      }

      const newClass = new Class({
        title,
        description,
        code: classCode,
        teacherId: req.user._id,
        createdBy: req.user._id,
        members: [
          {
            userId: req.user._id,
            roleInClass: 'teacher'
          }
        ]
      })

      await newClass.save()
      await newClass.populate('teacherId', 'name email')

      res.status(201).json({
        message: 'Class created successfully',
        class: newClass
      })
    } catch (error) {
      console.error('Create class error:', error)
      res.status(500).json({ message: 'Server error creating class' })
    }
  }
)

// @route   GET /api/classes
// @desc    Get classes with pagination and filtering
// @access  Private
router.get('/', authenticate, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 10, mine, q } = req.query
    const skip = (page - 1) * limit

    let query = { isActive: true }

    // Filter by user's classes if mine=1
    if (mine === '1') {
      query.$or = [
        { teacherId: req.user._id },
        { 'members.userId': req.user._id }
      ]
    } else if (req.user.role === 'student') {
      // Students can only see their enrolled classes
      query['members.userId'] = req.user._id
    } else if (req.user.role === 'teacher') {
      // Teachers can see their own classes
      query.teacherId = req.user._id
    }
    // Admins can see all classes (no additional filter)

    // Search functionality
    if (q) {
      query.$and = query.$and || []
      query.$and.push({
        $or: [
          { title: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { code: { $regex: q, $options: 'i' } }
        ]
      })
    }

    const classes = await Class.find(query)
      .populate('teacherId', 'name email')
      .populate('members.userId', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    const total = await Class.countDocuments(query)
    const pages = Math.ceil(total / limit)

    res.json({
      classes,
      pagination: {
        page: parseInt(page),
        pages,
        total,
        limit: parseInt(limit)
      }
    })
  } catch (error) {
    console.error('Get classes error:', error)
    res.status(500).json({ message: 'Server error fetching classes' })
  }
})

// @route   GET /api/classes/:id
// @desc    Get class by ID
// @access  Private
router.get(
  '/:id',
  authenticate,
  validateObjectId('id'),
  checkClassPermission(),
  async (req, res) => {
    try {
      const classDoc = await Class.findById(req.params.id)
        .populate('teacherId', 'name email profile')
        .populate('members.userId', 'name email role profile')

      res.json({ class: classDoc })
    } catch (error) {
      console.error('Get class error:', error)
      res.status(500).json({ message: 'Server error fetching class' })
    }
  }
)

// @route   PATCH /api/classes/:id
// @desc    Update class (Teacher/Admin only)
// @access  Private/Teacher/Admin
router.patch(
  '/:id',
  authenticate,
  validateObjectId('id'),
  checkClassPermission(),
  async (req, res) => {
    try {
      // Only teacher or admin can update
      if (
        req.user.role !== 'admin' &&
        req.class.teacherId.toString() !== req.user._id.toString()
      ) {
        return res
          .status(403)
          .json({
            message: 'Only the class teacher or admin can update this class'
          })
      }

      const allowedUpdates = ['title', 'description', 'settings']
      const updates = {}

      Object.keys(req.body).forEach(key => {
        if (allowedUpdates.includes(key)) {
          updates[key] = req.body[key]
        }
      })

      const updatedClass = await Class.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true, runValidators: true }
      ).populate('teacherId', 'name email')

      res.json({
        message: 'Class updated successfully',
        class: updatedClass
      })
    } catch (error) {
      console.error('Update class error:', error)
      res.status(500).json({ message: 'Server error updating class' })
    }
  }
)

// @route   POST /api/classes/:id/enroll
// @desc    Enroll a student in class (Teacher/Admin only)
// @access  Private/Teacher/Admin
router.post(
  '/:id/enroll',
  authenticate,
  validateObjectId('id'),
  checkClassPermission(),
  async (req, res) => {
    try {
      const { userId, email } = req.body

      // Only teacher or admin can enroll students
      if (
        req.user.role !== 'admin' &&
        req.class.teacherId.toString() !== req.user._id.toString()
      ) {
        return res
          .status(403)
          .json({
            message: 'Only the class teacher or admin can enroll students'
          })
      }

      let student
      if (userId) {
        student = await User.findById(userId)
      } else if (email) {
        student = await User.findOne({ email })
      } else {
        return res.status(400).json({ message: 'User ID or email is required' })
      }

      if (!student) {
        return res.status(404).json({ message: 'Student not found' })
      }

      if (student.role !== 'student') {
        return res
          .status(400)
          .json({ message: 'Only students can be enrolled in classes' })
      }

      // Check if already enrolled
      if (req.class.isUserEnrolled(student._id)) {
        return res
          .status(400)
          .json({ message: 'Student is already enrolled in this class' })
      }

      req.class.addMember(student._id, 'student')
      await req.class.save()

      res.json({
        message: 'Student enrolled successfully',
        student: {
          id: student._id,
          name: student.name,
          email: student.email
        }
      })
    } catch (error) {
      console.error('Enroll student error:', error)
      res.status(500).json({ message: 'Server error enrolling student' })
    }
  }
)

// @route   POST /api/classes/join
// @desc    Join class by code (Student only)
// @access  Private/Student
router.post('/join', authenticate, async (req, res) => {
  try {
    const { code } = req.body

    if (!code) {
      return res.status(400).json({ message: 'Class code is required' })
    }

    if (req.user.role !== 'student') {
      return res
        .status(403)
        .json({ message: 'Only students can join classes using codes' })
    }

    const classDoc = await Class.findOne({
      code: code.toUpperCase(),
      isActive: true
    })
    if (!classDoc) {
      return res.status(404).json({ message: 'Invalid class code' })
    }

    // Check if already enrolled
    if (classDoc.isUserEnrolled(req.user._id)) {
      return res
        .status(400)
        .json({ message: 'You are already enrolled in this class' })
    }

    classDoc.addMember(req.user._id, 'student')
    await classDoc.save()

    await classDoc.populate('teacherId', 'name email')

    res.json({
      message: 'Successfully joined class',
      class: {
        id: classDoc._id,
        title: classDoc.title,
        code: classDoc.code,
        teacher: classDoc.teacherId
      }
    })
  } catch (error) {
    console.error('Join class error:', error)
    res.status(500).json({ message: 'Server error joining class' })
  }
})

// @route   DELETE /api/classes/:id/members/:userId
// @desc    Remove member from class (Teacher/Admin only)
// @access  Private/Teacher/Admin
router.delete(
  '/:id/members/:userId',
  authenticate,
  validateObjectId('id'),
  validateObjectId('userId'),
  checkClassPermission(),
  async (req, res) => {
    try {
      // Only teacher or admin can remove members
      if (
        req.user.role !== 'admin' &&
        req.class.teacherId.toString() !== req.user._id.toString()
      ) {
        return res
          .status(403)
          .json({
            message: 'Only the class teacher or admin can remove members'
          })
      }

      const { userId } = req.params

      // Cannot remove the teacher
      if (userId === req.class.teacherId.toString()) {
        return res
          .status(400)
          .json({ message: 'Cannot remove the class teacher' })
      }

      // Check if user is enrolled
      if (!req.class.isUserEnrolled(userId)) {
        return res
          .status(404)
          .json({ message: 'User is not enrolled in this class' })
      }

      req.class.removeMember(userId)
      await req.class.save()

      res.json({ message: 'Member removed successfully' })
    } catch (error) {
      console.error('Remove member error:', error)
      res.status(500).json({ message: 'Server error removing member' })
    }
  }
)

// @route   DELETE /api/classes/:id
// @desc    Delete/Archive class (Teacher/Admin only)
// @access  Private/Teacher/Admin
router.delete(
  '/:id',
  authenticate,
  validateObjectId('id'),
  checkClassPermission(),
  async (req, res) => {
    try {
      // Only teacher or admin can delete
      if (
        req.user.role !== 'admin' &&
        req.class.teacherId.toString() !== req.user._id.toString()
      ) {
        return res
          .status(403)
          .json({
            message: 'Only the class teacher or admin can delete this class'
          })
      }

      // Check if class has assignments
      const Assignment = require('../models/Assignment')
      const assignmentCount = await Assignment.countDocuments({
        classId: req.params.id
      })

      if (assignmentCount > 0) {
        // Archive instead of delete if has assignments
        req.class.isActive = false
        await req.class.save()
        res.json({
          message: 'Class archived successfully (contains assignments)'
        })
      } else {
        await Class.findByIdAndDelete(req.params.id)
        res.json({ message: 'Class deleted successfully' })
      }
    } catch (error) {
      console.error('Delete class error:', error)
      res.status(500).json({ message: 'Server error deleting class' })
    }
  }
)

module.exports = router
