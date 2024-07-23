const { DataTypes } = require("sequelize");
const db = require("../loaders/sequelize");
const User = require("./User");

const HistoryLogs = db.define("HistoryLogs", {
   id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
   },
   API: {
      type: DataTypes.STRING,
   },
   requestType: {
      type: DataTypes.STRING,
   },
   body: {
      type: DataTypes.JSONB,
   },
   query: {
      type: DataTypes.JSONB,
   },
});

HistoryLogs.belongsTo(User);
HistoryLogs.sync();
module.exports = HistoryLogs;
