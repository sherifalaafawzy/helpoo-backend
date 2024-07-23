const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  database: process.env.DATABASE,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  dialect: process.env.DATABASE_DIALECT,
  dialectOptions: {
    //  ssl: {
    //      require: true, // This will help you. But you will see new error
    //      rejectUnauthorized: false // This line will fix new error
    //  }
  },
  logging: false,
});

// const sequelize = new Sequelize({
//     database: "helpoo_developers",
//     username: "helpoo_developers",
//     password:"Helpoo@Now@2023@$@Yalla",
//     host: "89.117.61.172",
//     port: 5432,
//     dialect: "postgres",
//     // dialectOptions: {
//     //     ssl: {
//     //         require: true, // This will help you. But you will see new error
//     //         rejectUnauthorized: false // This line will fix new error
//     //     }
//     // },
//     logging:false
//     }
// );

module.exports = sequelize;
