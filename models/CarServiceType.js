const { DataTypes } = require("sequelize");
const db = require("../loaders/sequelize");
const VehicleType = require("./VehicleType");

const CarServiceType = db.define("CarServiceType", {
   id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
   },
   en_name: {
      type: DataTypes.STRING,
      allowNull: false,
   },
   ar_name: {
      type: DataTypes.STRING,
   },
   base_cost: {
      type: DataTypes.INTEGER,
      allowNull: false,
   },
   cost_per_km: {
      type: DataTypes.INTEGER,
      allowNull: false,
   },
   costPerKm: {
      type: DataTypes.DOUBLE,
   },
   car_type: {
      type: DataTypes.INTEGER,
      references: {
         model: VehicleType,
      },
   },
   usagePrice: {
      type: DataTypes.INTEGER,
   },
   maxUsage: {
      type: DataTypes.INTEGER,
   },
});

CarServiceType.belongsTo(VehicleType, { foreignKey: "car_type" });

CarServiceType.sync();

module.exports = CarServiceType;
