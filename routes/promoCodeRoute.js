const express = require("express");

// middleWares
const catchAsync = require("../utils/catchAsync");
const auth = require("../middlewares/auth");
const restrict = require("../middlewares/restriction");

// services
const promoCodeService = require("../services/promoCodeServices");
const AppError = require("../utils/AppError");

// initiateRoute
const router = express.Router();

router.post(
   "/assignForUser/:id",
   auth,
   restrict("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['assign for user'] = {
            "in": "body",
            schema: {
                "promoCode": "string"
            }
        },
    */
      const userId = req.params.id;
      let promoValue = req.body.promoCode;
      if (!promoValue || !userId) {
         return next(new AppError("Missing promoCode or userId", 400));
      } else {
         const userWithPromo = await promoCodeService.checkAndAssignPromo({
            promoValue,
            userId,
         });
         if (userWithPromo.statusCode) {
            return next(userWithPromo);
         } else if (typeof userWithPromo === "string") {
            res.status(200).json({
               msg: userWithPromo,
            });
         } else
            res.status(200).json({
               status: "success",
               user: userWithPromo,
            });
      }
   })
);

router.post(
   "/useVoucher",
   auth,
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['use voucher'] = {
            "in": "body",
            schema: {
                "voucher": "string"
            }
        }
    */
      const voucher = req.body.voucher;
      let userId = req.user.id;
      if (!voucher || !userId) {
         return next(new AppError("Missing voucher or userId", 400));
      }
      const voucherUsed = await promoCodeService.useVoucher(voucher, userId);
      if (voucherUsed.statusCode) return next(userWithPromo);
      else
         res.status(200).json({
            status: "success",
            voucher: voucherUsed,
         });
   })
);

router.post(
   "/assignPromo",
   auth,
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['assign promo'] = {
            "in": "body",
            schema: {
                "promoCode": "string"
            }
        }
    */
      let promoValue = req.body.promoCode;
      let userId = req.user.id;
      if (!promoValue || !userId) {
         return next(new AppError("Missing promoCode or userId", 400));
      } else {
         const userWithPromo = await promoCodeService.checkAndAssignPromo({
            promoValue,
            userId,
         });
         if (userWithPromo.statusCode) {
            return next(userWithPromo);
         } else if (typeof userWithPromo === "string") {
            res.status(200).json({
               msg: userWithPromo,
            });
         } else
            res.status(200).json({
               status: "success",
               user: userWithPromo,
            });
      }
   })
);

router.post(
   "/createPromo",
   auth,
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['create promo'] = {
            "in": "body",
            schema: {
                $name: "string",
                $value: "number",
                $startDate: "2023-12-12",
                $expiryDate: "2023-12-12",
                $usageExpiryDate: "2023-12-12",
            }
        }
    */
      const promo = await promoCodeService.createPromo(req.body);
      if (promo.statusCode) {
         return next(promo);
      }
      res.status(200).json({
         status: "success",
         promo,
      });
   })
);

router.get(
   "/",
   auth,
   restrict("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      const { page, size } = req.query;
      const promoCodes = await promoCodeService.getAllPromos(page, size);
      res.status(200).json({
         status: "success",
         promoCodes,
      });
   })
);

router.get(
   "/promo/:id",
   auth,
   restrict("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      const promo = await promoCodeService.getAPromo(req.params.id);
      if (promo.statusCode) {
         return next(promo);
      }
      res.status(200).json({
         status: "success",
         promo,
      });
   })
);

router.patch(
   "/promo/:id",
   auth,
   restrict("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['update promo'] = {
            "in": "body",
            schema: {
                $name: "string",
                $value: "number",
                $startDate: "2023-12-12",
                $expiryDate: "2023-12-12",
                $usageExpiryDate: "2023-12-12",
            }
        }
    */
      const promo = await promoCodeService.updatePromo({
         promoId: req.params.id,
         data: req.body,
      });
      if (promo.statusCode) {
         return next(promo);
      }
      res.status(200).json({
         status: "success",
         promo,
      });
   })
);

