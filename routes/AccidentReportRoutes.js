const express = require("express");
const moment = require("moment");
const fs = require("fs");
const axios = require("axios");

const accidentReportService = require("../services/AccidentReport");
const carService = require("../services/carService");
const soleraFunctions = require("../services/soleraFunctions");

const auth = require("../middlewares/auth");
const restriction = require("../middlewares/restriction");

const catchAsync = require("../utils/catchAsync");

const personRole = require("../enums/Roles");
const AppError = require("../utils/AppError");

const router = express.Router();

const front = [
   "img3",
   "img4",
   "img6",
   "img7",
   "img8",
   "img18",
   "img19",
   "img20",
];
const rear = [
   "img9",
   "img10",
   "img11",
   "img12",
   "img13",
   "img14",
   "img15",
   "img16",
   "img17",
   "img23",
];
// const window = ["img5"]
const roof = ["img21", "img22"];

function returnTag(imageName) {
   if (front.includes(imageName)) {
      return "front";
   } else if (rear.includes(imageName)) {
      return "rear";
   } else if (roof.includes(imageName)) {
      return "roof";
   } else if (imageName.startsWith("glass") || imageName === "img5") {
      return "window";
   } else if (imageName.startsWith("internal") || imageName === "img2") {
      return "interior";
   } else {
      return "right";
   }
}

router.get(
   "/insurance/:insCompId",
   auth,
   restriction(
      personRole.Admin,
      personRole.Insurance,
      personRole.Broker,
      personRole.Super,
      personRole.Supervisor
   ),
   catchAsync(async (req, res, next) => {
      let { page, size } = req.query;
      const insuranceCompanyId = req.params.insCompId;
      if (!page) page = 1;
      if (!size) size = 10;
      const accReports =
         await accidentReportService.listAccidentReportsByInsComp(
            Number(insuranceCompanyId),
            Number(page),
            Number(size)
         );
      res.status(200).json({
         status: "success",
         ...accReports,
      });
   })
);

router.get(
   "/broker/:brokerId",
   auth,
   restriction(
      personRole.Admin,
      personRole.Insurance,
      personRole.Broker,
      personRole.Super,
      personRole.Supervisor
   ),
   catchAsync(async (req, res, next) => {
      let { page, size } = req.query;
      const brokerId = req.params.brokerId;
      if (!page) page = 1;
      if (!size) size = 10;
      const accReports =
         await accidentReportService.listAccidentReportsByBroker(
            Number(brokerId),
            Number(page),
            Number(size)
         );
      res.status(200).json({
         status: "success",
         ...accReports,
      });
   })
);

router.get(
   "/getAll",
   auth,
   restriction(personRole.Admin, personRole.Super, personRole.Supervisor),
   catchAsync(async (req, res, next) => {
      let { page, size } = req.query;
      // const insuranceCompanyId = req.params.insCompId;
      if (!page) page = 1;
      if (!size) size = 10;
      const accReports =
         await accidentReportService.listAccidentReportsByInsComp(
            null,
            Number(page),
            Number(size)
         );
      res.status(200).json({
         status: "success",
         ...accReports,
      });
   })
);

router.get(
   "/search",
   //  auth,
   catchAsync(async (req, res, next) => {
      let { id, name, mobile, insuranceCompanyId } = req.query;
      let reports = await accidentReportService.searchInAccidentReports(
         id,
         name,
         mobile,
         insuranceCompanyId
      );
      res.status(200).json({
         status: "success",
         reports,
      });
   })
);

router.get(
   "/show/:reportId",
   auth,
   restriction(
      personRole.Admin,
      personRole.Insurance,
      personRole.Broker,
      personRole.Client,
      personRole.Super,
      personRole.Supervisor
   ),
   catchAsync(async (req, res, next) => {
      const reportId = Number(req.params.reportId);
      let insurance = req.user.Role.name === personRole.Insurance;
      const accReport = await accidentReportService.getOneAccidentReport(
         reportId,
         insurance
      );
      if (accReport.statusCode) {
         return next(accReport);
      }
      res.status(200).json({
         status: "success",
         ...accReport,
      });
   })
);

