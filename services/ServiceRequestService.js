// NPM Lib
const moment = require("moment");
const { Op } = require("sequelize");
const sequelize = require("sequelize");
const cron = require("node-cron");
// Utils
const AppError = require("../utils/AppError");

// Models
const ServiceRequest = require("../models/ServiceRequest");
const ClientPackage = require("../models/ClientPackage");
const CorporateCompany = require("../models/CorporateCompany");
const Car = require("../models/Car");
const Client = require("../models/Client");
const Driver = require("../models/Driver");
const ServiceRequestPhotos = require("../models/ServiceRequestPhotos");
const CarServiceType = require("../models/CarServiceType");
const Types = require("../models/Types");
const Manufacturer = require("../models/Manufacturer");
const CarModel = require("../models/CarModel");
const Vehicle = require("../models/Vehicle");
const VehicleTypes = require("../models/VehicleType");
const User = require("../models/User");
const InsuranceCompany = require("../models/InsuranceCompany");
const CarPackage = require("../models/CarPackage");
const Roles = require("../models/Roles");
const Package = require("../models/Package");
const Config = require("../models/Config");
const TrackingLogs = require("../models/TrackingLogs");
const MonthlyTrackingLogs = require("../models/MonthlyTrackingLogs");

// Services
const carService = require("./carService");
const corporateCompanyService = require("./CorporateCompanyService");
const clientService = require("./clientService");
const driverService = require("./DriverService");
const discountService = require("./service_requests/DiscountService");
const originalFees = require("./service_requests/originalFees");
const fcm = require("../services/FcmFunctions");
const Branches = require("../models/Branches");
const smsService = require("./smsService");

