const { DataTypes } = require("sequelize");
const db = require("../loaders/sequelize");

const SoleraResponse = db.define("SoleraResponse", {
   response: {
      type: DataTypes.JSONB,
      allowNull: false,
   },
   images: {
      type: DataTypes.JSONB,
      allowNull: true,
   },
   accidentReportId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
         model: "AccidentReports",
         key: "id",
      },
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
SoleraResponse.sync();
module.exports = SoleraResponse;
