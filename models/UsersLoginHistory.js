const { DataTypes } = require("sequelize");
const db = require("../loaders/sequelize");

const UsersLoginHistory = db.define(
   "UsersLoginHistory",
   {
      id: {
         type: DataTypes.INTEGER,
         autoIncrement: true,
         primaryKey: true,
      },
      UserId: {
         type: DataTypes.INTEGER,
         allowNull: false,
         references: {
            model: "Users",
         },
      },
      loggedInAt: {
         type: DataTypes.DATE,
         defaultValue: new Date(),
      },
      loggedInData: {
         type: DataTypes.JSONB,
      },
   },
   {
      timestamps: true,
   }
);
UsersLoginHistory.sync();
module.exports = UsersLoginHistory;
