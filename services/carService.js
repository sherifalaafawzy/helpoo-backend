// NPM Lib
const { Op } = require("sequelize");

// Models
const Car = require("../models/Car");
const CarModel = require("../models/CarModel");
const Client = require("../models/Client");
const User = require("../models/User");
const Manufacturer = require("../models/Manufacturer");
const InsuranceCompany = require("../models/InsuranceCompany");
const CarPackage = require("../models/CarPackage");
const Package = require("../models/Package");
const ClientPackage = require("../models/ClientPackage");
const PendingCarsPackage = require("../models/PendingCarsPackage");
const Broker = require("../models/Broker");
const CorporateCompany = require("../models/CorporateCompany");
// Services
const promoCodeService = require("./promoCodeServices");
const clientService = require("./clientService");
const userService = require("./userService");
const packageService = require("./packageService");
const clientPackageService = require("../services/ClientPackageService");

// Utils
const AppError = require("../utils/AppError");

const sequelize = require("../loaders/sequelize");
class CarService {
   async getInsuranceCars(insuranceCompanyId) {
      let cars = await Car.findAll({
         where: { insuranceCompanyId },
         include: [
            {
               model: Manufacturer,
            },
            {
               model: CarModel,
            },
            {
               model: InsuranceCompany,
            },
            {
               model: Client,
               include: [User],
            },
         ],
      });
      cars = cars.map((car) => car.get({ plain: true }));

      return {
         cars,
      };
   }
   async cancelCarPolicy(id) {
      const car = await Car.update(
         {
            insuranceCompanyId: null,
            policyCanceled: true,
         },
         {
            where: { id },
         }
      );
      return car;
   }

