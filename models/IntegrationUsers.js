const { DataTypes } = require('sequelize');
const db = require('../loaders/sequelize');
const nanoid = require('nanoid');

const Integration = db.define('Integration', {
  clientName: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  clientId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    defaultValue: () => nanoid(10),
    primaryKey: true,
  },
  secret: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});
db.sync();

module.exports = Integration;
