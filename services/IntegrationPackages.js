const packageService = require("./packageService");
const clientPackageService = require("./ClientPackageService");
const userService = require("./userService");
const smsService = require("./smsService");
const packageCustomizationService = require("./PackageCustomization");
const AppError = require("../utils/AppError");
const clientService = require("./clientService");
const carService = require("./carService");
const Manufacturer = require("../models/Manufacturer");
const { Op } = require("sequelize");
const CarModel = require("../models/CarModel");
const validator = require("validator");
// const insuranceCompany = require("./InsuranceCompany");
const InsuranceCompany = require("../models/InsuranceCompany");
const PendingCarsPackage = require("../models/PendingCarsPackage");

class IntegrationPackages {
   async registerManyUsersThenAssign(data, pkgId, role, creator) {
      try {
         let successCount = 0;
         let failureCount = 0;
         let failedRows = [];
         let failedIndexes = [];
         let newData = [];
         let zeroes = ["zero", "زيرو", "0", "٠"];
         data = data.map((el) => {
            let filteredBody = {};
            for (let prop in el) {
               filteredBody[prop] = el[prop] === "" ? null : el[prop];
            }
            return filteredBody;
         });
         console.log(data);
         let users =
            data.map((user, i) => {
               if (!user.Vin_number) {
                  failureCount++;
                  failedRows.push({
                     ...user,
                     error: "Please provide a chassis number",
                  });
                  failedIndexes.push(i);
                  return undefined;
               }
               if (!user.PhoneNumber) {
                  if (role === "Corporate") {
                     failureCount++;
                     failedRows.push({
                        ...user,
                        error: "Please provide a phone number",
                     });
                     failedIndexes.push(i);
                     return undefined;
                  } else if (!user.Vin_number || !user.insuranceCompanyId) {
                     failureCount++;
                     failedRows.push({
                        ...user,
                        error: "Please provide a phone number or chassis number and insurance company",
                     });
                     failedIndexes.push(i);
                     return undefined;
                  } else {
                     return undefined;
                  }
               } else {
                  let phoneNumber = user.PhoneNumber.startsWith("+")
                     ? user.PhoneNumber
                     : `+2${user.PhoneNumber}`;
                  return {
                     name: user.name,
                     email: user.email,
                     identifier: phoneNumber ? phoneNumber.trim() : phoneNumber,
                  };
               }
            }) || [];
         console.log(users);
         console.log("users");
         let usersDataCreate = [];
         for (let i = 0; i < users.length; i++) {
            let userr = users[i];
            if (!userr) {
               usersDataCreate.push(undefined);
            } else {
               if (userr.identifier.length !== 13) {
                  failureCount++;
                  failedRows.push({
                     ...data[i],
                     error: "This Phone Number is wrong.",
                  });
                  newData = data.filter((_, index) => !(index === i));
                  data = newData;
                  continue;
               }
               let checkIfExist = await userService.checkExist(
                  userr.identifier
               );
               if (checkIfExist === "Not Exist") {
                  let userCreated = await userService.createUser(userr);
                  if (userCreated.user) {
                     usersDataCreate.push(userCreated.user);
                  } else {
                     usersDataCreate.push(userCreated);
                  }
               } else if (checkIfExist.startsWith("Exist")) {
                  let user = await userService.findUserByIdentifier(
                     userr.identifier
                  );
                  let client = await clientService.getClientByUserId(user.id);
                  let data = {
                     PhoneNumber: user.PhoneNumber,
                     name: user.name,
                     email: user.email,
                     RoleId: user.RoleId,
                     id: client.id,
                     userId: client.UserId,
                  };
                  usersDataCreate.push(data);
               } else {
               }
            }
         }
         let cars = [];
         for (let i = 0; i < data.length; i++) {
            let car = data[i];
            // if (!car.CarModel || !car.CarBrand) {
            //    failureCount++;
            //    failedRows.push(data[i]);
            //    failedIndexes.push(i);
            //    continue;
            // }
            let brand;
            if (car.CarBrand) {
               brand = await Manufacturer.findOne({
                  where: {
                     [Op.or]: {
                        en_name: {
                           [Op.iLike]: `%${car.CarBrand.toLowerCase().trim()}%`,
                        },
                        ar_name: {
                           [Op.iLike]: `%${car.CarBrand.trim()}%`,
                        },
                     },
                  },
               });
            }
            console.log(brand);
            let carModel;
            if (brand) {
               // failureCount++;
               // failedRows.push(data[i]);
               // failedIndexes.push(i);
               // continue;
               carModel = await CarModel.findOne({
                  where: {
                     [Op.or]: {
                        en_name: {
                           [Op.iLike]: `%${car.CarModel.toLowerCase().trim()}%`,
                        },
                        ar_name: {
                           [Op.iLike]: `%${car.CarModel.trim()}%`,
                        },
                     },
                     ManufacturerId: brand.id,
                  },
               });
            }
            let insuranceCompany;
            if (car.insuranceCompanyId) {
               insuranceCompany = await InsuranceCompany.findOne({
                  where: {
                     [Op.or]: {
                        en_name: {
                           [Op.iLike]: `%${car.insuranceCompanyId
                              .toLowerCase()
                              .trim()}%`,
                        },
                        ar_name: {
                           [Op.iLike]: `%${car.insuranceCompanyId.trim()}%`,
                        },
                     },
                  },
               });
               if (!insuranceCompany) {
                  failureCount++;
                  failedRows.push({
                     ...data[i],
                     error: "No insurance company with this name in our database",
                  });
                  failedIndexes.push(i);
                  continue;
               }
            }
            let dataWillBePushed = {};
            console.log(" ========= Policy Start ==========");
            console.log(car.PolicyStartDate);
            console.log(" ========= Policy End ==========");
            console.log(car.PolicyEndDate);
            console.log(
               car.PolicyStartDate
                  ? car.PolicyStartDate.includes("/")
                     ? new Date(car.PolicyStartDate).getTime()
                     : "number"
                  : "nan"
            );
            car.PolicyStartDate = car.PolicyStartDate
               ? car.PolicyStartDate.includes("/")
                  ? new Date(car.PolicyStartDate).getTime()
                  : Number(car.PolicyStartDate)
               : car.PolicyStartDate;
            car.PolicyEndDate = car.PolicyEndDate
               ? car.PolicyEndDate.includes("/")
                  ? new Date(car.PolicyEndDate).getTime()
                  : Number(car.PolicyEndDate)
               : car.PolicyEndDate;
            console.log(" ========= Policy Start ==========");
            console.log(car.PolicyStartDate);
            console.log(" ========= Policy End ==========");
            console.log(car.PolicyEndDate);
            if (role === "Broker") {
               let broker = await userService.findUserRoleData(creator, role);
               dataWillBePushed = {
                  active: false,
                  color: car.color,
                  year: Number(car.year),
                  plateNumber: zeroes.includes(car.CarPlate)
                     ? undefined
                     : car.CarPlate,
                  policyStarts: car.PolicyStartDate,
                  policyEnds: car.PolicyEndDate,
                  policyNumber: car.PolicyNumber,
                  vin_number: car.Vin_number,
                  ManufacturerId: brand ? brand.id : brand,
                  CarModelId: carModel ? carModel.id : carModel,
                  insuranceCompanyId: insuranceCompany
                     ? insuranceCompany.id
                     : undefined,
                  BrokerId: broker.user.id,
               };
            } else {
               dataWillBePushed = {
                  active: false,
                  color: car.color,
                  year: Number(car.year),
                  plateNumber: zeroes.includes(car.CarPlate)
                     ? undefined
                     : car.CarPlate,
                  policyStarts: car.PolicyStartDate
                     ? Number(car.PolicyStartDate)
                     : car.PolicyStartDate,
                  policyEnds: car.PolicyEndDate
                     ? Number(car.PolicyEndDate)
                     : car.PolicyEndDate,
                  policyNumber: car.PolicyNumber,
                  vin_number: car.Vin_number,
                  ManufacturerId: brand ? brand.id : brand,
                  CarModelId: carModel ? carModel.id : carModel,
                  insuranceCompanyId: insuranceCompany
                     ? insuranceCompany.id
                     : undefined,
               };
            }
            cars.push(dataWillBePushed);
         }

         if (failedIndexes.length > 0) {
            const newArray = usersDataCreate.filter(
               (_, index) => !failedIndexes.includes(index)
            );
            newData = data.filter((_, index) => !failedIndexes.includes(index));
            data = newData;
            console.log(newArray);
            usersDataCreate = newArray;
         }
         if (cars.length === 0) {
            let packageCustomization =
               await packageCustomizationService.getPackageCustomization(pkgId);
            console.log(usersDataCreate);
            for (let user of usersDataCreate) {
               let checkIfSub = await clientPackageService.checkIfClientIsSub(
                  user.id,
                  pkgId
               );
               if (checkIfSub) {
                  failedRows.push({ ...user, error: "already subscribed" });
                  failureCount++;
                  continue;
               } else {
                  let subscribe = await clientPackageService.immediateSubscribe(
                     {
                        PackageId: pkgId,
                        ClientId: user.id,
                     }
                  );
                  if (subscribe.statusCode) {
                     console.log(subscribe);

                     failedRows.push({ ...user, error: subscribe.message });

                     failureCount++;
                  } else {
                     await smsService.sendSms({
                        mobile: user.PhoneNumber,
                        message: packageCustomization.SMS
                           ? packageCustomization.SMS
                           : "You gained a subscription in helpoo",
                     });
                     successCount++;
                  }
               }
            }
            return {
               successCount,
               failureCount: failureCount,
               failedRows,
            };
         } else {
            let packageCustomization =
               await packageCustomizationService.getPackageCustomization(pkgId);
            // let successCount = 0;
            // let failureCount = 0;
            for (let i = 0; i < usersDataCreate.length; i++) {
               console.log(usersDataCreate.length);
               let user = usersDataCreate[i];
               let car = cars[i];
               console.log(user);
               console.log(car);
               if (!user) {
                  let carr = await carService.createCar({
                     ...car,
                  });
                  if (carr.statusCode) {
                     console.log(carr);
                     failedRows.push({ ...data[i], error: carr.message });
                     failureCount++;
                     continue;
                  } else {
                     await PendingCarsPackage.create({
                        carId: carr.id,
                        pkgId: pkgId,
                     });
                  }
                  successCount++;
                  continue;
               } else {
                  let checkIfSub = null;
                  // await clientPackageService.checkIfClientIsSub(
                  //    user.id,
                  //    pkgId
                  // );
                  if (car.insuranceCompanyId) {
                     // car["packageId"] = pkgId;
                     let carr = await carService.addNewCar(user.id, car);
                     if (checkIfSub) {
                        await clientPackageService.subscribeCarPackage({
                           packageId: pkgId,
                           clientId: user.id,
                           clientPackageId: clientPackageService.id,
                           carId: carr.id,
                        });
                        successCount += 1;
                        continue;
                     } else {
                        let subscribe =
                           await clientPackageService.immediateSubscribe({
                              PackageId: pkgId,
                              ClientId: user.id,
                           });
                        if (subscribe.statusCode) {
                           console.log(subscribe);

                           failedRows.push({
                              ...data[i],
                              error: subscribe.message,
                           });
                           failureCount++;
                        } else {
                           await clientPackageService.subscribeCarPackage({
                              packageId: pkgId,
                              clientId: user.id,
                              carId: carr.id,
                              clientPackageId: subscribe.id,
                           });
                           let insuranceCompany =
                              await InsuranceCompany.findByPk(
                                 car.insuranceCompanyId
                              );
                           if (role === "Broker") {
                              await smsService.sendSms({
                                 mobile: user.PhoneNumber,
                                 message: packageCustomization.SMS
                                    ? packageCustomization.SMS
                                    : "You gained a subscription in helpoo",
                              });
                              await smsService.sendSms({
                                 mobile: user.PhoneNumber,
                                 message:
                                    "تسهيلا لسيادتكم، برجاء عمل الاخطار في حالة حدوث تلفيات، فور وقوعها، من خلال تطبيق هلبو او الاتصال علي 17000",
                              });
                           } else if (role === "Insurance") {
                              await smsService.sendSms({
                                 mobile: user.PhoneNumber,
                                 message: packageCustomization.SMS
                                    ? packageCustomization.SMS
                                    : "You gained a subscription in helpoo",
                              });
                              await smsService.sendSms({
                                 mobile: user.PhoneNumber,
                                 message: `تم اصدار وثيقة تأمين رقم ${car.policyNumber} من قبل شركة ${insuranceCompany.ar_name}`,
                              });
                              await smsService.sendSms({
                                 mobile: user.PhoneNumber,
                                 message:
                                    "تسهيلا لسيادتكم، برجاء عمل الاخطار في حالة حدوث تلفيات، فور وقوعها، من خلال تطبيق هلبو او الاتصال علي 17000",
                              });
                           } else {
                              await smsService.sendSms({
                                 mobile: user.PhoneNumber,
                                 message: packageCustomization.SMS
                                    ? packageCustomization.SMS
                                    : "You gained a subscription in helpoo",
                              });
                           }
                           if (carr.statusCode) {
                              console.log(carr);

                              failedRows.push({
                                 ...data[i],
                                 error: carr.message,
                              });
                              failureCount++;
                           } else {
                              successCount++;
                           }
                        }
                     }
                  } else {
                     let carr = await carService.createCar({
                        ...car,
                        ClientId: user.id,
                     });
                     if (carr.statusCode) {
                        console.log(carr);
                        failedRows.push({ ...data[i], error: carr.message });
                        failureCount++;
                        continue;
                     } else {
                        if (checkIfSub) {
                           await clientPackageService.subscribeCarPackage({
                              packageId: pkgId,
                              clientId: user.id,
                              clientPackageId: checkIfSub.id,
                              carId: carr.id,
                           });
                           successCount += 1;
                           continue;
                        } else {
                           let subscribe =
                              await clientPackageService.immediateSubscribe({
                                 PackageId: pkgId,
                                 ClientId: user.id,
                              });
                           if (subscribe.statusCode) {
                              console.log(subscribe);
                              failedRows.push({
                                 ...data[i],
                                 error: subscribe.message,
                              });
                              failureCount++;
                           } else {
                              await clientPackageService.subscribeCarPackage({
                                 packageId: pkgId,
                                 clientId: user.id,
                                 clientPackageId: subscribe.id,
                                 carId: carr.id,
                              });
                              await smsService.sendSms({
                                 mobile: user.PhoneNumber,
                                 message: packageCustomization.SMS
                                    ? packageCustomization.SMS
                                    : "You gained a subscription in helpoo",
                              });
                              successCount++;
                           }
                        }
                     }
                  }
               }
            }
         }
         return {
            successCount,
            failureCount: failureCount,
            failedRows,
         };
      } catch (err) {
         console.log(err);
         throw new AppError(err.message, 500);
      }
   }
   async registerOneUser() {}
}

const integrationPackages = new IntegrationPackages();
module.exports = integrationPackages;
