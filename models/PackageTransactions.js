const { DataTypes } = require("sequelize");

const db = require("../loaders/sequelize");

const PackageTransactions = db.define("PackageTransactions", {
   orderId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      unique: true,
   },
   transactionType: {
      type: DataTypes.STRING,
      allowNull: false,
      validator: {
         isIn: [
            [
               "cash",
               "card-to-driver",
               "online-card",
               "online-wallet",
               "pre-paid",
            ],
         ],
      },
   },
   transactionStatus: {
      type: DataTypes.STRING,
      allowNull: false,
      validator: {
         isIn: [
            [
               "pending",
               "not-paid",
               "paid",
               "draft",
               "need-refund",
               "refund-done",
            ],
         ],
      },
   },
   transactionResponse: {
      type: DataTypes.JSONB,
   },
   transactionToken: {
      type: DataTypes.STRING,
   },
   transactionAmount: {
      type: DataTypes.FLOAT,
      allowNull: false,
   },
   transactionDate: {
      type: DataTypes.DATE,
      allowNull: false,
   },
   lang: {
      type: DataTypes.STRING,
   },
});

PackageTransactions.sync();

module.exports = PackageTransactions;