class ServiceRequestService {
   async createRequest(data) {
      let discount = 0;
      let discountPercentage = 0;
      let fees = data.original_fees;
      let clientPackages = undefined;
      let car;
      if (data.carId) {
         car = await carService.getCar(data.carId);
         if (car.statusCode) {
            return car;
         }
         if (!car.active) {
            return new AppError(
               "Please active the car before creating a service request",
               400
            );
         }
      }
      let insuranceDiscount = 0;
      let packageDiscount = 0;
      let promoDiscount = 0;
      let used_count = [];
      let clientPackageId = null;
      let PromoCodeUserId = null;
      const carServiceTypeId = JSON.parse(data.carServiceTypeId);
      //insurance Discount
      // if (car.insuranceCompany) {
      //   used_count = await this.findOldRequests(
      //     data.carId,
      //     car.insuranceCompany.policy_start_date,
      //     car.insuranceCompany.policy_end_date
      //   );
      //   insuranceDiscount = await discountService.calculateInsuranceDiscount(
      //     car,
      //     data.original_fees,
      //     used_count.length
      //   );
      // }
      if (carServiceTypeId.includes(6)) {
         if (!data.parentRequest) {
            return new AppError(
               "Please specify the parent request id for passenger vehicle",
               400
            );
         }
      }
      let client = await clientService.getClientById(data.clientId);
      if (client.statusCode) return client;
      if (data.carId) {
         const check = await this.checkIfClientHasAReq(client, car?.id);
         if (check)
            return new AppError(
               "This client has unfinished request in this car",
               400
            );
      }

      if (!data.corporateId) {
         //for promo code
         let promoDiscountRes = await discountService.calculatePromoDiscount(
            client,
            data.original_fees
         );
         promoDiscount = promoDiscountRes.discount;
         PromoCodeUserId = promoDiscountRes.promoCodeUserId;
         // for client package
         // clientPackages = await clientPackageService.getClientPackages(
         //   data.clientId
         // );
         // let packageDiscount = await discountService.calculatePackageDiscount(
         //   clientPackages,
         //   data.original_fees
         // );
         if (car?.CarPackages && car?.CarPackages.length > 0) {
            let carPackages = car.CarPackages;
            let carrier = [4, 5];
            let van = [1, 2, 3];
            let passenger = [6];
            let services;
            const isSubsetFromCarrier = carServiceTypeId?.every((element) =>
               carrier.includes(Number(element))
            );
            const isSubsetFromVan = carServiceTypeId?.every((element) =>
               van.includes(Number(element))
            );

            if (isSubsetFromCarrier) {
               services = carrier;
            }
            if (isSubsetFromVan) {
               services = van;
            }
            if (data.carId) {
               for (let i = 0; i < carPackages.length; i++) {
                  used_count = await this.findOldRequests(
                     data.carId,
                     // carPackages[i].ClientPackage.startDate,
                     // carPackages[i].ClientPackage.endDate,
                     carPackages[i].ClientPackage.id,
                     services
                  );

                  // if(used_count.length >= carPackages[i].ClientPackage.Package.numberOfDiscountTimes){
                  //   continue;
                  // }
                  let currPackageDiscount =
                     await discountService.calculatePackageDiscount(
                        carPackages[i].ClientPackage,
                        data.original_fees,
                        used_count.length,
                        services
                     );
                  if (currPackageDiscount.discount > promoDiscount) {
                     packageDiscount = currPackageDiscount.discount;
                     clientPackageId = carPackages[i].ClientPackage.id;
                     break;
                  }
               }
            }
         }
         discount = parseInt(
            Math.max(insuranceDiscount, promoDiscount, packageDiscount)
         );
         if (discount !== promoDiscount) {
            PromoCodeUserId = null;
         }
         if (discount !== packageDiscount) {
            clientPackageId = null;
         }
         discountPercentage = parseInt(
            Math.ceil((discount * 100) / data.original_fees)
         );
         // if (data.createdByUser === client.User.id) {

         // }
         fees = parseInt(data.original_fees - discount);
      } else {
         let corporateDiscount =
            await discountService.calculateDiscountAsCorporate(data);
         discount = parseInt(
            Math.max(corporateDiscount.discount, insuranceDiscount)
         );
         discountPercentage =
            discount === corporateDiscount.discount
               ? corporateDiscount.discountPercentage
               : parseInt((discount * 100) / data.original_fees);
         fees = parseInt(data.original_fees - discount);
      }
      let corporate = undefined;
      if (data.corporateId) {
         corporate = await corporateCompanyService.getACorporate(
            data.corporateId
         );
      }
      try {
         let request = await ServiceRequest.create({
            PromoCodeUserId,
            name: client.User.name,
            PhoneNumber: client.User.username,
            location: data.location,
            status: "open",
            fees,
            startTime: new Date(),
            // order_id: clientPackage ? clientPackage.order_id : null,
            order_id: null,
            originalFees: data.original_fees,
            discount,
            discountPercentage,
            policyAndPackage: car?.insuranceCompany
               ? {
                    status: "ok",
                    policy_end: car.policyEnds,
                    used_count: used_count.length,
                    policy_start: car.policyStarts,
                    policy_number: car.policyNumber,
                    policy_canceled: car.policyCanceled,
                    max_total_discount: car.insuranceCompany.max_total_discount,
                    package_request_count:
                       car.insuranceCompany.package_request_count,
                    package_discount_percentage:
                       car.insuranceCompany.package_discount_percentage,
                    discount_percent_after_policy_expires:
                       car.insuranceCompany
                          .discount_percent_after_policy_expires,
                 }
               : {},
            ClientPackageId: clientPackageId,
            CorporateCompanyId: data.corporateCompany
               ? data.corporateCompany
               : undefined,
            CarId: data.carId ? data.carId : null,
            clientId: data.clientId,
            createdByUser: data.createdByUser
               ? data.createdByUser
               : client.User.id,
            paymentMethod: data.paymentMethod,
            paymentStatus: data.paymentStatus,
            BranchId: data.BranchId ? data.BranchId : undefined,
            parentRequest: data.parentRequest,
         });
         for (let i = 0; i < carServiceTypeId.length; i++) {
            let createReports = await Types.create({
               ServiceRequestId: request.id,
               CarServiceTypeId: carServiceTypeId[i],
            });
         }

         let sentRequest = await ServiceRequest.findByPk(request.id, {
            include: [
               Car,
               Client,
               { model: CarServiceType },
               {
                  model: User,
               },
            ],
         });
         sentRequest = sentRequest.get({ plain: true });

         return {
            request: [sentRequest],
            corporate: corporate ? corporate.en_name : "",
         };
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 500);
      }
   }
   async createRequestOtherServices(data) {
      let discount = 0;
      let discountPercentage = 0;
      let fees = data.original_fees;
      let clientPackages = undefined;
      let car = await carService.getCar(data.carId);
      let insuranceDiscount = 0;
      let packageDiscount = 0;
      let promoDiscount = 0;
      let used_count = [];
      let clientPackageId = null;
      let PromoCodeUserId = null;

      const carServiceTypeId = Object.keys(data.services);

      let client = await clientService.getClientById(data.clientId);
      if (client.statusCode) return client;

      if (!data.corporateId) {
         let promoDiscountRes = await discountService.calculatePromoDiscount(
            client,
            data.original_fees
         );
         promoDiscount = promoDiscountRes.discount;
         PromoCodeUserId = promoDiscountRes.promoCodeUserId;
         if (car.CarPackages && car.CarPackages.length > 0) {
            let carPackages = car.CarPackages;
            let carrier = [4, 5];
            let van = [1, 2, 3];
            let passenger = [6];

            let services;
            const isSubsetFromCarrier = carServiceTypeId?.every((element) =>
               carrier.includes(Number(element))
            );
            const isSubsetFromVan = carServiceTypeId?.every((element) =>
               van.includes(Number(element))
            );

            if (isSubsetFromCarrier) {
               services = carrier;
            }
            if (isSubsetFromVan) {
               services = van;
            }

            for (let i = 0; i < carPackages.length; i++) {
               // console.log(moment(carPackages[i].createdAt));
               // console.log(
               //    carPackages[i].ClientPackage.Package.insuranceCompanyId
               // );
               if (
                  !carPackages[i].ClientPackage.Package.insuranceCompanyId &&
                  moment(carPackages[i].createdAt).add(5).isAfter(moment())
               ) {
                  continue;
               }
               used_count = await this.findOldRequests(
                  data.carId,
                  carPackages[i].ClientPackage.id,
                  services
               );

               let currPackageDiscount =
                  await discountService.calculatePackageDiscount(
                     carPackages[i].ClientPackage,
                     data.original_fees,
                     used_count.length,
                     services
                  );
               if (currPackageDiscount.discount > promoDiscount) {
                  packageDiscount = currPackageDiscount.discount;
                  clientPackageId = carPackages[i].ClientPackage.id;
                  break;
               }
            }
         }
         discount = parseInt(
            Math.max(insuranceDiscount, promoDiscount, packageDiscount)
         );
         if (discount !== promoDiscount) {
            PromoCodeUserId = null;
         }
         if (discount !== packageDiscount) {
            clientPackageId = null;
         }
         discountPercentage = parseInt(
            Math.ceil((discount * 100) / data.original_fees)
         );

         fees = parseInt(data.original_fees - discount);
      } else {
         let corporateDiscount =
            await discountService.calculateDiscountAsCorporate(data);
         discount = parseInt(
            Math.max(corporateDiscount.discount, insuranceDiscount)
         );
         discountPercentage =
            discount === corporateDiscount.discount
               ? corporateDiscount.discountPercentage
               : parseInt((discount * 100) / data.original_fees);
         fees = parseInt(data.original_fees - discount);
      }
      let corporate = undefined;
      if (data.corporateId) {
         corporate = await corporateCompanyService.getACorporate(
            data.corporateId
         );
      }
      try {
         let request = await ServiceRequest.create({
            PromoCodeUserId,
            name: client.User.name,
            PhoneNumber: client.User.username,
            location: data.location,
            status: "open",
            fees,
            startTime: new Date(),
            // order_id: clientPackage ? clientPackage.order_id : null,
            order_id: null,
            originalFees: data.original_fees,
            discount,
            discountPercentage,
            policyAndPackage: car.insuranceCompany
               ? {
                    status: "ok",
                    policy_end: car.policyEnds,
                    used_count: used_count.length,
                    policy_start: car.policyStarts,
                    policy_number: car.policyNumber,
                    policy_canceled: car.policyCanceled,
                    max_total_discount: car.insuranceCompany.max_total_discount,
                    package_request_count:
                       car.insuranceCompany.package_request_count,
                    package_discount_percentage:
                       car.insuranceCompany.package_discount_percentage,
                    discount_percent_after_policy_expires:
                       car.insuranceCompany
                          .discount_percent_after_policy_expires,
                 }
               : {},
            ClientPackageId: clientPackageId,
            CorporateCompanyId: data.corporateCompany
               ? data.corporateCompany
               : undefined,
            CarId: data.carId,
            clientId: data.clientId,
            createdByUser: data.createdByUser
               ? data.createdByUser
               : client.User.id,
            paymentMethod: data.paymentMethod,
            paymentStatus: data.paymentStatus,
            BranchId: data.BranchId ? data.BranchId : undefined,
            fuelServcieUsage: data.services[1],
            tiresServcieUsage: data.services[2],
         });
         for (let i = 0; i < carServiceTypeId.length; i++) {
            let createReports = await Types.create({
               ServiceRequestId: request.id,
               CarServiceTypeId: carServiceTypeId[i],
            });
         }

         let sentRequest = await ServiceRequest.findByPk(request.id, {
            include: [
               Car,
               Client,
               { model: CarServiceType },
               {
                  model: User,
               },
            ],
         });
         sentRequest = sentRequest.get({ plain: true });

         return {
            request: [sentRequest],
            corporate: corporate ? corporate.en_name : "",
         };
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 500);
      }
   }
   async checkIfClientHasAReq(client, carId) {
      let user = await User.findOne({
         where: {
            id: client.UserId,
         },
      });
      let where = {
         createdByUser: user.id,
         status: {
            [Op.notIn]: ["canceled", "cancelWithPayment", "done"],
         },
      };
      if (carId) {
         where["CarId"] = carId;
      }

      let request = await ServiceRequest.findOne({
         where,
         include: [
            {
               model: ClientPackage,
            },
            {
               model: CorporateCompany,
            },
            {
               model: Car,
               include: [CarModel, Manufacturer, InsuranceCompany],
            },
            {
               model: Client,
               include: [User],
            },
            {
               model: Driver,
               include: [User],
            },
            {
               model: User,
            },
         ],
      });

      if (request) {
         request = request.get({ plain: true });
         let location;
         let checkIf = await ServiceRequest.findOne({
            where: {
               DriverId: request.DriverId,
               id: {
                  [Op.ne]: request.id,
               },
               status: {
                  [Op.notIn]: ["done", "canceled", "cancelWithPayment"],
               },
            },
         });
         checkIf
            ? (location = {
                 latitude: checkIf.location.destinationLat,
                 longitude: checkIf.location.destinationLng,
              })
            : (location = undefined);
         return {
            request: request,
            location: location,
         };
      }
      return null;
   }
   async searchInRequests(id, name, mobile) {
      let where = {};
      let whereClient = {};
      if (id) {
         where["id"] = id;
      }
      if (name) {
         where["name"] = {
            [Op.or]: { [Op.substring]: name, [Op.eq]: name },
         };
      }
      if (mobile) {
         // whereClient['username'] = { [Op.substring]: mobile };
         where["PhoneNumber"] = {
            [Op.or]: { [Op.substring]: mobile, [Op.eq]: mobile },
         };
      }
      let requests = await ServiceRequest.findAll({
         where: {
            [Op.or]: where,
         },
         include: [
            {
               model: ClientPackage,
               include: [Package],
            },
            {
               model: CorporateCompany,
            },
            {
               model: Car,
               include: [CarModel, Manufacturer, InsuranceCompany],
            },
            {
               model: Client,
               include: [
                  {
                     model: User,
                     // where: whereClient,
                  },
               ],
            },
            {
               model: Driver,
               include: [User],
            },
            {
               model: User,
            },
            {
               model: Vehicle,
               include: [VehicleTypes],
            },
            {
               model: CarServiceType,
            },
            {
               model: ServiceRequestPhotos,
            },
            {
               model: Branches,
            },
         ],
      });
      return requests;
   }
   async getAllOpenRequests() {
      let requests = await ServiceRequest.findAll({
         where: {
            status: {
               [Op.notIn]: ["canceled", "done", "cancelWithPayment"],
            },
         },
         indexes: [{ name: "servicerequest_createuserandstatus_idx" }],
         include: [
            {
               model: ClientPackage,
               include: [Package],
            },
            {
               model: CorporateCompany,
            },
            {
               model: Car,
               include: [CarModel, Manufacturer, InsuranceCompany],
            },
            {
               model: Client,
               include: [User],
            },
            {
               model: Driver,
               include: [User],
            },
            {
               model: User,
            },
            {
               model: Vehicle,
               include: [VehicleTypes],
            },
         ],
      });
      //  if (request) {
      // request = request.get({ plain: true });
      return requests;
      //  }

      //  return null;
   }

   async findOldRequests(
      carId,
      /* policy_start_date, policy_end_date, */ packageId,
      services
   ) {
      const oldRequests = await ServiceRequest.findAll({
         where: {
            CarId: carId,
            status: "done",
            ClientPackageId: packageId,
            // createdAt: {
            //    [Op.between]: [policy_start_date, policy_end_date],
            // },
         },
         include: [
            {
               model: CarServiceType,
               where: {
                  id: {
                     [Op.in]: services,
                  },
               },
            },
         ],
      });
      return oldRequests;
   }
   async updatePayment(data) {
      try {
         let request = await ServiceRequest.update(
            {
               paymentMethod: data.paymentMethod,
               paymentStatus: data.paymentStatus,
               PaymentResponse: data.PaymentResponse,
            },
            {
               where: {
                  id: data.id,
               },
            }
         );
         request = await ServiceRequest.findByPk(data.id);
         return request;
      } catch (error) {
         return new AppError(error, 500);
      }
   }

   async requestReject(requestId, driverId) {
      if (!requestId || !driverId)
         return new AppError(
            "Missing Data , Please Check sending requestId and driverId",
            400
         );
      // Check if the request exist
      // get the driver
      let driver = await Driver.findByPk(driverId, { include: User });
      // get driver plain to control the data
      driver = driver.get({ plain: true });
      // get request and vehicle
      let request = await ServiceRequest.findByPk(requestId, {
         include: [Driver, { model: CarServiceType }],
      });
      if (!request) return new AppError("No Request with this id", 400);
      if (!driver) return new AppError("No Driver with this id", 400);
      await ServiceRequest.update(
         {
            reject: true,
            driverRejectId: driverId,
         },
         {
            where: {
               id: requestId,
            },
         }
      );
      request = await ServiceRequest.findByPk(requestId);
      return request;
   }

   async approvedReject(requestId) {
      let driverChange = await driverService.changeDriver(requestId);
      let driver;
      let request = await ServiceRequest.findByPk(requestId);
      if (driverChange.statusCode) {
         // continue;
         // fcm.sendNotification(driver.fcmtoken, 'helpoo', 'تم استقبال طلب جديد');
         let update = await ServiceRequest.update(
            {
               status: "not_available",
               DriverId: null,
               VehicleId: null,
            },
            {
               where: {
                  id: requestId,
               },
            }
         );
         return driverChange;
      } else {
         driver = driverChange.driver;
         let newDestination = await originalFees.getCalculateDistance(
            driverChange.distance,
            request.location.destinationDistance
         );
         if (
            request.location.destinationDistance.distance.value >=
            newDestination.distance.value
         ) {
         } else {
            let newOriginalFees = await originalFees.getOriginalFees(
               driverChange.carServiceTypeIds,
               driverChange.distance,
               newDestination
            );
            let discount = request.discountPercentage
               ? request.discountPercentage
               : 0;
            let newFees = newOriginalFees - (discount * newOriginalFees) / 100;
            request.location.calculatedDistance = newDestination;
            if (newFees > Number(request.fees) * 1.25) {
               let location = request.location;
               await ServiceRequest.update(
                  {
                     fees: newFees,
                     originalFees: newOriginalFees,
                     location,
                  },
                  {
                     where: {
                        id: request.id,
                     },
                  }
               );
            } else {
            }
         }
      }
      fcm.sendNotification(
         driverChange.driver.fcmtoken,
         "helpoo",
         "تم استقبال طلب جديد"
      );
      request = await ServiceRequest.findByPk(requestId);
      return {
         request,
         ...driverChange,
      };
   }

   async refuseReject(requestId) {
      if (!requestId)
         return new AppError(
            "Missing Data , Please Check sending requestId",
            400
         );
      // Check if the request exist
      // get the driver
      // get request and vehicle
      let request = await ServiceRequest.findByPk(requestId, {
         include: [Driver, { model: CarServiceType }],
      });
      if (!request) return new AppError("No Request with this id", 400);
      await ServiceRequest.update(
         {
            reject: false,
         },
         {
            where: {
               id: requestId,
            },
         }
      );
      request = await ServiceRequest.findByPk(requestId);
      return request;
   }

   async cancelRequest(requestID) {
      let requestCheck = await ServiceRequest.findByPk(requestID);

      if (!requestCheck) return new AppError("No request with this Id", 400);
      if (
         requestCheck.status !== "open" &&
         requestCheck.status !== "confirmed" &&
         requestCheck.status !== "accepted" &&
         requestCheck.status !== "pending" &&
         requestCheck.status !== "not_available"
      )
         return new AppError("You can't cancel this request!", 400);
      if (!requestCheck.DriverId) {
         let location = requestCheck.location;
         delete location?.calculatedDistance?.points;
         location?.firstUpdatedDistanceAndDuration
            ? delete location?.firstUpdatedDistanceAndDuration
            : undefined;
         location?.lastUpdatedDistanceAndDuration
            ? delete location?.lastUpdatedDistanceAndDuration
            : undefined;
         delete location?.acceptedWithTraffic?.points;
         delete location?.startedWithTraffic?.points;

         try {
            let request = await ServiceRequest.update(
               {
                  status: "canceled",
                  reject: false,
                  location,
               },
               {
                  where: {
                     id: requestID,
                  },
               }
            );
            request = await ServiceRequest.findByPk(requestID);
            return request;
         } catch (error) {
            return new AppError(error, 500);
         }
      }
      let checkIfHeHadAnother = await ServiceRequest.findOne({
         where: {
            DriverId: requestCheck.DriverId,
            status: {
               [Op.notIn]: ["done", "canceled", "cancelWithPayment"],
            },
            id: {
               [Op.ne]: requestID,
            },
         },
      });
      if (!checkIfHeHadAnother) {
         let reActiveDriver = await Driver.update(
            {
               available: true,
            },
            {
               where: {
                  id: requestCheck.DriverId,
               },
            }
         );
         let reActiveVehicle = await Vehicle.update(
            {
               available: true,
            },
            {
               where: {
                  Active_Driver: requestCheck.DriverId,
               },
            }
         );
      }
      let request = await ServiceRequest.update(
         {
            status: "canceled",
            reject: false,
         },
         {
            where: {
               id: requestID,
            },
         }
      );
      request = await ServiceRequest.findByPk(requestID);
      return request;
   }
   async getAllServiceRequests(
      page,
      size,
      sortBy,
      sortOrder,
      status,
      serviceType,
      clientType
   ) {
      let order = [];
      if (sortBy) {
         order.push([sortBy, sortOrder]);
      } else {
         order.push(["id", "DESC"]);
      }
      let where = {};
      if (status) {
         where["status"] = status;
      }
      let filterType = {};
      if (serviceType) {
         filterType["id"] = serviceType;
      }
      let roleType = {};
      if (clientType) {
         roleType["id"] = clientType;
      }
      const serviceRequests = await ServiceRequest.findAll({
         order,
         limit: size,
         offset: (page - 1) * size,
         include: [
            {
               model: ClientPackage,
               include: [Package],
            },
            {
               model: Vehicle,
               include: [VehicleTypes],
            },
            {
               model: CorporateCompany,
            },
            {
               model: Car,
            },
            {
               model: Client,
               include: [User],
            },
            {
               model: Driver,
               include: [User],
            },
            {
               model: User,
               include: {
                  model: Roles,
                  where: roleType,
               },
            },
            {
               model: ServiceRequestPhotos,
            },
            {
               model: CarServiceType,
               where: filterType,
            },
            {
               model: Branches,
            },
         ],
         where: where,
      });
      let counting = await ServiceRequest.count();
      const currentPage = page;
      const totalPages = Math.ceil(counting / size);
      return {
         totalData: counting,
         currentPage,
         totalPages,
         requests: serviceRequests,
      };
   }
   async getServiceRequestsBetDates(
      sDate,
      eDate,
      filterBy,
      ClientId,
      CorporateId,
      status
   ) {
      // let startDate = new Date(sDate + " 03:00:00");
      let startDate = moment(sDate).subtract(1, "h");
      let endDate = moment(eDate).add(1, "d").subtract(1, "h");

      let where = {
         createdAt: {
            [Op.between]: [startDate, endDate],
         },
      };
      if (status) {
         where["status"] = status;
      }
      if (filterBy) {
         switch (filterBy) {
            case "Clients":
               where["CorporateCompanyId"] = {
                  [Op.eq]: null,
               };
               break;
            case "Corporates":
               where["CorporateCompanyId"] = {
                  [Op.ne]: null,
               };
               break;
            default:
               break;
         }
      }
      if (ClientId) {
         where["clientId"] = ClientId;
      }
      if (CorporateId) {
         where["CorporateCompanyId"] = CorporateId;
      }
      const serviceRequests = await ServiceRequest.findAll({
         include: [
            {
               model: ClientPackage,
               attributes: ["id", "PackageId"],
               include: [Package],
            },
            {
               model: CorporateCompany,
            },
            {
               model: Car,
               include: [
                  {
                     model: Manufacturer,
                     attributes: ["id", "en_name", "ar_name"],
                  },
                  {
                     model: CarModel,
                     attributes: ["id", "en_name", "ar_name"],
                  },
               ],
            },
            {
               model: Client,
               attributes: ["id", "UserId"],
               include: [{ model: User, attributes: ["id", "name"] }],
            },
            {
               model: Driver,
               attributes: ["id", "UserId"],
               include: [
                  {
                     model: User,
                     attributes: ["id", "name"],
                  },
               ],
            },
            {
               model: User,
               attributes: ["id", "name", "RoleId"],
               include: [
                  {
                     model: Roles,
                     attributes: ["id", "name"],
                  },
               ],
            },
            {
               model: Vehicle,
               attributes: ["id", "Vec_num", "Vec_name"],
            },
            {
               model: Branches,
            },
         ],
         where: where,
         attributes: [
            "id",
            "createdAt",
            "status",
            "name",
            "PhoneNumber",
            "fees",
            "waitingFees",
            "isWaitingTimeApplied",
            "paymentMethod",
            "paymentStatus",
            "comment",
            "originalFees",
            "adminDiscount",
            "adminDiscountApprovedBy",
            "adminDiscountReason",
            "isAdminDiscountApplied",
            "adminComment",
            "discountPercentage",
            [
               sequelize.literal(
                  `"ServiceRequest"."location"->'clientAddress'`
               ),
               "clientAddress",
            ],
            [
               sequelize.literal(
                  `"ServiceRequest"."location"->'destinationAddress'`
               ),
               "destinationAddress",
            ],
         ],
      });
      return {
         requests: serviceRequests,
         totalCount: serviceRequests.length,
      };
   }
   async getAServiceRequest(serviceRequestId) {
      try {
         let serviceRequest = await ServiceRequest.findOne({
            where: {
               id: serviceRequestId,
            },
            include: [
               {
                  model: Vehicle,
                  include: [VehicleTypes],
               },
               {
                  model: ClientPackage,
                  include: [Package],
               },
               {
                  model: CorporateCompany,
               },
               {
                  model: Car,
                  include: [CarModel, Manufacturer, InsuranceCompany],
               },
               {
                  model: Client,
                  include: [User],
               },
               {
                  model: Driver,
                  include: [User],
               },
               {
                  model: User,
                  include: [Roles],
               },
               {
                  model: CarServiceType,
               },
               {
                  model: ServiceRequestPhotos,
               },
               {
                  model: Branches,
               },
            ],
         });
         if (!serviceRequest)
            return new AppError("No serviceRequest with this id", 404);

         serviceRequest = serviceRequest.get({ plain: true });
         let van = [1, 2, 3];
         let passenger = [6];

         if (!serviceRequest.location["waitingTimeAllowed"]) {
            let waitingTimeFree = 0;
            if (van.includes(serviceRequest.CarServiceTypes[0].id)) {
               let config = await Config.findOne();
               for (let i = 0; i < serviceRequest.CarServiceTypes.length; i++) {
                  const service = serviceRequest.CarServiceTypes[i];
                  if (serviceRequest.User.Role.name === "Corporate") {
                     switch (service.id) {
                        case 1:
                           waitingTimeFree += config.fuelServiceTimeCorp;
                           break;
                        case 2:
                           waitingTimeFree += config.batteryServiceTimeCorp;
                           break;
                        case 3:
                           waitingTimeFree += config.tiresServiceTimeCorp;
                           break;
                     }
                  } else {
                     switch (service.id) {
                        case 1:
                           waitingTimeFree += config.fuelServiceTime;
                           break;
                        case 2:
                           waitingTimeFree += config.batteryServiceTime;
                           break;
                        case 3:
                           waitingTimeFree += config.tiresServiceTime;
                           break;
                     }
                  }
               }
               serviceRequest.location["waitingTimeAllowed"] = waitingTimeFree;
               await ServiceRequest.update(
                  {
                     location: serviceRequest.location,
                  },
                  {
                     where: {
                        id: serviceRequest.id,
                     },
                  }
               );
               serviceRequest = await ServiceRequest.findOne({
                  where: {
                     id: serviceRequestId,
                  },
                  include: [
                     {
                        model: Vehicle,
                        include: [VehicleTypes],
                     },
                     {
                        model: ClientPackage,
                        include: [Package],
                     },
                     {
                        model: CorporateCompany,
                     },
                     {
                        model: Car,
                        include: [CarModel, Manufacturer, InsuranceCompany],
                     },
                     {
                        model: Client,
                        include: [User],
                     },
                     {
                        model: Driver,
                        include: [User],
                     },
                     {
                        model: User,
                        include: [Roles],
                     },
                     {
                        model: CarServiceType,
                     },
                     {
                        model: ServiceRequestPhotos,
                     },
                     {
                        model: Branches,
                     },
                  ],
               });
               serviceRequest = serviceRequest.get({ plain: true });
            }
         }
         let trackingLogs = await TrackingLogs.findAll({
            where: {
               requestId: serviceRequest.id,
            },
         });
         if (
            (serviceRequest.status === "accepted" ||
               serviceRequest.status === "started") &&
            serviceRequest.location.lastUpdatedDistanceAndDuration
         ) {
            if (
               !serviceRequest.location.lastUpdatedDistanceAndDuration
                  .lastGetOne ||
               (serviceRequest.location.lastUpdatedDistanceAndDuration
                  .lastGetOne &&
                  moment().isAfter(
                     moment(
                        serviceRequest.location.lastUpdatedDistanceAndDuration
                           .lastGetOne
                     ).add(5, "s")
                  ))
            ) {
               let duration = 0;
               if (
                  serviceRequest.status === "accepted" &&
                  serviceRequest.location?.acceptedWithTraffic
               ) {
                  duration =
                     serviceRequest.location?.acceptedWithTraffic
                        ?.driverDistanceMatrix?.duration.value;
                  let sub = getSliceValue(
                     duration,
                     serviceRequest.location.acceptedWithTraffic.points.length
                  );
                  let diff = serviceRequest.location
                     .lastUpdatedDistanceAndDuration.lastGetOne
                     ? Date.now() -
                       serviceRequest.location.lastUpdatedDistanceAndDuration
                          .lastGetOne
                     : 5000;
                  let manyOf5Secs = Math.floor(diff / 5000);
                  let subtract = manyOf5Secs * sub;
                  serviceRequest.location.lastUpdatedDistanceAndDuration.points =
                     serviceRequest.location.lastUpdatedDistanceAndDuration.points.slice(
                        subtract
                     );
                  serviceRequest.location.lastUpdatedDistanceAndDuration.lastGetOne =
                     Date.now();
                  await ServiceRequest.update(
                     {
                        location: serviceRequest.location,
                     },
                     {
                        where: {
                           id: serviceRequest.id,
                        },
                     }
                  );
               } else if (
                  serviceRequest.status === "started" &&
                  !van.includes(serviceRequest.CarServiceTypes[0].id) &&
                  serviceRequest.location.startedWithTraffic
               ) {
                  duration =
                     serviceRequest.location.startedWithTraffic
                        .driverDistanceMatrix.duration.value;

                  let sub = getSliceValue(
                     duration,
                     serviceRequest.location.startedWithTraffic.points.length
                  );
                  let diff = serviceRequest.location
                     .lastUpdatedDistanceAndDuration.lastGetOne
                     ? Date.now() -
                       serviceRequest.location.lastUpdatedDistanceAndDuration
                          .lastGetOne
                     : 5000;
                  let manyOf5Secs = Math.floor(diff / 5);
                  let subtract = manyOf5Secs * sub;
                  serviceRequest.location.lastUpdatedDistanceAndDuration.points =
                     serviceRequest.location.lastUpdatedDistanceAndDuration.points.slice(
                        subtract
                     );
                  serviceRequest.location.lastUpdatedDistanceAndDuration.lastGetOne =
                     Date.now();
                  await ServiceRequest.update(
                     {
                        location: serviceRequest.location,
                     },
                     {
                        where: {
                           id: serviceRequest.id,
                        },
                     }
                  );
               }
            }
         }
         trackingLogs = trackingLogs.map((log) => log.get({ plain: true }));
         let location;
         let firstClientLocation;
         let checkIf = await ServiceRequest.findOne({
            where: {
               DriverId: serviceRequest.DriverId,
               id: {
                  [Op.ne]: serviceRequest.id,
               },
               status: {
                  [Op.notIn]: ["done", "canceled", "cancelWithPayment"],
               },
               createdAt: {
                  [Op.lte]: serviceRequest.createdAt,
               },
            },
            include: [
               {
                  model: CarServiceType,
               },
            ],
         });
         if (checkIf) {
            if (van.includes(checkIf.CarServiceTypes[0])) {
               checkIf.status === "accepted"
                  ? (location = {
                       latitude: parseFloat(checkIf.location.clientLatitude),
                       longitude: parseFloat(checkIf.location.clientLongitude),
                    })
                  : (location = undefined);
            } else {
               checkIf
                  ? (location = {
                       latitude: parseFloat(checkIf.location.destinationLat),
                       longitude: parseFloat(checkIf.location.destinationLng),
                    })
                  : (location = undefined);
               checkIf
                  ? checkIf.status === "accepted"
                     ? (firstClientLocation = {
                          longitude: parseFloat(
                             checkIf.location.clientLongitude
                          ),
                          latitude: parseFloat(checkIf.location.clientLatitude),
                       })
                     : (firstClientLocation = undefined)
                  : (firstClientLocation = undefined);
            }
         }
         let oldRequestStatus = checkIf ? checkIf.status : undefined;
         return {
            request: [
               {
                  ...serviceRequest,
                  googleMapsLogs: { count: trackingLogs.length, trackingLogs },
               },
            ],
            location,
            firstClientLocation,
            oldRequestStatus,
         };
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 500);
      }
   }
   async findUserOldRequest(clientID) {
      try {
         const request = await ServiceRequest.findAll({
            order: [["id", "DESC"]],
            where: {
               clientId: clientID,
            },
            limit: 10,
            include: [
               {
                  model: Car,
                  include: [CarModel, Manufacturer, InsuranceCompany],
               },
               {
                  model: Client,
               },
               {
                  model: Driver,
                  include: [
                     {
                        model: User,
                        attributes: ["name", "PhoneNumber", "photo"],
                     },
                  ],
               },
               {
                  model: CarServiceType,
               },
               {
                  model: Vehicle,
                  include: [VehicleTypes],
               },
            ],
         });
         return request;
      } catch (err) {
         console.error(err);
         return new AppError(err, 400);
      }
   }
   async getCorporateRequests(corpId, page = 1, size = 10) {
      page = Number(page);
      size = Number(size);
      if (!corpId) return new AppError("No corporate Company Id has been sent");
      let requests = await ServiceRequest.findAll({
         order: [["id", "DESC"]],
         limit: size,
         offset: (page - 1) * size,
         where: {
            CorporateCompanyId: corpId,
         },
         include: [
            {
               model: Vehicle,
               include: [VehicleTypes],
            },
            {
               model: ClientPackage,
               include: [Package],
            },
            {
               model: CorporateCompany,
            },
            {
               model: Car,
            },
            {
               model: Client,
               include: [User],
            },
            {
               model: Driver,
               include: [User],
            },
            {
               model: User,
            },
            {
               model: ServiceRequestPhotos,
            },
            {
               model: CarServiceType,
            },
            {
               model: Branches,
            },
         ],
      });
      requests =
         requests.length > 0
            ? requests.map((request) => request.get({ plain: true }))
            : [];
      let counting = await ServiceRequest.count({
         where: {
            CorporateCompanyId: corpId,
         },
      });
      const currentPage = page;
      const totalPages = Math.ceil(counting / size);
      return {
         totalData: counting,
         currentPage,
         totalPages,
         requests,
      };
   }
   async findCorporateUserOldRequest(userId) {
      try {
         const request = await ServiceRequest.findAll({
            order: [["id", "DESC"]],
            where: {
               createdByUser: userId,
            },
            limit: 10,
            include: [
               {
                  model: Car,
                  include: [CarModel, Manufacturer, InsuranceCompany],
               },
               {
                  model: Client,
               },
               {
                  model: Driver,
                  include: [
                     {
                        model: User,
                        attributes: ["name", "PhoneNumber", "photo"],
                     },
                  ],
               },
               {
                  model: Vehicle,
                  include: [VehicleTypes],
               },
            ],
         });
         return request;
      } catch (err) {
         console.error(err);
         return new AppError(err, 400);
      }
   }
   async updateWaitingTime(request, statusChanged, config, isCorp) {
      let van = [1, 2, 3];
      let winch = [4, 5, 6];
      let passenger = [6];

      let waitingTimeFree = 0;
      if (van.includes(request.CarServiceTypes[0].id)) {
         for (let i = 0; i < request.CarServiceTypes.length; i++) {
            const service = request.CarServiceTypes[i];
            if (isCorp) {
               switch (service.id) {
                  case 1:
                     waitingTimeFree += config.fuelServiceTimeCorp;
                     break;
                  case 2:
                     waitingTimeFree += config.batteryServiceTimeCorp;
                     break;
                  case 3:
                     waitingTimeFree += config.tiresServiceTimeCorp;
                     break;
                  default:
                     break;
               }
            } else {
               switch (service.id) {
                  case 1:
                     waitingTimeFree += Number(config.fuelServiceTime);
                     break;
                  case 2:
                     waitingTimeFree += Number(config.batteryServiceTime);
                     break;
                  case 3:
                     waitingTimeFree += Number(config.tiresServiceTime);
                     break;
                  default:
                     break;
               }
            }
         }
      } else {
         if (isCorp) {
            waitingTimeFree = config.waitingTimeFreeCorp;
         } else {
            waitingTimeFree = config.waitingTimeFree;
         }
      }
      let addToFees = true;
      // let config = await Config.findOne();
      if (statusChanged === "done") {
         let startTime = request.destArriveTime;
         let endTime = request.endTime;
         if (van.includes(request.CarServiceTypes[0].id)) {
            startTime = request.startServiceTime;
         }
         let time = startTime && endTime ? endTime - startTime : 0;
         let allWaitingTimeInMins = Math.ceil(time / (60 * 1000));
         let waitingTimeInMins =
            allWaitingTimeInMins > waitingTimeFree
               ? allWaitingTimeInMins - waitingTimeFree
               : 0;
         let waitingTimeCount = Math.ceil(
            waitingTimeInMins / config.waitingTimeLimit
         );
         let waitingTimeCost = waitingTimeCount * config.waitingTimePrice;
         let addCost = waitingTimeCost;
         if (request.fees === 0) {
            if (
               request.originalFees + request.waitingFees <
               request.ClientPackage?.Package?.maxDiscountPerTime
            ) {
               let totalFees = request.originalFees + request.waitingFees;
               let difference =
                  request.ClientPackage?.Package?.maxDiscountPerTime -
                  (totalFees + waitingTimeCost);
               if (difference < 0) {
                  addCost = Math.abs(
                     request.ClientPackage?.Package?.maxDiscountPerTime -
                        (totalFees + waitingTimeCost)
                  );
               } else {
                  addCost = 0;
                  addToFees = false;
               }
            }
         }
         return {
            fees: waitingTimeCost,
            addCost,
            waitingTime: waitingTimeInMins,
            addToFees,
         };
      } else if (statusChanged === "started") {
         if (winch.includes(request.CarServiceTypes[0].id)) {
            let time =
               request.arriveTime && request.startServiceTime
                  ? request.startServiceTime - request.arriveTime
                  : 0;
            let allWaitingTimeInMins = Math.ceil(time / (60 * 1000));
            let waitingTimeInMins =
               allWaitingTimeInMins > waitingTimeFree
                  ? allWaitingTimeInMins - waitingTimeFree
                  : 0;
            let waitingTimeCount = Math.ceil(
               waitingTimeInMins / config.waitingTimeLimit
            );
            let waitingTimeCost = waitingTimeCount * config.waitingTimePrice;
            let addCost = waitingTimeCost;
            if (request.fees === 0) {
               if (
                  request.originalFees + request.waitingFees <
                  request.ClientPackage?.Package?.maxDiscountPerTime
               ) {
                  let totalFees = request.originalFees + request.waitingFees;
                  let difference =
                     request.ClientPackage?.Package?.maxDiscountPerTime -
                     (totalFees + waitingTimeCost);
                  if (difference < 0) {
                     addCost = Math.abs(
                        request.ClientPackage?.Package?.maxDiscountPerTime -
                           (totalFees + waitingTimeCost)
                     );
                  } else {
                     addCost = 0;
                     addToFees = false;
                  }
               }
            }
            return {
               fees: waitingTimeCost,
               addCost,
               waitingTime: waitingTimeInMins,
               addToFees,
            };
         } else return { fees: 0, waitingTime: 0 };
      } else {
         return { fees: 0, waitingTime: 0 };
      }
   }

   async updateRequestStatus(data, requestId) {
      try {
         let van = [1, 2, 3];
         let winch = [4, 5, 6];
         let passenger = [6];

         let vanStatusObj = {
            open: 1,
            confirmed: 1,
            accepted: 1,
            started: 1,
            done: 1,
            canceled: 1,
            cancelWithPayment: 1,
         };
         let config = await Config.findOne();
         config = config.get({ plain: true });
         let request = await ServiceRequest.findByPk(requestId, {
            include: [CarServiceType],
         });
         if (!request) return new AppError("No request with this id", 404);
         // if (!status) return new AppError("No status provided", 400);
         let requestOldStatus = request.status;
         if (
            data.status === "confirmed" &&
            data.paymentMethod === "online-card" &&
            request.paymentMethod === "online-card" &&
            request.paymentStatus === "not-paid"
         )
            return new AppError("Please complete the payment first", 400);
         if (van.includes(request.CarServiceTypes[0].id)) {
            if (data.status && !vanStatusObj[data.status]) {
               return new AppError(
                  `this status ${data.status} is not available for this service type`,
                  400
               );
            }
         }
         if (data.status === "canceled") {
            let canceling = await this.cancelRequest(requestId);
            if (canceling.statusCode) {
               return canceling;
            }
         }
         if (data.status === "done") {
            let donning = await driverService.finishRequest(
               requestId,
               request.DriverId
            );
            if (donning.statusCode) return donning;
         }
         if (
            request.status === "not_available" &&
            !request.DriverId &&
            data.status !== "not_available"
         )
            return new AppError(
               "Please assign driver first before changing status",
               400
            );
         request.status = data.status;
         switch (data.status) {
            case "confirmed":
               request.confirmationTime = moment(Date.now()).format();
               break;
            case "accepted":
               request.startTime = moment(Date.now()).format();
               break;
            case "started":
               request.startServiceTime = moment(Date.now()).format();
               break;
            case "arrived":
               request.arriveTime = moment(Date.now()).format();
               break;
            case "destArrived":
               request.destArriveTime = moment(Date.now()).format();
               break;
            default:
               break;
         }
         if (data.paymentStatus === "paid") {
            request.paidAt = moment(Date.now()).format();
         }
         await request.save();
         let update = await ServiceRequest.update(data, {
            where: {
               id: requestId,
            },
         });
         request = await ServiceRequest.findByPk(requestId, {
            include: [
               Car,
               Client,
               Driver,
               {
                  model: ClientPackage,
                  include: Package,
               },
               CarServiceType,
            ],
         });
         let waiting = await this.updateWaitingTime(
            request,
            request.status,
            config,
            request.CorporateCompanyId
         );
         let waitingTime = request.waitingTime
            ? request.waitingTime + waiting.waitingTime
            : waiting.waitingTime;
         let waitingFees = request.waitingFees
            ? request.waitingFees + waiting.fees
            : waiting.fees;
         if (waiting.fees > 0) {
            // fees: waitingTimeCost,
            // addCost,
            // waitingTime: waitingTimeInMins,
            // addToFees,
            let fees = request.fees;
            if (waiting.addToFees) {
               fees += waiting.addCost;
            }

            await ServiceRequest.update(
               {
                  waitingTime,
                  waitingFees,
                  fees,
               },
               {
                  where: {
                     id: request.id,
                  },
               }
            );
         }
         request = await ServiceRequest.findByPk(requestId, {
            include: [
               { model: Driver, include: [User] },
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
               {
                  model: Client,
               },
               {
                  model: CarServiceType,
               },
            ],
         });
         if (
            request.status === "done" &&
            requestOldStatus !== "done" &&
            !request.CorporateCompanyId
         ) {
            let message = `مطلوب دفع ${request.fees} للرحلة رقم ${
               request.id
            } \n مع العلم ان التكلفة الاساسية ${
               request.originalFees
            } و تكلفة وقت الانتظار ${
               request.waitingFees ? request.waitingFees : 0
            } \n الخصم الاجمالي ${
               request.originalFees + request.waitingFees - request.fees
            }`;
            let collectMoney = request.fees;
            let paidMoney = 0;
            if (request.paymentMethod === "online-card") {
               collectMoney = request.waitingFees;
               paidMoney = request.fees - request.waitingFees;
            }
            let driverMessage = `برجاء تحصيل مبلغ: ${collectMoney} \n تكلفة اساسية: ${
               request.fees - request.waitingFees
            } \n وقت انتظار : ${
               request.waitingFees ? request.waitingFees : 0
            } \n المدفوع : ${paidMoney}`;
            await smsService.sendSms({
               mobile: request.PhoneNumber,
               message,
            });
            await smsService.sendSms({
               mobile: request.Driver.User.PhoneNumber,
               message: driverMessage,
            });
            await fcm.sendNotification(
               request.Driver.fcmtoken,
               "service request",
               driverMessage
            );
         }
         if (request.status === "accepted" && requestOldStatus !== "accepted") {
            if (request?.createdByUser !== request?.Client?.UserId) {
               await smsService.sendSms({
                  mobile: request.PhoneNumber,
                  message: `يمكنك تتبع رحلتك من خلال تحميل تطبيق هلبو من خلال الرابط التالي https://open.helpooapp.net وتسجيل الدخول بنفس رقم الهاتف المستخدم لطلب الرحلة`,
               });
            }
            await smsService.sendSms({
               mobile: request.PhoneNumber,
               message: `هذه بيانات السائق الخاص بطلبك ${request.Driver.User.name} - ${request.Driver.User.PhoneNumber}`,
            });
         }
         let allowedStatus = {
            confirmed: 1,
            open: 1,
         };
         if (
            request.status === "accepted" &&
            allowedStatus[requestOldStatus] &&
            !request.CorporateCompanyId
         ) {
            await smsService.sendSms({
               mobile: request.PhoneNumber,
               message: `تم بدء رحلة رقم ${request.id} بتكلفة ${request.fees} مع العلم انه فى حاله تجاوز وقت الانتظار المسموح، سيتم احتساب تكلفه اضافيه`,
            });
         }
         let statusCases = {
            arrived: 1,
            destArrived: 1,
         };
         if (statusCases[request.status]) {
            handleTheWaitingTimeMessages(request, config);
         }
         return request;
      } catch (error) {
         return new AppError(error, 500);
      }
   }
   async checkPlateNumber(plateNumber, requestId) {
      try {
         let serviceRequest = await ServiceRequest.findOne({
            where: {
               id: requestId,
            },
            include: [
               {
                  model: Car,
                  include: [
                     {
                        model: CarPackage,
                     },
                  ],
               },
            ],
         });
         if (!serviceRequest)
            return new AppError("No request with this id", 404);
         serviceRequest = serviceRequest.get({ plain: true });
         let serviceRequestCarId = serviceRequest.Car.id;
         const isInsured = await carService.carIsInsured(serviceRequestCarId);
         let splittedPlateNumber = plateNumber.split("-");
         let carpn = serviceRequest.Car.plateNumber.split("-");

         let comparablePlateNumber = plateNumber;
         if (!isNaN(splittedPlateNumber[0]) ^ !isNaN(carpn[0])) {
            if (!isNaN(splittedPlateNumber[0])) {
               let newPlateNumber = [
                  splittedPlateNumber[1],
                  splittedPlateNumber[2],
                  splittedPlateNumber[3],
                  splittedPlateNumber[0],
               ];
               comparablePlateNumber = newPlateNumber.join("-");
            } else {
               let newPlateNumber = [
                  splittedPlateNumber[3],
                  splittedPlateNumber[0],
                  splittedPlateNumber[1],
                  splittedPlateNumber[2],
               ];
               comparablePlateNumber = newPlateNumber.join("-");
            }
         }
         if (serviceRequest.Car.plateNumber === comparablePlateNumber) {
            return true;
         }
         if (
            (isInsured ||
               (serviceRequest.Car.CarPackages &&
                  serviceRequest.Car.CarPackages.length !== 0)) &&
            serviceRequest.Car.plateNumber !== comparablePlateNumber
         ) {
            let update = await ServiceRequest.update(
               {
                  status: "pending",
               },
               {
                  where: {
                     id: requestId,
                  },
               }
            );
            return false;
         }
         if (serviceRequest.Car.plateNumber !== plateNumber) {
            let update = await Car.update(
               { plateNumber },
               {
                  where: {
                     id: serviceRequestCarId,
                  },
               }
            );
            return true;
         }
      } catch (error) {
         console.error(error);
         return new AppError(error, 500);
      }
   }
   async uploadRequestImage({ requestId, images }) {
      try {
         let request = await ServiceRequest.findByPk(requestId);
         if (!request) return new AppError("No request with this id", 404);
         if (!images) return new AppError("No images provided", 400);
         let serviceImages = [];
         for (let i = 0; i < images.length; i++) {
            serviceImages.push(
               decodeImages(
                  `serviceRequest-${requestId}-${Date.now()}`,
                  images[i]
               )
            );
         }
         await ServiceRequestPhotos.create({
            serviceRequestId: requestId,
            images: serviceImages,
         });
         return request;
      } catch (error) {
         return new AppError(error, 500);
      }
   }
   async getServiceRequestsTypes() {
      const serviceTypes = CarServiceType.findAll({});
      return serviceTypes;
   }
   async getDriverRequest(driverId) {
      const requests = await ServiceRequest.findAll({
         where: {
            DriverId: driverId,
         },
         include: [
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
            {
               model: Client,
            },
            {
               model: CarServiceType,
            },
         ],
         order: [["id", "DESC"]],
         limit: 10,
      });

      return requests;
   }
   async addWaitingTime(id, waitingTime, waitingFees) {
      // let request = await ServiceRequest.findByPk(id);
      // if (!request) return new AppError("No request with this Id", 400);

      // try {
      //    request.waitingTime = Number(waitingTime);
      //    request.waitingFees = Number(waitingFees);

      //    await request.save();
      //    return request;
      // } catch (err) {
      //    console.error(err);
      //    return new AppError(err.message, 500);
      // }
      return new AppError(
         "You can't edit anything in waiting time, if you have a problem send us a message",
         403
      );
   }
   async applyWaitingTime(id) {
      // let request = await ServiceRequest.findByPk(id);
      // if (!request) return new AppError("No request with this Id", 400);

      // try {
      //    if (request.waitingFees && !request.isWaitingTimeApplied) {
      //       request.fees += Number(request.waitingFees);
      //       // request.originalFees += Number(request.waitingFees);

      //       request.isWaitingTimeApplied = true;

      //       await request.save();
      //    }

      //    return request;
      // } catch (err) {
      //    console.error(err);
      //    return new AppError(err.message, 500);
      // }
      return new AppError(
         "You can't edit anything in waiting time, if you have a problem send us a message",
         403
      );
   }
   async removeWaitingTime(id) {
      // let request = await ServiceRequest.findByPk(id);
      // if (!request) return new AppError("No request with this Id", 400);

      // try {
      //    if (request.waitingFees && request.isWaitingTimeApplied) {
      //       request.fees -= Number(request.waitingFees);
      //       // request.originalFees -= Number(request.waitingFees);

      //       request.isWaitingTimeApplied = false;

      //       await request.save();
      //    }

      //    return request;
      // } catch (err) {
      //    console.error(err);
      //    return new AppError(err.message, 500);
      // }
      return new AppError(
         "You can't edit anything in waiting time, if you have a problem send us a message",
         403
      );
   }
   async addAdminDiscount(id, discount) {
      let request = await ServiceRequest.findByPk(id);
      if (!request) return new AppError("No request with this Id", 400);
      if (discount > 100) {
         return new AppError(
            "STOP BEING STUPID! WHY THE HELL HE WILL GET MORE THAN 100% DISCONUT",
            400
         );
      }
      if (request.discountPercentage > discount) {
         return new AppError(
            "Admin discount should be greater than or equal to the applied discount",
            400
         );
      }
      try {
         request.adminDiscount = Number(discount);

         await request.save();
         return request;
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 500);
      }
   }
   async applyAdminDiscount(id, approvedBy, reason) {
      let request = await ServiceRequest.findByPk(id);
      if (!request) return new AppError("No request with this Id", 400);

      try {
         if (request.adminDiscount && !request.isAdminDiscountApplied) {
            request.fees =
               Math.ceil(
                  request.originalFees -
                     request.originalFees * (request.adminDiscount / 100)
               ) + request.waitingFees;

            request.isAdminDiscountApplied = true;
            request.adminDiscountApprovedBy = approvedBy;
            request.adminDiscountReason = reason;

            await request.save();
         }

         return request;
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 500);
      }
   }
   async removeAdminDiscount(id) {
      let request = await ServiceRequest.findByPk(id);
      if (!request) return new AppError("No request with this Id", 400);

      try {
         if (request.adminDiscount && request.isAdminDiscountApplied) {
            request.fees =
               Math.ceil(
                  request.originalFees -
                     (request.originalFees * request.discountPercentage) / 100
               ) + request.waitingFees;

            request.isAdminDiscountApplied = false;
            request.adminDiscountApprovedBy = null;
            request.adminDiscountReason = null;
            request.adminDiscount = 0;

            await request.save();
         }

         return request;
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 500);
      }
   }
   async addAdminComment(id, comment) {
      let request = await ServiceRequest.findByPk(id);
      if (!request) return new AppError("No request with this Id", 400);
      try {
         request.adminComment = comment;
         await request.save();
         return request;
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 500);
      }
   }
   async cancelWithPayment({ requestId, fees, comment }) {
      let requestCheck = await ServiceRequest.findByPk(requestId);
      if (!requestCheck) return new AppError("No request with this Id", 400);
      if (!requestCheck.DriverId) {
         try {
            let request = await ServiceRequest.update(
               {
                  status: "cancelWithPayment",
                  fees,
                  adminComment: comment,
               },
               {
                  where: {
                     id: requestId,
                  },
               }
            );
            request = await ServiceRequest.findByPk(requestId);
            return request;
         } catch (error) {
            return new AppError(error, 500);
         }
      }
      let reActiveDriver = await Driver.update(
         {
            available: true,
         },
         {
            where: {
               id: requestCheck.DriverId,
            },
         }
      );
      let reActiveVehicle = await Vehicle.update(
         {
            available: true,
         },
         {
            where: {
               Active_Driver: requestCheck.DriverId,
            },
         }
      );
      let request = await ServiceRequest.update(
         {
            status: "cancelWithPayment",
            fees,
            adminComment: comment,
         },
         {
            where: {
               id: requestId,
            },
         }
      );
      request = await ServiceRequest.findByPk(requestId);
      return request;
   }
   async addDestination(
      requestId,
      destinationAddress,
      destinationLat,
      destinationLng,
      destinationDistance
   ) {
      try {
         let request = await this.getAServiceRequest(requestId);
         let locations = request.location;
         locations.anotherDestinations
            ? locations.anotherDestinations.push({
                 destinationAddress,
                 destinationDistance,
                 destinationLng,
                 destinationLat,
              })
            : (locations["anotherDestinations"] = [
                 {
                    destinationAddress,
                    destinationDistance,
                    destinationLng,
                    destinationLat,
                 },
              ]);
         let serviceIds = request.CarServiceTypes.map((type) => type.id);
         let original = await originalFees.getOriginalFeesKM(
            serviceIds,
            null,
            destinationDistance
         );
         let newFees = original - (original * request.discountPercentage) / 100;
         await ServiceRequest.update(
            {
               location: locations,
               fees: request.fees + newFees,
               originalFees: request.originalFees + original,
            },
            {
               where: {
                  id: requestId,
               },
            }
         );
         request = await this.getAServiceRequest(requestId);
         return request;
      } catch (err) {
         return new AppError(err.message, 500);
      }
   }
   async getRequestsWithXYEqu(sDate, eDate) {
      let reqs = await ServiceRequest.findAll({
         where: sequelize.literal(`
         CAST("ServiceRequest"."location"->'calculatedDistance'->'distance'->>'value' AS INTEGER) >
         CAST("ServiceRequest"."location"->'destinationDistance'->'distance'->>'value' AS INTEGER)
         AND "ServiceRequest"."createdAt" > '${sDate}' -- Assuming timestamps is a valid timestamp
         AND "ServiceRequest"."createdAt" < '${eDate}' -- Assuming timestamps is a valid timestamp
       `),
         order: [["id", "DESC"]],
         include: [
            {
               model: Vehicle,
               include: [VehicleTypes],
            },
            {
               model: ClientPackage,
               include: [Package],
            },
            {
               model: CorporateCompany,
            },
            {
               model: Car,
               include: [CarModel, Manufacturer, InsuranceCompany],
            },
            {
               model: Client,
               include: [User],
            },
            {
               model: Driver,
               include: [User],
            },
            {
               model: User,
            },
            {
               model: CarServiceType,
            },
            {
               model: ServiceRequestPhotos,
            },
         ],
      });
      return reqs;
   }
   async getDriversAndWenchesKMS(sDate, eDate) {
      let drivers = {};
      let wenches = {};
      let startDate = new Date(sDate).getTime();
      let endDate = new Date(eDate).getTime();
      let requests = await ServiceRequest.findAll({
         where: {
            createdAt: {
               [Op.gte]: startDate,
               [Op.lte]: endDate,
            },
            DriverId: {
               [Op.ne]: null,
            },
            status: "done",
         },
         include: [
            {
               model: Driver,
               include: User,
            },
            {
               model: Vehicle,
            },
         ],
      });
      for (let i = 0; i < requests.length; i++) {
         let meters =
            requests[i].location.distance.distance.value +
            requests[i].location.destinationDistance.distance.value;
         let kms = Math.ceil(meters / 1000);
         let driverId = requests[i].DriverId;
         let wenchId = requests[i].VehicleId;
         drivers[driverId]
            ? (drivers[driverId].kms += kms)
            : (drivers[driverId] = { Driver: requests[i].Driver, kms });
         wenches[wenchId]
            ? (wenches[wenchId].kms += kms)
            : (wenches[wenchId] = { Vehicle: requests[i].Vehicle, kms });
      }

      return {
         drivers,
         wenches,
      };
   }
}

