const { DataTypes } = require('sequelize');
const db = require('../loaders/sequelize');

const Rating = db.define('Rating', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  RatingType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});
db.sync();

module.exports = Rating;
