const { DataTypes } = require("sequelize");
const db = require("../loaders/sequelize");

const SoleraResponseInspections = db.define("SoleraResponseInspections", {
   response: {
      type: DataTypes.JSONB,
      allowNull: false,
   },
   images: {
      type: DataTypes.JSONB,
      allowNull: true,
   },
   InspectionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
         model: "Inspections",
         key: "id",
      },
   },
});

// sync the model with the database
SoleraResponseInspections.sync();
module.exports = SoleraResponseInspections;
