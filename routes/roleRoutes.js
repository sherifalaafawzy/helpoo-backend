const express = require("express");
const roleService = require("../services/roleService");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const auth = require("../middlewares/auth");
const restricted = require("../middlewares/restriction");

const router = express.Router();

router.post(
   "/",
   auth,
   restricted("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['create role'] = {
            "in": "body",
            schema: {
                "name": "Admin",
            }
        }
    */
      const newRole = await roleService.createRole(req.body);
      if (newRole.statusCode) {
         return next(newRole);
      }
      res.status(201).json({
         status: "success",
         role: newRole,
      });
   })
);

router.get(
   "/",
   catchAsync(async (req, res, next) => {
      const roles = await roleService.getRoles();
      res.status(200).json({
         status: "success",
         roles,
      });
   })
);

module.exports = router;
