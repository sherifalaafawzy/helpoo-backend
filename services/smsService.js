const axios = require("axios");
const crypto = require("crypto");
const moment = require("moment");
const fs = require("fs");
const pug = require("pug");
const os = require("os");
// const crypto = require("crypto");
const cryptoUtils = require("../cryptoUtils");
const nodemailer = require("nodemailer");
const AppError = require("../utils/AppError");
const validator = require("validator");

const SmsFilter = require("../models/SmsFilter");
const Config = require("../models/Config");
const MailCar = require("../models/MailCar");
const AccidentReport = require("../models/AccidentReport");
const vehicleService = require("./vehicleService");

// generate and return otp
function generateOTP() {
   // Declare a digits variable
   // which stores all digits
   var digits = "0123456789";
   let OTP = "";
   for (let i = 0; i < 4; i++) {
      OTP += digits[Math.floor(Math.random() * 10)];
   }
   return OTP;
}

// sending messages
async function sendSingleSms(text, mobile) {
   try {
      const config = await Config.findOne();
      if (config.usageSMS === 1) {
         let mobileNumber = mobile.startsWith("+") ? mobile.substr(1) : mobile;

         mobileNumber = mobileNumber.startsWith("0")
            ? `2${mobileNumber}`
            : mobileNumber;
         let response = await axios.post(
            "http://weapi.connekio.com/sms/single",
            {
               account_id: process.env.SMS_ACCOUNTID,
               text: text,
               msisdn: mobileNumber,
               sender: "helpoo",
            },
            {
               headers: {
                  Authorization: process.env.SMS_AUTH,
               },
            }
         );
         return response;
      } else {
         let string = `AccountId=${process.env.AccountIdVoda}&Password=${process.env.PasswordVoda}&SenderName=${process.env.SenderNameVoda}&ReceiverMSISDN=${mobile}&SMSText=${text}`;
         const secretKey = "F832A3FC09EF431DA1EBD2827BE549B4";
         // Create the SHA-256 HMAC
         const hmac = crypto.createHmac("sha256", secretKey);
         // console.log(string);
         // console.log(hmac);
         hmac.update(string);
         // console.log(hmac);

         // Final hash
         const hash = hmac.digest("hex");
         // console.log(hash);
         // Include the hash in your XML request
         const xmlRequest = `
   <SubmitSMSRequest xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
   xmlns:="http://www.edafa.com/web2sms/sms/model/" xsi:schemaLocation="http://www.edafa.com/web2sms/sms/model/SMSAPI.xsd"
   xsi:type="SubmitSMSRequest">
   <AccountId>${process.env.AccountIdVoda}</AccountId>

   <Password>${process.env.PasswordVoda}</Password>
   
   <SecureHash>${hash.toUpperCase()}</SecureHash>
   
   <SMSList>
   
   <SenderName>${process.env.SenderNameVoda}</SenderName>
   
   <ReceiverMSISDN>${mobile}</ReceiverMSISDN>
   
   <SMSText>${text}</SMSText>
   </SMSList>
 </SubmitSMSRequest>`;

         // Make the HTTP request using axios
         let res = await axios.post(
            "https://e3len.vodafone.com.eg/web2sms/sms/submit/",
            xmlRequest,
            {
               headers: {
                  "Content-Type": "application/xml",
               },
            }
         );
         // console.log(res, next);
         return res;
      }
   } catch (err) {
      console.error(err);
      return err;
   }
}

