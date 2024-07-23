const { DataTypes } = require("sequelize");
const db = require("../loaders/sequelize");

const Config = db.define("Config", {
   id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
   },
   minimumIOSVersion: {
      type: DataTypes.STRING,
   },
   minimumAndroidVersion: {
      type: DataTypes.STRING,
   },
   underMaintaining: {
      type: DataTypes.BOOLEAN,
   },
   minimumIOSVersionInspector: {
      type: DataTypes.STRING,
   },
   minimumAndroidVersionInspector: {
      type: DataTypes.STRING,
   },
   underMaintainingInspector: {
      type: DataTypes.BOOLEAN,
   },
   distanceLimit: {
      type: DataTypes.STRING,
   },
   durationLimit: {
      type: DataTypes.STRING,
   },
   termsAndConditionsEn: {
      type: DataTypes.STRING,
   },
   termsAndConditionsAr: {
      type: DataTypes.STRING,
   },
   finishTime: {
      type: DataTypes.INTEGER,
   },
   carryingTime: {
      type: DataTypes.INTEGER,
   },
   fuelServiceTime: {
      type: DataTypes.INTEGER,
   },
   batteryServiceTime: {
      type: DataTypes.INTEGER,
   },
   tiresServiceTime: {
      type: DataTypes.INTEGER,
   },
   fuelServiceTimeCorp: {
      type: DataTypes.INTEGER,
   },
   batteryServiceTimeCorp: {
      type: DataTypes.INTEGER,
   },
   tiresServiceTimeCorp: {
      type: DataTypes.INTEGER,
   },
   waitingTimeFree: {
      type: DataTypes.INTEGER,
   },
   waitingTimeLimit: {
      type: DataTypes.INTEGER,
   },
   waitingTimePrice: {
      type: DataTypes.INTEGER,
   },
   waitingTimeFreeCorp: {
      type: DataTypes.INTEGER,
   },
   usageMap: {
      type: DataTypes.INTEGER,
      validate: {
         isIn: {
            args: [[1, 2]],
            msg: "you have to choose number between [1 : googleMaps, 2 : MapBox]",
         },
      },
   },
   usageSMS: {
      type: DataTypes.INTEGER,
      validate: {
         isIn: {
            args: [[1, 2]],
            msg: "you have to choose number between [1 : We, 2 : Vodafone]",
         },
      },
   },
});
Config.sync();
module.exports = Config;
