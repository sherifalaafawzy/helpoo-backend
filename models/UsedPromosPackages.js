const { DataTypes } = require("sequelize");

const ClientPackage = require("./ClientPackage");
const Package = require("./Package");
const PackagePromoCode = require("./PackagePromoCode");
const User = require("./User");

const db = require("../loaders/sequelize");

const UsedPromosPackages = db.define("UsedPromosPackages", {
   id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
   },
   fees: {
      type: DataTypes.INTEGER,
      allowNull: false,
   },
   transactionsIds: {
      type: DataTypes.STRING,
   },
});

UsedPromosPackages.belongsTo(Package);
UsedPromosPackages.belongsTo(PackagePromoCode);
PackagePromoCode.hasMany(UsedPromosPackages);
UsedPromosPackages.belongsTo(User);
UsedPromosPackages.belongsTo(ClientPackage);
ClientPackage.hasMany(UsedPromosPackages);

UsedPromosPackages.sync();

module.exports = UsedPromosPackages;