router.get(
   "/getByStatus/:insId",
   auth,
   // restriction(personRole.Admin, personRole.Insurance, personRole.Super),
   catchAsync(async (req, res, next) => {
      const { insId } = req.params;
      let { page, size, status } = req.query;
      status = status.split(",");
      if (!page) page = 1;
      if (!size) size = 10;
      const accReports = await accidentReportService.listByStatus(
         insId,
         status,
         page,
         size
      );
      res.status(200).json({
         status: "success",
         ...accReports,
      });
   })
);

router.get(
   "/getByStatus/:brokerId",
   auth,
   // restriction(personRole.Admin, personRole.Insurance, personRole.Super),
   catchAsync(async (req, res, next) => {
      const { brokerId } = req.params;
      let { page, size, status } = req.query;
      status = status.split(",");
      if (!page) page = 1;
      if (!size) size = 10;
      const accReports = await accidentReportService.listByStatusBroker(
         brokerId,
         status,
         page,
         size
      );
      res.status(200).json({
         status: "success",
         ...accReports,
      });
   })
);

router.get(
   "/getAllByStatus",
   auth,
   // restriction(personRole.Admin, personRole.Insurance, personRole.Super),
   catchAsync(async (req, res, next) => {
      // const { insId } = req.params;
      let { page, size, status } = req.query;
      status = status.split(",");
      if (!page) page = 1;
      if (!size) size = 10;
      const accReports = await accidentReportService.listByStatus(
         null,
         status,
         page,
         size
      );
      res.status(200).json({
         status: "success",
         ...accReports,
      });
   })
);

router.post(
   "/",
   auth,
   // restriction(personRole.Client),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['create accident report'] = {
            in: 'body',
            schema: {
                $phoneNumber: '01000000000',
                $location: {
                    $lat: 30.123456,
                    $lng: 31.123456,
                    $address: 'address'
                },
                $accidentTypeId: 1,
                $carId: 1,
                $createdByUser: 1,
            }
        }
    */
      let accidentReport = req.body;
      if (
         !accidentReport.phoneNumber ||
         !accidentReport.location ||
         !accidentReport.accidentTypeId ||
         !accidentReport.carId ||
         !accidentReport.createdByUser
      ) {
         return next(new AppError("Missing Data", 400));
      }
      let car = await carService.getCar(accidentReport.carId);
      if (
         (!car.insuranceCompany ||
            !car.policyNumber ||
            !car.policyEnds ||
            moment(car.policyEnds).isBefore(moment())) &&
         !req.body.insuranceCompanyId
      ) {
         return next(
            new AppError(
               "This car does not have policy or the policy has been expired",
               400
            )
         );
      }

      const accReport = await accidentReportService.createAccidentReport({
         ...accidentReport,
         status: "created",
      });
      if (accReport.statusCode) {
         return next(accReport);
      } else
         res.status(201).json({
            status: "success",
            accidentReport: [accReport],
         });
      axios
         .post("https://hook.eu1.make.com/m0ghdhdydyymy9kfnuf6mbkth5g9oyvp", {
            subject: accReport.subject,
         })
         .then(() => {})
         .catch((err) => {
            console.log("Error: " + err);
         });
   })
);
router.patch(
   "/submitBill/:accidentReportId",
   auth,
   restriction(
      personRole.Admin,
      personRole.Client,
      personRole.Insurance,
      personRole.Super,
      personRole.Supervisor
   ),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['submit bill'] = {
            in: 'body',
            schema: {
                $billDeliveryLocation: {
                    $lat: 30.123456,
                    $lng: 31.123456,
                    $address: 'address'
                }
            }
        }
    */
      const accidentReportId = Number(req.params.accidentReportId);
      const accReport = await accidentReportService.updateBillAccidentReport(
         accidentReportId,
         req.body
      );
      const newAccReport = await accidentReportService.getOneAccidentReport(
         accidentReportId
      );
      if (accReport.statusCode) {
         return next(accReport);
      }
      res.status(200).json({
         status: "success",
         accidentReport: [newAccReport],
      });
   })
);

router.patch(
   "/updateStatus/:accidentReportId",
   auth,
   restriction(
      personRole.Admin,
      personRole.Client,
      personRole.Insurance,
      personRole.Super,
      personRole.Supervisor
   ),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['update status'] = {
            in: 'body',
            schema: {
                $status: 'police'
            }
        }
    */
      const accidentReportId = Number(req.params.accidentReportId);
      const accReport = await accidentReportService.updateAccidentReportStatus(
         accidentReportId,
         req.body.status
      );
      if (accReport.statusCode) {
         return next(accReport);
      }
      const newAccReport = await accidentReportService.getOneAccidentReport(
         accidentReportId
      );
      res.status(200).json({
         status: "success",
         accidentReport: [accReport],
      });
      await axios.post(
         "https://hook.eu1.make.com/97gmkpgwwsbgv2xtjcg145k86eszept4",
         {
            ...newAccReport,
         }
      );
   })
);

