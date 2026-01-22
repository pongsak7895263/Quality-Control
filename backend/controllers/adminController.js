// backend/controllers/adminController.js

const { User } = require('../models'); // <-- Import the User model from Sequelize

// Get all users
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password'] }, // Exclude passwords for security
            order: [['createdAt', 'ASC']]
        });
        res.json({ success: true, data: users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch users.' });
    }
};

// Create a new user
exports.createUser = async (req, res) => {
    const { username, password, role, fullName, email } = req.body;
    try {
        // The 'beforeCreate' hook in your User model will automatically hash the password
        const newUser = await User.create({ username, password, role, fullName, email });

        // Don't send the password back in the response
        const userResponse = newUser.toJSON();
        delete userResponse.password;

        res.status(201).json({
            success: true,
            message: `User ${username} created successfully.`,
            data: userResponse
        });
    } catch (error) {
        // Handle unique constraint error (e.g., duplicate username/email)
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ success: false, message: 'Username or email already exists.' });
        }
        console.error('Error creating user:', error);
        res.status(500).json({ success: false, message: 'Failed to create user.' });
    }
};

// Update a user's information
exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { role, fullName, email } = req.body; // Fields that an admin can update

    try {
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Update the user with new data
        user.role = role ?? user.role;
        user.fullName = fullName ?? user.fullName;
        user.email = email ?? user.email;
        
        await user.save();

        const userResponse = user.toJSON();
        delete userResponse.password;

        res.json({ success: true, message: `User ${id} updated successfully.`, data: userResponse });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ success: false, message: 'Failed to update user.' });
    }
};

// Delete a user
exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        await user.destroy();
        res.json({ success: true, message: 'User deleted successfully.' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ success: false, message: 'Failed to delete user.' });
    }
};