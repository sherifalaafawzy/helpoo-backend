const { DataTypes } = require("sequelize");
const db = require("../loaders/sequelize");

const Vehicle = db.define(
   "Vehicle",
   {
      id: {
         type: DataTypes.INTEGER,
         autoIncrement: true,
         primaryKey: true,
      },
      Vec_plate: {
         type: DataTypes.STRING,
         allowNull: false,
      },
      Vec_name: {
         type: DataTypes.STRING,
      },
      // Vec_type: {
      //   type: DataTypes.STRING,
      //   allowNull: false,
      // },
      Vec_num: {
         type: DataTypes.INTEGER,
         allowNull: false,
      },
      PhoneNumber: {
         type: DataTypes.STRING,
         allowNull: false,
      },
      IMEI: {
         type: DataTypes.STRING,
         allowNull: false,
         unique: true,
      },
      available: {
         type: DataTypes.BOOLEAN,
         allowNull: false,
         defaultValue: false,
      },
      url: {
         type: DataTypes.STRING,
      },
      fuelTanks: {
         type: DataTypes.INTEGER,
      },
      battery: {
         type: DataTypes.BOOLEAN,
      },
   },
   {
      indexes: [
         {
            unique: true,
            fields: ["IMEI"],
         },
         {
            unique: false,
            fields: ["Active_Driver"],
         },
         {
            unique: false,
            fields: ["Vec_num", "Vec_plate"],
         },
      ],
   }
);
// db.sync();

module.exports = Vehicle;
