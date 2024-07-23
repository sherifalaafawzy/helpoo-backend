const express = require("express");
const auth = require("../middlewares/auth");
const restriction = require("../middlewares/restriction");
const catchAsync = require("../utils/catchAsync");
const RolesEnum = require("../enums/Roles");

const manufacturerService = require("../services/manufacturerService");

const router = express.Router();

router.get(
   "/",
   catchAsync(async (req, res, next) => {
      const manufacturers = await manufacturerService.getAllManufacturer();
      res.status(200).json({
         status: "success",
         manufacturers,
      });
   })
);

router.post(
   "/create",
   auth,
   restriction(RolesEnum.Admin, RolesEnum.Super),
   catchAsync(async (req, res, next) => {
      /*
      #swagger.parameters['create manufacturer'] = {
          in: 'body',
          schema: {
            $en_name: "en_name",
            $ar_name: "ar_name",
          }
      }
  */
      const manufacturer = await manufacturerService.createManufacturer(
         req.body
      );
      res.status(200).json({
         status: "success",
         manufacturer,
      });
   })
);

router.patch(
   "/:id",
   auth,
   restriction(RolesEnum.Admin, RolesEnum.Super),
   catchAsync(async (req, res, next) => {
      /*
      #swagger.parameters['update manufacturer'] = {
          in: 'body',
          schema: {
            $en_name: "en_name",
            $ar_name: "ar_name",
          }
      }
  */
      const manufacturer = await manufacturerService.updateManufacturer(
         req.params.id,
         req.body
      );
      if (manufacturer.statusCode)
         return next(manufacturer);
      res.status(200).json({
         status: "success",
         manufacturer,
      });
   })
);

router.get(
   "/:id",
   auth,
   restriction(RolesEnum.Admin, RolesEnum.Super),
   catchAsync(async (req, res, next) => {
      const manufacturer = await manufacturerService.getManufacturer(
         req.params.id
      );

      if (manufacturer.statusCode)
         return next(manufacturer);

      res.status(200).json({
         status: "success",
         manufacturer,
      });
   })
);

router.delete(
   "/:id",
   auth,
   restriction(RolesEnum.Admin, RolesEnum.Super),
   catchAsync(async (req, res, next) => {
      const deleteManu = await manufacturerService.deleteManufacturer(
         req.params.id
      );
      if (deleteManu.statusCode)
         return next(deleteManu);
      res.status(204).json({
         status: "success",
         msg: deleteManu,
      });
   })
);

module.exports = router;
