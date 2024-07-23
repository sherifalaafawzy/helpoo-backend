const Sequelize = require('sequelize');
const InspectionManager = require('./InspectionManager');
const InspectionCompany = require('./InspectionCompany');
const db = require('../loaders/sequelize');

const InspectionManagerInspection = db.define('InspectionManagerInspection', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  InspectionManagerId: {
    type: Sequelize.INTEGER,
    references: {
      model: InspectionManager,
    },
  },
  InspectionCompanyId: {
    type: Sequelize.INTEGER,
    references: {
      model: InspectionCompany,
    },
  },
});

InspectionManagerInspection.sync();
module.exports = InspectionManagerInspection;
