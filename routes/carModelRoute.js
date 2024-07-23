const express = require("express");
const auth = require("../middlewares/auth");
const restriction = require("../middlewares/restriction");
const catchAsync = require("../utils/catchAsync");
const rolesEnum = require("../enums/Roles");
const carModelService = require("../services/carModelsService");

const router = express.Router();

router.get(
   "/",
   catchAsync(async (req, res, next) => {
      const models = await carModelService.getAllModels();
      res.status(200).json({
         status: "success",
         models,
      });
   })
);

router.get(
   "/manufacturer/:id",
   catchAsync(async (req, res, next) => {
      const models = await carModelService.getModelByManu(
         Number(req.params.id)
      );
      res.status(200).json({
         status: "success",
         models,
      });
   })
);

router.post(
   "/create",
   auth,
   restriction(rolesEnum.Super, rolesEnum.Admin),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['Create Car model'] = {
            in: 'body',
            schema: {
                $ar_name: "موديل السيارة",
                $en_name: "car model",
                $ManufacturerId: 1
            }
        }
    */
      const model = await carModelService.createModel(req.body);

      if (model.statusCode) {
         return next(model);
      } else
         res.status(200).json({
            status: "success",
            model,
         });
   })
);

router
   .route("/model/:id")
   .patch(
      auth,
      restriction(rolesEnum.Super, rolesEnum.Admin),
      catchAsync(async (req, res, next) => {
         /*
            #swagger.parameters['Update Car model'] = {
                in: 'body',
                schema: {
                    $ar_name: "موديل السيارة",
                    $en_name: "car model",
                    $ManufacturerId: 1
                }
            }
        */
         const model = await carModelService.updateModel(
            req.params.id,
            req.body
         );
         if (model.statusCode) return next(model);
         else
            res.status(200).json({
               status: "success",
               model,
            });
      })
   )
   .delete(
      auth,
      restriction(rolesEnum.Super, rolesEnum.Admin),
      catchAsync(async (req, res, next) => {
         const deleteModel = await carModelService.deleteModel(req.params.id);
         if (deleteModel.statusCode) return next(deleteModel);
         else
            res.status(200).json({
               status: "success",
               msg: deleteModel,
            });
      })
   );
router.get(
   "/model/:id",
   catchAsync(async (req, res, next) => {
      const model = await carModelService.getAModel(req.params.id);
      if (model.statusCode) return next(model);
      else
         res.status(200).json({
            status: "success",
            model,
         });
   })
);
module.exports = router;