router.patch(
   "/requestBeforeRepair/:accidentReportId",
   auth,
   restriction(
      personRole.Admin,
      personRole.Client,
      personRole.Insurance,
      personRole.Super,
      personRole.Supervisor
   ),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['request before repair'] = {
            in: 'body',
            schema: {
                $beforeRepairLocation:{
                    $lat: 30.123456,
                    $lng: 31.123456,
                    $address: 'address'
                },
                $bRepairName: 'name',
                $status: 'bRepair'
            }
        }
    */
      const accidentReportId = Number(req.params.accidentReportId);
      const accReport = await accidentReportService.updateBRepairAccidentReport(
         accidentReportId,
         req.body
      );
      const newAccReport = await accidentReportService.getOneAccidentReport(
         accidentReportId
      );
      if (accReport.statusCode) {
         return next(accReport);
      } else
         res.status(200).json({
            status: "success",
            accidentReport: [newAccReport],
         });
      await axios.post(
         "https://hook.eu1.make.com/97gmkpgwwsbgv2xtjcg145k86eszept4",
         {
            ...newAccReport,
         }
      );
   })
);

router.patch(
   "/requestRightSave/:accidentReportId",
   auth,
   restriction(
      personRole.Admin,
      personRole.Client,
      personRole.Insurance,
      personRole.Super,
      personRole.Supervisor
   ),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['request right save'] = {
            in: 'body',
            schema: {
                $rightSaveLocation:{
                    $lat: 30.123456,
                    $lng: 31.123456,
                    $address: 'address'
                },
                $status: 'rightSave'
            }
        }
    */
      const accidentReportId = Number(req.params.accidentReportId);
      const accReport =
         await accidentReportService.updateRightSaveLocationAccidentReport(
            accidentReportId,
            req.body
         );
      const newAccReport = await accidentReportService.getOneAccidentReport(
         accidentReportId
      );
      if (accReport.statusCode) {
         return next(accReport);
      }
      res.status(200).json({
         status: "success",
         accidentReport: [newAccReport],
      });
      await axios.post(
         "https://hook.eu1.make.com/97gmkpgwwsbgv2xtjcg145k86eszept4",
         {
            ...newAccReport,
         }
      );
   })
);

router.patch(
   "/requestSupplement/:accidentReportId",
   auth,
   restriction(
      personRole.Admin,
      personRole.Client,
      personRole.Insurance,
      personRole.Super,
      personRole.Supervisor
   ),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['request supplement'] = {
            in: 'body',
            schema: {
                $supplementLocation:{
                    $lat: 30.123456,
                    $lng: 31.123456,
                    $address: 'address'
                },
                $status: 'supplement'
            }
        }
    */
      const accidentReportId = Number(req.params.accidentReportId);
      const accReport =
         await accidentReportService.updateSupplementLocationAccidentReport(
            accidentReportId,
            req.body
         );
      const newAccReport = await accidentReportService.getOneAccidentReport(
         accidentReportId
      );
      if (accReport.statusCode) {
         return next(accReport);
      }
      res.status(200).json({
         status: "success",
         accidentReport: [newAccReport],
      });
      await axios.post(
         "https://hook.eu1.make.com/97gmkpgwwsbgv2xtjcg145k86eszept4",
         {
            ...newAccReport,
         }
      );
   })
);

router.patch(
   "/requestResurvey/:accidentReportId",
   auth,
   restriction(
      personRole.Admin,
      personRole.Client,
      personRole.Insurance,
      personRole.Super,
      personRole.Supervisor
   ),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['request resurvey'] = {
            in: 'body',
            schema: {
                $resurveyLocation:{
                    $lat: 30.123456,
                    $lng: 31.123456,
                    $address: 'address'
                },
                $status: 'resurvey'
            }
        }
    */
      const accidentReportId = Number(req.params.accidentReportId);
      const accReport =
         await accidentReportService.updateResurveyLocationAccidentReport(
            accidentReportId,
            req.body
         );
      const newAccReport = await accidentReportService.getOneAccidentReport(
         accidentReportId
      );
      if (accReport.statusCode) {
         return next(accReport);
      }
      res.status(200).json({
         status: "success",
         accidentReport: [newAccReport],
      });
      await axios.post(
         "https://hook.eu1.make.com/97gmkpgwwsbgv2xtjcg145k86eszept4",
         {
            ...newAccReport,
         }
      );
   })
);

