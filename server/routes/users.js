const express = require("express")
const router = express.Router()
const { check, validationResult } = require("express-validator")
const { authenticate } = require("../middleware/auth")
const User = require("../models/User")

// @route   GET api/users/stats
// @desc    Get user statistics (admin only)
// @access  Private/Admin
router.get("/", authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Not authorized as admin" })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    oneWeekAgo.setHours(0, 0, 0, 0)

    const [totalUsers, activeUsers, todayRegistrations, weeklyRegistrations, roleDistribution] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({
        createdAt: { $gte: today },
      }),
      User.countDocuments({
        createdAt: { $gte: oneWeekAgo },
      }),
      User.aggregate([
        {
          $group: {
            _id: "$role",
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: null,
            roles: {
              $push: {
                k: "$_id",
                v: "$count",
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            roles: { $arrayToObject: "$roles" },
          },
        },
      ]),
    ])

    const roleDistributionObj = roleDistribution[0]?.roles || {}

    res.json({
      totalUsers,
      activeUsers,
      todayRegistrations,
      weeklyRegistrations,
      roleDistribution: {
        student: roleDistributionObj.student || 0,
        teacher: roleDistributionObj.teacher || 0,
        admin: roleDistributionObj.admin || 0,
      },
    })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   GET api/users
// @desc    Get all users (admin only)
// @access  Private/Admin
router.get("/", authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Not authorized as admin" })
    }

    const { page = 1, limit = 10, search = "", role = "" } = req.query
    const query = {}

    // Add search filter
    if (search) {
      query.$or = [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }]
    }

    // Add role filter
    if (role) {
      query.role = role
    }

    const users = await User.find(query)
      .select("-password")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 })

    const count = await User.countDocuments(query)

    res.json({
      users,
      pagination: {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: +page,
        limit: +limit,
      },
    })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   PUT api/users/:id/role
// @desc    Update user role (admin only)
// @access  Private/Admin
router.put("/:id/role", [authenticate, check("role", "Role is required").not().isEmpty()], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }

  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Not authorized as admin" })
    }

    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ msg: "User not found" })
    }

    // Prevent modifying own role
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ msg: "Cannot modify your own role" })
    }

    user.role = req.body.role
    await user.save()

    res.json({ msg: "User role updated successfully" })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   PUT api/users/:id/status
// @desc    Update user status (active/inactive)
// @access  Private/Admin
router.put("/:id/status", [authenticate, check("isActive", "Status is required").isBoolean()], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }

  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Not authorized as admin" })
    }

    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ msg: "User not found" })
    }

    // Prevent modifying own status
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ msg: "Cannot modify your own status" })
    }

    user.isActive = req.body.isActive
    await user.save()

    res.json({
      msg: `User ${req.body.isActive ? "activated" : "deactivated"} successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   DELETE api/users/:id
// @desc    Delete user (admin only)
// @access  Private/Admin
router.delete("/:id", authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Not authorized as admin" })
    }

    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ msg: "User not found" })
    }

    // Prevent deleting self
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ msg: "Cannot delete your own account" })
    }

    await user.remove()
    res.json({ msg: "User removed" })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

module.exports = router
