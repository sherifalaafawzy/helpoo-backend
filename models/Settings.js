const { DataTypes } = require('sequelize');
const db = require('../loaders/sequelize');

const Setting = db.define(
  'Setting',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    PhoneNumber: {
      type: DataTypes.STRING,
    },
    email: {
      type: DataTypes.STRING,
    },
    hotline: {
      type: DataTypes.INTEGER,
    },
    about: {
      type: DataTypes.STRING,
    },
    WALink: {
      type: DataTypes.STRING,
    },
  },
  {
    timestamps: true,
  }
);
db.sync();
module.exports = Setting;
