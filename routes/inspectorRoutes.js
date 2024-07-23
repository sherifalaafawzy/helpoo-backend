const express = require("express");
const auth = require("../middlewares/auth");
const restricted = require("../middlewares/restriction");
const catchAsync = require("../utils/catchAsync");

const insuranceCompany = require("../services/InsuranceCompany");
const inspectorService = require("../services/InspectorServices");
const AppError = require("../utils/AppError");
const router = express.Router();

router.post(
   "/createInspector",
   auth,
   catchAsync(async (req, res, next) => {
      // console.log(req.get("host"));
      let host = req.get("host");
      let { identifier, name, insuranceId, phoneNumbers, emails } = req.body;

      let inspector = await inspectorService.createInspector(
         { identifier, name },
         insuranceId,
         { phoneNumbers: phoneNumbers, emails: emails },
         host.split(".")[0]
      );
      if (inspector.statusCode) return next(inspector);
      else
         res.status(201).json({
            status: "success",
            inspector: "done",
         });
   })
);

router.post(
   "/addInspector",
   auth,
   restricted("InspectionManager"),
   catchAsync(async (req, res, next) => {
      let { identifier, name, inspectionCompanyId, phoneNumbers, emails } =
         req.body;
      // console.log(req.get("host"));
      let host = req.get("host");
      let inspector = await inspectorService.addInspector(
         { identifier, name },
         inspectionCompanyId,
         { phoneNumbers: phoneNumbers, emails: emails },
         host.split(".")[0]
      );
      if (inspector.statusCode) return next(inspector);
      else
         res.status(201).json({
            status: "success",
            inspector,
         });
   })
);

router.get(
   "/getByInsurance/:insuranceId",
   auth,
   catchAsync(async (req, res, next) => {
      let insuranceId = req.params.insuranceId;
      if (!insuranceId)
         return next(
            new AppError("Kindly add insurance Company Id in the params", 400)
         );
      else {
         let inspectors = await inspectorService.getAllInspectorForIns(
            insuranceId
         );
         res.status(200).json({
            status: "success",
            inspectors,
         });
      }
   })
);

router.get(
   "/getByInspectionCompany/:inspectionCompanyId",
   auth,
   catchAsync(async (req, res, next) => {
      let inspectionCompanyId = req.params.inspectionCompanyId;
      if (!inspectionCompanyId)
         return next(
            new AppError("Kindly add insurance Company Id in the params", 400)
         );
      else {
         let inspectors = await inspectorService.getAllInspectorForInspection(
            inspectionCompanyId
         );
         res.status(200).json({
            status: "success",
            inspectors,
         });
      }
   })
);

router.post(
   "/assignInspector",
   auth,
   catchAsync(async (req, res, next) => {
      let { accidentReportId, inspectorId } = req.body;
      let inspector = await inspectorService.assignInspector(
         accidentReportId,
         inspectorId
      );
      if (inspector.statusCode) return next(inspector);
      else {
         res.status(200).json({
            status: "success",
            assignedTo: inspector,
         });
      }
   })
);

module.exports = router;
