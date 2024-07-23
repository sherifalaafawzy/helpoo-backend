const { DataTypes } = require("sequelize");
const sequelize = require("../loaders/sequelize");

const InspectionsReports = sequelize.define("InspectionsReports", {
   id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
   },
   report: {
      type: DataTypes.STRING,
      allowNull: true,
   },
   InspectionId: {
      type: DataTypes.INTEGER,
      references: {
         model: "Inspections",
      },
   },
});

module.exports = InspectionsReports;
