const { DataTypes } = require('sequelize');
const db = require('../loaders/sequelize');

const InspectionCompany = db.define(
  'InspectionCompany',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phoneNumbers: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
    },
    emails: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
    },
  },
  {
    paranoid: true,
    deletedAt: 'deletedAt',
  }
);

InspectionCompany.sync();
module.exports = InspectionCompany;
