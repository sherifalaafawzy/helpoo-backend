const { DataTypes } = require('sequelize');

const db = require('../loaders/sequelize');

const PackageBenefits = db.define('PackageBenefits', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  enName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  arName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

db.sync();

module.exports = PackageBenefits;
