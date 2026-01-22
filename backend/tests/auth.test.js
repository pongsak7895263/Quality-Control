// tests/auth.test.js - Sample Test File
const request = require('supertest');
const { app } = require('../server');
const { User, Role } = require('../models');

describe('Authentication Endpoints', () => {
  let authToken;
  let testUser;

  beforeEach(async () => {
    // Create test user
    const role = await Role.create({
      name: 'Test Role',
      description: 'Test role for authentication tests'
    });

    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: '$2a$12$test.hash.here',
      firstName: 'Test',
      lastName: 'User',
      roleId: role.id,
      isActive: true
    });
  });

  afterEach(async () => {
    // Clean up test data
    await User.destroy({ where: {}, force: true });
    await Role.destroy({ where: {}, force: true });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'admin123456'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('should fail with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });

    it('should fail with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });
  });

  describe('GET /api/auth/profile', () => {
    beforeEach(async () => {
      // Get auth token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'admin123456'
        });
      
      authToken = loginResponse.body.data.accessToken;
    });

    it('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('username');
      expect(response.body.data).not.toHaveProperty('passwordHash');
    });

    it('should fail without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});

// .sequelizerc - Sequelize CLI Configuration
const path = require('path');

module.exports = {
  'config': path.resolve('config', 'database.js'),
  'models-path': path.resolve('models'),
  'seeders-path': path.resolve('seeders'),
  'migrations-path': path.resolve('migrations')
};

module.exports = { packageJson };