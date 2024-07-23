// NPM Lib
const fs = require("fs");

// Models
const Inspections = require("../models/Inspections");
const Manufacturer = require("../models/Manufacturer");
const CarModel = require("../models/CarModel");
const Inspector = require("../models/Inspector");
const InsuranceCompany = require("../models/InsuranceCompany");
const InspectionCompany = require("../models/InspectionCompany");
const InspectionsReports = require("../models/InspectionsReports");
const User = require("../models/User");

const AppError = require("../utils/AppError");

const smsService = require("./smsService");

class InspectionService {
   async getAllByIns(insuranceId, status, page, size, type) {
      let order = [["id", "DESC"]];
      let where = {
         insuranceCompanyId: insuranceId,
      };
      if (status) {
         where["status"] = status;
         order = [["updatedAt", "DESC"]];
      }
      if (type) {
         where["type"] = type;
      }
      const allInspections = await Inspections.findAll({
         order,
         limit: size,
         offset: (page - 1) * size,
         where: where,
         include: [
            InsuranceCompany,
            { model: Inspector, include: [InspectionCompany, User] },
            CarModel,
            Manufacturer,
            InspectionCompany,
            InspectionsReports,
         ],
      });
      let totalData = await Inspections.count({
         where,
      });
      let totalPages = Math.ceil(totalData / size);

      return {
         inspections: allInspections,
         totalPages,
         totalData,
         currentPage: page,
      };
   }
   async getOneById(id) {
      let inspection = await Inspections.findOne({
         where: {
            id,
         },
         include: [
            InsuranceCompany,
            { model: Inspector, include: InspectionCompany },
            CarModel,
            Manufacturer,
            InspectionCompany,
            InspectionsReports,
         ],
      });
      if (!inspection) return new AppError("No Inspection with this Id", 404);
      inspection = inspection.get({ plain: true });
      return inspection;
   }
   async createInspection(data) {
      // console.log(data);
      delete data.createdAt;
      delete data.updatedAt;
      // console.log(data);
      try {
         let newInspection = await Inspections.create({
            ...data,
            status: "pending",
         });
         // console.log(newInspection);
         return newInspection;
      } catch (err) {
         return new AppError(err.message, 500);
      }
   }
   //  async uploadAttachments(id, attachments) {

