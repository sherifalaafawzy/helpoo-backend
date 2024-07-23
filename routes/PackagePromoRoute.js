const express = require("express");

const packagePromoCodeService = require("../services/PackagePromoCode");

const auth = require("../middlewares/auth");
const restirct = require("../middlewares/restriction");

const catchAsync = require("../utils/catchAsync");
const Roles = require("../enums/Roles");

const router = express.Router();

router.get(
   "/",
   auth,
   catchAsync(async (req, res, next) => {
      const promoes = await packagePromoCodeService.getAllPromo();
      res.status(200).json({
         status: "success",
         promoes,
      });
   })
);

router.get(
   "/usedPromos",
   auth,
   catchAsync(async (req, res, next) => {
      let { pkgId, userId, promoId } = req.query;
      const promoes = await packagePromoCodeService.getUsedPromoWithFilters({
         pkgId,
         userId,
         promoId,
      });

      res.status(200).json({
         status: "success",
         promoes,
      });
   })
);

router.post(
   "/checkIfExists",
   catchAsync(async (req, res, next) => {
      let { value } = req.body;
      const bool = await packagePromoCodeService.isExist(value);
      res.status(200).json({
         status: "success",
         isPromoPackage: bool,
      });
   })
);

router.get(
   "/promoWithValidation",
   auth,
   catchAsync(async (req, res, next) => {
      let { value } = req.query;
      const promoes = await packagePromoCodeService.findPromoAndValidate(
         value,
         req.user.id
      );
      if (promoes.statusCode) {
         return next(promoes);
      }
      res.status(200).json({
         status: "success",
         promoes,
      });
   })
);

router.get(
   "/promoWithFilter",
   auth,
   catchAsync(async (req, res, next) => {
      let { corporateCompanyId, value, name } = req.query;
      const promoes = await packagePromoCodeService.getPromoWithFilters({
         corporateCompanyId,
         value,
         name,
      });

      res.status(200).json({
         status: "success",
         promoes,
      });
   })
);

router.post(
   "/shellPromo",
   auth,
   catchAsync(async (req, res, next) => {
      let { promo, amount, userId, pkgId } = req.body;
      let data = await packagePromoCodeService.applyShellPromoCode(
         promo,
         amount,
         userId,
         pkgId
      );
      if (data.statusCode) {
         return next(data);
      }
      res.status(200).send(data);
   })
);

router.get(
   "/byCorporate/:corporateName",
   auth,
   catchAsync(async (req, res, next) => {
      let data = await packagePromoCodeService.getPackagesWithCorporateName(
         req.params.corporateName
      );
      if (data.statusCode) {
         return next(data);
      }
      return res.status(200).send({ success: true, data });
   })
);

router.post(
   "/createCorporateDeal",
   auth,
   catchAsync(async (req, res, next) => {
      let {
         discountPercent,
         discountFees,
         PackageId,
         CorporateCompanyId,
         expiryDate,
      } = req.body;
      let deal = await packagePromoCodeService.createDeal(
         discountPercent,
         discountFees,
         PackageId,
         CorporateCompanyId,
         expiryDate
      );
      if (deal.statusCode) {
         return next(deal);
      }
      return res.status(201).send({
         status: "success",
         deal,
      });
   })
);

router.get(
   "/getCorporateDeals",
   auth,
   restirct(Roles.Super, Roles.Admin),
   catchAsync(async (req, res, next) => {
      let { page = 1, size = 10 } = req.query;
      let deals = await packagePromoCodeService.getAllDeals(page, size);
      res.status(200).json({
         status: "success",
         deals,
      });
   })
);

router.post(
   "/useByCorporate",
   auth,
   catchAsync(async (req, res, next) => {
      let { userId, pkgId, corporateName, dealId } = req.body;
      let promo = await packagePromoCodeService.usePromoWithCorporateName(
         userId,
         pkgId,
         corporateName,
         dealId
      );
      if (promo.statusCode) {
         return next(promo);
      }
      // console.log(promo);
      res.status(200).send({
         status: "success",
         promo,
      });
   })
);

router
   .route("/one/:id")
   .get(
      auth,
      catchAsync(async (req, res, next) => {
         const promo = await packagePromoCodeService.getPromo(req.params.id);
         if (promo.status) return next(promo);
         else
            res.status(200).json({
               status: "success",
               promo,
            });
      })
   )
   .patch(
      auth,
      restirct("Admin", "Super"),
      catchAsync(async (req, res, next) => {
         const promo = await packagePromoCodeService.updatePromo(
            req.params.id,
            req.body
         );
         if (promo.status) return next(promo);
         else
            res.status(200).json({
               status: "success",
               promo,
            });
      })
   )
   .delete(
      auth,
      restirct("Admin", "Super"),
      catchAsync(async (req, res, next) => {
         const promo = await packagePromoCodeService.deletePromo(req.params.id);
         if (promo.status) return next(promo);
         else
            res.status(204).json({
               status: "success",
            });
      })
   );

router.post(
   "/create",
   auth,
   restirct("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      //   let { name, value, startDate, expiryDate, percentage } = req.body;
      const promo = await packagePromoCodeService.createPromo(req.body);
      if (promo.status) return next(promo);
      else
         res.status(200).json({
            status: "success",
            promo,
         });
   })
);

router.post(
   "/assignPromo",
   auth,
   catchAsync(async (req, res, next) => {
      const { promoId, userId } = req.body;
      const promo = await packagePromoCodeService.assignPromo(promoId, userId);
      if (promo.status) return next(promo);
      else
         res.status(200).json({
            status: "success",
            promo,
         });
   })
);

router.post(
   "/useOnPackage",
   auth,
   catchAsync(async (req, res, next) => {
      const { userId, promoId, packageId } = req.body;
      const promo = await packagePromoCodeService.usePromoCodeInPackage({
         packageId,
         userId,
         promoId,
      });
      if (promo.status) return next(promo);
      else
         res.status(200).json({
            status: "success",
            promo,
         });
   })
);

module.exports = router;
