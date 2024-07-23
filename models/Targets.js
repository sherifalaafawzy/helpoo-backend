const { DataTypes } = require('sequelize');
const db = require('../loaders/sequelize');

const Targets = db.define(
  'Targets',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    month: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    target: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    revenue: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    achievedPercentage: {
      type: DataTypes.DOUBLE,
      defaultValue: 0,
    },
    achieved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    year: {
      type: DataTypes.INTEGER,
      defaultValue: new Date().getFullYear(),
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        unique: false,
        fields: ['month', 'year'],
      },
    ],
  }
);

// db.sync()
module.exports = Targets;
