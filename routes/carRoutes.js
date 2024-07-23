const express = require("express");
const catchAsync = require("../utils/catchAsync");
const userService = require("../services/userService");
const carService = require("../services/carService");
const clientService = require("../services/clientService");
const auth = require("../middlewares/auth");
const restricted = require("../middlewares/restriction");
const router = express.Router();
const RolesEnum = require("../enums/Roles");
const clientPackageService = require("../services/ClientPackageService");
const smsService = require("../services/smsService");
const insuranceCompany = require("../services/InsuranceCompany");
const moment = require("moment");
const AppError = require("../utils/AppError");

router.get(
   "/policies/:insuranceCompanyId",
   auth,
   restricted(
      RolesEnum.Admin,
      RolesEnum.Insurance,
      RolesEnum.Broker,
      RolesEnum.Super,
      RolesEnum.Supervisor
   ),
   catchAsync(async (req, res, next) => {
      const insuranceCompanyId = req.params.insuranceCompanyId;
      const cars = await carService.getInsuranceCars(
         Number(insuranceCompanyId)
      );
      res.status(200).json({
         status: "success",
         ...cars,
      });
   })
);

router.patch(
   "/policies/cancelPolicy/:carId",
   auth,
   restricted(
      RolesEnum.Admin,
      RolesEnum.Insurance,
      RolesEnum.Broker,
      RolesEnum.Super,
      RolesEnum.Supervisor
   ),
   catchAsync(async (req, res, next) => {
      const id = req.params.carId;
      await carService.cancelCarPolicy(Number(id));
      res.status(200).json({
         status: "success",
      });
   })
);

router.post(
   "/create",
   auth,
   restricted(
      RolesEnum.Admin,
      RolesEnum.Insurance,
      RolesEnum.Broker,
      RolesEnum.Super,
      RolesEnum.Supervisor
   ),
   /* validate(validation.carValidation), */ catchAsync(
      async (req, res, next) => {
         /*
        #swagger.parameters['create car'] = {
            in: 'body',
            schema: {
                $phoneNumber: "01254525454865",
                $email: "test@email.com",
                $name: "test",
                $car: {
                    $plateNumber: "123456",
                    $vinNumber: "123456",
                    $insuranceCompanyId: 1,
                    $policyNumber: "123456",
                    $policyEnds: "2021-01-01",
                    $appendix_number: "123456",
                    $packageId: 1,
                }
            }
        }
    */
         const { car, phoneNumber, email, name } = req.body;
         const data = await userService.findUserByPhoneNumber(phoneNumber);

         if (!data.statusCode) {
            if (req.user.Role.name === "Broker") {
               let userData = await userService.findUserRoleData(
                  req.user,
                  req.user.Role.name
               );
               car["BrokerId"] = userData.id;
            }
            const newCar = await carService.addNewCar(data.client.id, car);

            if (newCar.statusCode) {
               return next(newCar);
            } else {
               const date = moment(newCar.policyEnds).format("YYYY/MM/DD");
               const insurance = await insuranceCompany.getInsurance(
                  newCar.insuranceCompanyId
               );
               const sendSms = await smsService.sendSms({
                  mobile: phoneNumber,
                  message: `تم اصدار وثيقة تأمين رقم ${newCar.policyNumber} من قبل شركة ${insurance.ar_name} للتأمين صالحة حتى تاريخ ${date}`,
               });
               const sendSms2 = await smsService.sendSms({
                  mobile: phoneNumber,
                  message: `برجاء تحميل برنامج هلبو لخدمات الطريق و عمل اخطار الحادث من خلال الرابط التالي helpoo.co`,
               });
               const sendSms3 = await smsService.sendSms({
                  mobile: phoneNumber,
                  message: `تسهيلا لسيادتكم، برجاء عمل الاخطار في حالة حدوث تلفيات، فور وقوعها، من خلال تطبيق هلبو او الاتصال علي 17000`,
               });

               res.status(201).json({
                  status: "success",
                  car: newCar,
               });
            }
         } else if (data.message === "client not found") {
            return next(new AppError("this user isn't a client", 400));
         } else {
            const UserData = await userService.createUser({
               identifier: phoneNumber,
               name: name,
               email,
            });
            if (UserData.statusCode) {
               return next(UserData);
            } else {
               const newCar = await carService.addNewCar(UserData.user.id, car);
               if (newCar.statusCode) {
                  return next(newCar);
               } else {
                  const date = moment(newCar.policyEnds).format("YYYY/MM/DD");
                  const insurance = await insuranceCompany.getInsurance(
                     newCar.insuranceCompanyId
                  );
                  const sendSms = await smsService.sendSms({
                     mobile: phoneNumber,
                     message: `تم اصدار وثيقة تأمين رقم ${newCar.policyNumber} من قبل شركة ${insurance.ar_name} للتأمين صالحة حتى تاريخ ${date}`,
                  });
                  const sendSms2 = await smsService.sendSms({
                     mobile: phoneNumber,
                     message: `برجاء تحميل برنامج هلبو لخدمات الطريق و عمل اخطار الحادث من خلال الرابط التالي helpoo.co`,
                  });
                  const sendSms3 = await smsService.sendSms({
                     mobile: phoneNumber,
                     message: `تسهيلا لسيادتكم، برجاء عمل الاخطار في حالة حدوث تلفيات، فور وقوعها، من خلال تطبيق هلبو او الاتصال علي 17000`,
                  });

                  res.status(201).json({
                     status: "success",
                     car: newCar,
                  });
               }
            }
         }
      }
   )
);

