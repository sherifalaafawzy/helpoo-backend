const db = require("../loaders/sequelize");
const { DataTypes } = require("sequelize");

const Car = db.define(
   "Car",
   {
      id: {
         type: DataTypes.INTEGER,
         autoIncrement: true,
         allowNull: false,
         primaryKey: true,
      },
      plateNumber: {
         type: DataTypes.STRING,
         // allowNull: false,
         // unique: true
      },
      year: {
         type: DataTypes.INTEGER,
         allowNull: false,
      },
      policyNumber: {
         type: DataTypes.STRING,
         // unique:true
      },
      policyStarts: {
         type: DataTypes.DATE,
      },
      policyEnds: {
         type: DataTypes.DATE,
      },
      appendix_number: {
         type: DataTypes.STRING,
      },
      vin_number: {
         type: DataTypes.STRING,
         // unique:true
         // allowNull: false
      },
      policyCanceled: {
         type: DataTypes.BOOLEAN,
      },
      color: {
         type: DataTypes.STRING,
      },
      frontLicense: {
         type: DataTypes.STRING,
      },
      backLicense: {
         type: DataTypes.STRING,
      },
      // insuranceCompanyId: {
      //   type: DataTypes.INTEGER
      // },
      /* owner: {
    type: DataTypes.INTEGER,
    allowNull: false

  }, */
      CreatedBy: {
         type: DataTypes.INTEGER,
         // allowNull:false,
         references: {
            model: "Users",
         },
      },
      ManufacturerId: {
         type: DataTypes.INTEGER,
         allowNull: true,
         references: {
            model: "Manufacturers",
         },
      },
      CarModelId: {
         type: DataTypes.INTEGER,
         allowNull: true,
         references: {
            model: "CarModels",
         },
      },
      ClientId: {
         type: DataTypes.INTEGER,
         // allowNull: false,
         references: {
            model: "Clients",
         },
      },
      BrokerId: {
         type: DataTypes.INTEGER,
         references: {
            model: "Brokers",
         },
      },
      active: {
         type: DataTypes.BOOLEAN,
         defaultValue: true,
      },
   },
   {
      paranoid: true,
      deletedAt: "deletedAt",
      // indexes: [
      //    // {
      //    //   unique:false,
      //    //   fields:['plateNumber','vin_number','policyNumber','ClientId','insuranceCompanyId']
      //    // },
      //    {
      //       unique: false,
      //       fields: ["plateNumber", "vin_number", "ClientId"],
      //    },
      //    {
      //       unique: false,
      //       fields: ["plateNumber", "vin_number", "policyNumber"],
      //    },
      //    {
      //       unique: false,
      //       fields: ["plateNumber", "ClientId"],
      //    },
      //    {
      //       unique: false,
      //       fields: ["policyNumber", "insuranceCompanyId"],
      //    },
      //    {
      //       unique: false,
      //       fields: ["vin_number", "ClientId", "insuranceCompanyId", "active"],
      //    },
      //    {
      //       unique: false,
      //       fields: ["vin_number", "ClientId"],
      //    },
      // ],
   }
);
Car.sync();
module.exports = Car;