class SendingSms {
   async sendOtp(mobileNumber, lang, ipAddress) {
      // check mobile Number
      if (!mobileNumber) return new AppError("Provide phone number", 400);
      console.log(mobileNumber);
      let mobile = mobileNumber.startsWith("0")
         ? `2${mobileNumber}`
         : mobileNumber;
      if (!validator.isMobilePhone(mobile, "ar-EG"))
         return new AppError("Provide valid number", 400);
      try {
         let serverIp = os.networkInterfaces()["eth0"][0].address;
         // generate and send the OTP
         let otp = generateOTP();
         // let message = 'الرقم التعريفي لبرنامج هيلبو ';
         // if (lang === 'en')
         if (
            mobileNumber.endsWith("01067300073") ||
            serverIp === "89.117.61.172"
         ) {
            otp = 1234;
         }
         let message = "Your Helpoo verification code is ";
         let ifExist = await SmsFilter.findOne({
            where: {
               PhoneNumber: mobileNumber,
            },
         });
         if (ifExist) {
            if (
               ifExist.tries >= 3 &&
               new Date(ifExist.createdAt).getTime() + 30 * 60 * 1000 >
                  Date.now()
            ) {
               return new AppError(
                  "This Phone number has been blocked for 30 mins",
                  400
               );
            } else if (ifExist.tries >= 3) {
               await SmsFilter.update(
                  { tries: 1, createdAt: Date.now() },
                  { where: { PhoneNumber: mobileNumber } }
               );
            } else {
               await SmsFilter.update(
                  { tries: ifExist.tries + 1 },
                  { where: { PhoneNumber: mobileNumber } }
               );
            }
         } else {
            await SmsFilter.create({
               PhoneNumber: mobileNumber,
               tries: 1,
            });
         }
         await sendSingleSms(message + otp, mobileNumber);
         console.info(otp);
         return {
            // encrypt the message to check from it
            message: cryptoUtils.encrypt(
               moment().format("YYYY/MM/DD hh:mm:ss A") +
                  "," +
                  mobileNumber +
                  "," +
                  otp
            ),
            created_at: moment().toISOString(),
         };
      } catch (error) {
         console.error(error);
         return new AppError(error.message, 500);
      }
   }
   // async sendOtpDriver(IMEI, lang, ipAddress) {
   //    let mobileNumber;
   //    let vec = await vehicleService.getVehicleWithIMEI(IMEI);
   //    // check mobile Number
   //    if (!mobileNumber) return new AppError("Provide phone number", 400);
   //    if (!validator.isMobilePhone(mobileNumber))
   //       return new AppError("Provide valid number", 400);
   //    try {
   //       let serverIp = os.networkInterfaces()["eth0"][0].address;
   //       // generate and send the OTP
   //       let otp = generateOTP();
   //       // let message = 'الرقم التعريفي لبرنامج هيلبو ';
   //       // if (lang === 'en')
   //       if (
   //          mobileNumber.endsWith("01067300073") ||
   //          serverIp === "89.117.61.172"
   //       ) {
   //          otp = 1234;
   //       }
   //       let message = "Your Helpoo verification code is ";
   //       let ifExist = await SmsFilter.findOne({
   //          where: {
   //             PhoneNumber: mobileNumber,
   //          },
   //       });
   //       if (ifExist) {
   //          if (
   //             ifExist.tries >= 3 &&
   //             new Date(ifExist.createdAt).getTime() + 30 * 60 * 1000 >
   //                Date.now()
   //          ) {
   //             return new AppError(
   //                "This Phone number has been blocked for 30 mins",
   //                400
   //             );
   //          } else if (ifExist.tries >= 3) {
   //             await SmsFilter.update(
   //                { tries: 1, createdAt: Date.now() },
   //                { where: { PhoneNumber: mobileNumber } }
   //             );
   //          } else {
   //             await SmsFilter.update(
   //                { tries: ifExist.tries + 1 },
   //                { where: { PhoneNumber: mobileNumber } }
   //             );
   //          }
   //       } else {
   //          await SmsFilter.create({
   //             PhoneNumber: mobileNumber,
   //             tries: 1,
   //          });
   //       }
   //       await sendSingleSms(message + otp, mobileNumber);
   //       console.info(otp);
   //       return {
   //          // encrypt the message to check from it
   //          message: cryptoUtils.encrypt(
   //             moment().format("YYYY/MM/DD hh:mm:ss A") +
   //                "," +
   //                mobileNumber +
   //                "," +
   //                otp
   //          ),
   //          created_at: moment().toISOString(),
   //       };
   //    } catch (error) {
   //       console.error(error);
   //       return new AppError(error.message, 500);
   //    }
   // }

   async sendLoginOTP(mobileNumber, userId) {
      // check mobile Number
      if (!mobileNumber) return new AppError("Provide phone number", 400);
      if (!validator.isMobilePhone(mobileNumber))
         return new AppError("Provide valid number", 400);
      try {
         // generate and send the OTP
         let otp = generateOTP();
         if (mobileNumber.endsWith("01067300073")) {
            otp = 1234;
         }
         // let message = 'الرقم التعريفي لبرنامج هيلبو ';
         // if (lang === 'en')
         let message = "Your Helpoo login code is ";
         let ifExist = await SmsFilter.findOne({
            where: {
               PhoneNumber: mobileNumber,
            },
         });
         if (ifExist) {
            if (
               ifExist.tries >= 3 &&
               new Date(ifExist.createdAt).getTime() + 30 * 60 * 1000 >
                  Date.now()
            ) {
               return new AppError(
                  "This Phone number has been blocked for 30 mins",
                  400
               );
            } else if (ifExist.tries >= 3) {
               await SmsFilter.update(
                  { tries: 1, createdAt: Date.now() },
                  { where: { PhoneNumber: mobileNumber } }
               );
            } else {
               await SmsFilter.update(
                  { tries: ifExist.tries + 1 },
                  { where: { PhoneNumber: mobileNumber } }
               );
            }
         } else {
            await SmsFilter.create({
               PhoneNumber: mobileNumber,
               tries: 1,
            });
         }
         await sendSingleSms(message + otp, mobileNumber);
         console.info(otp);
         let messageToEncrypt =
            moment().format("YYYY/MM/DD hh:mm:ss A") +
            "," +
            mobileNumber +
            "," +
            otp +
            "," +
            userId;

         return {
            // encrypt the message to check from it
            message: cryptoUtils.encrypt(messageToEncrypt),
            created_at: moment().toISOString(),
         };
      } catch (error) {
         console.error(error);
         return new AppError(error.message, 500);
      }
   }

