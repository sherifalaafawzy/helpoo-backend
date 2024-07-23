const express = require("express");
const auth = require("../middlewares/auth");
const catchAsync = require("../utils/catchAsync");
const router = express.Router();

const inspectionCompanyService = require("../services/InspectionCompany");

router.post(
   "/create",
   auth,
   catchAsync(async (req, res, next) => {
      // console.log(req.get("host"));
      let host = req.get("host");
      let inspectionManager =
         await inspectionCompanyService.createInspectionCompany(
            req.body,
            host.split(".")[0]
         );
      // console.log(inspectionManager);

      if (inspectionManager.statusCode)
    
         return next(inspectionManager);
      else
         res.status(201).json({
            status: "success",
            inspectionManager,
         });
   })
);

router.post(
   "/createInspectionManager",
   auth,
   catchAsync(async (req, res, next) => {
      let { data, inspectionCompany } = req.body;
      // console.log(req.get("host"));
      let host = req.get("host");
      let inspectionManager =
         await inspectionCompanyService.createInspectionManager(
            data,
            inspectionCompany,
            host.split(".")[0]
         );
      if (inspectionManager.status)

         return next(inspectionManager);
      else
         res.status(201).json({
            status: "success",
            inspectionManager,
         });
   })
);

router.get(
   "/getByIns/:insuranceId",
   auth,
   catchAsync(async (req, res, next) => {
      let inspectionCompanies =
         await inspectionCompanyService.getAllForInsurance(
            req.params.insuranceId
         );
      res.status(200).json({
         status: "success",
         inspectionCompanies,
      });
   })
);

router.post(
   "/assignInspectionComp",
   auth,
   catchAsync(async (req, res, next) => {
      let { inspectionCompanyId, accidentReportId } = req.body;
      let inspectionCompany =
         await inspectionCompanyService.assignInspectionCompany(
            inspectionCompanyId,
            accidentReportId
         );
      if (inspectionCompany.statusCode)

         return next(inspectionCompany);
      else
         res.status(200).json({
            status: "success",
            inspectionCompany,
         });
   })
);

module.exports = router;
