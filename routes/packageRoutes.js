const express = require("express");
const catchAsync = require("../utils/catchAsync");
const auth = require("../middlewares/auth");
const restriction = require("../middlewares/restriction");
const packageService = require("../services/packageService");
const clientPackageService = require("../services/ClientPackageService");
const clientService = require("../services/clientService");
const paymobService = require("../services/paymobServices");

const router = express.Router();

router.get(
   "/getAll",
   auth,
   catchAsync(async (req, res, next) => {
      let { isPublic } = req.query;
      if (!isPublic) isPublic = "false";
      if (isPublic === "true") isPublic = true;
      else isPublic = false;
      let { insuranceCompanyId, corprateCompanyId, BrokerId } = req.query;
      const packages = await packageService.getAllPackages(
         isPublic,
         insuranceCompanyId,
         corprateCompanyId,
         BrokerId
      );
      if (packages.statusCode) {
         return next(packages);
      }
      res.status(200).json({
         status: "success",
         packages,
      });
   })
);

router.put(
   "/package/:id",
   auth,
   restriction("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['update package'] = {
            in: 'body',
            schema: {
                $benefits: [{
                    $enName: "enName",
                    $arName: "arName",
                }],
            }
        }
    */
      const id = Number(req.params.id);
      const newPackage = await packageService.updatePackage(id, req.body);
      if (newPackage.statusCode) {
         return next(newPackage);
      }
      res.status(200).json({
         status: "success",
         package: newPackage,
      });
   })
);

router.post(
   "/create",
   auth,
   restriction("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['create package'] = {
            in: 'body',
            schema: {
                $enName: "enName",
                $arName: "arName",
                $fees: 1500,
                $maxDiscountPerTime: 0,
                $discountPercentage: 0,
                $numberOfDays: 30,
                $numberOfCars: 1,
                $active: true,
                $private: false,
                $insuranceCompanyId: 1,
                $discountAfterMaxTimes: 0,
            }
        }
    */
      const newPackage = await packageService.createPackage(req.body);
      if (newPackage.statusCode) {
         return next(newPackage);
      }
      res.status(201).json({
         status: "success",
         newPackage,
      });
   })
);
router.get(
   "/package/:id",
   auth,
   catchAsync(async (req, res, next) => {
      const package = await packageService.getOnePackage(req.params.id);
      if (package.statusCode) {
         return next(package);
      }
      res.status(200).json({
         status: "success",
         package,
      });
   })
);

router.delete(
   "/package/:packageId",
   auth,
   restriction("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      const package = await packageService.deletePackage(req.params.packageId);
      if (package.statusCode) return next(package);

      res.status(204).json({
         status: "success",
      });
   })
);

router.post(
   "/assignPackage",
   auth,
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['assign package'] = {
            in: 'body',
            schema: {
                $PackageId: 1,
                $ClientId: 1,
                $paymentMethod: "online-card",
            }
        }
    */
      // const authToken = await paymobService.authenticate();
      // const order = await paymobService.createOrder(authToken, 0);
      // await paymobService.createPackageTransactions(
      //    order.id,
      //    0,
      //    req.body.PackageId,
      //    req.user.id,
      //    "online-card",
      //    "pre-paid"
      // );
      const subscribed = await clientPackageService.subscribe({
         ...req.body,
         userId: req.user.id,
         // orderId: order.id,
      });
      if (subscribed.statusCode) {
         return next(subscribed);
      } else
         res.status(201).json({
            status: "success",
            package: subscribed,
         });
   })
);

router.get(
   "/clientPackages",
   auth,
   catchAsync(async (req, res, next) => {
      const client = await clientService.getClientByUserId(req.user.id);
      if (client.statusCode) {
         return next(client);
      } else {
         const clientPackages = await clientPackageService.getClientPackages(
            client.id
         );
         if (clientPackages.statusCode) {
            return next(clientPackages);
         }
         res.status(200).json({
            status: "success",
            clientPackages,
         });
      }
   })
);

router.get(
   "/unFilledClientPackages",
   auth,
   catchAsync(async (req, res, next) => {
      const client = await clientService.getClientByUserId(req.user.id);
      if (client.statusCode) {
         return next(client);
      } else {
         const clientPackages =
            await clientPackageService.getUnFilledClientPackage(client.id);
         if (clientPackages.statusCode) {
            return next(clientPackages);
         }
         res.status(200).json({
            status: "success",
            clientPackages,
         });
      }
   })
);
router.get(
   "/packageReports",
   auth,
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['subscribe car'] = {
            in: 'query',
            schema: {
                $startDate: timestamp,
                $endDate: timestamp,
            }
        }
    */
      let { startDate, endDate } = req.query;
      let reportData = await clientPackageService.getPackageReports(
         startDate,
         endDate
      );
      if (reportData.statusCode) {
         return next(reportData);
      }
      res.status(200).json({
         status: "success",
         reportData
      });
   })
);

router.post(
   "/subscribeCar",
   auth,
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['subscribe car'] = {
            in: 'body',
            schema: {
                $packageId: 1,
                $carId: 1,
                $clientId: 1,
            }
        }
    */
      const subscribed = await clientPackageService.subscribeCarPackage(
         req.body
      );
      if (subscribed.statusCode) {
         return next(subscribed);
      } else
         res.status(201).json({
            status: "success",
            subscribed: subscribed,
         });
   })
);

router.get(
   "/userTransactions/:userId",
   auth,
   catchAsync(async (req, res, next) => {
      const userTransactions = await packageService.packageTransactions(
         req.params.userId
      );
      res.status(200).json({
         status: "success",
         userTransactions,
      });
   })
);

router.get(
   "/clientsByPackage/:packageId",
   // auth,
   catchAsync(async (req, res, next) => {
      const clients = await clientPackageService.getClientsByPackage(
         req.params.packageId
      );
      if (clients.statusCode) {
         return next(clients);
      }
      res.status(200).json({
         status: "success",
         clients,
      });
   })
);

router.patch(
   "/togglePackage/:id",
   auth,
   catchAsync(async (req, res, next) => {
      const package = await packageService.togglePackage(req.params.id);
      if (package.statusCode) {
         return next(package);
      }
      res.status(200).json({
         status: "success",
         package,
      });
   })
);

module.exports = router;
