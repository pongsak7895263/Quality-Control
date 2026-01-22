qc-backend/
├── server.js                 # main server
├── db.js                     # PostgreSQL connection
├── routes/
│   ├── inspectionRoutes.js   # API สำหรับ Inspection
│   └── materialRoutes.js     # API สำหรับ Materials
├── controllers/
│   ├── inspectionController.js
│   └── materialController.js
├── models/
│   ├── inspectionModel.js
│   └── materialModel.js
├── package.json


---------------------------------------------
quality-control-backend/
├── config/
│   ├── database.js              # Database configuration
│   ├── auth.js                  # Authentication config
│   ├── app.js                   # App configuration
│   ├── redis.js                      
│   └── constants.js             # System constants
│
├── controllers/
│   ├── auth/
│   │   ├── authController.js
│   │   └── userController.js
│   │
│   ├── dashboard/
│   │   ├── dashboardController.js
│   │   ├── statsController.js
│   │   └── activityController.js
│   │
│   ├── inspections/
│   │   ├── materialInspectionController.js
│   │   ├── chemicalTestController.js
│   │   ├── billetInspectionController.js
│   │   ├── hotForgingController.js
│   │   ├── postForgingController.js
│   │   ├── heatTreatmentController.js
│   │   └── finalInspectionController.js
│   │
│   ├── charts/
│   │   ├── productionChartController.js
│   │   ├── qualityChartController.js
│   │   ├── efficiencyChartController.js
│   │   └── processStatusController.js
│   │
│   ├── reports/
│   │   ├── reportsController.js
│   │   └── exportController.js
│   │
│   └── settings/
│       ├── settingsController.js
│       ├── standardsController.js
│       └── systemController.js
│
├── middleware/
│   ├── auth.js                  # Authentication middleware
│   ├── validation.js            # Input validation
│   ├── errorHandler.js          # Error handling
│   ├── rateLimiter.js           # Rate limiting
│   ├── audit.js                 # Audit logging
│   └── realtime.js              # WebSocket middleware
│
├── models/
│   ├── auth/
│   │   ├── User.js
│   │   ├── Role.js
│   │   └── Permission.js
│   │
│   ├── inspections/
│   │   ├── MaterialInspection.js
│   │   ├── ChemicalTest.js
│   │   ├── BilletInspection.js
│   │   ├── HotForging.js
│   │   ├── PostForging.js
│   │   ├── HeatTreatment.js
│   │   ├── FinalInspection.js
│   │   └── TestElementResult.js
│   │
│   ├── production/
│   │   ├── ProductionBatch.js
│   │   ├── ProductionLine.js
│   │   ├── Equipment.js
│   │   └── WorkOrder.js
│   │
│   ├── quality/
│   │   ├── QualityStandard.js
│   │   ├── QualityMetric.js
│   │   ├── DefectType.js
│   │   └── QualityAlert.js
│   │
│   └── system/
│       ├── AuditLog.js
│       ├── SystemSettings.js
│       ├── Notification.js
│       └── ActivityLog.js
│
├── routes/
│   ├── auth.js                  # Authentication routes
│   ├── dashboard.js             # Dashboard routes
│   ├── inspections.js           # All inspection routes
│   ├── charts.js                # Chart data routes
│   ├── reports.js               # Reports routes
│   ├── settings.js              # Settings routes
│   └── realtime.js              # WebSocket routes
│
├── services/
│   ├── auth/
│   │   ├── authService.js
│   │   ├── tokenService.js
│   │   └── passwordService.js
│   │
│   ├── inspections/
│   │   ├── inspectionService.js
│   │   ├── validationService.js
│   │   └── calculationService.js
│   │
│   ├── dashboard/
│   │   ├── dashboardService.js
│   │   ├── metricsService.js
│   │   └── realtimeService.js
│   │
│   ├── reports/
│   │   ├── reportService.js
│   │   ├── exportService.js
│   │   └── scheduledReportService.js
│   │
│   ├── notifications/
│   │   ├── notificationService.js
│   │   ├── emailService.js
│   │   └── alertService.js
│   │
│   └── external/
│       ├── equipmentIntegration.js
│       └── erpIntegration.js
│
├── utils/
│   ├── database.js              # Database utilities
│   ├── validation.js            # Validation helpers
│   ├── calculations.js          # Statistical calculations
│   ├── dateHelpers.js           # Date utilities
│   ├── fileHelpers.js           # File handling
│   ├── cryptoHelpers.js         # Encryption utilities
│   └── constants.js             # Application constants
│
├── websocket/
│   ├── socketHandler.js         # Main socket handler
│   ├── realtimeData.js          # Real-time data broadcasting
│   └── notifications.js         # Real-time notifications
│
├── jobs/
│   ├── scheduledReports.js      # Scheduled report generation
│   ├── dataAggregation.js       # Data aggregation jobs
│   ├── alertMonitoring.js       # Quality alert monitoring
│   └── cleanup.js               # Database cleanup jobs
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── migrations/
├── seeders/
├── docs/
│   ├── api.md
│   └── database.md
│
├── app.js                       # Express app setup
├── server.js                    # Server entry point
├── package.json
└── .env


