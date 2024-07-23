const { DataTypes } = require('sequelize');
const db = require('../loaders/sequelize');

const promoAccess = db.define(
  'PromoAccess',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    PhoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    indexes: [
      {
        unique: false,
        fields: ['name'],
      },
      {
        unique: false,
        fields: ['PhoneNumber'],
      },
    ],
  }
);
// db.sync();

module.exports = promoAccess;
