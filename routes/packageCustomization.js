const express = require("express");
const auth = require("../middlewares/auth");
const catchAsync = require("../utils/catchAsync");
const router = express.Router();

const customizationService = require("../services/PackageCustomization");

router.get(
   "/",
   auth,
   catchAsync(async (req, res, next) => {
      const customizations =
         await customizationService.getAllPackageCustomizations();
      res.status(200).json({ customizations });
   })
);

router.post(
   "/",
   auth,
   catchAsync(async (req, res, next) => {
      const customization = await customizationService.createCustomization(
         req.body.packageId,
         req.body
      );
      if (customization.status)
       
         return next(customization);
      else res.status(200).json({ customization });
   })
);

router
   .route("/:packageId")
   .get(
      auth,
      catchAsync(async (req, res, next) => {
         const customization =
            await customizationService.getPackageCustomization(
               req.params.packageId
            );
         if (customization.status)
     
            return next(customization);
         else res.status(200).json({ customization });
      })
   )
   .patch(
      auth,
      catchAsync(async (req, res, next) => {
         const customization = await customizationService.updateCustomization(
            req.params.packageId,
            req.body
         );
         if (customization.status)
       
            return next(customization);
         else res.status(200).json({ customization });
      })
   );

module.exports = router;
