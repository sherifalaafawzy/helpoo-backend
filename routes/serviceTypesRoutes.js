const express = require("express");
const catchAsync = require("../utils/catchAsync");
const restriction = require("../middlewares/restriction");
const auth = require("../middlewares/auth");
const personRole = require("../enums/Roles");

const serviceTypes = require("../services/serviceTypes");

const router = express.Router();

router.get(
   "/",
   auth,
   restriction(personRole.Admin, personRole.Super),
   catchAsync(async (req, res, next) => {
      const types = await serviceTypes.getAll();
      res.status(200).json({
         status: "success",
         types,
      });
   })
);

router.get(
   "/:id",
   auth,
   restriction(personRole.Admin, personRole.Super),
   catchAsync(async (req, res, next) => {
      const id = req.params.id;
      const type = await serviceTypes.getOne(id);
      if (type.statusCode) return next(type);
      else
         res.status(200).json({
            status: "success",
            type,
         });
   })
);
router.post(
   "/create",
   auth,
   restriction(personRole.Admin, personRole.Super),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['create serviceType'] = {
            in: 'body',
            schema: {
                $ar_name: "ونش منخفض",
                $en_name: "European",
                $base_cost: 100,
                $costPerKm: 10,
                $car_type: 1,
            }
        }
    */
      const newType = await serviceTypes.createType(req.body);
      if (newType.statusCode) return next(type);
      else
         res.status(201).json({
            status: "success",
            newType,
         });
   })
);

router.patch(
   "/:id",
   auth,
   restriction(personRole.Admin, personRole.Super),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['update serviceType'] = {
            in: 'body',
            schema: {
                $ar_name: "ونش منخفض",
                $en_name: "European",
                $base_cost: 100,
                $costPerKm: 10,
                $car_type: 1,
            }
        }
    */
      const id = req.params.id;
      const type = await serviceTypes.updateType(id, req.body);
      if (type.statusCode) return next(type);
      else
         res.status(200).json({
            status: "success",
            msg: type,
         });
   })
);

module.exports = router;
