'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // สิ่งที่จะทำเมื่อรัน migrate (เพิ่มคอลัมน์)
    await queryInterface.addColumn('material_inspections', 'inspector', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'Unassigned'
    });
  },

  async down(queryInterface, Sequelize) {
    // สิ่งที่จะทำเมื่อต้องการย้อนกลับ (ลบคอลัมน์)
    await queryInterface.removeColumn('material_inspections', 'inspector');
  }
};