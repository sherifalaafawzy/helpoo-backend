const express = require("express");
const catchAsync = require("../utils/catchAsync");
const auth = require("../middlewares/auth");
const restricted = require("../middlewares/restriction");
const clientService = require("../services/clientService");
const RolesEnum = require("../enums/Roles");
const router = express.Router();

router.get(
   "/getAll",
   auth,
   restricted(RolesEnum.Admin, RolesEnum.Super),
   catchAsync(async (req, res, next) => {
      const clients = await clientService.getAllClients();
      if (clients.statusCode) {
         return next(clients);
      }
      res.status(200).json({
         status: "success",
         clients,
      });
   })
);

router.get(
   "/getOne/:clientId",
   auth,
   restricted(RolesEnum.Admin, RolesEnum.Super),
   catchAsync(async (req, res, next) => {
      const client = await clientService.getClientById(
         Number(req.params.clientId)
      );
      if (client.statusCode) {
         return next(client);
      }
      res.status(200).json({
         status: "success",
         client,
      });
   })
);

// router.delete("/deleteOne", auth , restricted('Admin', 'Super'), catchAsync(async (req,res,next)=>{
//     const corporate = await clientService.getClientByUserId(req.body.corporateCompanyId)
//     if(corporate.statusCode){
//          return next(corporate)
//     }
//     res.status(200).json({
//         status:"success",
//         corporate
//     })
// }))

router.patch(
   "/edit/:clientId",
   auth,
   restricted(RolesEnum.Admin, RolesEnum.Super),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['edit client'] = {
            "in": "body",
            schema: {
                $active: "true",
                $confirmed: "true",
            }
        }
    */
      const clientId = req.params.clientId;
      const updateClient = await clientService.updateClient({
         clientId,
         data: req.body,
      });
      if (updateClient.statusCode) {
         return next(updateClient);
      }
      res.status(200).json({
         status: "success",
         updateClient,
      });
   })
);

module.exports = router;
