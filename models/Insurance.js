const Sequelize = require('sequelize');
const db = require('../loaders/sequelize');

const Insurance = db.define('insurance', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  active: {
    type: Sequelize.BOOLEAN,
    defaultValue: true,
  },
});
db.sync();

module.exports = Insurance;