router.get(
   "/users/:promoId",
   auth,
   restrict("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      const promoUsers = await promoCodeService.getPromosUsers(
         req.params.promoId
      );
      if (promoUsers.statusCode) return next(promoUsers);
      else {
         res.status(200).json({
            status: "success",
            users: promoUsers,
         });
      }
   })
);

router.patch(
   "/deactivate/:id",
   auth,
   restrict("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      const promoId = req.params.id;
      const deactivate = await promoCodeService.deactivatePromo(promoId);
      if (deactivate.statusCode) return next(deactivate);
      res.status(200).json({
         status: "success",
         promo: deactivate,
      });
   })
);

// router.patch('/cancelPromoCode', auth, catchAsync(async (req, res, next) => {
//     const promo = await promoCodeService.updatePromo()
//     if (promo.statusCode) {
//          return next(promo);
//     }
//     res.status(200).json({
//         status: "success",
//         promo
//     })
// }))

router.get(
   "/access",
   auth,
   restrict("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      let accesses = await promoCodeService.getAllAccess();
      res.status(200).json({
         status: "success",
         accesses,
      });
   })
);

router.get(
   "/access/getOne/:id",
   auth,
   restrict("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      const id = req.params.id;
      const access = await promoCodeService.getOneAccess(id);
      if (access.statusCode) return next(access);
      res.status(200).json({
         status: "success",
         access,
      });
   })
);

router.get(
   "/access/getByPhone/:PhoneNumber",
   auth,
   restrict("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      const PhoneNumber = req.params.PhoneNumber;
      const access = await promoCodeService.getAccessForPhone(PhoneNumber);
      if (access.statusCode) return next(access);
      res.status(200).json({
         status: "success",
         access,
      });
   })
);

router.get(
   "/access/getByPromoName/:PromoName",
   auth,
   restrict("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      const PromoName = req.params.PromoName;
      const access = await promoCodeService.getAccessForPromo(PromoName);
      if (access.statusCode) return next(access);
      res.status(200).json({
         status: "success",
         access,
      });
   })
);

router.post(
   "/access/create",
   auth,
   restrict("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['create access'] = {
            "in": "body",
            schema: {
                $phoneNumber: "string",
                $name: "string",
            }
        }
    */
      const data = {
         phoneNumber: req.body.phoneNumber,
         name: req.body.name,
      };
      const access = await promoCodeService.createAccess(data);
      if (access.statusCode) return next(access);
      res.status(200).json({
         status: "success",
         access,
      });
   })
);

router.patch(
   "/access/update/:id",
   auth,
   restrict("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['update access'] = {
            "in": "body",
            schema: {
                $phoneNumber: "string",
                $name: "string",
            }
        }
    */
      const id = req.params.id;
      const access = await promoCodeService.updateAccess(req.body, id);
      if (access.statusCode) return next(access);
      res.status(200).json({
         status: "success",
         access,
      });
   })
);

router.delete(
   "/access/delete/:id",
   auth,
   restrict("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      const id = req.params.id;
      const access = await promoCodeService.deleteAccess(id);
      if (access.statusCode) return next(access);
      res.status(200).json({
         status: "success",
         access,
      });
   })
);

router.post(
   "/userVoucher/:id",
   auth,
   restrict("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['userVoucher'] = {
            "in": "body",
            schema: {
                $value: "string",
            }
        }
    */
      const userId = req.params.id;
      let value = req.body.value;
      if (!value || !userId) {
         return next(new AppError("Missing voucher or userId", 400));
      }
      const userWithVoucher = await promoCodeService.checkAndAssignPromo({
         value,
         userId,
      });
      if (userWithVoucher.statusCode) {
         return next(userWithVoucher);
      }
      if (typeof userWithVoucher === "string") {
         res.status(200).json({
            msg: userWithVoucher,
         });
      }
      res.status(200).json({
         status: "success",
         user: userWithVoucher,
      });
   })
);

module.exports = router;
