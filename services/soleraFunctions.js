const fs = require("fs");
const axios = require("axios");
const https = require("https");
const SoleraResponse = require("../models/SoleraResponse");
const SoleraResponseInspections = require("../models/SoleraResponseInspections");
const CarAccidentReports = require("../models/CarAccidentReports");
const AccidentReport = require("../models/AccidentReport");
const AccidentReportService = require("./AccidentReport");
const Inspections = require("../models/Inspections");
const InspectionsReports = require("../models/InspectionsReports");
const AppError = require("../utils/AppError");
let baseUrl = "https://services-pat.auda-target.com/APIGateway/api/v1";

class SoleraFunctions {
   async getToken() {
      const auth = await axios.request({
         url: "https://login-pat.audatex.com/connect/token",
         method: "post",
         headers: {
            "Content-Type": "application/x-www-form-urlencoded",
         },
         data: {
            grant_type: "client_credentials",
            scope: "apigateway.imagecapture apigateway.imagecaptureexternal apigateway.vicalculation apigateway.pdfreport",
            client_id: "05ba0ff1-627e-40b7-90cd-3cf0247a5209",
            client_secret: "U3VxUFVnYmxKMzI1bjFTNHpXNjBSa20xTGpaSDBQMVg=",
         },
         httpsAgent: new https.Agent({
            rejectUnauthorized: false,
         }),
      });
      return auth.data.access_token;
   }

   async getImageCaptureId(images, ar, token, inspection) {
      try {
         images = images.map((image) => {
            return {
               base64EncodedImage: image.image,
               tags: images.tags,
               clientReferenceImageId: "007",
            };
         });
         let clientReferenceId = "---";
         let value = "undefined";
         if (ar) {
            clientReferenceId = ar.ref + "-" + ar.id;
            value = ar.Car.vin_number;
         }
         if (inspection) {
            clientReferenceId = inspection.clientPhone + "-" + inspection.id;
            value = inspection.vinNumber;
         }
         console.info(images);
         const data = await axios.request({
            url: `${baseUrl}/ImageCaptureExternal`,
            method: "post",
            headers: {
               "X-Data-Region": "Solera-ch",
               Authorization: `Bearer ${token}`,
               "Content-Type": "application/json",
            },
            data: {
               clientReferenceId,
               asset: {
                  identifier: "VIN",
                  value,
               },
               images: images,
            },
         });
         console.log(data);
         console.info(data.data);
         return data.data.id;
      } catch (err) {
         console.error(err);
         console.log(err.data);
         console.log(err.response.data);
         console.log(err.data.errors);
      }
   }

   async getViCalcId(id, token) {
      try {
         const data = await axios.request({
            url: `${baseUrl}/ViNoCalculation`,
            method: "post",
            headers: {
               "X-Data-Region": "Solera-ch",
               Authorization: `Bearer ${token}`,
               "Content-Type": "application/json",
            },
            data: {
               imageCaptureId: id,
               enhancedVerification: false,
               includeContours: true,
               countryCode: "UK",
            },
         });
         console.info(data.data);
         return data.data.calculationId;
      } catch (err) {
         console.error(err);
         console.log(err.data);
         console.log(err.response.data);
         console.log(err.data.errors);
      }
   }

   async getViCalcRes(imageId, calcId, token) {
      try {
         const data = await axios.request({
            url: `${baseUrl}/ViNoCalculation/${imageId}/${calcId}`,
            method: "get",
            headers: {
               "X-Data-Region": "Solera-ch",
               Authorization: `Bearer ${token}`,
               "Content-Type": "application/json",
            },
         });
         console.info(data.data);
         return data.data;
      } catch (err) {
         console.error(err);
         console.log(err.data);
         console.log(err.response.data);
         console.log(err.data.errors);
      }
   }

