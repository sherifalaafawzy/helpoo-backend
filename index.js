require("./config");
const Users = require("./models/User");
const Client = require("./models/Client");
const Cars = require("./models/Car");
const ClientPackages = require("./models/ClientPackage");
const PackageTransactions = require("./models/PackageTransactions");
const CarPackages = require("./models/CarPackage");
const bcrypt = require("bcryptjs");
const relations = require("./models/relations");
const db = require("./loaders/sequelize");
const { Op } = require("sequelize");
const ServiceRequest = require("./models/ServiceRequest");
const Roles = require("./models/Roles");
const Car = require("./models/Car");
const { generate } = require("generate-password");
async function findUser() {
   await relations(db);

   //    const roles = await Roles.findAll({});
   //    console.log(roles);
   // await Users.update(
   //    {
   //       password,
   //    },   dataValues: {
   //   id: 3,
   //   name: 'Admin',
   //   createdAt: 2023-05-24T23:34:42.998Z,
   //   updatedAt: 2023-05-24T23:34:42.998Z
   // },dataValues: {
   //     id: 2,
   //     name: 'Super',
   //     createdAt: 2023-05-24T23:34:42.998Z,
   //     updatedAt: 2023-05-24T23:34:42.998Z
   //   }
   // let users = await Users.findAll({
   //    where: {
   //       //  RoleId: {
   //       //     [Op.in]: [2, 3],
   //       //  },
   //       username: "emadomda",
   //    },
   // });
   // console.log(users);
   // let usersWithPassword = [["name", "username", "password"]];
   // for (let i = 0; i < users.length; i++) {
   //    const user = users[i];
   //    let password = generate({
   //       length: 12,
   //       numbers: true,
   //       lowercase: true,
   //       uppercase: true,
   //       symbols: "!@#$%&*/?=",
   //    });
   //    console.log(`${password}`);
   //    let hashedPassword = await bcrypt.hash(password, 12);
   //    console.log(hashedPassword);
   //    try {
   //       await Users.update(
   //          {
   //             password: hashedPassword,
   //          },
   //          {
   //             where: {
   //                id: user.id,
   //             },
   //          }
   //       );
   //       usersWithPassword.push([user.name, user.username, password]);
   //    } catch (err) {
   //       console.log(err);
   //    }
   // }
   // console.log(usersWithPassword);
   //    writeToCsv(usersWithPassword, "./newPasswords.csv");
   //    {
   //       where: {
   //          id: 9899,
   //       },
   //    }
   // );
   // await Users.destroy({
   //    where: {
   //       id: 28425,
   //    },
   // });

   const user = await Users.findOne({
      where: {
         username: "+201067359420",
      },
      include: [Roles],
   });
   // const user = await Users.findOne({
   //    where: {
   //       id: 72,
   //    },
   //    include: [Roles],
   // });
   console.log(user.id);
   console.log(user);
   const client = await Client.findAll({
      where: {
         UserId: user.id,
      },
   });
   console.log(client);

   let clientPackages = await clientPackageService.getClientPackages(
      client[0].id
   );
   console.log(clientPackages);
   // const pkgTrans = await PackageTransactions.findAll({
   //    where: {
   //       UserId: user.id,
   //    },
   // });
   // console.log(pkgTrans);
   // console.log(client);
   // console.log(client[0].id);
   // console.log(client[0].get({ plain: true }).id);
   const cPackage = await ClientPackages.findOne({
      where: {
         // ClientId: 74021,
         id: 3217,
      },
   });
   console.log(cPackage);
   // const cPackage2 = await ClientPackages.findOne({
   //    where: {
   //       ClientId: client[1].id,
   //    },
   //    include: [
   //       {
   //          model: Client,
   //          include: [Users],
   //       },
   //    ],
   //    raw: true,
   // });
   // console.log(cPackage2);
   //    const carPackage = await CarPackages.findOne({
   //       where: {
   //          ClientPackageId: cPackage.id,
   //       },
   //    });
   // const cars = await Car.findAll({
   //    where: {
   //       ClientId: client[1].id,
   //    },
   // });
   // console.log(cars);
   // console.log(carPackage);
   // const servicesByPackage = await ServiceRequest.findAll({
   //    where: {
   //       clientId: 7500,
   //    },
   // });
   // console.log(servicesByPackage);
   // let all = cPackage.map((pkg) => pkg.get({ plain: true }));
   // console.log(all);
   // const carPackage = await CarPackages.findAll({
   //    where: {
   //       ClientPackageId: 1130,
   //    },
   // });
   // console.log(carPackage);
   // await Cars.update(
   //    {
   //       vin_number: "203018",
   //    },
   //    {
   //       where: {
   //          id: 12372,
   //       },
   //    }
   // );
   // const cars = await Cars.findAll({
   //    where: {
   //       ClientId: 7500,
   //    },
   // });
   // let carss = cars.map((car) => car.get({ plain: true }));
   // console.log(carss);
   // await Cars.update(
   //    {
   //       ClientId: 24976,
   //    },
   //    {
   //       where: {
   //          id: 7795,
   //       },
   //    }
   // );
   // await Client.destroy({
   //    where: {
   //       id: 34183,
   //    },
   // });
}

findUser();
const fs = require("fs");
const clientPackageService = require("./services/ClientPackageService");

function writeToCsv(data, filename) {
   // Convert each row to a comma-separated string
   const csvContent = data.map((row) => row.join(","));

   // Add a newline character at the end of each row
   csvContent.push(""); // Add an empty line at the end for better formatting

   // Write the CSV content to the file
   fs.writeFileSync(filename, csvContent.join("\n"), { encoding: "utf8" });

   console.log(`Successfully wrote data to CSV file: ${filename}`);
}
