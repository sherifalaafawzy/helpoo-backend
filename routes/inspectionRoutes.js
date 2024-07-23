const express = require("express");
const fs = require("fs");
const auth = require("../middlewares/auth");
const restricted = require("../middlewares/restriction");
const catchAsync = require("../utils/catchAsync");
// const sharp = require("sharp")
const inspectionService = require("../services/InspectionsService");
const soleraFunctions = require("../services/soleraFunctions");

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

// let resizeImages = catchAsync(async (req, res, next) => {

//     req.body.insuranceImages = [];
//     // req.body.inspectorImages = [];
//     if(req.files.insuranceImages){
//         await Promise.all(
//           req.files.insuranceImages.map(async (file, i) => {
//             const filename = `inspection-${Date.now()}-${i + 1}.jpeg`;
//             await sharp(file.buffer).resize(2000, 1333).toFormat('jpeg').jpeg({ quality: 90 }).toFile(`public/inspections/imgs/${filename}`)
//             req.body.insuranceImages.push(`/public/inspections/imgs/${filename}`)
//           })
//         )
//     }
//     // if(req.files.inspectorImages){
//         // await Promise.all(
//             // req.files.inspectorImages.map(async (file, i) => {
//             //   const filename = `inspection-${Date.now()}-${i + 1}.jpeg`;
//             //   await sharp(file.buffer).resize(2000, 1333).toFormat('jpeg').jpeg({ quality: 90 }).toFile(`public/inspection/${filename}`)
//             //   req.body.inspectorImages.push(`/public/inspections/imgs/${filename}`)
//             // })
//         // )
//     // }
//     next();
// })

router.post(
   "/create",
   auth,
   catchAsync(async (req, res, next) => {
      let data = {};
      if (!req.files || req.files.length === 0) {
         data = req.body;
      } else {
         // console.log(req.files);
         filePaths = req.files.map((file) => file.path);
         // console.log(filePaths);
         data = {
            ...req.body,
            attachments: filePaths,
         };
      }
      let inspection = await inspectionService.createInspection(data);
      if (inspection.statusCode)
         return next(inspection);
      else
         res.status(200).json({
            status: "success",
            inspection,
         });
   })
);

router.get(
   "/getAll/:insId",
   auth,
   catchAsync(async (req, res, next) => {
      let { status, type } = req.query;
      let page = req.query.page || 1;
      let size = req.query.size || 10;
      let inspections = await inspectionService.getAllByIns(
         req.params.insId,
         status,
         page,
         size,
         type
      );
      res.status(200).json({
         status: "success",
         ...inspections,
      });
   })
);

router.get(
   "/forInspector/:id",
   auth,
   catchAsync(async (req, res, next) => {
      let { status, type } = req.query;
      let page = req.query.page || 1;
      let size = req.query.size || 10;

      let inspections = await inspectionService.getForInspector(
         req.params.id,
         page,
         size,
         status,
         type
      );
      res.status(200).json({
         status: "success",
         ...inspections,
      });
   })
);

router.get(
   "/forInspection/:id",
   auth,
   catchAsync(async (req, res, next) => {
      let { status, type } = req.query;
      let page = req.query.page || 1;
      let size = req.query.size || 10;
      let filter = {};
      let excludedFields = ["status", "type", "page", "size"];
      Object.entries(req.query).forEach(([key, value]) => {
         if (excludedFields.includes(key)) {
         } else {
            filter[key] = value;
         }
      });

      // console.log(filter);

      let inspections = await inspectionService.getForInspection(
         req.params.id,
         page,
         size,
         status,
         type,
         filter
      );
      res.status(200).json({
         status: "success",
         ...inspections,
      });
   })
);

router.post(
   "/uploadPdf/:id",
   auth,
   catchAsync(async (req, res, next) => {
      let { pdfBase64 } = req.body;
      let inspection = await inspectionService.uploadInspectionPDFs(
         req.params.id,
         req.params.mobileNumber,
         pdfBase64
      );
      if (inspection.statusCode) {
         return next(inspection);
      } else {
         res.status(200).json({
            status: "success",
            inspection,
         });
      }
   })
);