*--******************************************
quality-control-backend/
├── config/
│   ├── database.js              
│   ├── auth.js                  
│   ├── app.js                  
│   ├── redis.js
│   ├── config.json                       
│   └── constants.js             
├── controllers/
│      ├── authController.js
│      ├── userController.js
│      ├── InspectionController.js
│      └── materialController.js
├── docs/
│   ├── api.md
│   ├── database.md
├── middleware/
│   ├── adminAuth.js
│   ├── audit.js
│   ├── auth.js
│   ├── databaseSelector.js                  
│   ├── validation.js   
│   ├── permission.js        
│   ├── errorHandler.js          
│   ├── rateLimiter.js           
│   ├── upload.js                 
│   └── realtime.js                
├── models/
│   ├── index.js
│   ├── inspection.js
│   ├── inspectionImage.js
│   ├── inspectionModel.js  
│   ├── MaterialInspection.js 
│   ├── materialModel.js
│   ├── PasswordResetToken.js
│   └── User.js
├── routes/
│   ├── admin.js
│   ├── api.js
│   ├── auth.js
│   ├── charts.js
│   ├── dashboard.js
│   ├── index.js
│   ├── inspectionRoutes.js
│   ├── inspections.js
│   ├── materialRoutes.js
│   ├── realtime.js
│   ├── reports.js
│   ├── setting.js
│   ├── test.js
├── utils/
│   ├── database.js              
│   ├── validation.js            
│   ├── calculations.js          
│   ├── dateHelpers.js           
│   ├── fileHelpers.js           
│   ├── cryptoHelpers.js        
│   └── constants.js 
├── server.js                    
├── package.json
├── db.js
├── hash-password.js
├── package-lock.json
└── .env

*--******************************************
quality-control-backend/
├── config/
│   ├── database.js              
│   ├── auth.js                  
│   ├── app.js                  
│   ├── redis.js
│   ├── config.json                       
│   └── constants.js             
├── controllers/
│     ├── auth
│         └── userController.js
│     ├── adminController.js
│     ├── apiController.js
│     ├── authController.js
│     ├── calibrationController
│     ├── hardnessController
│     ├── InspectionController.js
│     └── materialController.js
├── docs/
│   ├── api.md
│   ├── database.md
├── middleware/
│   ├── adminAuth.js
│   ├── audit.js
│   ├── auth.js
│   ├── databaseSelector.js                  
│   ├── validation.js   
│   ├── permission.js        
│   ├── errorHandler.js          
│   ├── rateLimiter.js           
│   ├── upload.js                 
│   └── realtime.js                
├── models/
    ├── index.js
│   ├── CalibrationPlan.js
│   ├── CalibrationResult.js
│   ├── inspectionImage.js
│   ├── inspectionModel.js  
│   ├── MaterialInspection.js 
│   ├── materialModel.js
│   ├── PasswordResetToken.js
│   └── User.js
├── routes/
│   ├── admin.js
│   ├── api.js
│   ├── auth.js
    ├── calibrationRoutes
│   ├── charts.js
│   ├── dashboard.js
│   ├── index.js
│   ├── inspectionRoutes.js
│   ├── inspections.js
│   ├── materialRoutes.js
│   ├── realtime.js
│   ├── reports.js
│   ├── setting.js
│   ├── test.js
├── utils/
│   ├── database.js              
│   ├── validation.js            
│   ├── calculations.js          
│   ├── dateHelpers.js           
│   ├── fileHelpers.js           
│   ├── cryptoHelpers.js        
│   └── constants.js 
├── server.js                    
├── package.json
├── db.js
├── hash-password.js
├── package-lock.json
└── .env




