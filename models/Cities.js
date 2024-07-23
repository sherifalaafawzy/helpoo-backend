const { DataTypes } = require("sequelize");
const sequelize = require("../loaders/sequelize");

const Cities = sequelize.define("Cities", {
   id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
   },
   enName: {
      type: DataTypes.STRING,
      allowNull: false,
   },
   arName: {
      type: DataTypes.STRING,
      allowNull: false,
   },
});

Cities.sync();

module.exports = Cities;
