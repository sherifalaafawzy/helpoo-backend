const { DataTypes } = require('sequelize');

const db = require('../loaders/sequelize');

const CarPackage = db.define(
  'CarPackage',
  {},
  {
    paranoid: true,
  }
);

db.sync();

module.exports = CarPackage;
