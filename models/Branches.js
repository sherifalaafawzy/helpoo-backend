const { DataTypes } = require("sequelize");
const db = require("../loaders/sequelize");

const Branches = db.define(
   "Branches",
   {
      id: {
         type: DataTypes.INTEGER,
         autoIncrement: true,
         primaryKey: true,
         allowNull: false,
      },
      name: {
         type: DataTypes.STRING,
         allowNull: false,
         trim: true,
         validate: {
            len: {
               args: [3, 80],
               msg: "Branch name must be at least 3 characters long.",
            },
         },
      },
      phoneNumber: {
         type: DataTypes.STRING,
         trim: true,
      },
      address: {
         type: DataTypes.STRING,
         trim: true,
      },
      CorporateCompanyId: {
         type: DataTypes.INTEGER,
         references: {
            model: "CorporateCompanies",
         },
      },
   },
   {
      paranoid: true,
   }
);

Branches.sync();
module.exports = Branches;
