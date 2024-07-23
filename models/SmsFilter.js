const { DataTypes } = require('sequelize');
const db = require('../loaders/sequelize');

const SmsFilter = db.define(
  'SmsFilter',
  {
    PhoneNumber: {
      type: DataTypes.STRING,
    },
    tries: {
      type: DataTypes.INTEGER,
    },
  },
  {
    timestamps: true,
  }
);
SmsFilter.sync();
module.exports = SmsFilter;
