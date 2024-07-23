const Sequelize = require("sequelize");
const db = require("../loaders/sequelize");

const Inspector = db.define("Inspector", {
   id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
   },
   UserId: {
      type: Sequelize.INTEGER,
      references: {
         model: "Users",
         key: "id",
      },
      allowNull: false,
   },
   phoneNumbers: {
      type: Sequelize.ARRAY(Sequelize.STRING),
   },
   emails: {
      type: Sequelize.ARRAY(Sequelize.STRING),
   },
   fcmtoken: {
      type: Sequelize.STRING,
   },
});
Inspector.sync();

module.exports = Inspector;
