const { DataTypes } = require('sequelize');
const db = require('../loaders/sequelize');

const Types = db.define(
  'Types',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
  },
  {
    timestamps: true,
  }
);
db.sync();
module.exports = Types;
