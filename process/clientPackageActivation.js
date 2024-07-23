// const cron = require("node-cron");
// const { Op } = require("sequelize");
// const moment = require("moment");
// const ClientPackage = require("../models/ClientPackage");
// const UsedPromosPackages = require("../models/UsedPromosPackages");
// const PackagePromoCode = require("../models/PackagePromoCode");
// const PackageCustomization = require("../models/PackageCustomization");
// const Package = require("../models/Package");
// const User = require("../models/User");
// const Client = require("../models/Client");
// const PackageTransactions = require("../models/PackageTransactions");

// // const packagePromo = require("../services/PackagePromoCode");
// const smsService = require("../services/smsService");
// /*
//     1- get all client packages that will start today
//     2- loop on them and get PromoCode Uses and if exist then send sms from it
//     3- if not exist then check for package customization
//     4 - if package customization not available then send generic sms
// */

// // const sendActivationMessage = cron.schedule("0 0 * * *", async () => {
// //    console.log("Activation");
// //    const date = new Date();
// //    const year = date.getFullYear();
// //    const month = date.getMonth() + 1;
// //    const day = date.getDate();
// //    const formattedDay = `${year}-${month}-${day}`;
// //    const formattedTomorrow = `${year}-${month}-${day + 1}`;
// //    const getTimeStampForToday = new Date(formattedDay).getTime();
// //    const getTimeStampForTomorrow = new Date(formattedTomorrow).getTime();

// //    let clientPackages = await ClientPackage.findAll({
// //       where: {
// //          startDate: {
// //             [Op.between]: [getTimeStampForToday, getTimeStampForTomorrow],
// //          },
// //       },
// //       include: [
// //          {
// //             model: Package,
// //             include: [PackageCustomization],
// //          },
// //          {
// //             model: UsedPromosPackages,
// //             include: [
// //                {
// //                   model: PackagePromoCode,
// //                },
// //             ],
// //          },
// //          {
// //             model: Client,
// //             include: [User],
// //          },
// //          {
// //             model: PackageTransactions,
// //          },
// //       ],
// //    });
// //    clientPackages = clientPackages.map((clientPackage) =>
// //       clientPackage.get({ plain: true })
// //    );
// //    for (let i = 0; i < clientPackages.length; i++) {
// //       let mobile = clientPackages[i].Client.User.PhoneNumber;
// //       let activationTime = startDate(clientPackages[i].startDate).format(
// //          "MM-DD h:mm:ss a"
// //       );
// //       let lang = clientPackages[i].PackageTransaction
// //          ? clientPackages[i].PackageTransaction.lang
// //             ? clientPackages[i].PackageTransaction.lang
// //             : "ar"
// //          : "ar";
// //       let lengthOfUsed = clientPackages[i].UsedPromosPackages.length;
// //       let lengthOfCustom =
// //          clientPackages[i].Package.PackageCustomizations.length;
// //       if (lengthOfCustom > 0 || lengthOfUsed > 0) {
// //          if (lengthOfUsed > 0) {
// //             if (
// //                clientPackages[i].UsedPromosPackages[0].PackagePromoCode
// //                   .ActivateSMS
// //             ) {
// //                if (lang == "en") {
// //                   await smsService.sendSms({
// //                      mobile,
// //                      message: `${clientPackages[i].UsedPromosPackages[0].PackagePromoCode.ActivateENSMS}\n you can enjoy your discount from ${activationTime}`,
// //                   });
// //                   continue;
// //                } else {
// //                   await smsService.sendSms({
// //                      mobile,
// //                      message: `${clientPackages[i].UsedPromosPackages[0].PackagePromoCode.ActivateSMS} \n يمكنك الاستفادة بالخصم من ${activationTime}`,
// //                   });
// //                   continue;
// //                }
// //             }
// //          }
// //          if (
// //             lengthOfCustom > 0 &&
// //             clientPackages[i].Package.PackageCustomizations[0].ActivateSMS
// //          ) {
// //             // if (clientPackages[i].Package.PackageCustomizations[0].ActivateSMS) {
// //             if (lang == "en") {
// //                await smsService.sendSms({
// //                   mobile,
// //                   message: `${clientPackages[i].Package.PackageCustomizations[0].ActivateENSMS}\n you can enjoy your discount from ${activationTime}`,
// //                });
// //                continue;
// //             } else {
// //                await smsService.sendSms({
// //                   mobile,
// //                   message: `${clientPackages[i].Package.PackageCustomizations[0].ActivateSMS}\n يمكنك الاستفادة بالخصم من ${activationTime}`,
// //                });
// //                continue;
// //             }
// //             // }
// //          }
// //       }
// //       if (lang == "en") {
// //          await smsService.sendSms({
// //             mobile,
// //             message: `Successfully activated the subscription in Helpoo's package\n you can enjoy your discount from ${activationTime}`,
// //          });
// //       } else {
// //          await smsService.sendSms({
// //             mobile,
// //             message: `تم تفعيل الاشتراك بنجاح في باقة هلبو\n يمكنك الاستفادة بالخصم من ${activationTime}`,
// //          });
// //       }
// //    }
// // });

// module.exports = sendActivationMessage;
