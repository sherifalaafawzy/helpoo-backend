// NPM Lib
const moment = require("moment");
const { Op } = require("sequelize");

// Models
const Broker = require("../models/Broker");
const Car = require("../models/Car");
const CarPackage = require("../models/CarPackage");
const CarModel = require("../models/CarModel");
const ClientPackage = require("../models/ClientPackage");
const Client = require("../models/Client");
const CorporateCompany = require("../models/CorporateCompany");
const InsuranceCompany = require("../models/InsuranceCompany");
const Manufacturer = require("../models/Manufacturer");
const Package = require("../models/Package");
const PackagePromoCode = require("../models/PackagePromoCode");
const PackageBenefits = require("../models/PackageBenefits");
const User = require("../models/User");
const ServiceRequest = require("../models/ServiceRequest");
const UsedPromosPackages = require("../models/UsedPromosPackages");

// Services
const packageService = require("./packageService");
const clientService = require("./clientService");

// Utils
const AppError = require("../utils/AppError");
const CarServiceType = require("../models/CarServiceType");
const PackageTransactions = require("../models/PackageTransactions");

class ClientPackageService {
   async getClientPackages(clientId) {
      const clientPackage = await ClientPackage.findAll({
         order: [["id", "DESC"]],
         where: {
            ClientId: clientId,
            active: true,
            // paymentStatus: "paid",
            // startDate: {
            //   [Op.lte]: moment().format("YYYY-MM-DD"),
            // },
            // endDate: {
            //   [Op.gte]: moment().format("YYYY-MM-DD"),
            // }
         },
         include: [
            {
               model: Package,
               include: [
                  {
                     model: PackageBenefits,
                     order: [["id", "ASC"]],
                  },
                  {
                     model: CorporateCompany,
                  },
                  {
                     model: InsuranceCompany,
                  },
                  {
                     model: Broker,
                     include: [User],
                  },
               ],
            },
            {
               model: CarPackage,
               include: [Car],
            },
            {
               model: UsedPromosPackages,
               include: [
                  {
                     model: PackagePromoCode,
                     include: [CorporateCompany],
                  },
               ],
            },
         ],
      });
      console.log(clientPackage);
      let pkgs = clientPackage.map((p) => {
         let pkg = p.get({ plain: true });

         return {
            ...pkg.Package,
            ...pkg,
            assignedCars: pkg.CarPackages.length,
            Package: undefined,
         };
      });
      for (let i = 0; i < pkgs.length; i++) {
         const pkgId = pkgs[i].id;
         let serviceCount = await ServiceRequest.count({
            where: {
               ClientPackageId: pkgId,
               status: "done",
            },
            include: [
               {
                  model: CarServiceType,
                  where: {
                     id: {
                        [Op.in]: ["4", "5"],
                     },
                  },
               },
            ],
         });
         let serviceCountOtherServices = await ServiceRequest.count({
            where: {
               ClientPackageId: pkgId,
               status: "done",
            },
            include: [
               {
                  model: CarServiceType,
                  where: {
                     id: {
                        [Op.in]: ["1", "2", "3"],
                     },
                  },
               },
            ],
         });
         pkgs[i]["requestsInThisPackage"] = serviceCount;
         pkgs[i]["requestsInThisPackageOtherServices"] =
            serviceCountOtherServices;
      }
      // console.log(pkgs);
      return pkgs;
   }
   async checkIfClientIsSub(clientId, pkgId) {
      let clientPackage = await ClientPackage.findOne({
         where: {
            ClientId: clientId,
            PackageId: pkgId,
         },
      });
      return clientPackage;
   }
   async subscribe(data) {
      try {
         const existPackage = await packageService.getOnePackage(
            data.PackageId
         );
         // const pkg = await packageService.getOnePackage(existPackage.PackageId);
         const existClient = await clientService.getClientById(data.ClientId);
         if (existPackage.statusCode) return existPackage;
         else if (existClient.statusCode) return existClient;
         else {
            // let clientPackage = await ClientPackage.findOne({
            //    where: {
            //       ClientId: existClient.id,
            //       PackageId: data.PackageId,
            //    },
            // });
            // if (clientPackage) {
            //    // return new AppError("Client already has this package", 400);
            //    await clientPackage.update({
            //       startDate: moment().add(
            //          existPackage.activateAfterDays,
            //          "days"
            //       ),
            //       endDate: moment()
            //          .add(existPackage.activateAfterDays, "days")
            //          .add(existPackage.numberOfDays, "days"),
            //       paymentStatus: "paid",
            //       paymentMethod: data.paymentMethod,
            //       active: true,
            //    });
            // } else {
            let startDate = moment().add(
               existPackage.activateAfterDays,
               "days"
            );
            let endDate = moment(startDate, "DD.MM.YYYY").add(
               existPackage.numberOfDays,
               "days"
            );
            let orderId = data.orderId;
            const clientsubscribed = await ClientPackage.create({
               PackageId: existPackage.id,
               ClientId: existClient.id,
               startDate,
               endDate,
               active: true,
               orderId,
            });
            // }
            let packages = await ClientPackage.findAll({
               where: {
                  ClientId: existClient.id,
               },
               include: [Package],
            });
            return packages.map((p) => {
               let pkg = p.get({ plain: true });
               return {
                  ...pkg,
                  ...pkg.Package,
                  Package: undefined,
               };
            });
         }
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 400);
      }
   }
   async immediateSubscribe(data) {
      try {
         const existPackage = await packageService.getOnePackage(
            data.PackageId
         );
         const existClient = await clientService.getClientById(data.ClientId);
         if (existClient.statusCode) return existClient;
         if (existPackage.statusCode) return existPackage;
         const checkSub = await this.checkIfClientIsSub(
            data.ClientId,
            data.PackageId
         );
         if (checkSub) {
            return checkSub;
         }
         let startDate = moment();
         let endDate = data.endDate
            ? data.endDate
            : moment(startDate, "DD.MM.YYYY").add(
                 existPackage.numberOfDays,
                 "days"
              );
         let clientPackage = await ClientPackage.create({
            PackageId: existPackage.id,
            ClientId: existClient.id,
            startDate,
            endDate,
            active: true,
         });
         return clientPackage;
      } catch (err) {
         return new AppError(err.message, 400);
      }
   }
   async isClientHasPackage(clientId, packageId) {
      let clientHasPackage = await ClientPackage.findOne({
         where: {
            ClientId: clientId,
            PackageId: packageId,
            active: true,
         },
         include: [
            {
               model: CarPackage,
            },
            {
               model: Package,
            },
         ],
      });
      if (clientHasPackage) {
         clientHasPackage = clientHasPackage.get({ plain: true });
         return clientHasPackage;
      }
      return new AppError("Client does not have this package", 400);
   }
   async subscribeCarPackage(data) {
      try {
         const existPackage = await packageService.getOnePackage(
            data.packageId
         );
         const existClient = await clientService.getClientById(data.clientId);
         // const carExist = await carService.getCar(data.carId);

         if (existPackage.statusCode) return existPackage;
         else if (existClient.statusCode) return existClient;
         // else if (carExist.statusCode) return carExist;
         else {
            // let clientPackage = await this.isClientHasPackage(
            //    existClient.id,
            //    existPackage.id
            // );
            let clientPackage = await ClientPackage.findOne({
               where: {
                  id: data.clientPackageId,
                  ClientId: data.clientId,
                  active: true,
               },
               include: [
                  {
                     model: CarPackage,
                  },
                  {
                     model: Package,
                  },
               ],
            });
            if (!clientPackage)
               return new AppError("Client does not have this package", 400);
            else {
               let carPackages = await CarPackage.findAll({
                  where: {
                     CarId: data.carId,
                  },
                  include: [Package, ClientPackage],
               });
               let carPackageExist = carPackages.find((cp) => {
                  return (
                     cp.Package.id == existPackage.id &&
                     cp.ClientPackage.id == clientPackage.id
                  );
               });
               if (carPackageExist)
                  return new AppError("This car already has this package", 400);
               let hasPrivatePackage = carPackages.find((cp) => {
                  return cp.Package.private == true;
               });
               if (
                  (hasPrivatePackage || carPackages.length !== 0) &&
                  clientPackage.Package.private == false
               )
                  return new AppError(
                     `This car already has a package you can't add public`,
                     400
                  );
               if (
                  clientPackage.CarPackages.length ==
                  clientPackage.Package.numberOfCars
               ) {
                  return new AppError(
                     "Client has reached the maximum number of cars allowed for this package",
                     400
                  );
               } else {
                  let car = await Car.findByPk(data.carId);
                  car = car.get({ plain: true });
                  if (!car.plateNumber)
                     return new AppError(
                        "subscribed cars must have a plate number",
                        400
                     );
                  const clientsubscribed = await CarPackage.create({
                     PackageId: existPackage.id,
                     CarId: data.carId,
                     ClientPackageId: clientPackage.id,
                  });
                  return clientsubscribed;
               }
            }
         }
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 400);
      }
   }
   async getClientsByPackage(packageId) {
      const clientsPackage = await ClientPackage.findAll({
         where: {
            PackageId: packageId,
         },
         include: [
            {
               model: Client,
               include: [User],
            },
            {
               model: CarPackage,
               // include: [],
            },
            {
               model: Car,
               include: [
                  {
                     model: Manufacturer,
                  },
                  {
                     model: CarModel,
                  },
               ],
            },
         ],
      });
      return clientsPackage;
   }
   async getPackageByInsurance(insuranceId) {
      const packages = await Package.findAll({
         where: {
            insuranceCompanyId: insuranceId,
         },
      });
      return packages;
   }
   async updateClientPackage(clientPackageId, data) {
      await ClientPackage.update(data, {
         where: {
            id: clientPackageId,
         },
      });
      let clientPackage = await ClientPackage.findByPk(clientPackageId);
      return clientPackage;
   }
   async getUnFilledClientPackage(clientId) {
      let clientPackages = await this.getClientPackages(clientId);
      let clientPackagesFinal = [];
      for (let i = 0; i < clientPackages.length; i++) {
         if (clientPackages[i].assignedCars < clientPackages[i].numberOfCars) {
            clientPackagesFinal.push(clientPackages[i]);
         }
      }
      return clientPackagesFinal;
   }
   async getPackageReports(sDate, eDate) {
      try {
         let cPackages = await ClientPackage.findAll({
            where: {
               createdAt: {
                  [Op.gte]: sDate,
                  [Op.lte]: eDate,
               },
            },
            attributes: ["id", "createdAt", "endDate", "ClientId", "startDate"],
            include: [
               {
                  model: Package,
                  include: [
                     {
                        model: CorporateCompany,
                     },
                     {
                        model: Broker,
                        include: [User],
                     },
                     {
                        model: InsuranceCompany,
                     },
                  ],
               },
               {
                  model: PackageTransactions,
               },
               {
                  model: Client,
                  attributes: ["id"],
                  include: [
                     {
                        model: User,
                        attributes: ["id", "name", "PhoneNumber"],
                     },
                  ],
               },
               {
                  model: UsedPromosPackages,
                  include: [
                     {
                        model: PackagePromoCode,
                        include: [CorporateCompany],
                     },
                  ],
               },
            ],
         });
         cPackages = cPackages.map((cPackage) => cPackage.get({ plain: true }));
         return cPackages;
      } catch (err) {
         return new AppError(err.message);
      }
   }
}

const clientPackageService = new ClientPackageService();
module.exports = clientPackageService;