   //  }
   async deleteInspection(id) {
      try {
         let inspection = await this.getOneById(id);
         if (inspection.statusCode) return inspection;
         await Inspections.destroy({
            where: {
               id,
            },
         });
         return { status: "deleted" };
      } catch (err) {
         return new AppError(err.message, 500);
      }
   }
   async updateInspection(id, data) {
      // console.log(data);
      delete data.createdAt;
      delete data.updatedAt;
      // console.log(data);
      try {
         let inspection = await this.getOneById(id);
         // console.log(inspection);
         if (inspection.statusCode) return inspection;

         let update = await Inspections.update(
            {
               ...data,
            },
            {
               where: {
                  id,
               },
            }
         );
         inspection = await this.getOneById(id);
         // console.log(inspection);

         return inspection;
      } catch (err) {
         return new AppError(err.message, 500);
      }
   }
   // 1) upload PDFs
   async uploadInspectionPDFs(inspectionId, mobileNumber, pdf) {
      try {
         let existInspection = await Inspections.findByPk(inspectionId);
         if (!existInspection) {
            return new AppError("No Inspection with this id", 404);
         }
         existInspection = existInspection.get({ plain: true });
         let pdfFilename = decodePDF(`pdf-${inspectionId}-${Date.now()}`, pdf);
         let checkPdfReports = existInspection.pdfReports
            ? existInspection.pdfReports
            : [];
         await Inspections.update(
            {
               pdfReports: [...checkPdfReports, pdfFilename],
            },
            {
               where: {
                  id: inspectionId,
               },
            }
         );

         // await smsService.sendSms({
         //   mobile: mobileNumber,
         //   message: `لقد تم تكليفك للمعاينه٬ التفاصيل من خلال الرابط https://apidev.helpooapp.net/${pdfFilename}`,
         // });

         let inspection = await Inspections.findByPk(inspectionId);

         return inspection;
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 500);
      }
   }
   // 2) upload Images
   async uploadInspectionImages(inspectionId, images) {
      try {
         let existInspection = await Inspections.findByPk(inspectionId);
         if (!existInspection) {
            return new AppError("No Inspection with this id", 404);
         }
         existInspection = existInspection.get({ plain: true });
         let inspectorImages = images.inspectorImages;
         let supplementImages = images.supplementImages;
         let additionalPaperImages = images.additionalPaperImages;
         // console.log(inspectorImages?.length);
         // console.log(supplementImages?.length);
         // console.log(additionalPaperImages?.length);
         let inspectorImagesTags = [];
         inspectorImages = inspectorImages
            ? inspectorImages.map((el, i) => {
                 let image = {
                    ...el,
                    imagePath: decodeImages(
                       `${el.imageName ? el.imageName : ""}-${
                          existInspection.id
                       }-${existInspection.inspectorId}-${Date.now()}-${i}`,
                       el.image
                    ),
                 };
                 inspectorImagesTags.push(image.imageName);
                 return {
                    text: image.text,
                    imagePath: image.imagePath,
                    imageName: image.imageName,
                 };
              })
            : [];
         additionalPaperImages = additionalPaperImages
            ? additionalPaperImages.map((el, i) => {
                 let image = {
                    ...el,
                    imagePath: decodeImages(
                       `${el.imageName ? el.imageName : ""}-${
                          existInspection.id
                       }-${existInspection.inspectorId}-${Date.now()}-${i}`,
                       el.image
                    ),
                 };
                 return {
                    text: image.text,
                    imagePath: image.imagePath,
                 };
              })
            : [];
         supplementImages = supplementImages
            ? supplementImages.map((el, i) => {
                 let imageName = `supplement-${
                    existInspection.id
                 }-${Date.now()}-${i}`;
                 let image = {
                    text: el.text,
                    imagePath: decodeImages(`${imageName}`, el.image),
                 };
                 let audio = el.audio
                    ? decodeAudio(
                         `supplement-audio-image-${imageName}`,
                         el.audio
                      )
                    : undefined;
                 return {
                    text: image.text,
                    imagePath: image.imagePath,
                    audioPath: audio,
                 };
              })
            : [];
         let existInspectorImages = existInspection.inspectorImages
            ? existInspection.inspectorImages
            : [];
         let existAdditionalPaperImages = existInspection.additionalPaperImages
            ? existInspection.additionalPaperImages
            : [];
         let existSupplementImages = existInspection.supplementImages
            ? existInspection.supplementImages
            : [];
         // console.log(inspectorImages?.length);
         // console.log(supplementImages?.length);
         // console.log(additionalPaperImages?.length);
         let remainingInspectorImages =
            existInspection.remainingInspectorImages ||
            existInspection.requiredInspectorImages ||
            [];
         if (inspectorImagesTags.length > 0) {
            remainingInspectorImages = remainingInspectorImages.filter(
               (tag) => {
                  // console.log(tag);
                  // console.log(inspectorImagesTags);
                  // console.log(inspectorImagesTags.includes(tag));
                  if (inspectorImagesTags.includes(tag)) {
                     return false;
                  }
                  return true;
               }
            );
         }
         await Inspections.update(
            {
               inspectorImages: [...existInspectorImages, ...inspectorImages],
               supplementImages: [
                  ...existSupplementImages,
                  ...supplementImages,
               ],
               additionalPaperImages: [
                  ...existAdditionalPaperImages,
                  ...additionalPaperImages,
               ],
               remainingInspectorImages,
            },
            {
               where: {
                  id: inspectionId,
               },
            }
         );
         let inspection = await Inspections.findByPk(inspectionId);
         return inspection;
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 400);
      }
   }
   // 3) upload insurance Images
   async uploadInsuranceImages(inspectionId, images) {
      try {
         let existInspection = await Inspections.findByPk(inspectionId);
         if (!existInspection) {
            return new AppError("No Inspection with this id", 404);
         }
         existInspection = existInspection.get({ plain: true });
         let insuranceImages = images;

         insuranceImages = insuranceImages
            ? insuranceImages.map((el, i) => {
                 let image = {
                    ...el,
                    imagePath: decodeImages(
                       `${el.imageName ? el.imageName + "-" : ""}${
                          existInspection.id
                       }-insuranceImages-${Date.now()}-i`,
                       el.image
                    ),
                 };
                 return {
                    text: image.text,
                    imagePath: image.imagePath,
                 };
              })
            : [];
         let existInsuranceImages = existInspection.insuranceImages
            ? existInspection.insuranceImages
            : [];
         await Inspections.update(
            {
               insuranceImages: [...existInsuranceImages, ...insuranceImages],
            },
            {
               where: {
                  id: inspectionId,
               },
            }
         );
         let inspection = await Inspections.findByPk(inspectionId);
         return inspection;
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 400);
      }
   }

   // 4) upload Audio
   async uploadInspectionAudios(inspectionId, audio) {
      try {
         let existInspection = await Inspections.findByPk(inspectionId);
         if (!existInspection)
            return new AppError("No Inspection with this id", 404);
         let audioPath = decodeAudio(
            `audio-${existInspection.id}-${Date.now()}`,
            audio
         );
         let audios = existInspection.audioRecordsWithNotes
            ? existInspection.audioRecordsWithNotes
            : [];
         await Inspections.update(
            {
               audioRecordsWithNotes: [...audios, { audioPath }],
            },
            {
               where: {
                  id: inspectionId,
               },
            }
         );
         let inspection = await Inspections.findByPk(inspectionId);
         return inspection;
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 400);
      }
   }
   async getForInspector(id, page, size, status, type) {
      let order = [["id", "DESC"]];
      let where = {
         inspectorId: id,
      };
      if (status) {
         where["status"] = status;
         order = [["updatedAt", "DESC"]];
      }
      if (type) {
         where["type"] = type;
      }
      let inspections = await Inspections.findAll({
         order,
         limit: size,
         offset: (page - 1) * size,
         where: where,
         include: [
            InsuranceCompany,
            { model: Inspector, include: [InspectionCompany, User] },
            CarModel,
            Manufacturer,
            InspectionCompany,
            InspectionsReports,
         ],
      });
      let totalData = await Inspections.count({
         where,
      });
      let totalPages = Math.ceil(totalData / size);

      return { inspections, totalPages, totalData, currentPage: page };
   }

   async getForInspection(id, page, size, status, type, filters) {
      let order = [["id", "DESC"]];

      let where = {
         ...filters,
         inspectionCompanyId: id,
      };
      if (status) {
         where["status"] = status;
         order = [["updatedAt", "DESC"]];
      }
      if (type) {
         where["type"] = type;
      }
      let inspections = await Inspections.findAll({
         order,
         limit: size,
         offset: (page - 1) * size,
         where: where,
         include: [
            InsuranceCompany,
            { model: Inspector, include: [InspectionCompany, User] },
            CarModel,
            Manufacturer,
            InspectionCompany,
            InspectionsReports,
         ],
      });
      let totalData = await Inspections.count({
         where,
      });
      let totalPages = Math.ceil(totalData / size);

      return { inspections, totalPages, totalData, currentPage: page };
   }
   async deleteInspectionPhoto(id, key, img) {
      let inspection = await Inspections.findByPk(id);
      if (!inspection) {
         return new AppError("No inspection with this id", 404);
      }
      let editableArray = inspection[key];
      // console.log(img);
      // console.log(img);
      // console.log(editableArray.length);
      let gainedTags = [];
      editableArray = editableArray?.filter((image) => {
         if (image.imagePath === img) {
            fs.unlink(`.${image.imagePath}`);
            if (key === "inspectorImages") {
               // console.log(image.imageName);
               gainedTags.push(image.imageName);
            }
            return false;
         }
         return true;
      });
      // console.log(gainedTags);
      // console.log(inspection.remainingInspectorImages);
      let remainingInspectorImages = inspection.remainingInspectorImages;
      if (gainedTags.length > 0) {
         remainingInspectorImages =
            inspection.remainingInspectorImages.includes(gainedTags[0])
               ? inspection.remainingInspectorImages
               : [...inspection.remainingInspectorImages, gainedTags[0]];
      }
      // console.log(remainingInspectorImages);
      let updateObj = { remainingInspectorImages };
      updateObj[key] = editableArray;

      await Inspections.update(updateObj, {
         where: {
            id,
         },
      });
      inspection = await Inspections.findByPk(id);
      return inspection;
   }
   async deleteAllImagesInspection(id, key) {
      let inspection = await Inspections.findByPk(id);
      if (!inspection) {
         return new AppError("No inspection with this id", 404);
      }
      let arr = inspection[key];
      for (let i = 0; i < arr.length; i++) {
         let img = arr[i];
         fs.unlink(`.${img.imagePath}`);
      }

      let updateObj = {};
      updateObj[key] = [];
      await Inspections.update(updateObj, {
         where: {
            id,
         },
      });
      inspection = await Inspections.findByPk(id);
      return inspection;
   }
   // async getImagesCompressed(id) {
   //    let inspection = await Inspections.findByPk(id);
   //    if (!inspection) {
   //       return new AppError("No inspection with this id", 404);
   //    }
   //    const archiveInspection = archiver("zip");
   //    const archivePapers = archiver("zip");
   //    const archiveExtra = archiver("zip");
   // }
}

const decodeImages = (imageName, image) => {
   const base64Image = image.split(";base64,").pop();
   let filename = `/public/inspections/imgs/${imageName}.jpg`;
   fs.writeFile(`.${filename}`, base64Image, "base64", function (err) {
      if (err) console.error(err);
   });
   return filename;
};

const decodePDF = (pdfName, pdf) => {
   let base64Data = pdf.replace(/^data:application\/pdf;base64,/, "");
   let filename = `/public/inspections/pdf/${pdfName}.pdf`;
   fs.writeFile(`.${filename}`, base64Data, "base64", function (err) {
      if (err) console.error(err);
   });
   return filename;
};

const decodeAudio = (audioName, audio) => {
   const base64Audio = audio.split(";base64,").pop();
   let fileName = `/public/inspections/audios/${audioName}.m4a`;
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

const inspectionsService = new InspectionService();
module.exports = inspectionsService;
