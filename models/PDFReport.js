const { DataTypes } = require('sequelize');
const db = require('../loaders/sequelize');

const PDFReport = db.define('PDFReport', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  pdfReportType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});
db.sync();

module.exports = PDFReport;