   async getPDF(imageId, calcId, token, ar, inspection) {
      try {
         const data = await axios.request({
            url: `${baseUrl}/Reports/pdf/IntelligentDamageDetection/${imageId}/${calcId}`,
            method: "get",
            headers: {
               "X-Data-Region": "Solera-ch",
               Authorization: `Bearer ${token}`,
               "Content-Type": "application/json",
            },
            data: {
               linkExpiryDays: 7,
               language: "en_GB",
               timeZone: "GMT_Standard_Time",
               settings: [
                  {
                     key: "CameraMode",
                     value: "native",
                  },
                  {
                     key: "EnableBackButton",
                     value: "true",
                  },
               ],
               pageConfiguration: {
                  pages: [
                     {
                        pageType: "FrontLeft",
                        isImageRequired: false,
                        displayOrder: 1,
                     },
                     {
                        pageType: "FrontRight",
                        isImageRequired: false,
                        displayOrder: 2,
                     },
                     {
                        pageType: "RearLeft",
                        isImageRequired: false,
                        displayOrder: 3,
                     },
                     {
                        pageType: "RearRight",
                        isImageRequired: false,
                        displayOrder: 4,
                     },
                     {
                        pageType: "AdHoc",
                        isImageRequired: false,
                        overrideTitle: "Damage Close Ups",
                        overrideText:
                           "Take close-up photos of damage holding your camera 100cm away from the vehicle, so each panel and each damage is clearly visible in every photo",
                        displayOrder: 5,
                     },
                  ],
               },
               communication: {
                  recipient: {
                     dialingCode: "+44",
                     mobileNumber: "7702073579",
                  },
                  from: "Solera",
                  message:
                     "Hi Hamel, please note the pin and click the URL to begin the Image Capture process - Link: {IC_URL}, Pin: {IC_PIN}",
                  type: "SMS",
               },
            },
            responseType: "stream",
         });
         let fileName;
         if (ar) {
            fileName = `/public/accidentReports/pdf/AiCalc-${imageId}---${calcId}-${ar.id}.pdf`;
            data.data.pipe(
               fs.createWriteStream(
                  `./public/accidentReports/pdf/AiCalc-${imageId}---${calcId}-${ar.id}.pdf`
               )
            );
            await CarAccidentReports.create({
               report: fileName,
               AccidentReportId: ar.id,
               CarId: ar.CarId,
               pdfReportId: 14,
            });
         }
         if (inspection) {
            fileName = `/public/inspections/pdf/AiCalc-${imageId}---${calcId}-${inspection.id}.pdf`;
            data.data.pipe(
               fs.createWriteStream(
                  `./public/inspections/pdf/AiCalc-${imageId}---${calcId}-${inspection.id}.pdf`
               )
            );
            await InspectionsReports.create({
               InspectionId: inspection.id,
               report: fileName,
            });
         }
         return "done";
      } catch (err) {
         console.error(err);
         console.log(err.data);
         console.log(err.response.data);
         console.log(err.data.errors);
      }
   }

   async runAllFunctions(ar, images, inspection) {
      try {
         // console.info(ar);
         if (ar) {
            await AccidentReport.update(
               {
                  sentToSolera: true,
               },
               {
                  where: {
                     id: ar.id,
                  },
               }
            );
         }
         if (inspection) {
            await Inspections.update(
               {
                  sentToSolera: true,
               },
               {
                  where: {
                     id: inspection.id,
                  },
               }
            );
         }
         let token = await this.getToken();
         const imageCaptureId = await this.getImageCaptureId(
            images,
            ar,
            token,
            inspection
         );
         const ViCalcId = await this.getViCalcId(imageCaptureId, token);
         let ViResponse = await this.getViCalcRes(
            imageCaptureId,
            ViCalcId,
            token
         );
         while (
            ViResponse.status !== "Successfully Processed" &&
            ViResponse.status !== "Processing Failed" &&
            !ViResponse.status.includes("Successful")
         ) {
            await delay(20000);
            ViResponse = await this.getViCalcRes(
               imageCaptureId,
               ViCalcId,
               token
            );
            console.info(ViResponse);

            // ViResponse = await this.getViCalcRes(imageCaptureId, ViCalcId, token)
         }
         console.info(ViResponse);
         const savePDF = await this.getPDF(
            imageCaptureId,
            ViCalcId,
            token,
            ar,
            inspection
         );
         if (ar) {
            const createResponseRow = await SoleraResponse.create({
               response: ViResponse,
               accidentReportId: ar.id,
            });
            // let arFull = await AccidentReportService.getOneAccidentReport(
            //    ar.id
            // );
         }
         if (inspection) {
            const createResponseRow = await SoleraResponseInspections.create({
               response: ViResponse,
               InspectionId: inspection.id,
            });
         }
         return "done";
      } catch (err) {
         console.error(err);
         return new AppError(err, 500);
         // console.error(err.response.data);
      }
   }
}

async function delay(ms) {
   return new Promise((resolve) => setTimeout(resolve, ms));
}

const soleraFunctions = new SoleraFunctions();
module.exports = soleraFunctions;
