const Sequelize = require("sequelize");
const db = require("../loaders/sequelize");

const InspectorManager = db.define("InspectorManager", {
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
   InspectionCompanyId: {
      type: Sequelize.INTEGER,
      references: {
         model: "InspectionCompanies",
         key: "id",
      },
      // allowNull:false
   },
});
InspectorManager.sync();

module.exports = InspectorManager;
