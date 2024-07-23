const db = require("../loaders/sequelize");
const { DataTypes } = require("sequelize");

const Wizard = db.define(
   "Wizard",
   {
      id: {
         type: DataTypes.INTEGER,
         autoIncrement: true,
         primaryKey: true,
      },
      name: {
         type: DataTypes.STRING,
      },
      textAr: {
         type: DataTypes.STRING,
      },
      textEn: {
         type: DataTypes.STRING,
      },
      headlineEn: {
         type: DataTypes.STRING,
      },
      headlineAr: {
         type: DataTypes.STRING,
      },
      img: {
         type: DataTypes.STRING,
      },
      // link:{
      //     type: DataTypes.STRING
      // },
      apiKey: {
         type: DataTypes.STRING,
      },
      time: {
         type: DataTypes.STRING,
      },
      timeAfter: {
         type: DataTypes.STRING,
      },
      timeBefore: {
         type: DataTypes.STRING,
      },
   },
   {
      indexes: [
         {
            unique: false,
            fields: ["name"],
         },
      ],
   }
);
Wizard.sync();

module.exports = Wizard;
