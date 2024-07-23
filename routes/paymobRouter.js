const express = require("express");
const auth = require("../middlewares/auth");
const paymobService = require("../services/paymobServices");
const catchAsync = require("../utils/catchAsync");
const path = require("path");
const router = express.Router();

router.post(
   "/getIframe",
   auth,
   catchAsync(async (req, res, next) => {
      /*
    #swagger.parameters['getIframe'] = {
        in: 'body',
        schema: {
            $amount: 1500,
            $packageId: 1,
            $serviceRequestId: 1
        }
    }
  */
      const user = req.user;
      const { amount } = req.body;

      const generatedToken = await paymobService.createPaymentToken({
         amount: Number(amount) * 100,
         currency: "EGP",
         integration_id: process.env.PAYMOB_INTEGRATION_ID,
         // integration_id: 2026787,
         email: user.email,
         phone_number: user.username,
         first_name: user.name,
         last_name: user.name,
         packageId: Number(req.body.packageId),
         userId: user.id,
         serviceRequestId: Number(req.body.serviceRequestId),
         lang: req.headers["accept-language"],
      });
      if (generatedToken.statusCode)

         return next(generatedToken);
      else {
         // const iframe = 378572;
         const iframe = process.env.PAYMOB_IFRAME;
         res.status(200).json({
            status: "success",
            iframe_url: `https://accept.paymobsolutions.com/api/acceptance/iframes/${iframe}?payment_token=${generatedToken.token}`,
         });
      }
   })
);

router.post(
   "/callback",
   catchAsync(async (req, res, next) => {
      const response = await paymobService.paymentTransactionCallback(req.body);
      if (response.statusCode)
         return next(response);
      else
         res.status(200).json({
            status: "success",
            data: response,
         });
   })
);

router.get(
   "/callback",
   catchAsync(async (req, res, next) => {
      let { success, pending, order, txn_response_code } = req.query;
      const data = {
         obj: {
            order: {
               id: order,
            },
            success: success === "true" ? true : false,
         },
      };
      const respo = await paymobService.paymentTransactionCallback(data);
      if (success === "true") success = true;
      else success = false;
      if (success) {
         res.status(200).sendFile(
            path.join(__dirname, "../views/success.html")
         );
      }
      // else if (pending) {
      //     res.status(200).send("Payment Pending");
      // }
      else {
         let error = txn_response_code
            ? txn_response_code.split("_").join(" ").toLowerCase()
            : "error occurred";
         let errorMessage = req.query["data.message"];
         res.setHeader("Content-Type", "text/html");
         res.status(400).send(`
        <html>

        <head>
          <link href="//maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" rel="stylesheet">
          <script src="//code.jquery.com/jquery.min.js"></script>
          <script src="//maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js"></script>
        
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
          <!-- Meta, title, CSS, favicons, etc. -->
          <meta charset="utf-8">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        
          <link rel="icon" href="/static/base/img/acc_blue.png">
        
          <title>Payment Status | </title>
        
          <!-- Custom Theme Style -->
          <script type="text/javascript" src="/static/base/js/jquery-2.2.4.js"></script>
        </head>
        
        <body>
          <div class="container" style="margin-top:5%; margin-bottom: 5%; padding-right: 30px; padding-left: 30px;">
            <div class="row">
        
              <div class="container">
                <div class="row text-center">
                  <div class="col-sm-8 col-sm-offset-2 col-md-8 col-md-offset-2">
                    <br><br>
                    <h2 style="color:#5C5C5C; font-size:26px;">Error Occured</h2>
                    <img src="https://api.helpooapp.net/views/static/false-sign.png" style="height: 85px;">
                    <p style="font-size:26px;color:#5C5C5C;">Thank you for using the online payment service.</p>
                    <p style="font-size:26px;color:#5C5C5C;">${errorMessage}! If this problem persists, please contact your
                      service provider.</p>
                    <br><br>
                    
                    <div style="text-align:center">
                    © Payment is powered by <a href="https://www.paymob.com">Paymob</a>
                    </div>
                    </div>
                    </div>
              </div>
            </div>
          </div>
        
        </body>
        
        </html>
        `);
      }
   })
);

module.exports = router;
