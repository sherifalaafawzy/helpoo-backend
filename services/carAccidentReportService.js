const fs = require("fs");
const { Op } = require("sequelize");
const merge = require("easy-pdf-merge");
const PDFDocument = require("pdf-lib").PDFDocument;
const CarAccidentReports = require("../models/CarAccidentReports");
const PDFReport = require("../models/PDFReport");
const PDFMerger = require("pdf-merger-js");

const smsService = require("./smsService");
const insuranceCompanyService = require("./InsuranceCompany");
const accidentReportService = require("./AccidentReport");

const AppError = require("../utils/AppError");
const { default: axios } = require("axios");

class CarAccidentReportService {
   async createPdfReport(report) {
      const {
         AccidentReportId,
         carId,
         pdfReportId,
         Type,
         pdfReport,
         subject,
         text,
         pdfLink,
      } = report;
      try {
         let base64Data = pdfReport?.replace(
            /^data:application\/pdf;base64,/,
            ""
         );
         let filename = `/public/accidentReports/pdf/${Type}-${AccidentReportId}-${Date.now()}.pdf`;
         const CarAccReport = await CarAccidentReports.findOne({
            where: {
               report: {
                  [Op.startsWith]: "/public/accidentReports/pdf/FNOL-",
               },
               AccidentReportId,
            },
         });
         // if (CarAccReport) {
         //    return new AppError("This file already exists", 400);
         // } else {
         // console.log(pdfLink);
         let fileUrlStream;
         if (pdfReport) {
            // fs.writeFile(`.${filename}`, base64Data, "base64", function (err) {
            //    if (err) console.error(err);
            // });
            // if (Type === "FNOLForAi") {
            //    let createdReportFileName = await this.saveMergedPDFReport(
            //       `.${filename}`,
            //       AccidentReportId,
            //       carId
            //    );
            //    // if (createdReport.statusCode) {
            //    //    createdReport = await CarAccidentReports.create({
            //    //       report: filename,
            //    //       AccidentReportId: AccidentReportId,
            //    //       CarId: carId,
            //    //       pdfReportId: 13,
            //    //    });
            //    //    return createdReport;
            //    // }
            //    let createdReport = await CarAccidentReports.create({
            //       report: createdReportFileName,
            //       AccidentReportId: AccidentReportId,
            //       CarId: carId,
            //       pdfReportId: 16,
            //    });
            //    const createdReportForAi = await CarAccidentReports.create({
            //       report: filename,
            //       AccidentReportId: AccidentReportId,
            //       CarId: carId,
            //       pdfReportId: pdfReportId,
            //    });
            //    return createdReport;
            // } else {
            // }
            return { s: null };
         } else if (pdfLink) {
            // console.log("Hellooo ----=-==-=-=-=-=================");
            // let save = await this.saveLinkPDF(pdfLink, filename);

            let respo = await axios.get(pdfLink, { responseType: "stream" });
            // .then((response) => {
            if (respo.status === 200) {

               try {
                  const fileStream = fs.createWriteStream(`.${filename}`);
                  // Pipe the PDF data from the Axios response to the file stream
                  fileUrlStream = respo.data;

                  // Pipe the response data to the file stream and wait for it to finish
                  await new Promise((resolve, reject) => {
                     fileUrlStream.pipe(fileStream);
                     fileStream.on("finish", () => {
                        // console.log(`PDF saved to ${filename}`);
                        fileStream.close();
                        resolve();
                     });
                     fileStream.on("error", reject);
                     fileUrlStream.on("error", reject);
                  });
               } catch (error) {
                  console.log(error);
               }
            } else {
               console.error(
                  `Error downloading PDF. Status Code: ${respo.status}`
               );
            }
            // })
            // .catch((error) => {
            //    console.error(`Error downloading PDF: ${error.message}`);
            // });
         } else {
            return { s: null };
         }
         const createdReport = await CarAccidentReports.create({
            report: filename,
            AccidentReportId: AccidentReportId,
            pdfReportId: pdfReportId,
         });
         let accidentReport = await accidentReportService.getOneAccidentReport(
            AccidentReportId
         );
         let insuranceCompany = await insuranceCompanyService.getInsurance(
            accidentReport.report.insuranceCompanyId
         );
         let bcc = [];
         let to = insuranceCompany.emails;
         if (accidentReport.report.Car.BrokerId) {
            bcc.push(accidentReport.report.Car.Broker.email);
         }
         // let subject = `${Type} of FNOL - ${accidentReport.report.ref}`;
         // let text = `${Type} of FNOL - ${accidentReport.report.ref} today ---- By Helpoo.`;
         // let filePath = filename;
         if (!to || to.length === 0) {
            return createdReport;
         }
         let rep = await CarAccidentReports.findOne({
            where: {
               AccidentReportId: AccidentReportId,
               pdfReportId: 16,
            },
         });
         let filePath2 = rep?.report;
         await smsService.sendMail(
            to,
            subject,
            bcc,
            text,
            filename,
            carId,
            undefined,
            undefined,
            undefined,
            filePath2
         );
         return createdReport;
      } catch (error) {
         console.log(error);
         return new AppError(error.message, 500);
      }
   }
   async saveMergedPDFReport(pdfReportPath, AccidentReportId, CarId) {
      let AiReport = await CarAccidentReports.findOne({
         where: {
            report: {
               [Op.startsWith]: "/public/accidentReports/pdf/AiCalc",
            },
            AccidentReportId,
         },
      });
      if (!AiReport) return new AppError("AiReport not found", 404);
      AiReport = AiReport.get({ plain: true });
      let AiReportPath = AiReport.report;
      const { firstPart, secondPart } = await this.splitIntoTwo(pdfReportPath);
      let filename = `/public/accidentReports/pdf/FNOLWithAi-${AccidentReportId}-${Date.now()}.pdf`;
      // let mergingProcess = merge(
      //    [pdfReportPath, AiReportPath],
      //    `.${filename}`,
      //    function (err) {
      //       if (err) {
      //          console.error(err);
      //          return "failed";
      //       }
      //       return "success";
      //    }
      // );
      // if (mergingProcess === "success") {
      //    const createdReport = await CarAccidentReports.create({
      //       report: filename,
      //       AccidentReportId: AccidentReportId,
      //       CarId,
      //       pdfReportId: 13,
      //    });
      //    return createdReport;
      // } else {
      //    return new AppError("couldn't merge pdf reports", 500);
      // }

      let merging = await this.combinePDFs(
         firstPart,
         secondPart,
         AiReportPath,
         `.${filename}`
      );
      return filename;
   }
   async getPdfReports(AccidentReportId) {
      try {
         const carAccidentReports = await CarAccidentReports.findAll({
            where: {
               AccidentReportId: AccidentReportId,
            },
         });
         return carAccidentReports;
      } catch (error) {
         return new AppError(error.message, 400);
      }
   }
   async combinePDFs(firstPart, secondPart, otherPDFPath, outputPath) {
      const otherPDFBytes = fs.readFileSync(`.${otherPDFPath}`);
      const otherPDF = await PDFDocument.load(otherPDFBytes);

      // Create a new PDF to combine all parts
      const combinedPDF = await PDFDocument.create();
      // Add pages to the combinedPDF in the desired order
      const firstPartPages = firstPart.getPages();
      for (let i = 0; i < firstPartPages.length; i++) {
         const copiedPage = combinedPDF.copyPages(firstPart, [i]);
         combinedPDF.addPage(copiedPage[0]);
      }

      const otherPDFPages = otherPDF.getPages();
      for (let i = 0; i < otherPDFPages.length; i++) {
         const copiedPage = combinedPDF.copyPages(otherPDF, [i]);
         combinedPDF.addPage(copiedPage[0]);
      }
      // for (const page of otherPDF.getPages()) {
      //    const copiedPage = combinedPDF.copyPages(otherPDF, [page]);
      //    combinedPDF.addPage(copiedPage[0]);
      // }
      const secondPartPages = secondPart.getPages();
      for (let i = 0; i < secondPartPages.length; i++) {
         const copiedPage = combinedPDF.copyPages(secondPart, [i]);
         combinedPDF.addPage(copiedPage[0]);
      }
      // for (const page of secondPart.getPages()) {
      //    const copiedPage = combinedPDF.copyPages(secondPart, [page]);
      //    combinedPDF.addPage(copiedPage[0]);
      // }

      fs.writeFileSync(outputPath, await combinedPDF.save());
      return outputPath;
   }

