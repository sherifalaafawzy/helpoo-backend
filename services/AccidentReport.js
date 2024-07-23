// NPM Lib
const moment = require("moment");
const { Op } = require("sequelize");
const os = require("os");
// Services
const carService = require("../services/carService");
const clientService = require("./clientService");

// Models
const AccidentReportModel = require("../models/AccidentReport");
const AccidentReportMainImages = require("../models/AccidentReportMainImages");
const AccidentType = require("../models/AccidentType");
const AccidentTypesAndReports = require("../models/AccidentTypesAndReports");
const Broker = require("../models/Broker");
const Car = require("../models/Car");
const CarModel = require("../models/CarModel");
const CarAccidentReports = require("../models/CarAccidentReports");
const Client = require("../models/Client");
const InsuranceCompany = require("../models/InsuranceCompany");
const Inspector = require("../models/Inspector");
const Manufacturer = require("../models/Manufacturer");
const User = require("../models/User");

// Utils
const AppError = require("../utils/AppError");

// Enums
const imagesRefKeys = require("../enums/imagesRefKeys");

class AccidentReport {
   async listAccidentReportsByInsComp(insuranceCompanyId, page, size) {
      let where = {};
      if (insuranceCompanyId) {
         where["insuranceCompanyId"] = insuranceCompanyId;
      }
      try {
         const listAccidentReportsByInsComp = await AccidentReportModel.findAll(
            {
               order: [["id", "DESC"]],
               limit: size,
               offset: (page - 1) * size,
               where,
               include: [
                  {
                     model: CarAccidentReports,
                  },
                  {
                     model: InsuranceCompany,
                  },
               ],
            }
         );
         let countAccidentReports = await AccidentReportModel.count({
            where,
         });
         where["read"] = false;
         let countUnreadAccidentReports = await AccidentReportModel.count({
            where,
         });
         const currentPage = page;
         const totalPages = Math.ceil(countAccidentReports / size);
         return {
            accidentReports: listAccidentReportsByInsComp,
            totaldata: listAccidentReportsByInsComp.length,
            unread: countUnreadAccidentReports,
            currentPage,
            totalPages,
            totalItems: countAccidentReports,
         };
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 500);
      }
   }
   async listAccidentReportsByBroker(BrokerId, page, size) {
      let where = {};
      try {
         const listAccidentReportsByBroker = await AccidentReportModel.findAll({
            order: [["id", "DESC"]],
            limit: size,
            offset: (page - 1) * size,
            include: [
               {
                  model: CarAccidentReports,
               },
               {
                  model: Car,
                  where: {
                     BrokerId,
                  },
               },
               {
                  model: InsuranceCompany,
               },
            ],
         });
         let countAccidentReports = await AccidentReportModel.count({
            include: [
               {
                  model: Car,
                  where: {
                     BrokerId,
                  },
               },
            ],
         });
         where["read"] = false;
         let countUnreadAccidentReports = await AccidentReportModel.count({
            where,
            include: [
               {
                  model: Car,
                  where: {
                     BrokerId,
                  },
               },
            ],
         });
         const currentPage = page;
         const totalPages = Math.ceil(countAccidentReports / size);
         return {
            accidentReports: listAccidentReportsByBroker,
            totaldata: listAccidentReportsByBroker.length,
            unread: countUnreadAccidentReports,
            currentPage,
            totalPages,
            totalItems: countAccidentReports,
         };
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 500);
      }
   }
   async listByStatus(insuranceCompanyId, status, page, size) {
      let where = {};
      if (insuranceCompanyId) {
         where["insuranceCompanyId"] = insuranceCompanyId;
      }
      if (status) {
         where["status"] = {
            [Op.or]: status,
         };
      }
      try {
         const listAccidentReportsByInsComp = await AccidentReportModel.findAll(
            {
               order: [["id", "DESC"]],
               limit: size,
               offset: (page - 1) * size,
               where,
               include: [
                  {
                     model: CarAccidentReports,
                  },
                  {
                     model: InsuranceCompany,
                  },
               ],
            }
         );
         let countAccidentReports = await AccidentReportModel.count({
            where,
         });
         let countUnreadAccidentReports = await AccidentReportModel.count({
            where: {
               read: false,
               status: {
                  [Op.or]: status,
               },
            },
         });
         const currentPage = Number(page);
         const totalPages = Math.ceil(countAccidentReports / size);
         return {
            accidentReports: listAccidentReportsByInsComp,
            totaldata: listAccidentReportsByInsComp.length,
            unread: countUnreadAccidentReports,
            currentPage,
            totalPages,
            totalItems: countAccidentReports,
         };
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 500);
      }
   }
   async listByStatusBroker(brokerId, status, page, size) {
      let where = {};
      if (status) {
         where["status"] = {
            [Op.or]: status,
         };
      }
      try {
         const listAccidentReportsByInsComp = await AccidentReportModel.findAll(
            {
               order: [["id", "DESC"]],
               limit: size,
               offset: (page - 1) * size,
               where,
               include: [
                  {
                     model: CarAccidentReports,
                  },
                  {
                     model: Car,
                     where: {
                        BrokerId: brokerId,
                     },
                  },
                  {
                     model: InsuranceCompany,
                  },
               ],
            }
         );
         let countAccidentReports = await AccidentReportModel.count({
            where,
            include: [
               {
                  model: Car,
                  where: {
                     BrokerId: brokerId,
                  },
               },
            ],
         });
         let countUnreadAccidentReports = await AccidentReportModel.count({
            where: {
               read: false,
               status: {
                  [Op.or]: status,
               },
            },
            include: [
               {
                  model: Car,
                  where: {
                     BrokerId: brokerId,
                  },
               },
            ],
         });
         const currentPage = Number(page);
         const totalPages = Math.ceil(countAccidentReports / size);
         return {
            accidentReports: listAccidentReportsByInsComp,
            totaldata: listAccidentReportsByInsComp.length,
            unread: countUnreadAccidentReports,
            currentPage,
            totalPages,
            totalItems: countAccidentReports,
         };
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 500);
      }
   }
   async listAccidentReports() {
      const listAccidentReportsByInsComp = await AccidentReportModel.findAll(
         {}
      );
      return listAccidentReportsByInsComp;
   }
   async searchInAccidentReports(id, name, mobile, insuranceCompanyId) {
      let where = {};
      if (id) {
         where["id"] = id;
      }
      if (name) {
         where["client"] = {
            [Op.or]: { [Op.substring]: name, [Op.eq]: name },
         };
      }
      if (mobile) {
         // whereClient['username'] = { [Op.substring]: mobile };
         where["phoneNumber"] = {
            [Op.or]: { [Op.substring]: mobile, [Op.eq]: mobile },
         };
      }
      if (insuranceCompanyId) {
         where["insuranceCompanyId"] = insuranceCompanyId;
      }

      let reports = await AccidentReportModel.findAll({
         where: {
            [Op.or]: where,
         },
         include: [
            {
               model: InsuranceCompany,
            },
            {
               model: Car,
               include: [CarModel, Manufacturer, InsuranceCompany],
            },
            {
               model: Client,
               include: [
                  {
                     model: User,
                     // where: whereClient,
                  },
               ],
            },
         ],
      });
      return reports;
   }
   async getOneAccidentReport(reportId, insurance) {
      try {
         if (insurance) {
            await AccidentReportModel.update(
               { read: true },
               {
                  where: {
                     id: reportId,
                  },
               }
            );
         }
         let accidentReportsExist = await AccidentReportModel.findOne({
            where: {
               id: reportId,
            },
            include: [
               {
                  model: InsuranceCompany,
               },
               {
                  model: Car,
                  include: [
                     {
                        model: InsuranceCompany,
                     },
                     {
                        model: Manufacturer,
                     },
                     {
                        model: CarModel,
                     },
                     {
                        model: Broker,
                        include: [User],
                     },
                  ],
               },
               {
                  model: CarAccidentReports,
               },
               {
                  model: AccidentType,
               },
               {
                  model: Client,
                  include: [User],
               },
               {
                  model: Inspector,
                  include: [User],
               },
            ],
         });
         if (!accidentReportsExist) {
            return new AppError("No Accident Report Exists ", 404);
         }
         let insuranceCom = await InsuranceCompany.findByPk(
            accidentReportsExist.insuranceCompanyId
         );
         let mainImages = await AccidentReportMainImages.findAll({
            where: {
               accidentReportId: reportId,
               additional: false,
            },
         });
         let additionalImages = await AccidentReportMainImages.findAll({
            where: {
               accidentReportId: reportId,
               additional: true,
            },
         });
         let policeImages = [];
         let supplementImages = [];
         let bRepairImages = [];
         let resurveyImages = [];
         let additional = [];
         mainImages = mainImages.map((image) => {
            image = image.get({ plain: true });
            image["arName"] = imagesRefKeys[image.imageName];
            image["guide"] = `/views/fnol_images/${image.imageName}.png`;
            image.arName = imagesRefKeys[image.imageName];
            return image;
         });
         if (additionalImages) {
            additionalImages = additionalImages.map((img) =>
               img.get({ plain: true })
            );

            let images = additionalImages.map((img) => {
               let imageName = img.imageName;
               if (imageName.startsWith("police")) {
                  policeImages.push(img);
               } else if (imageName.startsWith("supplement")) {
                  supplementImages.push(img);
               } else if (imageName.startsWith("repair")) {
                  bRepairImages.push(img);
               } else if (imageName.startsWith("resurvey")) {
                  resurveyImages.push(img);
               } else {
                  additional.push(img);
               }
               return img;
            });
         }
         accidentReportsExist = accidentReportsExist.get({ plain: true });

         return {
            report: {
               ...accidentReportsExist,
               insuranceCompany: insuranceCom,
            },
            mainImages,
            policeImages,
            supplementImages,
            bRepairImages,
            resurveyImages,
            additional,
         };
      } catch (error) {
         return new AppError(error.message, 400);
      }
   }
   async createAccidentReport(accidentReport) {
      try {
         const accidentTypeId = JSON.parse(accidentReport.accidentTypeId);
         const location = JSON.parse(accidentReport.location);
         let car = await carService.getCar(accidentReport.carId);
         if (car.statusCode) return car;
         let client = await clientService.getClientById(car.ClientId);
         if (client.statusCode) return client;
         let user = await User.findOne({
            where: {
               id: client.UserId,
            },
         });
         if (!car.active)
            return new AppError(
               "Please active the car before creating an accident report",
               400
            );
         user = user.get({ plain: true });
         let date = moment().format("YYYY/MM/DD");
         date = date.replaceAll("/", "");
         const insuranceCompanyId = car.insuranceCompany
            ? car.insuranceCompany.id
            : accidentReport.insuranceCompanyId;
         // let serverIp = os.networkInterfaces()["eth0"][0].address;
         // if (serverIp !== "89.117.61.172") {
         //    const checkIfCreated = await AccidentReportModel.findOne({
         //       where: {
         //          clientId: client.id,
         //          carId: car.id,
         //       },
         //    });
         //    if (
         //       checkIfCreated &&
         //       moment().add(24, "h").isAfter(moment(checkIfCreated.createdAt))
         //    ) {
         //       return new AppError(
         //          "You have created this accident report today, please try again later or update the current one",
         //          400
         //       );
         //    }
         // }
         if (!car.active) {
            return new AppError(
               "Please active the car before creating an accident report",
               400
            );
         }
         const createdAccidentReport = await AccidentReportModel.create({
            location,
            insuranceCompanyId,
            phoneNumber: accidentReport.phoneNumber,
            carId: accidentReport.carId,
            clientId: car.ClientId,
            createdByUser: accidentReport.createdByUser,
            status: "created",
            client: user.name,
            ref: `${user.PhoneNumber}-${date}`,
            statusList: ["created"],
         });
         let requiredImagesForAccident = [];
         let allImages = [];
         for (let i = 0; i < accidentTypeId.length; i++) {
            let type = await AccidentType.findOne({
               where: {
                  id: accidentTypeId[i],
               },
            });
            type = type.get({ plain: true });
            let requiredImagesss = type.requiredImages.split(",");
            allImages.push(...requiredImagesss);
            await AccidentTypesAndReports.create({
               AccidentReportId: createdAccidentReport.id,
               accidentTypeId: accidentTypeId[i],
            });
         }

         for (let i = 0; i < allImages.length; i++) {
            if (!requiredImagesForAccident.includes(allImages[i])) {
               requiredImagesForAccident.push(allImages[i]);
            } else {
               continue;
            }
         }
         await createdAccidentReport.update({
            requiredImagesNo: requiredImagesForAccident.length - 1,
         });
         await createdAccidentReport.save();
         let accReport = await AccidentReportModel.findOne({
            where: {
               id: createdAccidentReport.id,
            },
         });
         accReport = accReport.get({ plain: true });
         return {
            ...accReport,
            requiredImages: requiredImagesForAccident,
            subject: `إخطار حادث ${car.Manufacturer.ar_name} ${car.Manufacturer.ar_name} شاسيه ${car.vin_number}`,
         };
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 400);
      }
   }
   async updateBillAccidentReport(accidentReportId, accidentReport) {
      try {
         let existAccidentReport = await AccidentReportModel.findByPk(
            accidentReportId
         );

         if (!existAccidentReport)
            return new AppError("No accidentReport with this id", 404);
         let billDeliveryLocation = JSON.parse(
            accidentReport.billDeliveryLocation
         );

         let billDeliveryDates = [];
         let billDeliveryTimeRanges = [];
         let billDeliveryNotes = [];
         let billDeliveryLocations = [];
         if (accidentReport.billDeliveryLocation) {
            if (existAccidentReport.billDeliveryLocation !== null) {
               billDeliveryLocations = existAccidentReport.billDeliveryLocation;
               billDeliveryLocations = [
                  ...billDeliveryLocations,
                  billDeliveryLocation,
               ];
            } else {
               billDeliveryLocations = [billDeliveryLocation];
            }
         }
         if (accidentReport.billDeliveryTimeRange) {
            if (existAccidentReport.billDeliveryTimeRange !== null) {
               billDeliveryTimeRanges =
                  existAccidentReport.billDeliveryTimeRange;
               billDeliveryTimeRanges = [
                  ...billDeliveryTimeRanges,
                  accidentReport.billDeliveryTimeRange,
               ];
            } else {
               billDeliveryTimeRanges = [accidentReport.billDeliveryTimeRange];
            }
         }
         if (accidentReport.billDeliveryDate) {
            if (existAccidentReport.billDeliveryDate !== null) {
               billDeliveryDates = existAccidentReport.billDeliveryDate;
               billDeliveryDates = [
                  ...billDeliveryDates,
                  moment(accidentReport.billDeliveryDate).add(6, "h"),
               ];
            } else {
               billDeliveryDates = [
                  moment(accidentReport.billDeliveryDate).add(6, "h"),
               ];
            }
         }
         if (accidentReport.billDeliveryNotes) {
            if (existAccidentReport.billDeliveryNotes !== null) {
               billDeliveryNotes = existAccidentReport.billDeliveryNotes;
               billDeliveryNotes = [
                  ...billDeliveryNotes,
                  accidentReport.billDeliveryNotes,
               ];
            } else {
               billDeliveryNotes = [accidentReport.billDeliveryNotes];
            }
         }

         const updatedAccidentReport = await AccidentReportModel.update(
            {
               billDeliveryDate: billDeliveryDates,
               billDeliveryTimeRange: billDeliveryTimeRanges,
               billDeliveryNotes: billDeliveryNotes,
               billDeliveryLocation: billDeliveryLocations,
               status: accidentReport.status,
               statusList: getNewStatusList(
                  existAccidentReport.statusList,
                  accidentReport.status
               ),
               read: false,
            },
            {
               where: {
                  id: accidentReportId,
               },
            }
         );
         return updatedAccidentReport;
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 400);
      }
   }
   async updateBRepairAccidentReport(accidentReportId, accidentReport) {
      try {
         let existAccidentReport = await AccidentReportModel.findByPk(
            accidentReportId
         );

         if (!existAccidentReport)
            return new AppError("No accidentReport with this id", 404);
         let beforeRepairLocation = JSON.parse(
            accidentReport.beforeRepairLocation
         );
         let befRepairName = accidentReport.bRepairName;
         let bRepairLocations = [];
         let bName = [];
         if (existAccidentReport.beforeRepairLocation !== null) {
            bRepairLocations = existAccidentReport.beforeRepairLocation;
            bName = existAccidentReport.bRepairName;
         }
         bName = [...bName, befRepairName];
         bRepairLocations = [...bRepairLocations, beforeRepairLocation];
         const updatedAccidentReport = await AccidentReportModel.update(
            {
               beforeRepairLocation: bRepairLocations,
               bRepairName: bName,
               status: accidentReport.status,
               statusList: getNewStatusList(
                  existAccidentReport.statusList,
                  accidentReport.status
               ),
               read: false,
            },
            {
               where: {
                  id: accidentReportId,
               },
            }
         );
         return updatedAccidentReport;
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 400);
      }
   }

   async updateARepairAccidentReport(accidentReportId, accidentReport) {
      try {
         let existAccidentReport = await AccidentReportModel.findByPk(
            accidentReportId
         );

         if (!existAccidentReport)
            return new AppError("No accidentReport with this id", 404);
         let afterRepairLocation = JSON.parse(
            accidentReport.afterRepairLocation
         );
         let aRepairLoc = [];
         if (existAccidentReport.afterRepairLocation !== null) {
            aRepairLoc = existAccidentReport.afterRepairLocation;
         }
         aRepairLoc = [...aRepairLoc, afterRepairLocation];
         const updatedAccidentReport = await AccidentReportModel.update(
            {
               afterRepairLocation: aRepairLoc,
               status: accidentReport.status,
               statusList: getNewStatusList(
                  existAccidentReport.statusList,
                  accidentReport.status
               ),
               read: false,
            },
            {
               where: {
                  id: accidentReportId,
               },
            }
         );
         return updatedAccidentReport;
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 400);
      }
   }

   async updateRightSaveLocationAccidentReport(
      accidentReportId,
      accidentReport
   ) {
      try {
         let existAccidentReport = await AccidentReportModel.findByPk(
            accidentReportId
         );

         if (!existAccidentReport)
            return new AppError("No accidentReport with this id", 404);
         let rightSaveLocation = JSON.parse(accidentReport.rightSaveLocation);
         let rSaveLoc = [];
         if (existAccidentReport.rightSaveLocation !== null) {
            rSaveLoc = existAccidentReport.rightSaveLocation;
         }
         rSaveLoc = [...rSaveLoc, rightSaveLocation];
         const updatedAccidentReport = await AccidentReportModel.update(
            {
               rightSaveLocation: rSaveLoc,
               status: accidentReport.status,
               statusList: getNewStatusList(
                  existAccidentReport.statusList,
                  accidentReport.status
               ),
               read: false,
            },
            {
               where: {
                  id: accidentReportId,
               },
            }
         );
         return updatedAccidentReport;
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 400);
      }
   }

   async updateSupplementLocationAccidentReport(
      accidentReportId,
      accidentReport
   ) {
      try {
         let existAccidentReport = await AccidentReportModel.findByPk(
            accidentReportId
         );

         if (!existAccidentReport)
            return new AppError("No accidentReport with this id", 404);
         let supplementLocation = JSON.parse(accidentReport.supplementLocation);
         let suppLoc = [];
         if (existAccidentReport.supplementLocation !== null) {
            suppLoc = existAccidentReport.supplementLocation;
         }
         suppLoc = [...suppLoc, supplementLocation];
         const updatedAccidentReport = await AccidentReportModel.update(
            {
               supplementLocation: suppLoc,
               status: accidentReport.status,
               statusList: getNewStatusList(
                  existAccidentReport.statusList,
                  accidentReport.status
               ),
               read: false,
            },
            {
               where: {
                  id: accidentReportId,
               },
            }
         );
         return updatedAccidentReport;
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 400);
      }
   }

   async updateResurveyLocationAccidentReport(
      accidentReportId,
      accidentReport
   ) {
      try {
         let existAccidentReport = await AccidentReportModel.findByPk(
            accidentReportId
         );

         if (!existAccidentReport)
            return new AppError("No accidentReport with this id", 404);
         let resurveyLocation = JSON.parse(accidentReport.resurveyLocation);
         let resLoc = [];
         if (existAccidentReport.resurveyLocation !== null) {
            resLoc = existAccidentReport.resurveyLocation;
         }
         resLoc = [...resLoc, resurveyLocation];
         const updatedAccidentReport = await AccidentReportModel.update(
            {
               resurveyLocation: resLoc,
               status: accidentReport.status,
               statusList: getNewStatusList(
                  existAccidentReport.statusList,
                  accidentReport.status
               ),
               read: false,
            },
            {
               where: {
                  id: accidentReportId,
               },
            }
         );
         return updatedAccidentReport;
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 400);
      }
   }

   async uploadAccidentReportImages(accidentReportId, accidentReport) {
      try {
         let existAccidentReport = await AccidentReportModel.findByPk(
            accidentReportId
         );
         if (!existAccidentReport) {
            return new AppError("No AccidentReport with this id", 404);
         }
         existAccidentReport = existAccidentReport.get({ plain: true });
         let images = JSON.parse(accidentReport.images);
         let accidentImages = images.map((el) => {
            return {
               ...el,
               accidentReportId,
               imagePath: decodeImages(
                  `${el.imageName}-${existAccidentReport.carId}${
                     existAccidentReport.insuranceCompanyId
                  }-${existAccidentReport.id}-${Date.now()}`,
                  el.image
               ),
            };
         });
         let nonAdditionalImgsNo = 0;
         for (let i = 0; i < accidentImages.length; i++) {
            if (!accidentImages[i].additional) {
               nonAdditionalImgsNo++;
            }
         }
         const updatedAccidentReport =
            await AccidentReportMainImages.bulkCreate(accidentImages);
         await AccidentReportModel.update(
            {
               uploadedImagesCounter:
                  nonAdditionalImgsNo +
                  existAccidentReport.uploadedImagesCounter,
            },
            {
               where: {
                  id: accidentReportId,
               },
            }
         );
         return updatedAccidentReport;
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 400);
      }
   }
   async closeFNOL(accidentReportId) {
      try {
         const existAccidentReport = await AccidentReportModel.findByPk(
            accidentReportId
         );
         if (!existAccidentReport)
            return new AppError("No accidentReport with this id", 404);
         const closedAccidentReport = await AccidentReportModel.update(
            {
               status: "closed",
               statusList: getNewStatusList(
                  existAccidentReport.statusList,
                  "closed"
               ),
            },
            {
               where: {
                  id: accidentReportId,
               },
            }
         );
         return closedAccidentReport;
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 400);
      }
   }
   async updateAccidentReport(id, accidentReport) {
      const accidentReportExist = await AccidentReportModel.findByPk(id);
      if (!accidentReportExist) {
         return new AppError("No Accident Report with this Id", 404);
      } else {
         const status = accidentReport.status;
         let commentUser;
         if (!!accidentReport.commentUser) {
            commentUser = decodeAudio(
               `audioComment-${accidentReportExist.carId}-${accidentReportExist.insuranceCompanyId}-${accidentReportExist.id}-${accidentReportExist.clientId}`,
               accidentReport.commentUser
            );
         }

         let updateObj = {
            status,
            statusList: getNewStatusList(
               accidentReportExist.statusList,
               status
            ),
            read: false,
         };
         if (accidentReport.comment) {
            updateObj["comment"] = accidentReport.comment;
         }
         if (accidentReport.audioCommentWritten) {
            updateObj["audioCommentWritten"] =
               accidentReport.audioCommentWritten;
         }
         if (commentUser) {
            updateObj["commentUser"] = commentUser;
         }
         if (accidentReport.additionalFields) {
            updateObj["additionalData"] = accidentReport.additionalFields;
         }
         const updatedAccidentReport = await AccidentReportModel.update(
            updateObj,
            {
               where: {
                  id,
               },
            }
         );
         return updatedAccidentReport;
      }
   }
   async getFNOLClient(clientId) {
      try {
         const checkExist = await Client.findByPk(clientId);
         if (!checkExist) return new AppError("No client with this Id", 404);

         const clientReports = await AccidentReportModel.findAll({
            order: [["id", "DESC"]],
            limit: 5,
            where: { clientId },
            include: [
               {
                  model: InsuranceCompany,
               },
               {
                  model: Car,
                  include: [
                     {
                        model: InsuranceCompany,
                     },
                     {
                        model: Manufacturer,
                     },
                     {
                        model: CarModel,
                     },
                  ],
               },
               {
                  model: AccidentReportMainImages,
                  as: "images",
               },
               {
                  model: CarAccidentReports,
               },
               {
                  model: AccidentType,
               },
            ],
         });

         return clientReports;
      } catch (error) {
         return new AppError(error.message, 400);
      }
   }
   async deleteAccidentReport(id) {
      const deletedAccidentReport = await AccidentReportModel.destroy({
         where: {
            id,
         },
      });
      return deletedAccidentReport;
   }
   async updateAccidentReportStatus(id, status) {
      const accidentReportExist = await AccidentReportModel.findByPk(id);
      if (!accidentReportExist) {
         return new AppError("No Accident Report with this Id", 404);
      }
      let update = await AccidentReportModel.update(
         {
            status,
            statusList: getNewStatusList(
               accidentReportExist.statusList,
               status
            ),
            read: false,
         },
         {
            where: {
               id,
            },
         }
      );
      let accidentReport = await AccidentReportModel.findByPk(id);
      return accidentReport;
   }
   async rejectAccidentReport(id) {
      const checkExist = await AccidentReport.findByPk(id);
      if (!checkExist) return new AppError("No Report with this Id", 404);
      await AccidentReport.update(
         {
            status: "rejected",
            statusList: getNewStatusList(checkExist.statusList, "rejected"),
         },
         {
            where: {
               id,
            },
         }
      );
      // let report = await AccidentReport.findByPk(id)
      return "rejected";
   }
   async getForInspector(id, page, size) {
      let reports = await AccidentReportModel.findAll({
         order: [["id", "DESC"]],
         limit: size,
         offset: (page - 1) * size,
         where: {
            InspectorId: id,
         },
         include: [
            {
               model: InsuranceCompany,
            },
            {
               model: Car,
               include: [
                  {
                     model: InsuranceCompany,
                  },
                  {
                     model: Manufacturer,
                  },
                  {
                     model: CarModel,
                  },
               ],
            },
            {
               model: CarAccidentReports,
            },
            {
               model: AccidentType,
            },
            {
               model: Client,
               include: [User],
            },
            {
               model: Inspector,
               include: [User],
            },
         ],
      });
      return reports;
   }
   async getForInspection(id, page, size) {
      let reports = await AccidentReportModel.findAll({
         order: [["id", "DESC"]],
         limit: size,
         offset: (page - 1) * size,
         where: {
            inspectionCompanyId: id,
         },
         include: [
            {
               model: InsuranceCompany,
            },
            {
               model: Car,
               include: [
                  {
                     model: InsuranceCompany,
                  },
                  {
                     model: Manufacturer,
                  },
                  {
                     model: CarModel,
                  },
               ],
            },
            {
               model: CarAccidentReports,
            },
            {
               model: AccidentType,
            },
            {
               model: Client,
               include: [User],
            },
            {
               model: Inspector,
               include: [User],
            },
         ],
      });
      return reports;
   }
}

const getNewStatusList = (oldList, status) => {
   if (!status) return oldList;
   if (oldList.includes(status)) return oldList;
   else return [...oldList, status];
};

const decodeImages = (imageName, image) => {
   const base64Image = image.split(";base64,").pop();
   let filename = `/public/accidentReports/imgs/${imageName}.jpg`;
   require("fs").writeFile(
      `.${filename}`,
      base64Image,
      "base64",
      function (err) {
         if (err) console.error(err);
      }
   );
   return filename;
};

const decodeAudio = (audioName, audio) => {
   const base64Audio = audio.split(";base64,").pop();
   let fileName = `/public/accidentReports/audios/${audioName}.m4a`;
   require("fs").writeFile(
      `.${fileName}`,
      base64Audio,
      "base64",
      function (err) {
         if (err) console.error(err);
      }
   );
   return fileName;
};
const accidentReport = new AccidentReport();
module.exports = accidentReport;
