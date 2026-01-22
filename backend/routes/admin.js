const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth'); // Standard authentication middleware
const { requireAdmin } = require('../middleware/adminAuth'); // Admin role-check middleware

// All routes in this file require the user to be logged in and to be an admin.
// We apply the middleware to all routes at once.
router.use(auth, requireAdmin);

// Define the specific routes for user management
router.get('/users', adminController.getAllUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;