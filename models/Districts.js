const { DataTypes } = require("sequelize");
const sequelize = require("../loaders/sequelize");

const Districts = sequelize.define("Districts", {
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
   CityId: {
      type: DataTypes.INTEGER,
      references: {
         model: "Cities",
      },
   },
});

Districts.sync();

module.exports = Districts;
