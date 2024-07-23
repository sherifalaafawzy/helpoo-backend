const Sequelize = require('sequelize');
const Inspector = require('./Inspector');
const InspectionCompany = require('./InspectionCompany');
const db = require('../loaders/sequelize');

const InspectorInspection = db.define('InspectorInspection', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  InspectorId: {
    type: Sequelize.INTEGER,
    references: {
      model: Inspector,
    },
  },
  InspectionCompanyId: {
    type: Sequelize.INTEGER,
    references: {
      model: InspectionCompany,
    },
  },
});

db.sync();
module.exports = InspectorInspection;
