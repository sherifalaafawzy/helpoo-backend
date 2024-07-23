const { DataTypes } = require("sequelize");
// const sequelize = require('../loaders/sequelize');
const db = require("../loaders/sequelize");
const Roles = require("./Roles");

const User = db.define(
   "User",
   {
      id: {
         type: DataTypes.INTEGER,
         autoIncrement: true,
         primaryKey: true,
      },
      PhoneNumber: {
         type: DataTypes.STRING,
         unique: true,
         trim: true,
         allowNull: true,
      },
      email: {
         type: DataTypes.STRING,
         unique: true,
         trim: true,
         validate: {
            isEmail: {
               msg: "Must be a valid email address",
            },
         },
      },
      password: {
         type: DataTypes.STRING,
         validate: {
            min: 8,
         },
         allowNull: false,
      },
      username: {
         type: DataTypes.STRING,
         unique: true,
         allowNull: false,
         trim: true,
      },
      name: {
         type: DataTypes.STRING,
         allowNull: false,
         trim: true,
      },
      blocked: {
         type: DataTypes.BOOLEAN,
         allowNull: false,
         defaultValue: false,
      },
      photo: {
         type: DataTypes.STRING,
         defaultValue:
            "https://pixinvent.com/demo/materialize-mui-react-nextjs-admin-template/demo-1/images/avatars/1.png",
      },
      deleted: {
         type: DataTypes.BOOLEAN,
         defaultValue: false,
      },
      RoleId: {
         type: DataTypes.INTEGER,
         allowNull: false,
         references: { model: "Roles" },
      },
      lastLogIn: {
         type: DataTypes.DATE,
         defaultValue: new Date(),
      },
      lastLogInData: {
         type: DataTypes.JSONB,
      },
   },
   {
      timestamps: true,
      indexes: [
         {
            unique: false,
            fields: ["username"],
         },
         {
            unique: false,
            fields: ["PhoneNumber"],
         },
      ],
   }
);
User.belongsTo(Roles);

db.sync();
module.exports = User;
