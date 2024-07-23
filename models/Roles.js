const { DataTypes } = require("sequelize");
const db = require("../loaders/sequelize");

const Roles = db.define(
   "Roles",
   {
      id: {
         type: DataTypes.INTEGER,
         autoIncrement: true,
         primaryKey: true,
      },
      name: {
         type: DataTypes.STRING,
         unique: true,
         allowNull: false,
      },
   },
   {
      indexes: [
         {
            unique: true,
            fields: ["name"],
         },
      ],
   }
);
// db.sync()

module.exports = Roles;
