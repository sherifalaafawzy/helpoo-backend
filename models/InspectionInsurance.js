const Sequelize = require('sequelize');
const InspectionCompany = require('./InspectionCompany');
const InsuranceCompany = require('./InsuranceCompany');
const db = require('../loaders/sequelize');

const InspectionInsurance = db.define('InspectionInsurance', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  InspectionCompanyId: {
    type: Sequelize.INTEGER,
    references: {
      model: InspectionCompany,
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
module.exports = InspectionInsurance;
