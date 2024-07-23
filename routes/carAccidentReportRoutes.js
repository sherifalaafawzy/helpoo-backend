const express = require("express");
const catchAsync = require("../utils/catchAsync");
const carAccidentReportService = require("../services/carAccidentReportService");
const auth = require("../middlewares/auth");
const restricted = require("../middlewares/restriction");
const personRole = require("../enums/Roles");
const accidentReport = require("../services/AccidentReport");

const router = express.Router();
router.post(
   "/createPdfReport",
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['create pdf report'] = {
            in: 'body',
            schema: {
                $pdfReportId: 1,
                $AccidentReportId: 1,
                $carId: 1,
                $Type: "pdf",
                $pdfReport: "base64"
            }
        }



    */
      const {
         pdfReportId,
         AccidentReportId,
         carId,
         Type,
         pdfReport,
         subject,
         text,
         pdfLink,
      } = req.body;

      let report = await carAccidentReportService.createPdfReport({
         AccidentReportId,
         carId,
         pdfReportId,
         Type,
         pdfReport,
         subject,
         text,
         pdfLink,
      });
      if (report.statusCode) {
         return next(report);
      }
      res.status(200).json({
         status: "success",
         report,
      });
      // const ar = await accidentReport.getOneAccidentReport(AccidentReportId);
      // axios.post("https://hook.eu1.make.com/cjpk0ct14hbd7qmwnpykhhexwgaviycd", {
      //    accidentReport: ar,
      //    theNewFile: report.report,
      // });
      // if (subject) {
      //    axios
      //       .post(
      //          "https://hook.eu1.make.com/m0ghdhdydyymy9kfnuf6mbkth5g9oyvp",
      //          {
      //             subject,
      //          }
      //       )
      //       .then(() => {})
      //       .catch((err) => {
      //          console.log("Error: " + err);
      //       });
      // }
   })
);
router.post(
   "/receivePDF",
   catchAsync(async (req, res, next) => {
      const { reportId, reportLink } = req.body;
      const savePDF = await carAccidentReportService.savePDFLink(
         reportId,
         reportLink
      );
      res.status(200).send({ status: "success" });
   })
);
router.post(
   "/createPdfReportCombine",
   catchAsync(async (req, res, next) => {
      /*
       #swagger.parameters['create pdf report'] = {
           in: 'body',
           schema: {
               $pdfReportId: 1,
               $AccidentReportId: 1,
               $carId: 1,
               $Type: "pdf",
               $pdfReport: "base64"
           }
       }
   */
      const {
         pdfReportId,
         AccidentReportId,
         carId,
         Type,
         pdfReportOne,
         pdfReportTwo,
      } = req.body;
      let report = await carAccidentReportService.createPDFsWithMerge({
         AccidentReportId,
         carId,
         pdfReportId,
         Type,
         pdfReportOne,
         pdfReportTwo,
      });
      if (report.statusCode) {
         return next(report);
      } else
         res.status(200).json({
            status: "success",
            report,
         });
   })
);

router.get(
   "/getPdfReports/:accidentReportId",
   auth,
   restricted(
      personRole.Admin,
      personRole.Super,
      personRole.Insurance,
      personRole.Supervisor
   ),
   catchAsync(async (req, res, next) => {
      const accidentReportId = Number(req.params.accidentReportId);
      let reports = await carAccidentReportService.getPdfReports(
         accidentReportId
      );
      if (reports.statusCode) {
         return next(reports);
      }
      res.status(200).json({
         status: "success",
         reports,
      });
   })
);

module.exports = router;
