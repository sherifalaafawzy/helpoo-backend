const Sequelize = require("sequelize");
const db = require("../loaders/sequelize");

const InsuranceCompany = db.define(
   "insuranceCompany",
   {
      id: {
         type: Sequelize.INTEGER,
         autoIncrement: true,
         primaryKey: true,
      },
      en_name: {
         type: Sequelize.STRING,
         unique: true,
         allowNull: false,
      },
      ar_name: {
         type: Sequelize.STRING,
         unique: true,
         allowNull: false,
      },
      package_request_count: {
         type: Sequelize.INTEGER,
         // allowNull: false,
      },
      package_discount_percentage: {
         type: Sequelize.INTEGER,
         // allowNull: false,
      },
      max_total_discount: {
         type: Sequelize.INTEGER,
         // allowNull: false,
      },
      discount_percent_after_policy_expires: {
         type: Sequelize.INTEGER,
         // allowNull: false,
      },
      startDate: {
         type: Sequelize.DATE,
         // allowNull:false
      },
      endDate: {
         type: Sequelize.DATE,
         // allowNull:false
      },
      photo: {
         type: Sequelize.STRING,
      },
      emails: {
         type: Sequelize.ARRAY(Sequelize.STRING),
      },
      additionalFields: {
         type: Sequelize.JSONB,
      },
      contracted: {
         type: Sequelize.BOOLEAN,
         defaultValue: false,
      },
   },
   {
      indexes: [
         {
            unique: false,
            fields: ["en_name"],
         },
      ],
   }
);

InsuranceCompany.sync();

// InsuranceCompany.hasMany(Insurance, { foreignKey: 'insuranceCompanyId' });

module.exports = InsuranceCompany;
