const { DataTypes } = require("sequelize");
const db = require("../loaders/sequelize");

const PromoCodeUser = db.define("PromoCodeUser", {
   id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
   },
   count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
   },
   active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
   },
   UserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
         model: "User",
      },
   },
   PromoCodeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
         model: "PromoCode",
      },
   },
});

module.exports = PromoCodeUser;