router.get(
   "/myCars",
   auth,
   catchAsync(async (req, res, next) => {
      const id = req.user.id;
      const client = await clientService.getClientByUserId(id);
      if (client.statusCode) return next(client);
      else {
         const cars = await carService.getUserCars(client.id);
         const packages = await clientPackageService.getClientPackages(
            client.id
         );
         res.status(200).json({
            status: "success",
            cars,
            packages,
         });
      }
   })
);

router.post(
   "/addCar",
   auth,
   restricted(
      RolesEnum.Admin,
      RolesEnum.Super,
      RolesEnum.Corporate,
      RolesEnum.CallCenter,
      RolesEnum.Client
   ),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['Add car'] = {
            in: 'body',
            schema: {
                $plateNumber: "123456",
                $vin_number: "123456",
                $ClientId: 1,
                $insuranceCompanyId: 1,
                $policyNumber: "123456",
                $policyEnds: "2021-01-01",
                $appendix_number: "123456",
            }
        }
    */
      const id = req.user.id;
      if (req.user.Role.name == RolesEnum.Client) {
         const create = await carService.createCar(req.body, id);
         const cars = await carService.getClientsCar(req.body);
         if (create.statusCode) {
            res.status(create.statusCode).json({
               status: "failed",
               msg: res.__(create.message),
               cars,
            });
         } else
            res.status(201).json({
               status: "success",
               cars,
               newCar: create,
            });
      } else if (
         req.user.Role.name == RolesEnum.Super ||
         req.user.Role.name == RolesEnum.Admin ||
         req.user.Role.name == RolesEnum.CallCenter
      ) {
         let phoneNumber = req.body.phoneNumber;
         if (!phoneNumber) {
            return next(new AppError("Provide a phoneNumber", 400));
         } else {
            phoneNumber = phoneNumber.startsWith("0")
               ? `+2${phoneNumber}`
               : phoneNumber;
            const car = await carService.adminCreateCar(
               phoneNumber,
               req.body,
               id
            );
            if (car.statusCode) {
               return next(car);
            } else
               res.status(200).json({
                  status: "success",
                  ...car,
               });
            // }
         }
      } else {
         // if (req.user.Role.name == RolesEnum.Corporate) {

         let phoneNumber = req.body.phoneNumber;
         if (!phoneNumber) {
            return next(new AppError("Provide a phoneNumber", 400));
         } else {
            phoneNumber = phoneNumber.startsWith("0")
               ? `+2${phoneNumber}`
               : phoneNumber;
            const car = await carService.corporateCar(
               phoneNumber,
               req.body,
               id
            );
            if (car.statusCode) {
               return next(car);
            } else
               res.status(200).json({
                  status: "success",
                  ...car,
               });
            // }
         }
      }
   })
);

