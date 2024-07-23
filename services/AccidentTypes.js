const fs = require("fs");
const AccidentType = require("../models/AccidentType");
const Inspections = require("../models/Inspections");
const AppError = require("../utils/AppError");

class AccidentTypesService {
   async getAllAccidentTypes() {
      return await AccidentType.findAll();
   }

   async getImagesList(accidentTypeId, inspection, inspectionId) {
      if (!accidentTypeId) return new AppError("you should send the ids", 400);
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
      }

      for (let i = 0; i < allImages.length; i++) {
         if (!requiredImagesForAccident.includes(allImages[i])) {
            requiredImagesForAccident.push(allImages[i]);
         } else {
            continue;
         }
      }
      if (inspection) {
         requiredImagesForAccident = ["img1", ...requiredImagesForAccident];
         requiredImagesForAccident = requiredImagesForAccident.filter((tag) => {
            if (tag === "air_bag_images") {
               return false;
            }
            return true;
         });
      }
      // console.log(requiredImagesForAccident);
      // console.log(inspectionId);
      if (inspectionId) {
         const anInspection = await Inspections.findByPk(inspectionId);
         if (!anInspection) {
            return requiredImagesForAccident;
         }
         if (anInspection.requiredInspectorImages) {
            let selectedAccTypes = anInspection.selectedAccTypes;
            let diff = anInspection.requiredInspectorImages.filter((img) => {
               if (requiredImagesForAccident.includes(img)) {
                  return false;
               }
               return true;
            });
            let filteredImages = anInspection.inspectorImages.filter((img) => {
               if (diff.includes(img.imageName)) {
                  fs.unlink(`.${img.imagePath}`);
                  return false;
               }
               return true;
            });
            let filteredImagesTags = filteredImages.map((img) => img.imageName);
            let remainingInspectorImages = requiredImagesForAccident.filter(
               (img) => {
                  if (filteredImagesTags.includes(img)) {
                     return false;
                  }
                  return true;
               }
            );
            // if (selectedAccTypes && selectedAccTypes.length > 0) {
            //    selectedAccTypes = returnSelectedTypes(
            //       selectedAccTypes,
            //       accidentTypeId
            //    );
            // } else {
            selectedAccTypes = accidentTypeId;
            // }
            await Inspections.update(
               {
                  inspectorImages: filteredImages,
                  requiredInspectorImages: requiredImagesForAccident,
                  remainingInspectorImages,
                  selectedAccTypes,
               },
               {
                  where: {
                     id: inspectionId,
                  },
               }
            );
         } else {
            // console.log(requiredImagesForAccident);
            await Inspections.update(
               {
                  requiredInspectorImages: requiredImagesForAccident,
                  remainingInspectorImages: requiredImagesForAccident,
                  selectedAccTypes: accidentTypeId,
               },
               {
                  where: {
                     id: inspectionId,
                  },
               }
            );
         }
         return requiredImagesForAccident;
      }
      return requiredImagesForAccident;
   }
}
function returnSelectedTypes(selectedAccTypes, newTypes) {
   for (let i = 0; i < newTypes.length; i++) {
      if (selectedAccTypes.includes(newTypes[i])) {
         continue;
      } else {
         selectedAccTypes.push(newTypes[i]);
      }
   }
   return selectedAccTypes;
}
const accidentTypes = new AccidentTypesService();
module.exports = accidentTypes;