router.patch(
   "/requestAfterRepair/:accidentReportId",
   auth,
   restriction(
      personRole.Admin,
      personRole.Client,
      personRole.Insurance,
      personRole.Super,
      personRole.Supervisor
   ),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['request after repair'] = {
            in: 'body',
            schema: {
                $afterRepairLocation:{
                    $lat: 30.123456,
                    $lng: 31.123456,
                    $address: 'address'
                },
                $status: 'aRepair'
            }
        }
    */
      const accidentReportId = Number(req.params.accidentReportId);
      const accReport = await accidentReportService.updateARepairAccidentReport(
         accidentReportId,
         req.body
      );
      const newAccReport = await accidentReportService.getOneAccidentReport(
         accidentReportId
      );
      if (accReport.statusCode) {
         return next(accReport);
      }
      res.status(200).json({
         status: "success",
         accidentReport: [newAccReport],
      });
      await axios.post(
         "https://hook.eu1.make.com/97gmkpgwwsbgv2xtjcg145k86eszept4",
         {
            ...newAccReport,
         }
      );
   })
);

router.post(
   "/flairSoleraFunctions/:accidentReportId",
   auth,
   restriction(personRole.Admin, personRole.Super),
   catchAsync(async (req, res, next) => {
      const {} = req.body;
      // console.log(req.params);
      let accidentReport = await accidentReportService.getOneAccidentReport(
         req.params.accidentReportId
      );

      if (!accidentReport.report.sentToSolera) {
         let base64Imgs = fs
            .readFileSync(
               `./public/accidentReports/base64Imgs/${req.params.accidentReportId}.txt`,
               "utf8",
               function (err) {
                  console.error(err);
               }
            )
            .toString();
         base64Imgs = base64Imgs.split(",,,,");
         base64Imgs = base64Imgs.map((img) => JSON.parse(img));

         let resp = await soleraFunctions.runAllFunctions(
            accidentReport.report,
            base64Imgs
         );
         if (resp.statusCode) {
            return next(resp);
         } else {
            res.status(200).json({
               status: "success",
               message: resp,
            });
         }
      }
   })
);

router.post(
   "/uploadImages/:accidentReportId",
   auth,
   restriction(personRole.Client),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['upload images'] = {
            in: 'body',
            schema: {
                $images: [{image:'base64',additional:false,isFinished:false, imageName:'id_img1'},{image:'base64',additional:false,isFinished:false, imageName:'id_img2'},{image:'base64',additional:false,isFinished:false, imageName:'id_img3'}]
            }
        }
    */
      const accImages = await accidentReportService.uploadAccidentReportImages(
         req.params.accidentReportId,
         req.body
      );
      if (accImages.statusCode) {
         return next(accImages);
      }
      /*
        {
            id:{
                ARId:id,
                images:[],
                isFinished:T or F
            }
        }
    */
      res.status(200).json({
         status: "success",
         images: accImages,
      });
      let imagesList = req.body.images;
      imagesList = JSON.parse(imagesList);
      let imagess = [];
      // imagesList = imagesList.map(el => el.image)
      for (let i = 0; i < imagesList.length; i++) {
         let obj = imagesList[i];
         if (obj.imageName.startsWith("id") || obj.additional) {
            continue;
         } else {
            imagess.push({
               image: obj.image,
               tags: [returnTag(obj.imageName)],
            });
         }
      }
      if (imagess.length > 0) {
         if (
            fs.existsSync(
               `./public/accidentReports/base64Imgs/${req.params.accidentReportId}.txt`
            )
         ) {
            fs.appendFile(
               `./public/accidentReports/base64Imgs/${req.params.accidentReportId}.txt`,
               `,,,,${JSON.stringify(...imagess)}`,
               function (err, data) {
                  if (err) console.error(err);
               }
            );
         } else {
            fs.writeFile(
               `./public/accidentReports/base64Imgs/${req.params.accidentReportId}.txt`,
               `${JSON.stringify(...imagess)}`,
               function (err) {
                  if (err) {
                     console.error(err);
                  }
               }
            );
         }
      }
      let accidentReport = await accidentReportService.getOneAccidentReport(
         req.params.accidentReportId
      );
      if (
         accidentReport.report.requiredImagesNo ===
            accidentReport.report.uploadedImagesCounter &&
         !imagesList[0].additional &&
         !accidentReport.report.sentToSolera
      ) {
         // we will call SoleraFunctions
         // 1) we get all images
         let base64Imgs = fs
            .readFileSync(
               `./public/accidentReports/base64Imgs/${req.params.accidentReportId}.txt`,
               "utf8",
               function (err) {
                  console.error(err);
               }
            )
            .toString();
         base64Imgs = base64Imgs.split(",,,,");
         base64Imgs = base64Imgs.map((img) => JSON.parse(img));

         await soleraFunctions.runAllFunctions(
            accidentReport.report,
            base64Imgs
         );
      }
   })
);

