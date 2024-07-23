const express = require("express");
const auth = require("../middlewares/auth");
const fcmService = require("../services/FcmService");
const catchAsync = require("../utils/catchAsync");

const router = express.Router();

router.post(
   "/notifyMessage",
   auth,
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['notify message'] = {
            in: 'body',
            schema: {
                $token: "token",
                $title: "title",
                $body: "body",
                $type: "type",
                $key: 1
            }
        }
    */
      const message = await fcmService.notifyMessage(req.body);
      if (message.statusCode) {
         return next(message);
      } else
         res.status(200).json({
            status: "success",
            message,
         });
   })
);

module.exports = router;
