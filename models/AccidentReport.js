const { DataTypes } = require("sequelize");
const db = require("../loaders/sequelize");
// const AccidentType = require("./AccidentType");
// const AccidentTypesAndReports = require("./AccidentTypesAndReports");
// const AccidentReportMainImages = require("./AccidentReportMainImages");
// const Car = require("./Car");
// const User = require("./User");
// const Inspector = require("./Inspector");
// const Client = require("./Client");
// const InspectionCompany = require("./InspectionCompany");
// const CarAccidentReports = require("./CarAccidentReports");
// const InsuranceCompany = require("./InsuranceCompany");
// const Inspections = require("./Inspections");
const AccidentReport = db.define(
   "AccidentReport",
   {
      // Model attributes are defined here
      id: {
         type: DataTypes.INTEGER,
         autoIncrement: true,
         primaryKey: true,
      },
      requiredImagesNo: {
         type: DataTypes.INTEGER,
      },
      uploadedImagesCounter: {
         type: DataTypes.INTEGER,
         defaultValue: 0,
      },
      ref: {
         type: DataTypes.STRING,
      },
      comment: {
         type: DataTypes.STRING,
      },
      phoneNumber: {
         type: DataTypes.STRING,
      },
      client: {
         type: DataTypes.STRING,
      },
      repairCost: {
         type: DataTypes.STRING,
      },
      commentUser: {
         type: DataTypes.STRING,
      },

      audioCommentWritten: {
         type: DataTypes.STRING,
      },
      status: {
         type: DataTypes.STRING,
         validate: {
            isIn: [
               [
                  "created",
                  "FNOL",
                  "policeReport",
                  "bRepair",
                  "aRepair",
                  "appendix",
                  "billing",
                  "rightSave",
                  "closed",
                  "rejected",
                  "supplement",
                  "resurvey",
               ],
            ],
         },
      },
      statusList: {
         type: DataTypes.ARRAY(DataTypes.STRING),
      },
      aiRef: {
         type: DataTypes.STRING,
      },
      location: {
         type: DataTypes.JSONB,
      },
      billDeliveryDate: {
         type: DataTypes.ARRAY(DataTypes.DATE),
      },
      billDeliveryTimeRange: {
         type: DataTypes.ARRAY(DataTypes.STRING),
      },
      billDeliveryNotes: {
         type: DataTypes.ARRAY(DataTypes.STRING),
      },
      billDeliveryLocation: {
         type: DataTypes.ARRAY(DataTypes.JSONB),
      },
      beforeRepairLocation: {
         type: DataTypes.ARRAY(DataTypes.JSONB),
      },
      afterRepairLocation: {
         type: DataTypes.ARRAY(DataTypes.JSONB),
      },
      video: {
         type: DataTypes.STRING,
      },
      bRepairName: {
         type: DataTypes.ARRAY(DataTypes.STRING),
      },
      rightSaveLocation: {
         type: DataTypes.ARRAY(DataTypes.JSONB),
      },
      supplementLocation: {
         type: DataTypes.ARRAY(DataTypes.JSONB),
      },
      resurveyLocation: {
         type: DataTypes.ARRAY(DataTypes.JSONB),
      },
      read: {
         type: DataTypes.BOOLEAN,
         defaultValue: false,
      },
      sentToSolera: {
         type: DataTypes.BOOLEAN,
         defaultValue: false,
      },
      sentToInsurance: {
         type: DataTypes.BOOLEAN,
         defaultValue: false,
      },
      additionalData: {
         type: DataTypes.JSONB,
      },
   },
   {
      // Other model options go here
   }
);
// AccidentType.belongsToMany(AccidentReport, {
//    through: AccidentTypesAndReports,
// });
// AccidentReport.belongsToMany(AccidentType, {
//    through: AccidentTypesAndReports,
//    foreignKey: "AccidentReportId",
// });
// AccidentReport.hasMany(AccidentReportMainImages, {
//    foreignKey: "accidentReportId",
//    as: "images",
// });
// AccidentReportMainImages.belongsTo(AccidentReport, {
//    foreignKey: "accidentReportId",
// });
// AccidentReport.belongsTo(Car, { foreignKey: "carId" });
// AccidentReport.belongsTo(User, { foreignKey: "createdByUser" });
// AccidentReport.belongsTo(Client, { foreignKey: "clientId" });
// AccidentReport.belongsTo(Inspector, { foreignKey: "InspectorId" });
// AccidentReport.belongsTo(InspectionCompany, {
//    foreignKey: "inspectionCompanyId",
// });
// AccidentReport.hasMany(CarAccidentReports, { foreignKey: "AccidentReportId" });
// Inspections.belongsTo(AccidentReport);
// InsuranceCompany.hasMany(AccidentReport, { foreignKey: "insuranceCompanyId" });
AccidentReport.sync();
module.exports = AccidentReport;
