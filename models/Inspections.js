const { DataTypes } = require("sequelize");
const db = require("../loaders/sequelize");

const Inspections = db.define(
   "Inspection",
   {
      id: {
         type: DataTypes.INTEGER,
         primaryKey: true,
         autoIncrement: true,
         allowNull: false,
      },
      clientName: {
         type: DataTypes.STRING,
         allowNull: false,
      },
      clientPhone: {
         type: DataTypes.STRING,
      },
      engPhone: {
         type: DataTypes.STRING,
      },
      government: {
         type: DataTypes.STRING,
         allowNull: false,
      },
      city: {
         type: DataTypes.STRING,
      },
      area: {
         type: DataTypes.STRING,
         allowNull: false,
      },
      addressInfo: {
         type: DataTypes.STRING,
         allowNull: false,
      },
      carBrand: {
         type: DataTypes.INTEGER,
         references: {
            model: "Manufacturers",
         },
         allowNull: false,
      },
      carModel: {
         type: DataTypes.INTEGER,
         references: {
            model: "CarModels",
         },
         allowNull: false,
      },
      vinNumber: {
         type: DataTypes.STRING,
         allowNull: false,
      },
      engineNumber: {
         type: DataTypes.STRING,
      },
      plateNumber: {
         type: DataTypes.STRING,
      },
      color: {
         type: DataTypes.STRING,
      },
      accidentDescription: {
         type: DataTypes.STRING,
      },
      exceptions: {
         type: DataTypes.STRING,
      },
      inspectorId: {
         type: DataTypes.INTEGER,
         references: {
            model: "Inspectors",
         },
      },
      type: {
         type: DataTypes.STRING,
         validate: {
            isIn: {
               args: [
                  [
                     "preInception",
                     "beforeRepair",
                     "supplement",
                     "afterRepair",
                     "rightSave",
                  ],
               ],
               msg: "The type must be one of those : [preInception , beforeRepair, supplement, afterRepair,rightSave]",
            },
         },
         allowNull: false,
      },
      date: {
         type: DataTypes.DATE,
      },
      arrivedAt: {
         type: DataTypes.DATE,
      },
      assignDate: {
         type: DataTypes.DATE,
      },
      inspectDate: {
         type: DataTypes.DATE,
      },
      followDate: {
         type: DataTypes.DATE,
      },
      attachments: {
         type: DataTypes.ARRAY(DataTypes.STRING),
      },
      insuranceImages: {
         type: DataTypes.ARRAY(DataTypes.JSONB),
      },
      inspectorImages: {
         type: DataTypes.ARRAY(DataTypes.JSONB),
      },
      supplementImages: {
         type: DataTypes.ARRAY(DataTypes.JSONB),
      },
      pdfReports: {
         type: DataTypes.ARRAY(DataTypes.STRING),
      },
      audioRecords: {
         type: DataTypes.ARRAY(DataTypes.STRING),
      },
      audioRecordsWithNotes: {
         type: DataTypes.ARRAY(DataTypes.JSONB),
      },
      notes: {
         type: DataTypes.STRING,
      },
      status: {
         type: DataTypes.STRING,
         // defaultValue
         validate: {
            isIn: {
               args: [["finished", "done", "pending"]],
               msg: "The status must be one of those : [finished , done ,pending]",
            },
         },
      },
      commitmentStatus: {
         type: DataTypes.STRING,
         validate: {
            isIn: {
               args: [["committed", "notCommitted"]],
               msg: "The status must be one of those : [committed, notCommitted]",
            },
         },
      },
      notCommittedReason: {
         type: DataTypes.STRING,
      },
      accidentList: {
         type: DataTypes.ARRAY(DataTypes.JSONB),
      },
      workerFeesBefore: {
         type: DataTypes.STRING,
      },
      workerFeesAfter: {
         type: DataTypes.STRING,
      },
      damageDescription: {
         type: DataTypes.STRING,
      },
      partsList: {
         type: DataTypes.ARRAY(DataTypes.JSONB),
      },
      additionalPaperImages: {
         type: DataTypes.ARRAY(DataTypes.JSONB),
      },
      sentToSolera: {
         type: DataTypes.BOOLEAN,
         defaultValue: false,
      },
      requiredInspectorImages: {
         type: DataTypes.ARRAY(DataTypes.STRING),
      },
      remainingInspectorImages: {
         type: DataTypes.ARRAY(DataTypes.STRING),
      },
      selectedAccTypes: {
         type: DataTypes.ARRAY(DataTypes.INTEGER),
      },
   },
   {
      paranoid: true,
      deletedAt: "deletedAt",
   }
);
Inspections.sync();
module.exports = Inspections;
