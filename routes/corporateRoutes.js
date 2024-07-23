const express = require("express");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const auth = require("../middlewares/auth");
const restricted = require("../middlewares/restriction");
const corporateCompanyService = require("../services/CorporateCompanyService");
const RolesEnum = require("../enums/Roles");
const serviceRequest = require("../services/ServiceRequestService");

const router = express.Router();

router.post(
   "/create",
   auth,
   restricted(RolesEnum.Admin, RolesEnum.Super),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['Create Corporate Company'] = {
            in: 'body',
            schema: {
                $en_name: "string",
                $ar_name: "string",
                $discount_ratio: 15,
                $deferredPayment: true,
                $endDate: "2021-12-12",
                $cash:true,
                $credit:true,
                $online:true,
                $photo: "string",
            }
        }
    */
      const corporate = await corporateCompanyService.createCorporateCompany(
         req.body
      );
      if (corporate.statusCode) return next(corporate);
      else
         res.status(201).json({
            status: "success",
            corporate,
         });
   })
);

// router(
//    "/getUsersForCorporate",
//    auth,
//    restricted(
//       RolesEnum.Admin,
//       RolesEnum.CallCenter,
//       RolesEnum.Super,
//       RolesEnum.Corporate
//    ),
//    catchAsync(async (req, res, next)=>{

//    })
// );

router.get(
   "/getAll",
   auth,
   restricted(RolesEnum.Admin, RolesEnum.Super, RolesEnum.CallCenter),
   catchAsync(async (req, res, next) => {
      const corporates = await corporateCompanyService.getAllCorporates();
      if (corporates.statusCode) {
         return next(corporates);
      } else
         res.status(200).json({
            status: "success",
            ...corporates,
         });
   })
);
router.get(
   "/serviceRequests/:corporateId",
   auth,
   catchAsync(async (req, res, next) => {
      const corporateId = req.params.corporateId;
      let { page, size } = req.query;
      const corporateCompanyRequests =
         await serviceRequest.getCorporateRequests(corporateId, page, size);
      if (corporateCompanyRequests.statusCode) {
         return next(corporateCompanyRequests);
      } else
         res.status(200).json({
            status: "success",
            corporateCompanyRequests,
         });
   })
);

router.get(
   "/one/:corporateCompanyId",
   auth,
   restricted(RolesEnum.Admin, RolesEnum.Super),
   catchAsync(async (req, res, next) => {
      const corporateCompany = await corporateCompanyService.getACorporate(
         Number(req.params.corporateCompanyId)
      );
      if (corporateCompany.statusCode) {
         return next(corporateCompany);
      } else
         res.status(200).json({
            status: "success",
            corporateCompany,
         });
   })
);

router.delete(
   "/:corporateCompanyId",
   auth,
   restricted(RolesEnum.Admin, RolesEnum.Super),
   catchAsync(async (req, res, next) => {
      const corporate = await corporateCompanyService.deleteCorporateCompany(
         req.params.corporateCompanyId
      );
      if (corporate.statusCode) return next(corporate);
      res.status(200).json({
         status: "success",
         corporate,
      });
   })
);

router.get(
   "/search",
   auth,
   catchAsync(async (req, res, next) => {
      let { name } = req.query;
      let corporates = await corporateCompanyService.searchByName(name);
      if (corporates.statusCode) return next(corporates);

      res.status(200).json({
         status: "success",
         corporates,
      });
   })
);

router.patch(
   "/:corporateCompanyId",
   auth,
   restricted(RolesEnum.Admin, RolesEnum.Super),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['Update Corporate Company'] = {
            in: 'body',
            schema: {
                $en_name: "string",
                $ar_name: "string",
                $discount_ratio: 15,
                $deferredPayment: true,
                $endDate: "2021-12-12",
                $cash:true,
                $credit:true,
                $online:true,
                $photo: "string",
            }
        }
    */
      const corporateCompanyId = req.params.corporateCompanyId;
      const updateCorporate =
         await corporateCompanyService.updateCorporateCompany({
            data: req.body,
            corporateCompanyId,
         });
      if (updateCorporate.statusCode) {
         return next(updateCorporate);
      } else {
         const corporate = await corporateCompanyService.getACorporate(
            corporateCompanyId
         );
         res.status(200).json({
            status: "success",
            corporate,
         });
      }
   })
);

router.get(
   "/usersInCorporate/:id",
   auth,
   catchAsync(async (req, res, next) => {
      const users = await corporateCompanyService.getCorporatesInCC(
         req.params.id
      );
      res.status(200).json({
         status: "success",
         users,
      });
   })
);

module.exports = router;
