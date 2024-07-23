const { DataTypes } = require("sequelize");
const moment = require("moment");
const db = require("../loaders/sequelize");

const ServiceRequest = db.define(
   "ServiceRequest",
   {
      id: {
         type: DataTypes.INTEGER,
         autoIncrement: true,
         primaryKey: true,
      },
      name: {
         type: DataTypes.STRING,
         allowNull: false,
      },
      PhoneNumber: {
         type: DataTypes.STRING,
         allowNull: false,
      },
      location: {
         type: DataTypes.JSONB,
      },
      status: {
         type: DataTypes.STRING,
         validate: {
            isIn: [
               [
                  "open",
                  "confirmed",
                  "canceled",
                  "not_available",
                  "accepted",
                  "arrived",
                  "started",
                  "done",
                  "pending",
                  "destArrived",
                  "cancelWithPayment",
               ],
            ],
         },
      },
      fees: {
         type: DataTypes.INTEGER,
      },
      waitingFees: {
         type: DataTypes.INTEGER,
      },
      waitingTime: {
         type: DataTypes.INTEGER,
      },
      isWaitingTimeApplied: {
         type: DataTypes.BOOLEAN,
         defaultValue: false,
      },
      confirmationTime: {
         type: DataTypes.DATE,
      },
      startTime: {
         type: DataTypes.DATE,
         // defaultValue: moment(Date.now()).format(),
      },
      arriveTime: {
         type: DataTypes.DATE,
      },
      startServiceTime: {
         type: DataTypes.DATE,
      },
      destArriveTime: {
         type: DataTypes.DATE,
      },
      endTime: {
         type: DataTypes.DATE,
      },
      paidAt: {
         type: DataTypes.DATE,
      },
      paymentMethod: {
         type: DataTypes.STRING,
         validate: {
            isIn: [
               [
                  "cash",
                  "card-to-driver",
                  "online-card",
                  "online-wallet",
                  "deferred",
                  "online-link",
               ],
            ],
         },
      },
      paymentStatus: {
         type: DataTypes.STRING,
         validate: {
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
      PaymentResponse: {
         type: DataTypes.JSONB,
      },
      order_id: {
         type: DataTypes.STRING,
      },
      comment: {
         type: DataTypes.STRING,
      },
      rating: {
         type: DataTypes.STRING,
      },
      rated: {
         type: DataTypes.BOOLEAN,
         defaultValue: false,
      },
      originalFees: {
         type: DataTypes.INTEGER,
      },
      adminDiscount: {
         type: DataTypes.INTEGER,
      },
      adminDiscountApprovedBy: {
         type: DataTypes.STRING,
      },
      adminDiscountReason: {
         type: DataTypes.STRING,
      },
      isAdminDiscountApplied: {
         type: DataTypes.BOOLEAN,
         defaultValue: false,
      },
      adminComment: {
         type: DataTypes.STRING,
      },
      discountPercentage: {
         type: DataTypes.INTEGER,
      },
      policyAndPackage: {
         type: DataTypes.JSONB,
      },
      reject: {
         type: DataTypes.BOOLEAN,
         defaultValue: false,
      },
      driverRejectId: {
         type: DataTypes.INTEGER,
         references: {
            model: "Drivers",
         },
      },
      fuelServcieUsage: {
         type: DataTypes.INTEGER,
      },
      tiresServcieUsage: {
         type: DataTypes.INTEGER,
      },
      parentRequest: {
         type: DataTypes.INTEGER,
      },
   },
   {
      indexes: [
         {
            unique: false,
            name: "servicerequest_createuserandstatus_idx",
            fields: ["createdByUser", "status"],
         },
         {
            unique: false,
            fields: ["createdAt", "clientId"],
         },
      ],
   }
);
// db.sync()

module.exports = ServiceRequest;
