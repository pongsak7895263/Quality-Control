// controllers/inspections/chemicalTestController.js
const { 
  sequelize, 
  ChemicalTest, 
  TestElementResult, 
  User, 
  QualityStandard,
  MaterialInspection,
  ProductionBatch
} = require('../../models');

const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

const chemicalTestController = {

  // ==========================================
  // 1. GET ALL (✅ แก้ไขแล้ว - รองรับทั้ง grade/materialGrade และ result/status)
  // ==========================================
  getAll: async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 10, 
        // ✅ รองรับทั้ง 2 ชื่อ parameter
        status,
        result,           // เพิ่มรองรับ result
        materialGrade,
        grade,            // เพิ่มรองรับ grade
        search 
      } = req.query;

      const offset = (page - 1) * limit;
      
      let whereCondition = {};

      // ✅ Grade filter - รองรับทั้ง 2 ชื่อ (ต้องทำก่อน search!)
      const gradeFilter = materialGrade || grade;
      if (gradeFilter && gradeFilter.toLowerCase() !== 'all' && gradeFilter !== '') {
        whereCondition.materialGrade = gradeFilter;
        console.log('📋 Filtering by grade:', gradeFilter);
      }

      // ✅ Status/Result filter - รองรับทั้ง 2 ชื่อ
      const statusFilter = status || result;
      if (statusFilter && statusFilter.toLowerCase() !== 'all' && statusFilter !== '') {
        // รองรับทั้ง overallResult และ testResult field
        const upperStatus = statusFilter.toUpperCase();
        whereCondition[Op.and] = whereCondition[Op.and] || [];
        whereCondition[Op.and].push({
          [Op.or]: [
            { overallResult: upperStatus },
            { testResult: upperStatus }
          ]
        });
        console.log('📋 Filtering by status/result:', upperStatus);
      }
      
      // ✅ Search filter
      if (search && search.trim()) {
        const searchTerm = search.trim();
        whereCondition[Op.and] = whereCondition[Op.and] || [];
        whereCondition[Op.and].push({
          [Op.or]: [
            { testNumber: { [Op.iLike]: `%${searchTerm}%` } },
            { heatNo: { [Op.iLike]: `%${searchTerm}%` } },
            { certNo: { [Op.iLike]: `%${searchTerm}%` } },
            { materialGrade: { [Op.iLike]: `%${searchTerm}%` } },
            { manufacturer: { [Op.iLike]: `%${searchTerm}%` } },
            { inspector: { [Op.iLike]: `%${searchTerm}%` } }
          ]
        });
        console.log('📋 Searching for:', searchTerm);
      }

      console.log('🔍 Query params:', { page, limit, status, result, materialGrade, grade, search });
      console.log('🔍 WHERE condition:', JSON.stringify(whereCondition, null, 2));

      const { count, rows: tests } = await ChemicalTest.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: TestElementResult,
            as: 'elementResults',
            required: false
          },
          {
             model: User,
             as: 'tester',
             attributes: ['firstName', 'lastName'],
             required: false
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: offset,
        distinct: true
      });

      console.log(`✅ Found ${count} records matching filters`);

      res.json({
        success: true,
        data: {
          tests,
          pagination: {
            total: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            page: parseInt(page),  // ✅ เพิ่ม page สำหรับ frontend
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get chemical tests error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch chemical tests', error: error.message });
    }
  },

  // ==========================================
  // 2. GET BY ID
  // ==========================================
  getById: async (req, res) => {
    try {
      const { id } = req.params;

      const test = await ChemicalTest.findByPk(id, {
        include: [
          {
            model: TestElementResult,
            as: 'elementResults'
          },
          {
            model: User,
            as: 'tester',
            attributes: ['firstName', 'lastName']
          },
          {
            model: User,
            as: 'reviewer',
            attributes: ['firstName', 'lastName']
          }
        ]
      });

      if (!test) {
        return res.status(404).json({ success: false, message: 'Chemical test not found' });
      }

      res.json({ success: true, data: test });
    } catch (error) {
      console.error('Get chemical test by ID error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch chemical test', error: error.message });
    }
  },

  // ==========================================
  // 3. CREATE
  // ==========================================
  create: async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      }

      const { elementResults, testValues, ...testData } = req.body;

      const count = await ChemicalTest.count({ transaction: t });
      const year = new Date().getFullYear();
      testData.testNumber = `CT${year}${String(count + 1).padStart(6, '0')}`;
      
      testData.testedBy = req.user ? req.user.id : null;
      testData.testedAt = new Date();
      
      if (testValues) testData.testValues = testValues;

      const chemicalTest = await ChemicalTest.create(testData, { transaction: t });

      if (elementResults && elementResults.length > 0) {
        const elementsData = elementResults.map(element => ({
          ...element,
          chemicalTestId: chemicalTest.id
        }));
        
        await TestElementResult.bulkCreate(elementsData, { transaction: t });
        
        await chemicalTestController.evaluateTestResults(chemicalTest.id, testData.materialGrade, t);
      }

      await t.commit();

      const createdTest = await ChemicalTest.findByPk(chemicalTest.id, {
        include: [{ model: TestElementResult, as: 'elementResults' }]
      });

      res.status(201).json({ success: true, data: createdTest, message: 'Chemical test created successfully' });

    } catch (error) {
      await t.rollback();
      console.error('Create chemical test error:', error);
      res.status(500).json({ success: false, message: 'Failed to create chemical test', error: error.message });
    }
  },

  // ==========================================
  // 4. UPDATE
  // ==========================================
  update: async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { elementResults, testValues, ...updateData } = req.body;

      const existingTest = await ChemicalTest.findByPk(id);
      if (!existingTest) {
        await t.rollback();
        return res.status(404).json({ success: false, message: 'Chemical test not found' });
      }

      if (existingTest.approvedAt) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'Cannot update approved test.' });
      }

      if (testValues) updateData.testValues = testValues;

      await existingTest.update({
        ...updateData,
        updatedAt: new Date()
      }, { transaction: t });

      if (elementResults && elementResults.length > 0) {
        await TestElementResult.destroy({
          where: { chemicalTestId: id },
          transaction: t
        });

        const elementsData = elementResults.map(element => ({
          ...element,
          chemicalTestId: id
        }));
        
        await TestElementResult.bulkCreate(elementsData, { transaction: t });
        
        await chemicalTestController.evaluateTestResults(id, updateData.materialGrade || existingTest.materialGrade, t);
      }

      await t.commit();

      const updatedTest = await ChemicalTest.findByPk(id, {
        include: [{ model: TestElementResult, as: 'elementResults' }]
      });

      res.json({ success: true, data: updatedTest, message: 'Chemical test updated successfully' });

    } catch (error) {
      await t.rollback();
      console.error('Update chemical test error:', error);
      res.status(500).json({ success: false, message: 'Failed to update chemical test', error: error.message });
    }
  },

  // ==========================================
  // 5. DELETE
  // ==========================================
  delete: async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;

      const existingTest = await ChemicalTest.findByPk(id);
      if (!existingTest) {
        await t.rollback();
        return res.status(404).json({ success: false, message: 'Chemical test not found' });
      }

      if (existingTest.approvedAt) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'Cannot delete approved test.' });
      }

      await TestElementResult.destroy({
        where: { chemicalTestId: id },
        transaction: t
      });

      await existingTest.destroy({ transaction: t });

      await t.commit();

      res.json({ success: true, message: 'Chemical test deleted successfully' });

    } catch (error) {
      await t.rollback();
      console.error('Delete chemical test error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete chemical test', error: error.message });
    }
  },

  // ==========================================
  // 6. STATS (✅ เพิ่มใหม่ - แก้ Error 500)
  // ==========================================
  getStats: async (req, res) => {
    try {
      let total = 0, passed = 0, failed = 0, pending = 0;

      try {
        total = await ChemicalTest.count() || 0;
      } catch (e) {
        console.warn('Count total failed:', e.message);
      }

      try {
        // รองรับทั้ง overallResult และ testResult
        passed = await ChemicalTest.count({ 
          where: { 
            [Op.or]: [
              { overallResult: 'PASS' },
              { overallResult: 'pass' },
              { testResult: 'PASS' },
              { testResult: 'pass' }
            ]
          } 
        }) || 0;
      } catch (e) {
        console.warn('Count passed failed:', e.message);
      }

      try {
        failed = await ChemicalTest.count({ 
          where: { 
            [Op.or]: [
              { overallResult: 'FAIL' },
              { overallResult: 'fail' },
              { testResult: 'FAIL' },
              { testResult: 'fail' }
            ]
          } 
        }) || 0;
      } catch (e) {
        console.warn('Count failed failed:', e.message);
      }

      try {
        pending = await ChemicalTest.count({ 
          where: { 
            [Op.or]: [
              { overallResult: 'PENDING' },
              { overallResult: 'pending' },
              { overallResult: null },
              { testResult: 'PENDING' },
              { testResult: 'pending' },
              { testResult: null }
            ]
          } 
        }) || 0;
      } catch (e) {
        console.warn('Count pending failed:', e.message);
      }

      console.log('📊 Stats:', { total, passed, failed, pending });

      res.json({
        success: true,
        total,
        passed,
        failed,
        pending,
        passRate: total > 0 ? ((passed / total) * 100).toFixed(2) : 0
      });

    } catch (error) {
      console.error('getStats Error:', error);
      // ส่ง default values แทน error
      res.json({
        success: false,
        total: 0,
        passed: 0,
        failed: 0,
        pending: 0,
        passRate: 0,
        message: error.message
      });
    }
  },

  // ==========================================
  // 7. LOGIC EVALUATE
  // ==========================================
  evaluateTestResults: async (testId, materialGrade, transaction = null) => {
    try {
      const elementResults = await TestElementResult.findAll({
        where: { chemicalTestId: testId },
        transaction 
      });

      const standards = await QualityStandard.findAll({
        where: {
          materialGrade: materialGrade,
          processStage: 'chemical_test'
        },
        transaction
      });

      let overallResult = 'pass';

      const symbolMap = { 'c': 'carbon', 'si': 'silicon', 'mn': 'manganese', 'p': 'phosphorus', 's': 'sulfur', 'cu': 'copper', 'ni': 'nickel', 'cr': 'chromium', 'mo': 'molybdenum' };

      for (const element of elementResults) {
        const standard = standards.find(s => {
            const dbParamName = s.parameterName.toLowerCase().trim();
            const inputSymbol = element.elementSymbol.toLowerCase().trim();
            
            if (dbParamName === inputSymbol) return true;
            if (symbolMap[inputSymbol] && dbParamName.includes(symbolMap[inputSymbol])) return true;
            
            const regex = new RegExp(`\\b${inputSymbol}\\b`, 'i');
            return regex.test(dbParamName);
        });

        if (standard) {
          let result = 'pass';
          const val = parseFloat(element.measuredValue);
          const min = parseFloat(standard.minValue);
          const max = parseFloat(standard.maxValue);

          if ((!isNaN(min) && val < min) || (!isNaN(max) && val > max)) {
            result = 'fail';
            overallResult = 'fail';
          }

          await element.update({ 
            result,
            specificationMin: standard.minValue,
            specificationMax: standard.maxValue
          }, { transaction });
        }
      }

      await ChemicalTest.update(
        { overallResult },
        { where: { id: testId }, transaction }
      );

      return overallResult;
    } catch (error) {
      console.error('Evaluate test results error:', error);
      throw error;
    }
  },

  // ==========================================
  // 8. APPROVE
  // ==========================================
  approve: async (req, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const test = await ChemicalTest.findByPk(id);
      if (!test) return res.status(404).json({ success: false, message: 'Chemical test not found' });

      await test.update({
        approvedBy: req.user.id,
        approvedAt: new Date(),
        notes: notes || test.notes
      });

      res.json({ success: true, message: 'Chemical test approved successfully' });
    } catch (error) {
      console.error('Approve chemical test error:', error);
      res.status(500).json({ success: false, message: 'Failed to approve chemical test', error: error.message });
    }
  }
};

module.exports = chemicalTestController;