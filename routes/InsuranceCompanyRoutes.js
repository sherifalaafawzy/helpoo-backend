const express = require("express");
const catchAsync = require("../utils/catchAsync");
const auth = require("../middlewares/auth");
const restriction = require("../middlewares/restriction");
const insuranceCompany = require("../services/InsuranceCompany");
const AppError = require("../utils/AppError");
const RolesEnum = require("../enums/Roles");

const router = express.Router();

router.get(
   "/",
   auth,
   catchAsync(async (req, res, next) => {
      const insCompanies = await insuranceCompany.listInsuranceCompanies();
      res.status(200).json({
         status: "success",
         insuranceCompanies: insCompanies,
      });
   })
);

router.get(
   "/contracted",
   auth,
   catchAsync(async (req, res, next) => {
      const insCompanies =
         await insuranceCompany.listContractedInsuranceCompanies();
      res.status(200).json({
         status: "success",
         insuranceCompanies: insCompanies,
      });
   })
);

router.post(
   "/create",
   auth,
   restriction(RolesEnum.Admin, RolesEnum.Super),
   catchAsync(async (req, res, next) => {
      /*
    #swagger.parameters['create insurance company'] = {
      in: 'body',
      schema: {
        $ar_name: "شركة الشام",
        $en_name: "Sham Company",
        $package_request_count: 10,
        $max_total_discount: 10,
        $discount_percent_after_policy_expires: 10,
        $startDate: "2021-01-01",
        $endDate: "2021-01-01",
      }
    }
  */
      const newInsuranceCompany = await insuranceCompany.createInsurance(
         req.body
      );
      if (newInsuranceCompany.statusCode) {
         return next(newInsuranceCompany);
      }
      res.status(201).json({
         status: "success",
         newInsuranceCompany,
      });
   })
);
router.get(
   "/insurance/:insuranceCompanyId",
   auth,
   catchAsync(async (req, res, next) => {
      const oneInsuranceCompany = await insuranceCompany.getInsurance(
         req.params.insuranceCompanyId
      );
      if (oneInsuranceCompany.statusCode) {
         return next(oneInsuranceCompany);
      }
      res.status(200).json({
         status: "success",
         insuranceCompany: oneInsuranceCompany,
      });
   })
);
router.patch(
   "/edit/:insuranceCompanyId",
   auth,
   restriction(RolesEnum.Admin, RolesEnum.Super),
   catchAsync(async (req, res, next) => {
      /*
    #swagger.parameters['edit insurance company'] = {
      in: 'body',
      schema: {
        $ar_name: "شركة الشام",
        $en_name: "Sham Company",
        $package_request_count: 10,
        $max_total_discount: 10,
        $discount_percent_after_policy_expires: 10,
        $startDate: "2021-01-01",
        $endDate: "2021-01-01",
      }
    }
  */
      const insuranceCompanyId = req.params.insuranceCompanyId;
      const updateInsuranceCompany = await insuranceCompany.updateInsurance({
         data: req.body,
         insuranceCompanyId,
      });
      if (updateInsuranceCompany.statusCode) {
         return next(updateInsuranceCompany);
      }
      const insurance = await insuranceCompany.getInsurance(insuranceCompanyId);
      res.status(200).json({
         status: "success",
         insuranceCompany: insurance,
      });
   })
);
module.exports = router;