   async splitIntoTwo(pathToPdf) {
      const docAsBytes = await fs.promises.readFile(pathToPdf);
      const pdfDoc = await PDFDocument.load(docAsBytes);
      const pages = pdfDoc.getPages();

      const firstPart = await PDFDocument.create();
      const secondPart = await PDFDocument.create();

      // Add pages to the firstPart
      for (let i = 0; i < 1; i++) {
         const copiedPage = firstPart.copyPages(pdfDoc, [i]);
         firstPart.addPage(copiedPage[0]);
      }

      // Add pages to the secondPart
      const secondPartPages = pages.slice(1);
      for (let i = 1; i < pages.length; i++) {
         const copiedPage = secondPart.copyPages(pdfDoc, [i]);
         secondPart.addPage(copiedPage[0]);
      }

      return { firstPart, secondPart };
   }

   async createPDFsWithMerge({
      AccidentReportId,
      carId,
      pdfReportId,
      Type,
      pdfReportOne,
      pdfReportTwo,
   }) {
      let base64DataOne = pdfReportOne.replace(
         /^data:application\/pdf;base64,/,
         ""
      );
      let base64DataTwo = pdfReportTwo.replace(
         /^data:application\/pdf;base64,/,
         ""
      );
      let filenameOne = `/public/accidentReports/pdf/${Type}-${AccidentReportId}-${Date.now()}-1.pdf`;
      let filenameTwo = `/public/accidentReports/pdf/${Type}-${AccidentReportId}-${Date.now()}-2.pdf`;
      fs.writeFile(`.${filenameOne}`, base64DataOne, "base64", function (err) {
         if (err) {
            // console.log("here");
            console.error(err);
         }
      });
      fs.writeFile(`.${filenameTwo}`, base64DataTwo, "base64", function (err) {
         if (err) console.error(err);
      });
      // let createdReportFileName = await this.saveMergedPDFReport(
      //    `.${filename}`,
      //    AccidentReportId,
      //    carId
      // );
      let AiReport = await CarAccidentReports.findOne({
         where: {
            report: {
               [Op.startsWith]: "/public/accidentReports/pdf/AiCalc",
            },
            AccidentReportId,
         },
      });
      if (!AiReport) return new AppError("AiReport not found", 404);
      AiReport = AiReport.get({ plain: true });
      let AiReportPath = AiReport.report;
      let filename = `/public/accidentReports/pdf/FNOLWithAi-${AccidentReportId}-${Date.now()}.pdf`;

      let merger = new PDFMerger();
      await merger.add(`.${filenameOne}`);
      await merger.add(`.${AiReportPath}`);
      await merger.add(`.${filenameTwo}`);
      await merger.save(`.${filename}`);
      const createdReport = await CarAccidentReports.create({
         report: filename,
         AccidentReportId: AccidentReportId,
         CarId: carId,
         pdfReportId: 16,
      });
      const createdReportForAiOne = await CarAccidentReports.create({
         report: filenameOne,
         AccidentReportId: AccidentReportId,
         CarId: carId,
         pdfReportId: pdfReportId,
      });
      const createdReportForAiTwo = await CarAccidentReports.create({
         report: filenameTwo,
         AccidentReportId: AccidentReportId,
         CarId: carId,
         pdfReportId: pdfReportId,
      });
      return createdReport;
   }
   async saveLinkPDF(reportLink, filename) {
      let respo = await axios.get(reportLink, { responseType: "stream" });
      // .then((response) => {
      // console.log(respo.status);
      if (respo.status === 200) {
         // console.log("Hellooo ----=-==-=-=-=-=================");

         try {
            // console.log(trying);
            // Create a write stream to save the PDF data to a file
            const fileStream = fs.createWriteStream(`.${filename}`);
            // console.log(fileStream);
            // Pipe the PDF data from the Axios response to the file stream
            respo.data.pipe(fileStream);
            // console.log("respo");
            // Listen for the 'finish' event to know when the file write is complete
            fileStream.on("finish", () => {
               // console.log(`PDF saved to ${filename}`);
               fileStream.close();
            });
         } catch (error) {
            console.log(error);
         }
      } else {
         console.error(`Error downloading PDF. Status Code: ${respo.status}`);
      }
   }
   async savePDFLink(reportId, reportLink) {
      let report = await accidentReportService.getOneAccidentReport(reportId);
      let filename = `/public/accidentReports/pdf/FNOLWithAi-${reportId}-${Date.now()}.pdf`;
      // let res = await axios.get(reportLink);
      // console.log(res.data);
      axios
         .get(reportLink, { responseType: "stream" })
         .then((response) => {
            if (response.status === 200) {
               // Create a write stream to save the PDF data to a file
               const fileStream = fs.createWriteStream(`.${filename}`);

               // Pipe the PDF data from the Axios response to the file stream
               response.data.pipe(fileStream);

               // Listen for the 'finish' event to know when the file write is complete
               fileStream.on("finish", () => {
                  // console.log(`PDF saved to ${filename}`);
                  fileStream.close();
               });
            } else {
               console.error(
                  `Error downloading PDF. Status Code: ${response.status}`
               );
            }
         })
         .catch((error) => {
            console.error(`Error downloading PDF: ${error.message}`);
         });
      let createdReport = await CarAccidentReports.create({
         report: filename,
         AccidentReportId: reportId,
         CarId: report.report.Car.id,
         pdfReportId: 16,
      });
      return createdReport;
   }
}

const carAccidentReportService = new CarAccidentReportService();
module.exports = carAccidentReportService;
