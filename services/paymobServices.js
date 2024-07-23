// NPM Lib
const axios = require("axios");
const moment = require("moment");

// Models
const ServiceRequest = require("../models/ServiceRequest");
const PackageTransactions = require("../models/PackageTransactions");

// Services
const clientPackageService = require("./ClientPackageService");
const clientService = require("./clientService");
const PackagePromoCode = require("./PackagePromoCode");

// Utils
const AppError = require("../utils/AppError");
const packagePromoCodeService = require("./PackagePromoCode");
const smsService = require("./smsService");
const packageCustomization = require("./PackageCustomization");
const userService = require("./userService");
const packageService = require("./packageService");

// Statics
const PAYMOB_API_KEY = process.env.PAYMOB_API_KEY;
const headers = {
   "Content-Type": "application/json",
};
class PaymobService {
   async authenticate() {
      const url = "https://accept.paymobsolutions.com/api/auth/tokens";
      const data = {
         api_key: PAYMOB_API_KEY,
      };
      const response = await axios.post(url, data, { headers });
      return response.data.token;
   }
   async createOrder(token, amount) {
      const url = "https://accept.paymobsolutions.com/api/ecommerce/orders";
      const data = {
         delivery_needed: "false",
         merchant_id: process.env.PAYMOB_MERCHANT_ID,
         amount_cents: amount,
         currency: "EGP",
         items: [],
         auth_token: token,
      };
      const response = await axios.post(url, data, {
         headers: {
            ...headers,
         },
      });
      return response.data;
   }
   async createPaymentKey(requestData) {
      const {
         token,
         amount,
         orderId,
         first_name,
         last_name,
         email,
         phone_number,
         integration_id,
      } = requestData;
      const url =
         "https://accept.paymobsolutions.com/api/acceptance/payment_keys";
      const data = {
         auth_token: token,
         amount_cents: amount,
         expiration: 600,
         order_id: orderId,
         billing_data: {
            first_name,
            last_name,
            email: email ? email : "developers@helpooapp.com",
            phone_number,
            floor: "NA",
            apartment: "NA",
            street: "NA",
            building: "NA",
            shipping_method: "NA",
            postal_code: "NA",
            city: "NA",
            country: "NA",
            state: "NA",
         },
         currency: "EGP",
         integration_id,
      };
      const response = await axios.post(url, data, headers);
      return response.data;
   }
   async createPaymentToken(requestData) {
      try {
         let authToken = await this.authenticate();
         let order = await this.createOrder(authToken, requestData.amount);
         console.log(order);
         console.log(order.id);

         if (requestData.packageId) {
            let check = await PackagePromoCode.getUsedPromoForUserAndPackage(
               requestData.userId,
               requestData.packageId
            );

            let pkg = await packageService.getOnePackage(requestData.packageId);
            requestData.amount = pkg.fees * 100;
            if (
               check &&
               !check.ClientPackageId &&
               moment(check.createdAt).add("15", "minutes").isAfter(moment())
            ) {
               requestData.amount = check.fees * 100;
            }
            await this.createPackageTransactions(
               order.id,
               requestData.amount,
               requestData.packageId,
               requestData.userId,
               "online-card",
               "pending",
               requestData.lang
            );
         } else if (requestData.serviceRequestId) {
            let servRequest = await this.createServiceRequestTransactions(
               order.id,
               requestData.serviceRequestId
            );
            requestData.amount = Number.parseInt(servRequest.fees) * 100;
         } else {
            return new AppError("No package or service request found", 404);
         }
         let paymentKey = await this.createPaymentKey({
            ...requestData,
            token: authToken,
            orderId: order.id,
         });
         return paymentKey;
      } catch (error) {
         console.error(error);
         return new AppError(error.message, 500);
      }
   }
   async createPackageTransactions(
      orderId,
      amount,
      packageId,
      userId,
      transactionType,
      transactionStatus,
      lang
   ) {
      await PackageTransactions.create({
         orderId,
         transactionType,
         transactionStatus,
         transactionAmount: amount / 100,
         transactionDate: new Date(),
         PackageId: packageId,
         UserId: userId,
         lang,
      });
   }
   async createServiceRequestTransactions(orderId, serviceRequestId) {
      let serviceRequest = await ServiceRequest.update(
         {
            order_id: orderId,
         },
         {
            where: {
               id: serviceRequestId,
            },
         }
      );
      serviceRequest = await ServiceRequest.findByPk(serviceRequestId, {
         attributes: ["id", "fees"],
      });
      console.log(serviceRequest);
      return serviceRequest;
   }
   async paymentTransactionCallback(requestData) {
      const { order, pending, success } = requestData.obj;
      if (!order.id) {
         throw new AppError("Order ID is required", 400);
      }
      const packageTransaction = await PackageTransactions.findOne({
         where: {
            orderId: order.id,
         },
      });
      if (!packageTransaction) {
         //should here check for service request next
         let order_id = order.id.toString();
         console.log(order_id);
         const serviceRequest = await ServiceRequest.findOne({
            where: {
               order_id,
            },
         });
         if (!serviceRequest) {
            return new AppError("No package or service request found", 404);
         } else {
            if (serviceRequest.paymentStatus === "paid") return "ok";
            else {
               const updating = await serviceRequest.update({
                  paymentMethod: "online-card",
                  paymentStatus: success ? "paid" : "not-paid",
                  paidAt: moment(Date.now()).format(),
                  paymentResponse: requestData.obj,
                  status: success ? "confirmed" : "open",
               });
               await serviceRequest.save();
               return serviceRequest;
            }
         }
      } else {
         try {
            if (packageTransaction.transactionStatus === "paid") return "ok";
            else {
               await packageTransaction.update({
                  transactionStatus: success ? "paid" : "not-paid",
                  transactionDate: new Date(),
                  transactionResponse: requestData.obj,
               });
               if (success) {
                  const user = await userService.getOneUser(
                     packageTransaction.UserId
                  );
                  const client = await clientService.getClientByUserId(
                     packageTransaction.UserId
                  );
                  if (client.statusCode) return client;
                  const usedPromo =
                     await packagePromoCodeService.getUsedPromoForUserAndPackage(
                        packageTransaction.UserId,
                        packageTransaction.PackageId
                     );
                  const tryinnng = await clientPackageService.subscribe({
                     PackageId: packageTransaction.PackageId,
                     ClientId: client.id,
                     orderId: packageTransaction.orderId,
                  });
                  const clientPack =
                     await clientPackageService.isClientHasPackage(
                        client.id,
                        packageTransaction.PackageId
                     );
                  let checkIfCustomized =
                     await packageCustomization.getPackageCustomization(
                        packageTransaction.PackageId
                     );
                  if (usedPromo) {
                     await packagePromoCodeService.updateUsedPromo(
                        usedPromo.id,
                        {
                           ClientPackageId: clientPack.id,
                        }
                     );
                     if (usedPromo.PackagePromoCode.SMS) {
                        if (packageTransaction.lang == "ar") {
                           await smsService.sendSms({
                              mobile: user.user.PhoneNumber,
                              message: usedPromo.PackagePromoCode.SMS,
                           });
                        } else {
                           console.log("Sending English SMS message");

                           await smsService.sendSms({
                              mobile: user.user.PhoneNumber,
                              message: usedPromo.PackagePromoCode.ENSMS,
                           });
                        }
                     }
                  } else if (
                     !checkIfCustomized.statusCode &&
                     checkIfCustomized.SMS
                  ) {
                     if (packageTransaction.lang == "ar") {
                        await smsService.sendSms({
                           mobile: user.user.PhoneNumber,
                           message: checkIfCustomized.SMS,
                        });
                     } else {
                        await smsService.sendSms({
                           mobile: user.user.PhoneNumber,
                           message: checkIfCustomized.ENSMS,
                        });
                     }
                  } else {
                     if (packageTransaction.lang == "ar") {
                        await smsService.sendSms({
                           mobile: user.user.PhoneNumber,
                           message:
                              " تم الاشتراك في تطبيق هلبو بنجاح ، سيتم تفعيل الباقة على السيارة بعد اضافتها الى الباقة بـ5 ايام",
                        });
                     } else {
                        await smsService.sendSms({
                           mobile: user.user.PhoneNumber,
                           message:
                              "You have successfully subscribed to Helpoo package, The package will be activated after 5 days from adding a car to it",
                        });
                     }
                  }
               }
               return packageTransaction;
            }
         } catch (err) {
            console.error(err);
            return new AppError(err.message, 400);
         }
      }
   }
}
const paymobService = new PaymobService();
module.exports = paymobService;
