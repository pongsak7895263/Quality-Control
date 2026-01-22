// controllers/inspections/chemicalTestController.js
const { ChemicalTest, TestElementResult, MaterialInspection, ProductionBatch, User, QualityStandard } = require('../../models');
const { validationResult } = require('express-validator');

const chemicalTestController = {
  // GET /api/inspections/chemical - สำหรับ ChemicalTest Component
  getAll: async (req, res) => {
    try {
      const { page = 1, limit = 10, status, materialGrade, testType } = req.query;
      const offset = (page - 1) * limit;
      
      let whereCondition = {};
      if (status) whereCondition.overallResult = status;
      if (materialGrade) whereCondition.materialGrade = materialGrade;
      if (testType) whereCondition.testType = testType;

      const { count, rows: tests } = await ChemicalTest.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: MaterialInspection,
            as: 'materialInspection',
            include: [{
              model: ProductionBatch,
              as: 'batch',
              attributes: ['batchNumber', 'materialGrade']
            }]
          },
          {
            model: User,
            as: 'tester',
            attributes: ['firstName', 'lastName', 'employeeId']
          },
          {
            model: User,
            as: 'reviewer',
            attributes: ['firstName', 'lastName', 'employeeId']
          },
          {
            model: TestElementResult,
            as: 'elementResults'
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: offset
      });

      res.json({
        success: true,
        data: {
          tests,
          pagination: {
            total: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get chemical tests error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch chemical tests',
        error: error.message
      });
    }
  },

  // GET /api/inspections/chemical/:id - ดึงข้อมูลตาม ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;

      const test = await ChemicalTest.findByPk(id, {
        include: [
          {
            model: MaterialInspection,
            as: 'materialInspection',
            include: [{
              model: ProductionBatch,
              as: 'batch',
              attributes: ['batchNumber', 'materialGrade']
            }]
          },
          {
            model: User,
            as: 'tester',
            attributes: ['firstName', 'lastName', 'employeeId']
          },
          {
            model: User,
            as: 'reviewer',
            attributes: ['firstName', 'lastName', 'employeeId']
          },
          {
            model: TestElementResult,
            as: 'elementResults'
          }
        ]
      });

      if (!test) {
        return res.status(404).json({
          success: false,
          message: 'Chemical test not found'
        });
      }

      res.json({
        success: true,
        data: test
      });
    } catch (error) {
      console.error('Get chemical test by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch chemical test',
        error: error.message
      });
    }
  },

  // POST /api/inspections/chemical - สร้างการทดสอบเคมีใหม่
  create: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { elementResults, ...testData } = req.body;

      // Generate test number
      const count = await ChemicalTest.count();
      testData.testNumber = `CT${new Date().getFullYear()}${String(count + 1).padStart(6, '0')}`;
      testData.testedBy = req.user.id;
      testData.testedAt = new Date();

      // สร้างการทดสอบเคมี
      const chemicalTest = await ChemicalTest.create(testData);

      // สร้างผลการทดสอบองค์ประกอบ
      if (elementResults && elementResults.length > 0) {
        const elementsData = elementResults.map(element => ({
          ...element,
          chemicalTestId: chemicalTest.id
        }));
        
        await TestElementResult.bulkCreate(elementsData);

        // ตรวจสอบผลรวม
        await chemicalTestController.evaluateTestResults(chemicalTest.id, testData.materialGrade);
      }

      const createdTest = await ChemicalTest.findByPk(chemicalTest.id, {
        include: [
          {
            model: TestElementResult,
            as: 'elementResults'
          },
          {
            model: User,
            as: 'tester',
            attributes: ['firstName', 'lastName']
          }
        ]
      });

      res.status(201).json({
        success: true,
        data: createdTest,
        message: 'Chemical test created successfully'
      });
    } catch (error) {
      console.error('Create chemical test error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create chemical test',
        error: error.message
      });
    }
  },

  // ✅ PUT /api/inspections/chemical/:id - อัพเดทข้อมูล
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { elementResults, ...updateData } = req.body;

      // ตรวจสอบว่ามีข้อมูลอยู่หรือไม่
      const existingTest = await ChemicalTest.findByPk(id);
      if (!existingTest) {
        return res.status(404).json({
          success: false,
          message: 'Chemical test not found'
        });
      }

      // ตรวจสอบว่าถูก approve แล้วหรือยัง (ถ้า approve แล้วอาจไม่ให้แก้ไข)
      if (existingTest.approvedAt) {
        return res.status(400).json({
          success: false,
          message: 'Cannot update approved test. Please contact administrator.'
        });
      }

      // อัพเดทข้อมูลหลัก
      await existingTest.update({
        ...updateData,
        updatedAt: new Date()
      });

      // ถ้ามีการส่ง elementResults มาด้วย ให้อัพเดท
      if (elementResults && elementResults.length > 0) {
        // ลบ element results เดิม
        await TestElementResult.destroy({
          where: { chemicalTestId: id }
        });

        // สร้างใหม่
        const elementsData = elementResults.map(element => ({
          ...element,
          chemicalTestId: id
        }));
        
        await TestElementResult.bulkCreate(elementsData);

        // ประเมินผลใหม่
        await chemicalTestController.evaluateTestResults(id, updateData.materialGrade || existingTest.materialGrade);
      }

      // ดึงข้อมูลที่อัพเดทแล้ว
      const updatedTest = await ChemicalTest.findByPk(id, {
        include: [
          {
            model: TestElementResult,
            as: 'elementResults'
          },
          {
            model: User,
            as: 'tester',
            attributes: ['firstName', 'lastName']
          }
        ]
      });

      res.json({
        success: true,
        data: updatedTest,
        message: 'Chemical test updated successfully'
      });
    } catch (error) {
      console.error('Update chemical test error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update chemical test',
        error: error.message
      });
    }
  },

  // ✅ DELETE /api/inspections/chemical/:id - ลบข้อมูล
  delete: async (req, res) => {
    try {
      const { id } = req.params;

      // ตรวจสอบว่ามีข้อมูลอยู่หรือไม่
      const existingTest = await ChemicalTest.findByPk(id);
      if (!existingTest) {
        return res.status(404).json({
          success: false,
          message: 'Chemical test not found'
        });
      }

      // ตรวจสอบว่าถูก approve แล้วหรือยัง
      if (existingTest.approvedAt) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete approved test. Please contact administrator.'
        });
      }

      // ลบ element results ก่อน (Foreign Key)
      await TestElementResult.destroy({
        where: { chemicalTestId: id }
      });

      // ลบ chemical test
      await existingTest.destroy();

      res.json({
        success: true,
        message: 'Chemical test deleted successfully'
      });
    } catch (error) {
      console.error('Delete chemical test error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete chemical test',
        error: error.message
      });
    }
  },

  // ฟังก์ชันประเมินผลการทดสอบ
  evaluateTestResults: async (testId, materialGrade) => {
    try {
      const elementResults = await TestElementResult.findAll({
        where: { chemicalTestId: testId }
      });

      // ดึงมาตรฐานคุณภาพ
      const standards = await QualityStandard.findAll({
        where: {
          materialGrade: materialGrade,
          processStage: 'chemical_test'
        }
      });

      let overallResult = 'pass';

      // ตรวจสอบแต่ละองค์ประกอบ
      for (const element of elementResults) {
        const standard = standards.find(s => 
          s.parameterName.toLowerCase().includes(element.elementSymbol.toLowerCase())
        );

        if (standard) {
          let result = 'pass';
          
          if (element.measuredValue < standard.minValue || 
              element.measuredValue > standard.maxValue) {
            result = 'fail';
            overallResult = 'fail';
          }

          await element.update({ 
            result,
            specificationMin: standard.minValue,
            specificationMax: standard.maxValue
          });
        }
      }

      // อัพเดทผลรวม
      await ChemicalTest.update(
        { overallResult },
        { where: { id: testId } }
      );

      return overallResult;
    } catch (error) {
      console.error('Evaluate test results error:', error);
      throw error;
    }
  },

  // PUT /api/inspections/chemical/:id/approve
  approve: async (req, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const test = await ChemicalTest.findByPk(id);
      if (!test) {
        return res.status(404).json({
          success: false,
          message: 'Chemical test not found'
        });
      }

      await test.update({
        approvedBy: req.user.id,
        approvedAt: new Date(),
        notes: notes || test.notes
      });

      res.json({
        success: true,
        message: 'Chemical test approved successfully'
      });
    } catch (error) {
      console.error('Approve chemical test error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve chemical test',
        error: error.message
      });
    }
  }
};

module.exports = chemicalTestController;