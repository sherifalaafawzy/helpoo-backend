const { DataTypes } = require("sequelize");
const db = require("../loaders/sequelize");

const CheckTime = db.define("CheckTimes", {
   id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
   },
   //    UserId: {
   //       type: DataTypes.INTEGER,
   //       allowNull: false,
   //       references: [
   //          {
   //             model: "Users",
   //             key: "id",
   //          },
   //       ],
   //    },
   times: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
   },
});
db.sync();
module.exports = CheckTime;