router.patch(
   "/closeFNOL/:accidentReportId",
   auth,
   restriction(
      personRole.Admin,
      personRole.Super,
      personRole.Insurance,
      personRole.Supervisor
   ),
   catchAsync(async (req, res, next) => {
      const accidentReportId = Number(req.params.accidentReportId);
      const accReport = await accidentReportService.closeFNOL(accidentReportId);
      const newAccReport = await accidentReportService.getOneAccidentReport(
         accidentReportId
      );
      if (accReport.statusCode) {
         return next(accReport);
      }
      res.status(200).json({
         status: "success",
         accidentReport: [newAccReport],
      });
   })
);
router.get(
   "/latestReports/:id",
   auth,
   restriction(
      personRole.Admin,
      personRole.Client,
      personRole.Super,
      personRole.Supervisor
   ),
   catchAsync(async (req, res, next) => {
      const id = req.params.id;
      const reports = await accidentReportService.getFNOLClient(id);
      if (reports.statusCode) {
         return next(reports);
      }
      res.status(200).json({
         status: "success",
         reports,
      });
   })
);

router.patch(
   "/updateReport/:id",
   auth,
   restriction(
      personRole.Super,
      personRole.Admin,
      personRole.Client,
      personRole.Supervisor
   ),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['update accident report'] = {
            in: 'body',
            schema: {
                $status: 'created',
                $commentUser: 'base64',
                $comment: 'comment',
            }
        }
    */
      const accReport = await accidentReportService.updateAccidentReport(
         req.params.id,
         req.body
      );
      const arFull = await accidentReportService.getOneAccidentReport(
         req.params.id
      );
      if (accReport.statusCode) return next(accReport);
      else {
         res.status(200).json({
            status: "success",
            accidentReport: accReport,
         });
         if (req.body.audioCommentWritten) {
            await axios.post(
               "https://hook.eu1.make.com/uqq4yvfort89ktbqr6bkah4e715y3ms7",
               {
                  ...arFull,
               }
            );
         }
         if (req.body.status && req.body.status === "police") {
            await axios.post(
               "https://hook.eu1.make.com/97gmkpgwwsbgv2xtjcg145k86eszept4",
               {
                  ...arFull,
               }
            );
         }
      }
   })
);

router.patch(
   "/reject/:id",
   auth,
   restriction(
      personRole.Admin,
      personRole.Insurance,
      personRole.Super,
      personRole.Supervisor
   ),
   catchAsync(async (req, res, next) => {
      let id = req.params.id;
      const update = await accidentReportService.rejectAccidentReport(id);
      if (update.statusCode) {
         return next(update);
      }
      // else
      res.status(200).json({
         status: "success",
         msg: update,
      });
   })
);

router.get(
   "/forInspector/:id",
   auth,
   catchAsync(async (req, res, next) => {
      let page = req.query.page || 1;
      let size = req.query.size || 10;
      let reports = await accidentReportService.getForInspector(
         req.params.id,
         page,
         size
      );
      res.status(200).json({
         status: "success",
         reports,
      });
   })
);

router.get(
   "/forInspection/:id",
   auth,
   catchAsync(async (req, res, next) => {
      let page = req.query.page || 1;
      let size = req.query.size || 10;
      let reports = await accidentReportService.getForInspection(
         req.params.id,
         page,
         size
      );
      res.status(200).json({
         status: "success",
         reports,
      });
   })
);

module.exports = router;
