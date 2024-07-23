const Sequelize = require('sequelize');
const Inspector = require('./Inspector');
const InsuranceCompany = require('./InsuranceCompany');
const db = require('../loaders/sequelize');

const InspectorInsurance = db.define('InspectorInsurance', {
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
  insuranceCompanyId: {
    type: Sequelize.INTEGER,
    references: {
      model: InsuranceCompany,
    },
  },
});

db.sync();
module.exports = InspectorInsurance;