router.post(
   "/uploadImages/:id",
   auth,
   catchAsync(async (req, res, next) => {
      let { inspectorImages, supplementImages, additionalPaperImages } =
         req.body;
      let inspection = await inspectionService.uploadInspectionImages(
         req.params.id,
         { inspectorImages, supplementImages, additionalPaperImages }
      );
      if (inspection.statusCode)
         return next(inspection);
      else {
         res.status(200).json({
            status: "success",
            inspection,
         });
         if (req.body.inspectorImages && req.body.inspectorImages.length > 0) {
            try {
               let imagesList = req.body.inspectorImages;
               let imagess = [];
               // imagesList = imagesList.map(el => el.image)
               for (let i = 0; i < imagesList.length; i++) {
                  let obj = imagesList[i];
                  imagess.push({
                     image: obj.image,
                     tags: [obj.imageName ? returnTag(obj.imageName) : "front"],
                  });
               }

               if (imagess.length > 0) {
                  // console.log(
                  //    fs.existsSync(
                  //       `./public/inspections/base64Imgs/${req.params.id}.txt`
                  //    )
                  // );
                  for (let i = 0; i < imagess.length; i++) {
                     // console.log(i);
                     // console.log(
                     //    fs.existsSync(
                     //       `./public/inspections/base64Imgs/${req.params.id}.txt`
                     //    )
                     // );
                     if (
                        fs.existsSync(
                           `./public/inspections/base64Imgs/${req.params.id}.txt`
                        )
                     ) {
                        fs.appendFile(
                           `./public/inspections/base64Imgs/${req.params.id}.txt`,
                           `,,,,${JSON.stringify(imagess[i])}`,
                           function (err, data) {
                              if (err) console.error(err);
                           }
                        );
                     } else {
                        fs.writeFile(
                           `./public/inspections/base64Imgs/${req.params.id}.txt`,
                           `${JSON.stringify(imagess[0])}`,
                           function (err) {
                              if (err) {
                                 console.error(err);
                              }
                           }
                        );
                        continue;
                     }
                  }
               }

               if (
                  inspection.remainingInspectorImages.length === 0 &&
                  !inspection.sentToSolera &&
                  inspection.status === "finished"
               ) {
                  // console.log("inside the cycle");
                  // 1) we get all images
                  let base64Imgs = fs
                     .readFileSync(
                        `./public/inspections/base64Imgs/${req.params.id}.txt`,
                        "utf8",
                        function (err) {
                           console.error(err);
                        }
                     )
                     .toString();
                  base64Imgs = base64Imgs.split(",,,,");
                  base64Imgs = base64Imgs.map((img) => JSON.parse(img));
                  // console.log(base64Imgs.length);
                  // let allowedComp = {
                  //    allianz: 1,
                  // };
                  let allowedTypes = {
                     preInception: 1,
                  };
                  if (
                     // allowedComp[inspection.insuranceCompany.en_name.toLowerCase()] &&
                     allowedTypes[inspection.type]
                  ) {
                     await soleraFunctions.runAllFunctions(
                        undefined,
                        base64Imgs,
                        inspection
                     );
                  }
               }
            } catch (error) {
               console.log(error);
            }
         }
      }
   })
);

router.post(
   "/uploadInsuranceImages/:id",
   auth,
   catchAsync(async (req, res, next) => {
      let { insuranceImages } = req.body;
      let inspection = await inspectionService.uploadInsuranceImages(
         req.params.id,
         insuranceImages
      );
      if (inspection.statusCode) {
         return next(inspection);
      } else {
         res.status(200).json({
            status: "success",
            inspection,
         });
      }
   })
);

router.post(
   "/uploadAudio/:id",
   auth,
   catchAsync(async (req, res, next) => {
      let { audioBase64 } = req.body;
      let inspection = await inspectionService.uploadInspectionAudios(
         req.params.id,
         audioBase64
      );
      if (inspection.statusCode) {
         return next(inspection);
      } else {
         res.status(200).json({
            status: "success",
            inspection,
         });
      }
   })
);

router
   .route("/one/:id")
   .get(
      auth,
      catchAsync(async (req, res, next) => {
         const inspection = await inspectionService.getOneById(req.params.id);
         if (inspection.statusCode)
            return next(inspection);
         else {
            res.status(200).json({
               status: "success",
               inspection,
            });
         }
      })
   )
   .patch(
      auth,
      catchAsync(async (req, res, next) => {
         // delete req.body.insuranceImages
         let data;
         // console.log(req.files);
         if (!req.files || req.files.length === 0) {
            data = req.body;
         } else {
            filePaths = req.files.map((file) => file.path);
            data = {
               ...req.body,
               attachments: filePaths,
            };
         }
         const inspection = await inspectionService.updateInspection(
            req.params.id,
            data
         );
         if (inspection.statusCode)
            return next(inspection);
         else {
            res.status(200).json({
               status: "success",
               inspection,
            });
         }
         // console.log("before process");
         if (
            req.body.status === "finished" &&
            inspection.status === "finished" &&
            !inspection.sentToSolera &&
            inspection.remainingInspectorImages.length === 0
         ) {
            // we will call SoleraFunctions
            // console.log("inside the cycle");
            // 1) we get all images
            let base64Imgs = fs
               .readFileSync(
                  `./public/inspections/base64Imgs/${req.params.id}.txt`,
                  "utf8",
                  function (err) {
                     console.error(err);
                  }
               )
               .toString();
            base64Imgs = base64Imgs.split(",,,,");
            base64Imgs = base64Imgs.map((img) => JSON.parse(img));
            // console.log(base64Imgs.length);
            // let allowedComp = {
            //    allianz: 1,
            // };
            let allowedTypes = {
               preInception: 1,
            };
            if (
               // allowedComp[inspection.insuranceCompany.en_name.toLowerCase()] &&
               allowedTypes[inspection.type]
            ) {
               await soleraFunctions.runAllFunctions(
                  undefined,
                  base64Imgs,
                  inspection
               );
            }
         }
      })
   )
   .delete(
      auth,
      catchAsync(async (req, res, next) => {
         let deleting = await inspectionService.deleteInspection(req.params.id);
         if (deleting.statusCode)
            return next(deleting);
         else
            res.status(204).json({
               status: "deleted",
            });
      })
   );

router.delete("/inspectionImage/:id", async (req, res, next) => {
   let { key, path } = req.body;
   let inspection = await inspectionService.deleteInspectionPhoto(
      req.params.id,
      key,
      path
   );
   res.status(200).json({ inspection, status: "success" });
});
router.delete("/inspectionAllImage/:id", async (req, res, next) => {
   let { key } = req.body;
   let inspection = await inspectionService.deleteAllImagesInspection(id, key);

   res.status(200).json({ inspection, status: "success" });
});
module.exports = router;