router.get(
   "/getAllCars",
   auth,
   restricted(RolesEnum.Admin, RolesEnum.Super),
   catchAsync(async (req, res, next) => {
      let { page, size } = req.query;
      page = page || 1;
      size = size || 10;
      const cars = await carService.getAllCars(page, size);
      res.status(200).json({
         status: "success",
         ...cars,
      });
   })
);

router.post(
   "/confirmAndActivate/:id",
   auth,
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['confirm and activate car'] = {
            in: 'body',
            schema: {
                $clientId: 1,
                $insuranceCompanyId: 1,
                $policyNumber: "123456",
                $policyEnds: "2021-01-01",
                $appendix_number: "123456",
                $plateNumber: "123456",
                $vin_number: "123456",
                $fl: "image Base64",
                $bl: "image Base64",
            }
        }
    */
      const car = await carService.confirmAndActivateCar(
         req.params.id,
         req.body.clientId,
         req.body.insuranceCompanyId,
         req.body
      );
      if (car.statusCode) return next(car);
      else
         res.status(200).json({
            status: "success",
            car,
         });
   })
);

router.get(
   "/getCar/:id",
   auth,
   catchAsync(async (req, res, next) => {
      const id = Number(req.params.id);
      const car = await carService.getCar(id);
      if (car.statusCode) {
         return next(car);
      } else
         res.status(200).json({
            status: "success",
            car: car,
         });
   })
);

router.get(
   "/getCarByPlate/:plateNo",
   auth,
   restricted(
      RolesEnum.Admin,
      RolesEnum.CallCenter,
      RolesEnum.Super,
      RolesEnum.Corporate
   ),
   catchAsync(async (req, res, next) => {
      const car = await carService.getCarByPlateNumber(req.params.plateNo);
      res.status(200).json({
         status: "success",
         car,
      });
   })
);

router.get(
   "/getCarByUserPhone/:phone",
   auth,
   restricted(
      RolesEnum.Admin,
      RolesEnum.Super,
      RolesEnum.CallCenter,
      RolesEnum.Corporate
   ),
   catchAsync(async (req, res, next) => {
      const car = await carService.getUserCarsByPhone(req.params.phone);
      res.status(200).json({
         status: "success",
         car,
      });
   })
);

router.delete(
   "/deleteMyCar/:id",
   auth,
   catchAsync(async (req, res, next) => {
      let carId = req.params.id;
      let client = await clientService.getClientByUserId(req.user.id);

      let car = await carService.deleteCarForClient(carId, client.id);
      if (car.statusCode) return next(car);
      else
         res.status(204).json({
            status: "deleted",
            car,
         });
   })
);

router.post(
   "/getCarByVinNumber",
   auth,
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['get car by vin number'] = {
            in: 'body',
            schema: {
                $vinNo: "123456",
                $insuranceCompanyId: 1,
                $clientId: 1,
            }
        }
    */
      const { insuranceCompanyId, vinNo, clientId } = req.body;
      if (req.user.Role.name === "Client") {
         if (!vinNo || !insuranceCompanyId || !clientId) {
            return next(
               new AppError(
                  "Provide chassis , insuranceCompanyId and ClientId",
                  400
               )
            );
         }
      }
      if (!vinNo || !insuranceCompanyId) {
         return next(
            new AppError("Provide chassis and insuranceCompanyId", 400)
         );
      }
      const car = await carService.getCarByVinNumber(
         vinNo,
         insuranceCompanyId,
         Number(clientId)
      );
      console.log("================= car =================");
      console.log(car);
      if (car.statusCode) {
         return next(car);
      }
      res.status(200).json({
         status: "success",
         car,
      });
   })
);

router.patch(
   "/updateCar/:id",
   auth,
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['update car'] = {
            in: 'body',
            schema: {
                $vin_number: "123456",
                $plateNumber: "123456",
                $insuranceCompanyId: 1,
                $policyNumber: "123456",
                $policyEnds: "2021-01-01",
                $appendix_number: "123456",
                $fl: "image Base64",
                $bl: "image Base64",
                $active: true,
            }
        }
    */
      const id = Number(req.params.id);
      const car = await carService.updateCar(id, req.body);
      const cars = await carService.getClientsCar(req.body);
      // console.log(car);
      if (car.statusCode) {
         return next(car);
      } else
         res.status(200).json({
            status: "success",
            cars,
         });
   })
);

module.exports = router;