   /// start add new car
   async addNewCar(owner, car) {
      try {
         if (!car.vin_number) {
            return new AppError("Please add a vin number", 400);
         }
         const carExist = await Car.findOne({
            where: {
               plateNumber: car.plateNumber,
               ClientId: owner,
               // vin_number: {
               //    [Op.endsWith]: `${car.vin_number.toLowerCase()}`,
               // },
            },
         });

         if (carExist) {
            const newCar = await Car.update(
               {
                  insuranceCompanyId: car.insuranceCompanyId,
                  policyNumber: car.policyNumber,
                  policyStarts: new Date(),
                  policyEnds: car.policyEnds,
                  appendix_number: car.appendix_number,
                  policyCanceled: false,
                  active: false,
                  vin_number: car.vin_number,
               },
               {
                  where: {
                     id: carExist.id,
                  },
               }
            );
            if (car.packageId || car.insuranceCompanyId) {
               await this.addInusredCarPackage(car, owner, carExist);
            }
            const allCarNewData = await Car.findOne({
               where: {
                  id: carExist.id,
               },
            });

            return allCarNewData;
         }

         const newCar = await Car.create({
            ClientId: owner,
            policyStarts: new Date(),
            ...car,
            active: false,
         });
         //  if (car.packageId || car.insuranceCompanyId) {
         //     if (!car.packageId) {
         //        const pckg = await packageService.findPackageByInsuranceId(
         //           car.insuranceCompanyId
         //        );
         //        if (pckg.statusCode) return newCar;
         //        car.packageId = pckg.id;
         //     }
         //     const checkIfClientPackageExist =
         //        await clientPackageService.isClientHasPackage(
         //           owner,
         //           car.packageId
         //        );
         //     if (checkIfClientPackageExist.statusCode) {
         //        const subs = await clientPackageService.immediateSubscribe({
         //           PackageId: car.packageId,
         //           ClientId: owner,
         //           endDate: car.policyEnds,
         //        });
         //        if (subs.statusCode) return newCar;
         //     }
         //     const clientPackage =
         //        await clientPackageService.subscribeCarPackage({
         //           carId: newCar.id,
         //           packageId: car.packageId,
         //           clientId: owner,
         //        });
         //     if (clientPackage.statusCode) return clientPackage;
         //  }
         if (car.packageId || car.insuranceCompanyId) {
            await this.addInusredCarPackage(car, owner, newCar);
         }
         return newCar;
      } catch (error) {
         console.error(error);
         return new AppError(error.message, 400);
      }
   }
   /// start add new car
   async addInusredCarPackage(car, owner, newCar) {
      if (!car.packageId) {
         const pckg = await packageService.findPackageByInsuranceId(
            car.insuranceCompanyId
         );
         if (pckg.statusCode) return 0;
         car.packageId = pckg.id;
      }
      let cp;
      const checkIfClientPackageExist =
         await clientPackageService.isClientHasPackage(owner, car.packageId);
      if (checkIfClientPackageExist.statusCode) {
         const subs = await clientPackageService.immediateSubscribe({
            PackageId: car.packageId,
            ClientId: owner,
            endDate: car.policyEnds,
         });
         cp = subs;
         if (subs.statusCode) return 0;
      } else {
         cp = checkIfClientPackageExist;
      }
      const clientPackage = await clientPackageService.subscribeCarPackage({
         carId: newCar.id,
         packageId: car.packageId,
         clientPackageId: cp.id,
         clientId: owner,
      });
      if (clientPackage.statusCode) return clientPackage;
      // }
   }
   async getCar(id) {
      try {
         const car = await Car.findOne({
            where: { id },
            include: [
               {
                  model: Manufacturer,
               },
               {
                  model: CarModel,
               },
               {
                  model: InsuranceCompany,
               },
               {
                  model: CarPackage,
                  include: [
                     {
                        model: ClientPackage,
                        include: [
                           {
                              model: Package,
                           },
                        ],
                     },
                  ],
               },
            ],
         });
         if (!car) return new AppError("No car with this Id", 404);
         return car;
      } catch (err) {
         console.error(err);
      }
   }
   async createCar(data, id) {
      try {
         let car = {};
         for (let prop in data) {
            car[prop] = data[prop] === "" ? undefined : data[prop];
         }

         if (car.ClientId) {
            if (car.vin_number) {
               const checkVin = await Car.findOne({
                  where: {
                     vin_number: car.vin_number.toLowerCase(),
                     ClientId: car.ClientId,
                  },
               });
               if (checkVin)
                  return new AppError(
                     "You have already added this car before",
                     400
                  );
            }
            if (car.plateNumber) {
               const checkPlate = await Car.findOne({
                  where: {
                     plateNumber: car.plateNumber,
                     ClientId: car.ClientId,
                  },
               });
               if (checkPlate)
                  return new AppError(
                     "You have already added this car before",
                     400
                  );
            }
         }
         if (car.plateNumber) {
            let plate = car.plateNumber.split("-");
            if (Number(plate[0])) {
               car.plateNumber = [plate[1], plate[2], plate[3], plate[0]].join(
                  "-"
               );
            }
         }
         const newCar = await Car.create({
            ...car,
            CreatedBy: id,
         });
         return newCar;
      } catch (err) {
         // console.error(err);
         return new AppError(err.message, 400);
      }
   }
   async getClientsCar(data) {
      const allCars = await Car.findAll({
         where: {
            ClientId: data.ClientId,
         },
         include: [
            {
               model: Manufacturer,
            },
            {
               model: CarModel,
            },
            {
               model: InsuranceCompany,
            },
            {
               model: CarPackage,
               include: [
                  {
                     model: ClientPackage,
                     include: [
                        {
                           model: Package,
                        },
                     ],
                  },
                  {
                     model: Package,
                     include: [
                        {
                           model: CorporateCompany,
                        },
                        {
                           model: InsuranceCompany,
                        },
                        {
                           model: Broker,
                           include: [
                              {
                                 model: User,
                              },
                           ],
                        },
                     ],
                  },
               ],
            },
         ],
      });
      return allCars;
   }
   async adminCreateCar(phoneNumber, data, id) {
      try {
         let user = await User.findOne({
            where: {
               username: phoneNumber,
            },
         });
         if (!user) {
            // create user with client row
            const userData = {
               name: data.name,
               identifier: phoneNumber,
               email: data.email,
               promoCode: data.promoCode,
            };
            let car = JSON.parse(data.Car);
            const user = await userService.createUser(userData);
            if (car.plateNumber) {
               let plate = car.plateNumber.split("-");
               if (Number(plate[0])) {
                  car.plateNumber = [
                     plate[1],
                     plate[2],
                     plate[3],
                     plate[0],
                  ].join("-");
               }
            }
            const newCar = await Car.create({
               ...car,
               CreatedBy: id,
               ClientId: user.id,
            });
            const carInclude = await Car.findOne({
               where: {
                  id: newCar.id,
               },
               include: [Manufacturer, InsuranceCompany, CarModel],
            });
            return {
               car: carInclude,
               ...user,
            };
         }
         user = user.get({ plain: true });
         let client = await Client.findOne({
            where: {
               UserId: user.id,
            },
         });
         if (!client) return new AppError("this user isn't a client", 400);
         let car = JSON.parse(data.Car);
         if (car.plateNumber) {
            let plate = car.plateNumber.split("-");
            if (Number(plate[0])) {
               car.plateNumber = [plate[1], plate[2], plate[3], plate[0]].join(
                  "-"
               );
            }
         }
         let newCar = await Car.create({
            ...car,
            CreatedBy: id,
            ClientId: client.id,
         });
         let carInclude = await Car.findOne({
            where: {
               id: newCar.id,
            },
            include: [Manufacturer, InsuranceCompany, CarModel],
         });
         return {
            car: carInclude,
            user,
         };
      } catch (err) {
         return new AppError(err.message, 500);
      }
   }
   async corporateCar(phoneNumber, data, id) {
      try {
         let user = await User.findOne({
            where: {
               username: phoneNumber,
            },
         });
         if (!user) {
            // create user with client row
            const userData = {
               name: data.name,
               identifier: phoneNumber,
               email: data.email,
               promoCode: data.promoCode,
            };
            let car = JSON.parse(data.Car);
            if (car.plateNumber) {
               let plate = car.plateNumber.split("-");
               if (Number(plate[0])) {
                  car.plateNumber = [
                     plate[1],
                     plate[2],
                     plate[3],
                     plate[0],
                  ].join("-");
               }
            }
            const user = await userService.createUser(userData);
            const newCar = await Car.create({
               ...car,
               CreatedBy: id,
            });
            const carInclude = await Car.findOne({
               where: {
                  id: newCar.id,
               },
               include: [Manufacturer, InsuranceCompany, CarModel],
            });
            return {
               car: carInclude,
               ...user,
            };
         }
         user = user.get({ plain: true });
         let client = await Client.findOne({
            where: {
               UserId: user.id,
            },
         });
         if (!client) return new AppError("this user isn't a client", 400);
         let car = JSON.parse(data.Car);
         if (car.plateNumber) {
            let plate = car.plateNumber.split("-");
            if (!Number(plate[0])) {
               car.plateNumber = [plate[1], plate[2], plate[3], plate[0]].join(
                  "-"
               );
            }
         }
         let newCar = await Car.create({
            ...car,
            CreatedBy: id,
         });
         let carInclude = await Car.findOne({
            where: {
               id: newCar.id,
            },
            include: [Manufacturer, InsuranceCompany, CarModel],
         });
         if (data.promoCode) {
            const assignPromo = await promoCodeService.assignPromo(
               promoCode,
               user.id
            );
            if (assignPromo.statusCode) {
               let data = {
                  car: carInclude,
                  user: {
                     PhoneNumber: user.PhoneNumber,
                     name: user.name,
                     email: user.email,
                     RoleId: user.RoleId,
                     id: client.id,
                     userId: client.UserId,
                  },
                  msg: assignPromo.message,
               };
               return data;
            }
            let data = {
               car: carInclude,
               user: {
                  PhoneNumber: user.PhoneNumber,
                  name: user.name,
                  email: user.email,
                  RoleId: user.RoleId,
                  id: client.id,
                  userId: client.UserId,
               },
               promo: assignPromo,
            };
            return data;
         }
         return {
            car: carInclude,
            user: {
               PhoneNumber: user.PhoneNumber,
               name: user.name,
               email: user.email,
               RoleId: user.RoleId,
               id: client.id,
               userId: client.UserId,
            },
         };
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 400);
      }
   }
   async getAllCars(page, size) {
      const cars = await Car.findAll({
         order: [["id", "DESC"]],
         limit: size,
         offset: (page - 1) * size,

         include: [
            {
               model: Manufacturer,
            },
            {
               model: CarModel,
            },
            {
               model: Client,
               nested: true,
            },
            {
               model: InsuranceCompany,
            },
         ],
      });
      // if (cars.length === 0) return { msg: false };
      let totalCount = await Car.count();
      const currentPage = Number(page);
      const totalPages = Math.ceil(totalCount / size);

      return {
         totalCount,
         currentPage,
         totalPages,
         cars,
      };
   }
   async getUserCars(ClientId) {
      let cars = await Car.findAll({
         where: {
            ClientId,
         },
         include: [
            {
               model: Manufacturer,
            },
            {
               model: CarModel,
            },
            {
               model: InsuranceCompany,
            },
            {
               model: CarPackage,
               order: [["id", "DESC"]],
               include: [
                  {
                     model: ClientPackage,
                  },
                  {
                     model: Package,
                     include: [
                        {
                           model: CorporateCompany,
                        },
                        {
                           model: InsuranceCompany,
                        },
                        {
                           model: Broker,
                           include: [
                              {
                                 model: User,
                              },
                           ],
                        },
                     ],
                  },
               ],
            },
         ],
      });
      cars = cars
         .map((car) => {
            car = car.get({ plain: true });
            const numberOfCarPackages = car.CarPackages.length;
            return {
               ...car,
               numberOfCarPackages,
            };
         })
         .sort((a, b) => b.numberOfCarPackages - a.numberOfCarPackages);
      return cars;
   }
   async getUserCarsByPhone(phoneNumber) {
      const user = await User.findOne({
         where: {
            username: phoneNumber,
         },
      });
      if (!user) return { msg: false };
      const client = await clientService.getClientByUserId(user.id);
      if (client.statusCode) return client;
      const cars = await Car.findAll({
         where: {
            ClientId: client.id,
         },
         include: [
            {
               model: Manufacturer,
            },
            {
               model: CarModel,
            },
            {
               model: InsuranceCompany,
            },
         ],
      });
      return cars;
   }
   async getCarByPlateNumber(plateNumber) {
      const car = await Car.findAll({
         where: {
            plateNumber,
         },
         include: [
            {
               model: Manufacturer,
            },
            {
               model: CarModel,
            },
            {
               model: InsuranceCompany,
            },
         ],
      });
      return car;
   }
   async carIsInsured(carId) {
      const car = await Car.findOne({
         where: {
            id: carId,
         },
         include: [
            {
               model: InsuranceCompany,
            },
         ],
      });
      if (car.insuranceCompany) {
         return true;
      }
      return false;
   }
   async getCarByPolicyNumber(policyNumber, insuranceCompanyId, clientId) {
      const car = await Car.findOne({
         where: {
            policyNumber,
            insuranceCompanyId: insuranceCompanyId,
         },
         include: [
            {
               model: InsuranceCompany,
            },
            {
               model: Manufacturer,
            },
            {
               model: CarModel,
            },
         ],
      });
      if (!car) return new AppError("Car not found", 404);
      await car.update({
         ClientId: clientId,
      });
      const existPackage = await packageService.findPackageByInsuranceId(
         insuranceCompanyId
      );
      if (existPackage.statusCode) return existPackage;
      const subscribedClient = await clientPackageService.subscribe({
         PackageId: existPackage.id,
         ClientId: clientId,
         paymentMethod: "pre-paid",
      });
      if (subscribedClient.statusCode) return subscribedClient;
      const subscribeCar = await clientPackageService.subscribeCarPackage({
         carId: car.id,
         packageId: existPackage.id,
         clientPackageId: subscribedClient.id,
         clientId: clientId,
      });
      if (subscribeCar.statusCode) return subscribeCar;
      return car;
   }
   async getCarByVinNumber(vinNumber, insuranceCompanyId, clientId) {
      // let userId = Number(clientId)
      let car;
      let where = {
         vin_number: {
            [Op.endsWith]: `${vinNumber.toLowerCase()}`,
         },
         insuranceCompanyId: insuranceCompanyId,
      };
      if (clientId) {
         let checkIfThere = await Car.findOne({
            where: {
               vin_number: {
                  [Op.endsWith]: `${vinNumber.toLowerCase()}`,
               },
               insuranceCompanyId: insuranceCompanyId,
               ClientId: clientId,
               active: true,
            },
         });
         if (checkIfThere)
            return new AppError(
               "You have already activated this car, kindly check your vehicles",
               400
            );
         car = await Car.findOne({
            where,
            include: [
               {
                  model: InsuranceCompany,
               },
               {
                  model: Manufacturer,
               },
               {
                  model: CarModel,
               },
            ],
         });
         if (!car) return new AppError("Car not found", 404);
         car = car.get({ plain: true });
         return car;
      } else {
         car = await Car.findAll({
            where,
            include: [
               {
                  model: InsuranceCompany,
               },
               {
                  model: Manufacturer,
               },
               {
                  model: CarModel,
               },
               {
                  model: Client,
                  include: [
                     {
                        model: User,
                     },
                  ],
               },
            ],
         });
         if (car.length === 0) return new AppError("Car not found", 404);
         return car;
      }
      // let userId = Number(clientId)
      // if(car.ClientId === userId && car.active) return new AppError('You have already activated this car, kindly check your vehicles',400)
      // if(car.ClientId && car.ClientId !== userId) return new AppError("Car belongs to another client",400)

      return car;
   }
   async confirmAndActivateCar(carId, clientId, insuranceCompanyId, data) {
      let car = await Car.findByPk(carId, {
         include: [
            {
               model: InsuranceCompany,
            },
            {
               model: Manufacturer,
            },
            {
               model: CarModel,
            },
         ],
      });
      clientId = Number(clientId);
      if (!car.ClientId) {
         if (
            (!car.plateNumber && !data.plateNumber) ||
            (!car.ManufacturerId && !data.ManufacturerId) ||
            (!car.CarModelId && !data.CarModelId) ||
            (!car.year && !data.year)
         ) {
            return new AppError(
               "Please make sure you provided us ( plate number, manufacturer , car model and year )",
               400
            );
         }
         await car.update({
            ClientId: clientId,
            ...data,
         });

         if (data.fl && data.bl) {
            // return car;
            const frontLicense = decodeImages(
               `car-frontLicense-${car.id}-${car.ClientId}`,
               data.fl
            );
            const backLicense = decodeImages(
               `car-backLicense-${car.id}-${car.ClientId}`,
               data.bl
            );
            await car.update({ frontLicense, backLicense });
         }
         let packageId;
         const pendingCar = await PendingCarsPackage.findOne({
            where: {
               carId: car.id,
            },
         });
         const existPackage = await packageService.findPackageByInsuranceId(
            insuranceCompanyId
         );
         if (pendingCar) {
            packageId = pendingCar.pkgId;
            await PendingCarsPackage.destroy({
               where: {
                  carId: car.id,
                  id: pendingCar.id,
               },
            });
         } else if (existPackage.statusCode) {
            console.error("existPackage", existPackage.message);
            return car;
         } else if (existPackage.id && !pendingCar) {
            packageId = existPackage.id;
         }

         const subscribedClient = await clientPackageService.immediateSubscribe(
            {
               PackageId: packageId,
               ClientId: clientId,
               paymentMethod: "pre-paid",
               endDate: car.policyEnds,
            }
         );
         if (subscribedClient.statusCode) {
            console.error("subscribeClient", subscribedClient.message);
            return car;
         }
         const subscribeCar = await clientPackageService.subscribeCarPackage({
            carId: carId,
            packageId: packageId,
            clientPackageId: subscribedClient.id,
            clientId: clientId,
         });
         if (subscribeCar.statusCode) {
            console.error("subscribeCar", subscribeCar.message);
            return car;
         }
         return car;
      } else if (car.ClientId === clientId && !car.active) {
         // Only update
         await car.update(data);
         if (data.fl && data.bl) {
            // return car;
            const frontLicense = decodeImages(
               `car-frontLicense-${car.id}-${car.ClientId}`,
               data.fl
            );
            const backLicense = decodeImages(
               `car-backLicense-${car.id}-${car.ClientId}`,
               data.bl
            );
            await car.update({ frontLicense, backLicense });
         }

         return car;
      } else if (car.ClientId !== clientId) {
         // create new with same date without pkgs
         try {
            if (car.plateNumber) {
               let plate = car.plateNumber.split("-");
               if (!Number(plate[0])) {
                  car.plateNumber = [
                     plate[1],
                     plate[2],
                     plate[3],
                     plate[0],
                  ].join("-");
               }
            }
            let newCar = await Car.create({
               plateNumber: car.plateNumber,
               year: car.year,
               policyNumber: car.policyNumber,
               policyStarts: car.policyStarts,
               policyEnds: car.policyEnds,
               appendix_number: car.appendix_number,
               vin_number: car.vin_number.toLowerCase(),
               policyCanceled: car.policyCanceled,
               color: car.color,
               frontLicense: car.frontLicense,
               backLicense: car.backLicense,
               ManufacturerId: car.ManufacturerId,
               CarModelId: car.CarModelId,
               active: car.active,
               insuranceCompanyId: car.insuranceCompanyId,
            });
            await newCar.update({ ClientId: clientId, ...data });
            return newCar;
         } catch (err) {
            console.error(err);
            return new AppError(err.message, 500);
         }
      }
   }
   async updateCar(carId, data) {
      let car = await Car.findOne({
         where: {
            id: carId,
         },
      });
      let updateData = {};
      for (let prop in data) {
         updateData[prop] = data[prop] === "" ? undefined : data[prop];
      }
      if (!car) return new AppError("Car not found", 404);
      car = car.get({ plain: true });
      // console.log(data);
      // console.log(updateData);
      // console.log(car);
      if (updateData.vin_number) {
         if (car.vin_number) {
            if (
               updateData.vin_number.toLowerCase() !==
               car.vin_number.toLowerCase()
            ) {
               // console.log("Checking");
               const checkVin = await Car.findOne({
                  where: {
                     vin_number: updateData.vin_number.toLowerCase(),
                     ClientId: car.ClientId,
                     id: {
                        [Op.ne]: carId,
                     },
                  },
               });
               // console.log(checkVin);
               if (checkVin)
                  return new AppError(
                     "You have a car with the same chassis number",
                     400
                  );
            }
         } else {
            const checkVin = await Car.findOne({
               where: {
                  vin_number: updateData.vin_number.toLowerCase(),
                  ClientId: car.ClientId,
                  id: {
                     [Op.ne]: carId,
                  },
               },
            });
            if (checkVin)
               return new AppError(
                  "You have a car with the same chassis number",
                  400
               );
         }
      }
      if (
         updateData.plateNumber !== car.plateNumber &&
         car.plateNumber &&
         updateData.plateNumber
      ) {
         const checkPlate = await Car.findOne({
            where: {
               plateNumber: updateData.plateNumber,
               ClientId: car.ClientId,
               id: {
                  [Op.ne]: carId,
               },
            },
         });
         if (checkPlate)
            return new AppError(
               "You have a car with the same plate number",
               400
            );
      }
      let updatedCar = await Car.update(data, {
         where: {
            id: carId,
         },
      });
      updatedCar = await Car.findByPk(carId);
      // console.log(updatedCar);
      if (!data.fl && !data.bl) {
         return updatedCar;
      }
      const frontLicense = decodeImages(
         `car-frontLicense-${car.id}-${car.ClientId}`,
         data.fl
      );
      const backLicense = decodeImages(
         `car-backLicense-${car.id}-${car.ClientId}`,
         data.bl
      );
      await Car.update(
         { frontLicense, backLicense },
         {
            where: {
               id: carId,
            },
         }
      );
      updatedCar = await Car.findByPk(carId);
      return updatedCar;
   }
   async findCarByVinNumber(vinNumber, policyNo) {
      const insurance = await InsuranceCompany.findOne({
         where: {
            en_name: {
               [Op.like]: "Delta",
            },
         },
      });
      let car = await Car.findOne({
         where: {
            vin_number: {
               [Op.endsWith]: `${vinNumber.toLowerCase()}`,
            },
            policyNumber: {
               [Op.endsWith]: `${policyNo}`,
            },
            insuranceCompanyId: insurance.id,
         },
         include: [
            {
               model: Manufacturer,
            },
            {
               model: CarModel,
            },
         ],
      });
      if (!car) return new AppError("Car not found", 404);
      car = car.get({ plain: true });
      if (!car.ClientId) return car;
      const client = await clientService.getClientById(car.ClientId);
      if (!client || client.statusCode) return car;
      let user = await userService.getOneUser(client.UserId);
      if (user.statusCode || !user) return car;
      return {
         ...car,
         User: user,
      };
   }
   async deleteCarForClient(carId, clientId) {
      let checkCar = await Car.findOne({
         where: {
            id: carId,
            ClientId: clientId,
         },
      });
      if (!checkCar) return new AppError("You don't own this car", 400);
      await Car.destroy({
         where: {
            id: carId,
         },
      });
      return "done";
   }
}
const decodeImages = (imageName, image) => {
   // const base64Image = image.split(';base64,').pop();
   let filename = `/public/licenses/${imageName}.jpg`;
   require("fs").writeFile(`.${filename}`, image, "base64", function (err) {
      if (err) console.error(err);
   });
   return filename;
};

const carService = new CarService();

module.exports = carService;
