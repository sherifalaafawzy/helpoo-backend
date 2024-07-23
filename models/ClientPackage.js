const { DataTypes } = require('sequelize');

const db = require('../loaders/sequelize');

const ClientPackage = db.define(
  'ClientPackage',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    startDate: {
      type: DataTypes.DATE,
    },
    endDate: {
      type: DataTypes.DATE,
    },
    orderId: {
      type: DataTypes.INTEGER,
    },
  },
  {
    paranoid: true,
    indexes: [
      {
        unique: false,
        fields: ['ClientId', 'PackageId', 'active'],
      },
      {
        unique: false,
        fields: ['ClientId', 'PackageId'],
      },
    ],
  }
);

// db.sync()

module.exports = ClientPackage;
