const { DataTypes } = require("sequelize");
const db = require("../loaders/sequelize");

const Driver = db.define("Driver", {
   id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
   },
   offline: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
   },
   average_rating: {
      type: DataTypes.DECIMAL(10, 2),
   },
   rating_count: {
      type: DataTypes.INTEGER,
   },
   location: {
      type: DataTypes.JSONB,
   },
   available: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
   },
   fcmtoken: {
      type: DataTypes.STRING,
   },
   // open: {
   //    type: DataTypes.BOOLEAN,
   //    defaultValue: true,
   // },
});
db.sync();

module.exports = Driver;