const decodeImages = (imageName, image) => {
   // const base64Image = image.split(';base64,').pop();
   let filename = `/public/serviceRequests/${imageName}.jpg`;
   require("fs").writeFile(`.${filename}`, image, "base64", function (err) {
      if (err) console.error(err);
   });
   return filename;
};

function handleTheWaitingTimeMessages(request, config) {
   // console.log("starting .........");
   let waiting = config.waitingTimeFree;
   const futureTime = new Date();
   const minutes = futureTime.getMinutes() + waiting;
   const seconds = futureTime.getSeconds();
   const hoursAndMinutes = ` ${minutes >= 60 ? minutes - 60 : minutes} ${
      minutes >= 60 ? futureTime.getHours() + 1 : futureTime.getHours()
   } `;
   const cronExpression = `${
      seconds > 60 ? seconds - 60 : seconds
   }${hoursAndMinutes}* * *`;
   console.log(cronExpression);
   const task = cron.schedule(cronExpression, async () => {
      // console.log("time is up and checking");
      let req = await ServiceRequest.findByPk(request.id, {
         include: [{ model: Driver, include: [User] }],
      });
      let statusCases = {
         arrived: 1,
         destArrived: 1,
      };
      if (statusCases[req.status]) {
         await smsService.sendSms({
            mobile: request.PhoneNumber,
            message: `لقد تم تجاوز وقت الانتظار المسموح بة وسوف يتم احتساب تكلفة إضافية`,
         });
         await smsService.sendSms({
            mobile: req.Driver.User.PhoneNumber,
            message: `لقد تم تجاوز وقت الانتظار المسموح بة وسوف يتم احتساب تكلفة إضافية`,
         });
         await fcm.sendNotification(
            req.Driver.fcmtoken,
            "service request",
            `لقد تم تجاوز وقت الانتظار المسموح بة وسوف يتم احتساب تكلفة إضافية`
         );
      }
      // Remove the task from the list once it's executed
      task.stop();
   });
}

function getSliceValue(value, pointsNumber) {
   let numberOf5Secs = Math.round(value / 5);
   let sub =
      pointsNumber / numberOf5Secs > 1
         ? Math.floor(pointsNumber / numberOf5Secs)
         : 1;
   return sub;
}

const serviceRequest = new ServiceRequestService();
module.exports = serviceRequest;
