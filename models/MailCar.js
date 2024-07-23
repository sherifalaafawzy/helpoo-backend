const { DataTypes } = require("sequelize");
const db = require("../loaders/sequelize");

const MailCar = db.define("MailCar", {
   id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
   },
   CarId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
         model: "Cars",
      },
   },
   messageId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
   },
});

MailCar.sync();
module.exports = MailCar;
