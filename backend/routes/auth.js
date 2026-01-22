// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Public routes
router.post('/login', authController.loginUser);
router.post('/register', authController.registerUser);
router.get('/health', authController.healthCheck);

// Protected routes (ต้อง login ก่อน)
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, authController.updateProfile);
router.post('/change-password', authenticateToken, authController.changePassword);
router.post('/logout', authenticateToken, authController.logoutUser);

console.log('Auth routes loaded');

module.exports = router;