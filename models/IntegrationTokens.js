const { DataTypes } = require('sequelize');
const db = require('../loaders/sequelize');

const IntegrationToken = db.define('IntegrationToken', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  token: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  // ClientId: {
  //     type: DataTypes.STRING,
  //     allowNull: false,
  //     unique: true,
  //     references: {
  //         model: 'Integration',
  //         key: 'clientId',
  //     }
  // }
});
db.sync();

module.exports = IntegrationToken;
