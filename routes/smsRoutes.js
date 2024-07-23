const express = require("express");
const smsService = require("../services/smsService");
const userService = require("../services/userService");
const catchAsync = require("../utils/catchAsync");
const router = express.Router();

router.post(
   "/sendOTP",
   catchAsync(async (req, res, next) => {
      /*
    #swagger.parameters['send otp'] = {
        in: 'body',
        schema: {
            $mobileNumber: "+20123456789"
        }
    }
    */
      const mobileNumber = req.body.mobileNumber;
      const lang = req.headers["accept-language"] || "ar";
      const response = await smsService.sendOtp(mobileNumber, lang);
      if (response.statusCode) {
         return next(response);
      }
      let checkExist = 1;
      const result = await userService.checkExist(mobileNumber);
      if (result === "Not Exist") {
         checkExist = 1;
      } else if (result === "Exist and active") {
         checkExist = 2;
      } else if (result === "Exist and inactive") {
         checkExist = 3;
      } else if (result.statusCode) return next(result);
      else {
      }
      response["checkExist"] = checkExist;
      res.status(200).json(response);
   })
);

router.post(
   "/sendLoginOTP",
   catchAsync(async (req, res, next) => {
      /*
    #swagger.parameters['send otp'] = {
        in: 'body',
        schema: {
            $mobileNumber: "+20123456789"
        }
    }
    */
      const mobileNumber = req.body.mobileNumber;
      let checkExist = await userService.findUserByPhoneNumber(mobileNumber);
      if (checkExist.statusCode) {
         return next(checkExist);
      }
      const response = await smsService.sendLoginOTP(
         mobileNumber,
         checkExist.user.id
      );
      if (response.statusCode) {
         return next(response);
      } else res.status(200).json(response);
   })
);

// router.get(
//    "/test",
//    catchAsync(async (req, res, next) => {
//       await smsService.sendSMSVF();
//       res.send("OK");
//    })
// );

router.post(
   "/sendEmail",
   catchAsync(async (req, res, next) => {
      let { to, subject, bcc, text, filePath, carId, arId, html } = req.body;
      if (typeof to === "string") {
         to = [to];
      }
      let resp = await smsService.sendMail(
         to,
         subject,
         bcc,
         text,
         filePath,
         carId,
         arId,
         html
      );
      res.status(200).json({ msg: "Done" });
      // axios
      //    .post("https://hook.eu1.make.com/m0ghdhdydyymy9kfnuf6mbkth5g9oyvp", {
      //       subject,
      //    })
      //    .then(() => {})
      //    .catch((err) => {
      //       console.log("Error: " + err);
      //    });
   })
);

router.post(
   "/verifyOTP",
   catchAsync(async (req, res, next) => {
      /*
    #swagger.parameters['verify otp'] = {
        in: 'body',
        schema: {
            $message: "message",
            $mobileNumber: "+20123456789",
            $otp: "1234"
        }
    }
     */
      const response = await smsService.verifyOtp(req.body);
      if (response.statusCode) {
         return next(response);
      }
      res.status(200).json({
         message: response,
      });
   })
);

router.post(
   "/sendSms",
   catchAsync(async (req, res, next) => {
      /*
    #swagger.parameters['send sms'] = {
        in: 'body',
        schema: {
            $message: "message",
            $mobileNumber: "0123456789"
        }
    }
    */
      const mobile = req.body.mobileNumber;
      const message = req.body.message;
      const response = await smsService.sendSms({ mobile, message });
      if (response.statusCode) {
         return next(response);
      }
      res.status(200).json({
         message: response,
      });
   })
);

// router.post(
//    "/sendMail",
//    catchAsync(async (req, res, next) => {
//       let { to, subject, text } = req.body;
//       await smsService.sendMail(to, subject, text);
//       res.status(200).send({ msg: "great" });
//    })
// );

module.exports = router;
