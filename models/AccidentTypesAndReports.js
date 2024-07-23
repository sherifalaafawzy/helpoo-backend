const Sequelize = require('sequelize');
const AccidentType = require('./AccidentType');
const AccidentReport = require('./AccidentReport');
const db = require('../loaders/sequelize');

const AccidentTypesAndReports = db.define('AccidentTypesAndReports', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  AccidentTypeId: {
    type: Sequelize.INTEGER,
    references: {
      model: AccidentType,
    },
  },
  AccidentReportId: {
    type: Sequelize.INTEGER,
    references: {
      model: AccidentReport,
    },
  },
});

db.sync();
module.exports = AccidentTypesAndReports;
