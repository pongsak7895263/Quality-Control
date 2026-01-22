// config/app.js - Application Configuration
module.exports = {
    // Server Configuration
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    
    // Security Configuration
    jwt: {
      secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      refreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    },
    
    // CORS Configuration
    cors: {
      origin: process.env.CLIENT_URL || 'http://192.168.0.26:3000',
      credentials: true
    },
    
    // Rate Limiting
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      authMax: 5 // limit login attempts
    },
    
    // File Upload Configuration
    upload: {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
      destination: process.env.UPLOAD_PATH || './uploads/'
    },
    
    // Email Configuration
    email: {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    },
    
    // Redis Configuration
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    },
    
    // Application Settings
    app: {
      name: process.env.APP_NAME || 'Quality Control',
      version: process.env.APP_VERSION || '1.0.0',
      description: 'Steel Manufacturing Quality Control System'
    },
    
    // Logging Configuration
    logging: {
      level: process.env.LOG_LEVEL || 'info',
      file: process.env.LOG_FILE || './logs/app.log',
      enableConsole: process.env.NODE_ENV !== 'production'
    }
  };
  
  // package.json - Dependencies
  const packageJson = {
    "name": "quality-control-backend",
    "version": "1.0.0",
    "description": "Quality Control System Backend API",
    "main": "server.js",
    "scripts": {
      "start": "node server.js",
      "dev": "nodemon server.js",
      "test": "jest --watchAll --detectOpenHandles",
      "test:ci": "jest --ci --coverage --detectOpenHandles",
      "db:migrate": "sequelize-cli db:migrate",
      "db:seed": "sequelize-cli db:seed:all",
      "db:reset": "sequelize-cli db:migrate:undo:all && npm run db:migrate && npm run db:seed",
      "lint": "eslint .",
      "lint:fix": "eslint . --fix"
    },
    "dependencies": {
      "express": "^4.18.2",
      "sequelize": "^6.32.1",
      "pg": "^8.11.3",
      "pg-hstore": "^2.3.4",
      "bcryptjs": "^2.4.3",
      "jsonwebtoken": "^9.0.2",
      "express-validator": "^7.0.1",
      "cors": "^2.8.5",
      "helmet": "^7.0.0",
      "morgan": "^1.10.0",
      "dotenv": "^16.3.1",
      "express-rate-limit": "^6.8.1",
      "rate-limit-redis": "^3.0.1",
      "redis": "^4.6.7",
      "socket.io": "^4.7.2",
      "multer": "^1.4.5-lts.1",
      "exceljs": "^4.4.0",
      "pdfkit": "^0.13.0",
      "nodemailer": "^6.9.4",
      "compression": "^1.7.4",
      "winston": "^3.10.0",
      "joi": "^17.9.2"
    },
    "devDependencies": {
      "nodemon": "^3.0.1",
      "jest": "^29.6.2",
      "supertest": "^6.3.3",
      "sequelize-cli": "^6.6.1",
      "eslint": "^8.45.0",
      "eslint-config-node": "^4.1.0",
      "eslint-plugin-node": "^11.1.0",
      "husky": "^8.0.3",
      "lint-staged": "^13.2.3"
    },
    "keywords": [
      "quality-control",
      "manufacturing",
      "steel",
      "inspection",
      "nodejs",
      "express",
      "postgresql"
    ],
    "author": "Your Company",
    "license": "MIT",
    "engines": {
      "node": ">=16.0.0",
      "npm": ">=8.0.0"
    }
  };
  
  // tests/setup.js - Test Setup
  const { sequelize } = require('../models');
  
  // Setup database for testing
  beforeAll(async () => {
    // Connect to test database
    await sequelize.authenticate();
    
    // Sync database (create tables)
    await sequelize.sync({ force: true });
    
    // Run seeders for test data
    // await runSeeders();
  });
  
  // Cleanup after all tests
  afterAll(async () => {
    await sequelize.close();
  });
  
  // Clean up after each test
  afterEach(async () => {
    // Optional: Clean up test data
    // await cleanupTestData();
  });
  
  module.exports = {
    testTimeout: 30000,
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    testEnvironment: 'node',
    collectCoverageFrom: [
      'controllers/**/*.js',
      'services/**/*.js',
      'models/**/*.js',
      '!**/node_modules/**',
      '!tests/**'
    ],
    coverageThreshold: {
      global: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70
      }
    }
  };