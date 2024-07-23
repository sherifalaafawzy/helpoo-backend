const { DataTypes } = require('sequelize');
const db = require('../loaders/sequelize');

const ServiceRequestPhotos = db.define('ServiceRequestPhotos', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  images: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
  },
});
db.sync();
module.exports = ServiceRequestPhotos;
