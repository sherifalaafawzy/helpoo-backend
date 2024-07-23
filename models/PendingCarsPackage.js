const { DataTypes } = require("sequelize");
const db = require("../loaders/sequelize");

const PendingCarsPackage = db.define("PendingCarsPackage", {
   id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
   },
   carId: {
      type: DataTypes.INTEGER,
      allowNull: false,
   },
   pkgId: {
      type: DataTypes.INTEGER,
      allowNull: false,
   },
});
PendingCarsPackage.sync();

module.exports = PendingCarsPackage;
