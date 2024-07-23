// NPM Lib
const { Op } = require("sequelize");
const generator = require("generate-password");

// Models
const InspectionCompany = require("../models/InspectionCompany");
const InspectionManager = require("../models/InspectionManager");
const InspectionInsurance = require("../models/InspectionInsurance");
const AccidentReport = require("../models/AccidentReport");

// Services
const userService = require("./userService");
const smsService = require("./smsService");

// Utils
const AppError = require("../utils/AppError");
const Roles = require("../models/Roles");

class InspectionCompanyService {
   async createInspectionCompany(data, host) {
      try {
         let checkExist = await InspectionCompany.findOne({
            where: {
               name: data.name,
            },
         });
         if (!checkExist) {
            const inspectionCompany = await InspectionCompany.create(data);
            let checkIfCreated = await InspectionInsurance.findOne({
               where: {
                  InspectionCompanyId: inspectionCompany.id,
                  insuranceCompanyId: data.insuranceId,
               },
            });
            if (checkIfCreated) {
               return new AppError(
                  "Inspection Company already added to this insurance company",
                  400
               );
            }
            await InspectionInsurance.create({
               InspectionCompanyId: inspectionCompany.id,
               insuranceCompanyId: data.insuranceId,
            });
            // await InspectionInsurance.create({
            //    InspectionCompanyId: inspectionCompany.id,
            //    insuranceCompanyId: data.insuranceId,
            // });
            let inspectorManager = await this.createInspectionManager(
               data,
               inspectionCompany,
               host
            );

            // console.log(inspectorManager);
            if (inspectorManager.statusCode) {
               return new AppError(
                  inspectorManager.message +
                     " and the inspection company has been added to the insurance company",
                  inspectorManager.statusCode
               );
            }
            return inspectorManager;
            // return inspectionCompany;
         } else {
            checkExist = checkExist.get({ plain: true });
            let checkIfCreated = await InspectionInsurance.findOne({
               where: {
                  InspectionCompanyId: checkExist.id,
                  insuranceCompanyId: data.insuranceId,
               },
            });
            if (checkIfCreated) {
               return new AppError(
                  "Inspection Company already added to this insurance company",
                  400
               );
            }
            await InspectionInsurance.create({
               InspectionCompanyId: checkExist.id,
               insuranceCompanyId: data.insuranceId,
            });

            let inspectorManager = await this.createInspectionManager(
               data,
               checkExist,
               host
            );
            // console.log(inspectorManager);

            if (inspectorManager.statusCode) {
               console.log("there's an error ");
               return new AppError(
                  inspectorManager.message +
                     " and the inspection company has been added to the insurance company",
                  inspectorManager.statusCode
               );
            }
            // if (inspectorManager.message === "This user already exists"){
            //    await
            // }
            // return checkExist;
            return inspectorManager;
         }
      } catch (err) {
         console.error(err);
         return new AppError(err, 500);
      }
   }

   async createInspectionManager(data, inspectionCompany, host) {
      // console.log(host);
      const testingHosts = {
         apidev: 1,
         apistaging: 1,
      };
      // console.log(testingHosts[host.toLowerCase()]);
      const password = testingHosts[host.toLowerCase()]
         ? "12345678"
         : generator.generate({
              length: 12,
              numbers: true,
              lowercase: false,
              uppercase: false,
           });
      try {
         let getRole = await Roles.findOne({
            where: {
               name: {
                  [Op.iLike]: "%InspectionManager",
               },
            },
         });
         if (!getRole) {
            return new AppError("Please create InspectionManager role first");
         }
         getRole = getRole.get({ plain: true });
         const user = await userService.createUserAsAdmin({
            ...data,
            password,
            roleId: getRole.id,
         });
         if (user.message === "This user already exists") {
            let userr = await userService.findUserByIdentifier(data.identifier);
            if (userr.Role.name === "InspectionManager") {
               // await userService.updateAnyUser({
               //    userId: userr.id,
               //    data: { roleId: getRole.id },
               // });
               // let inspectorManager = await InspectionManager.create({
               //    UserId: userr.id,
               //    phoneNumbers: data.phoneNumbers,
               //    emails: data.emails,
               //    InspectionCompanyId: inspectionCompany.id,
               // });
               let inspectorManager = await InspectionCompany.findOne({
                  where: {
                     UserId: userr.id,
                  },
               });
               await InspectionManagerInspection.create({
                  InspectionManagerId: inspectorManager.id,
                  InspectionCompanyId: inspectionCompany.id,
               });
               return inspectorManager;
            } else {
               return new AppError("This user already exists", 400);
            }
         } else if (user.statusCode) return user;
         else {
            let inspectorManager = await InspectionManager.create({
               UserId: user.id,
               phoneNumbers: data.phoneNumbers,
               emails: data.emails,
               InspectionCompanyId: inspectionCompany.id,
            });
            //    await InspectionManagerInspection.create({
            //        InspectionManagerId:inspectorManager.id,
            //        InspectionCompanyId:inspectionCompany.id,
            //    })
            // console.log(password);
            await smsService.sendSms({
               mobile: `${data.identifier}`,
               message: `لقد تم تعيين شركتكم للمعاينة من خلال برنامج هيلبو من فضلك استخدم كلمة المرور هذه ${password}`,
            });
            return inspectorManager;
         }
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 400);
      }
   }
   async getAllForInsurance(insuranceId) {
      let inspectionCompaniesId = await InspectionInsurance.findAll({
         where: {
            insuranceCompanyId: insuranceId,
         },
      });
      if (inspectionCompaniesId.length === 0) return [];
      else {
         inspectionCompaniesId = inspectionCompaniesId.map(
            (inspectionCompany) => inspectionCompany.get({ plain: true })
         );
         inspectionCompaniesId = inspectionCompaniesId.map(
            (inspectionCompany) => inspectionCompany.InspectionCompanyId
         );
         let inspectionCompanies = await InspectionCompany.findAll({
            where: {
               id: {
                  [Op.or]: inspectionCompaniesId,
               },
            },
         });
         return inspectionCompanies;
      }
   }

   async assignInspectionCompany(inspectionCompanyId, accidentReportId) {
      let accidentReport = await AccidentReport.findByPk(accidentReportId);
      if (!accidentReport)
         return new AppError("This Accident Report does not exist", 404);
      let inspectionCompany = await InspectionCompany.findByPk(
         inspectionCompanyId
      );
      if (!inspectionCompany)
         return new AppError("No inspection Company with this Id", 404);
      await AccidentReport.update(
         {
            inspectionCompanyId: inspectionCompanyId,
         },
         {
            where: {
               id: accidentReportId,
            },
         }
      );
      inspectionCompany = inspectionCompany.get({ plain: true });
      return inspectionCompany;
   }
}

const inspectionCompanyService = new InspectionCompanyService();
module.exports = inspectionCompanyService;