   async verifyOtp(body) {
      let encryptedMessage = body.message;
      const mobileNumber = body.mobileNumber;
      const otp = body.otp;

      // check no missing data
      if (!otp || !mobileNumber || !encryptedMessage)
         return new AppError("missing data", 400);
      await SmsFilter.destroy({
         where: {
            PhoneNumber: mobileNumber,
         },
      });
      try {
         // parse string to object
         encryptedMessage = JSON.parse(encryptedMessage);
         // decrypt the message
         let message = cryptoUtils.decrypt(encryptedMessage);
         // split to get the data
         let messageArray = message.split(",");
         let mobile = messageArray[1];
         let sentOtp = messageArray[2];
         // get current time to check time valid
         const dateNow = moment(messageArray[0], "YYYY/MM/DD hh:mm A");
         if (dateNow.isBefore(moment().subtract("10", "minutes")))
            return new AppError("OTP has expired", 400);
         if (mobileNumber !== mobile || sentOtp !== otp)
            return new AppError("Invalid OTP", 400);

         return mobile;
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 400);
      }
   }
   async verifyLoginOtp(body) {
      let encryptedMessage = body.message;
      const mobileNumber = body.mobileNumber;
      const otp = body.otp;

      // check no missing data
      if (!otp || !mobileNumber || !encryptedMessage)
         return new AppError("missing data", 400);
      await SmsFilter.destroy({
         where: {
            PhoneNumber: mobileNumber,
         },
      });
      try {
         // parse string to object
         encryptedMessage = JSON.parse(encryptedMessage);
         // decrypt the message
         let message = cryptoUtils.decrypt(encryptedMessage);
         // split to get the data
         let messageArray = message.split(",");
         let mobile = messageArray[1];
         let sentOtp = messageArray[2];
         let userId = messageArray[3];
         // get current time to check time valid
         const dateNow = moment(messageArray[0], "YYYY/MM/DD hh:mm A");
         if (dateNow.isBefore(moment().subtract("10", "minutes")))
            return new AppError("OTP has expired", 400);
         if (mobileNumber !== mobile || sentOtp !== otp)
            return new AppError("Invalid OTP", 400);

         return userId;
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 400);
      }
   }

   async sendSms({ mobile, message }) {
      if (!mobile || !message)
         return new AppError("Provide phone number or message", 400);
      if (!validator.isMobilePhone(mobile))
         return new AppError("Provide valid number", 400);

      try {
         // console.log(message);
         const res = await sendSingleSms(message, mobile);
         if (!res || res.status !== 200) {
            console.error(res.data);
            return new AppError("invalid response", 400);
         }
         return res.data;
      } catch (error) {
         console.error(error);
         return new AppError(error.message, 400);
      }
   }
   // async resetPassword(body){
   // }

   async sendMail(
      to,
      subject,
      bcc,
      text,
      filePath,
      carId,
      arId,
      html,
      fileUrlStream,
      filePath2
   ) {
      let cc = ["notifications@helpooapp.com"];
      // Create transporter outside the loop
      let transporter = nodemailer.createTransport({
         host: "smtp.sendgrid.net",
         port: 587,
         auth: {
            user: "apikey",
            pass: process.env.SG_APIKEY,
         },
      });

      // Create fileStream if filePath is provided
      let fileStream;
      let fileStream2;
      if (filePath) {
         if (filePath.startsWith("/")) {
         } else {
            filePath = `/${filePath}`;
         }
         // console.log(filePath);
         let checkExist = fs.existsSync(`.${filePath}`);
         // console.log(checkExist);
         while (!checkExist) {
            // console.log(checkExist);
            await delay(150);
            checkExist = fs.existsSync(filePath);
         }
         try {
            fileStream = fs.createReadStream(
               `.${filePath.startsWith("/") ? filePath : "/" + filePath}`
            );
            // console.log(fileStream);
         } catch (error) {
            // console.log(error);
         }
      } else {
         fileStream = fileUrlStream;
      }
      if (filePath2) {
         fileStream2 = fs.createReadStream(
            `.${filePath2.startsWith("/") ? filePath2 : "/" + filePath2}`
         );
      }
      // Create textt with attachment link if filePath is provided
      let textt = text;
      if (filePath) {
         textt += "\n https://api.helpooapp.net" + filePath;
      }

      let data = {
         from: "claims@helpooapp.com",
         subject,
         text,
         html: pug.renderFile(`${__dirname}/../views/email/mailBody.pug`, {
            url: "helpooapp.com",
            text: textt.split("\n"),
         }),
         attachments: [],
      };

      // Add attachments to data if fileStream is provided
      if (fileStream) {
         data["attachments"].push({
            filename: "report.pdf",
            content: fileStream,
         });
      }
      if (fileStream2) {
         data["attachments"].push({
            filename: "FNOL.pdf",
            content: fileStream2,
         });
      }

      try {
         // Loop through recipients and send email to each
         // for (let recipient of to) {
         //    emailData.to =
         // }
         let emailData = { ...data };
         if (cc.length > 0) {
            emailData.cc = cc;
         }
         for (let i = 0; i < to.length; i++) {
            if (i == 0) {
               emailData.to = to[0];
            } else {
               emailData.cc = [...emailData.cc, to[i]];
            }
         }
         // emailData.to = recipient;

         // Add cc recipients

         // Add bcc recipients
         if (bcc) {
            emailData.bcc = bcc;
         }

         // Send email
         let info = await transporter.sendMail(emailData);
         console.log(info);

         // Update accident report if arId is provided
         if (arId) {
            let updates = await AccidentReport.update(
               {
                  sentToInsurance: true,
               },
               {
                  where: {
                     id: arId,
                  },
               }
            );
         }

         return "done";
      } catch (e) {
         console.error(e);
         return e;
      }
   }

   async sendEmailWithSpecificEmail(to, subject, text, filePath) {
      let data = {
         from: "antonio@helpooapp.com",
         subject,
         text,
         html: pug.renderFile(`${__dirname}/../views/email/mailBody.pug`, {
            url: "helpooapp.com",
            text: text.split("\n"),
         }),
         attachments: [],
      };
      let fileStream;
      if (filePath) {
         if (filePath.startsWith("/")) {
         } else {
            filePath = `/${filePath}`;
         }
         // console.log(filePath);
         let checkExist = fs.existsSync(`.${filePath}`);
         // console.log(checkExist);
         while (!checkExist) {
            // console.log(checkExist);
            await delay(150);
            checkExist = fs.existsSync(filePath);
         }
         try {
            fileStream = fs.createReadStream(
               `.${filePath.startsWith("/") ? filePath : "/" + filePath}`
            );
            // console.log(fileStream);
         } catch (error) {
            console.log(error);
         }
      }
      if (fileStream) {
         data["attachments"].push({
            filename: "dailyReport.csv",
            content: fileStream,
         });
      }
      try {
         let transporter = nodemailer.createTransport({
            host: "smtpout.secureserver.net",
            port: 465,
            secure: true,
            auth: {
               user: "antonio@helpooapp.com",
               pass: "helpoo@2022",
            },
         });

         let emailData = { ...data };
         emailData.cc = ["fahmy@helpooapp.com"];
         // if (cc.length > 0) {
         //    emailData.cc = cc;
         // }
         for (let i = 0; i < to.length; i++) {
            if (i == 0) {
               emailData.to = to[0];
            } else {
               emailData.cc.push(to[i]);
            }
         }
         // let info = await transporter.sendMail({
         //    subject: "hhhhhhh",
         //    from: "antonio@helpooapp.com",
         //    to: "fahmy@helpooapp.com",
         //    text: "We are testinggggggggggg",
         // });
         let info = await transporter.sendMail(emailData);

         console.log(info);
      } catch (error) {
         console.log(error);
      }
   }
   async sendWhatsappMsg(to, body) {
      // how to send whatsapp message with node.js using twilio ?
   }
   // async sendSMSVF() {
   //    // Your data
   //    const data = {
   //       AccountId: "550044033",
   //       Password: "Vodafone.1",
   //       SenderName: "HELPOO",
   //       ReceiverMSISDN: "01212197281",
   //       SMSText: "Hello Helpoo Is Here",
   //    };
   //    // Create the parameter=value pairs
   //    const paramString = Object.entries(sortedData)
   //       .map(([key, value]) => `${key}=${value}`)
   //       .join("&");

   //    // Your secret key
   // }
}

const smsService = new SendingSms();

module.exports = smsService;
async function delay(ms) {
   return new Promise((resolve) => setTimeout(resolve, ms));
}
