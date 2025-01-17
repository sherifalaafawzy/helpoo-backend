const { DataTypes } = require('sequelize');
const sequelize = require('../loaders/sequelize');

const CarAccidentReports = sequelize.define('CarAccidentReports', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  report: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
});

module.exports = CarAccidentReports;
