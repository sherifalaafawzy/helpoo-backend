const express = require("express");
const catchAsync = require("../utils/catchAsync");
const auth = require("../middlewares/auth");
const restriction = require("../middlewares/restriction");
const PDFTypeService = require("../services/PDFTypeService");
const AppError = require("../utils/AppError");

const router = express.Router();

router.post(
   "/createPdf",
   auth,
   restriction("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['create pdfType'] = {
            in: 'body',
            schema: {
                $pdfReportType: "beforeRepair",
            }
        }
    */
      try {
         const pdfType = await PDFTypeService.createPDFType(req.body);
         res.status(201).json({
            status: "success",
            pdfType,
         });
      } catch (err) {
         res.status(400).json({
            status: "failed",
            error: err.errors,
         });
      }
   })
);

router.get(
   "/:id",
   auth,
   // restriction("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      const id = req.params.id;
      const pdfType = await PDFTypeService.getPDFType(id);
      if (pdfType.statusCode) {
         return next(pdfType);
      }
      res.status(200).json({
         status: "success",
         pdfType,
      });
   })
);
router.put(
   "/:id",
   auth,
   restriction("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['update pdfType'] = {
            in: 'body',
            schema: {
                $pdfReportType: "beforeRepair",
            }
        }
    */
      const id = req.params.id;
      const updatedpdfType = await PDFTypeService.updatePDFType(id, req.body);
      if (updatedpdfType.statusCode) {

         return next(updatedpdfType);
      }
      const pdfType = await PDFTypeService.getPDFType(id);
      res.status(200).json({
         status: "success",
         pdfType,
      });
   })
);

router.delete(
   "/:id",
   auth,
   restriction("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      const pdfType = await PDFTypeService.deletePDFType(req.params.id);
      if (pdfType.statusCode) return next(pdfType);

      res.status(200).json({
         status: "success",
         msg: "Deleted Successfully",
      });
   })
);

router.get(
   "/",
   auth,
   // restriction("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      const pdfTypes = await PDFTypeService.getPDFTypes();
      res.json(pdfTypes);
   })
);

module.exports = router;
