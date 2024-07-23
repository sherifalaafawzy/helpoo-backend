const Sequelize = require('sequelize');
const db = require('../loaders/sequelize');

const AccidentReportMainImages = db.define('AccidentReportMainImages', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  imageName: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  imagePath: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  additional: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },
  count: {
    type: Sequelize.INTEGER,
    defaultValue: 1,
  },
});
db.sync();

module.exports = AccidentReportMainImages;
