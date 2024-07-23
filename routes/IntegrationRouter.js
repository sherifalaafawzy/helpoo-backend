const { Router } = require("express");
const CatchAsync = require("../utils/catchAsync");
const integrationService = require("../services/auth/integrationService");
const packageIntegrationService = require("../services/IntegrationPackages");
const carService = require("../services/carService");
const auth = require("../middlewares/auth");
const restrictions = require("../middlewares/restriction");
const AppError = require("../utils/AppError");
const router = Router();

router.post(
   "/register",
   auth,
   restrictions("Admin", "Super"),
   CatchAsync(async (req, res, next) => {
      const { clientName, secret } = req.body;
      const client = await integrationService.RegisterClient(
         clientName,
         secret
      );
      res.status(201).json({
         status: "success",
         data: client,
      });
   })
);

router.post(
   "/addUsersInPackage",
   auth,
   CatchAsync(async (req, res, next) => {
      const { packageId, users } = req.body;
      if (!Array.isArray(users))
         return next(new AppError("Users must be an array", 400));
      else {
         let role = req.user.Role.name;
         let user = req.user;
         const counts =
            await packageIntegrationService.registerManyUsersThenAssign(
               users,
               packageId,
               role,
               user
            );
         res.status(201).json({
            status: "success",
            data: counts,
         });
      }
   })
);

router.get(
   "/users",
   auth,
   restrictions("Admin", "Super"),
   CatchAsync(async (req, res, next) => {
      const clients = await integrationService.GetUsers();
      res.status(200).json({
         status: "success",
         data: clients,
      });
   })
);

router.post(
   "/reset",
   auth,
   restrictions("Admin", "Super"),
   CatchAsync(async (req, res, next) => {
      const { clientId, secret } = req.body;
      const client = await integrationService.ResetClientSecret(
         clientId,
         secret
      );
      if (client.statusCode) {
         return next(client);
      }
      res.status(200).json({
         status: "success",
         data: client,
      });
   })
);

router.post(
   "/getToken",
   CatchAsync(async (req, res, next) => {
      let client_id;
      let client_secret;
      if (req.headers.authorization) {
         const credi = Buffer.from(
            req.headers.authorization.split(" ")[1],
            "base64"
         ).toString();

         client_id = credi.split(":")[0];
         client_secret = credi.split(":")[1];
      } else {
         client_id = req.headers.client_id;
         client_secret = req.headers.client_secret;
      }
      const token = await integrationService.authenticateClient(
         client_id,
         client_secret
      );
      if (token.statusCode) {
         return next(token);
      } else
         res.status(200).json({
            status: "success",
            access_token: token,
         });
   })
);

router.post(
   "/delta/car",
   CatchAsync(async (req, res, next) => {
      // const token = req.headers.authorization
      if (
         !req.headers.authorization ||
         !req.headers.authorization.startsWith("Bearer")
      ) {
         return next(new AppError("Provide us login token", 401));
      } else {
         const token = req.headers.authorization.split(" ")[1];
         const { vinNo, policyNo } = req.body;
         const valid = await integrationService.verifyToken(token);
         if (valid.statusCode) {
            return next(valid);
         } else {
            const carData = await carService.findCarByVinNumber(
               vinNo,
               policyNo
            );
            if (carData.statusCode) {
               return next(carData);
            } else
               res.status(200).json({
                  status: "success",
                  data: carData,
               });
         }
      }
   })
);

// router.get('/authorize', (req,res, next)=>{
//     return render('authorize',{
//         clientId: req.query.client_id,
//         redirect_uri: req.query.redirect_uri
//     })
// })

// router.post("/authorize", (req,res, next) =>{
//     return oauth.authorize()
// })

module.exports = router;
