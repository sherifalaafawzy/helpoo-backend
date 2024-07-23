const cron = require("node-cron");
const fs = require("fs");
const os = require("os");
const moment = require("moment");
const clientPackageService = require("../services/ClientPackageService");
const smsService = require("../services/smsService");
require("../models/relations");
// const fun = cron.schedule("* * * * * *", async () => {
//    console.log("sDate");
// });

module.exports = cron.schedule("0 0 * * *", async () => {
   let serverIp = os.networkInterfaces()["eth0"][0].address;

   console.log("running daily report on server ip: " + serverIp);
   if (serverIp === "86.48.1.125") {
   console.log("started daily report on server ip: " + serverIp);
   try {
      let data = [
         [
            "id",
            "createdAt",
            "EndDate",
            "Activation date",
            "Client Name",
            "Client Mobile",
            "Payment Status",
            "Payment Method",
            "Order Id",
            "Original Fees",
            "Fees",
            "Discount cost",
            "Discount rate",
            "Package Name",
            "Package Type",
            "Company Name",
         ],
      ];
      let sDate = moment().subtract(15, "day");
      console.log(sDate);
      let eDate = moment();
      console.log(eDate);
      let cp = await clientPackageService.getPackageReports(sDate, eDate);
      console.log(cp);
      console.log(cp[0]);
      console.log(cp[0].Package);
      for (let i = 0; i < cp.length; i++) {
         const clientPackage = cp[i];
         let pkgType = "public";
         let name = "N/A";
         if (clientPackage.Package.private) {
            pkgType = "private";
         }
         if (clientPackage.Package.BrokerId) {
            name = `Borker-${clientPackage.Package.Broker.User.name}`;
         }
         if (clientPackage.Package.corporateCompanyId) {
            name = `corporate-${clientPackage.Package.CorporateCompany.en_name}`;
         }
         if (clientPackage.Package.insuranceCompanyId) {
            name = `insurance-${clientPackage.Package.insuranceCompany.en_name}`;
         }
         if (
            !clientPackage.Package.private &&
            clientPackage.UsedPromosPackages?.PackagePromoCode
               ?.CorporateCompanyId
         ) {
            name = `corporate-${clientPackage.UsedPromosPackages?.PackagePromoCode?.CorporateCompany?.en_name}`;
         }
         // console.log(clientPackage.Client);
         // console.log(clientPackage);
         // if(!clientPackage.Client){
         // }
         // if(!clientPackage.Client.User){
         // }
         data.push([
            clientPackage.id,
            moment(clientPackage.createdAt).format("DD/MM/YYYY HH:mm a"),
            moment(clientPackage.endDate).format("DD/MM/YYYY HH:mm a"),
            moment(clientPackage.startDate).format("DD/MM/YYYY HH:mm a"),
            clientPackage.Client?.User?.name
               ? clientPackage.Client?.User?.name
               : "needs to be updated",
            clientPackage.Client?.User?.PhoneNumber
               ? clientPackage.Client?.User?.PhoneNumber
               : "needs to be updated",
            clientPackage.PackageTransaction?.transactionType,
            clientPackage.PackageTransaction?.transactionStatus,
            clientPackage.PackageTransaction?.orderId,
            clientPackage.Package.fees,
            clientPackage.PackageTransaction?.transactionAmount,
            clientPackage.Package.fees - clientPackage.UsedPromosPackages?.fees,
            clientPackage.UsedPromosPackages?.PackagePromoCode?.percentage
               ? clientPackage.UsedPromosPackages?.PackagePromoCode?.percentage
               : (clientPackage.Package.fees -
                    clientPackage.UsedPromosPackages?.fees) /
                 clientPackage.Package.fees,
            clientPackage.Package.enName,
            pkgType,
            name,
         ]);
      }
      let filename = `/public/clientPackage/reports/report-${eDate.format(
         "DD-MM-YYYY"
      )}.csv`;
      await new Promise((resolve, reject) => {
         writeToCsv(data, `.${filename}`);
         resolve();
      });
      // await smsService.sendMail(
      //    [
      //       "amr.ali@helpooapp.com",
      //       "m.farouk@helpooapp.com",
      //       "fahmy@helpooapp.com",
      //    ],
      //    `Daily Report : ${eDate.format("YYYY-MM-DD")}`,
      //    undefined,
      //    `Helpoo Subscription daily report for day with date : ${eDate.format(
      //       "YYYY-MM-DD"
      //    )}`,
      // `/public/clientPackage/reports/report-${eDate.format("DD-MM-YYYY")}.csv`;
      // );
      await smsService.sendEmailWithSpecificEmail(
         [
            "amr.ali@helpooapp.com",
            "m.farouk@helpooapp.com",
            "ahmed.samy@helpooapp.com",
         ],
         `Daily Report : ${eDate.format("YYYY-MM-DD")}`,
         `Helpoo Subscription daily report for day with date : ${eDate.format(
            "YYYY-MM-DD"
         )}`,
         filename
      );
   } catch (error) {
      console.log(error);
   }
   }
});

function writeToCsv(data, filename) {
   // Convert each row to a comma-separated string
   const csvContent = data.map((row) => row.join(","));

   // Add a newline character at the end of each row
   csvContent.push(""); // Add an empty line at the end for better formatting

   // Write the CSV content to the file
   fs.writeFileSync(filename, csvContent.join("\n"), { encoding: "utf8" });

   console.log(`Successfully wrote data to CSV file: ${filename}`);
}
