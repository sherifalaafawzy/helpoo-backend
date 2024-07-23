// NPM Lib
const { Op } = require("sequelize");
const validator = require("validator");
const generator = require("generate-password");

// Models
const Inspector = require("../models/Inspector");
const AccidentReport = require("../models/AccidentReport");
const User = require("../models/User");
const InspectorInsurance = require("../models/InspectorInsurance");
const InspectorInspection = require("../models/InspectorInspection");

// Services
const smsService = require("./smsService");
const userService = require("./userService");
const InsuranceCompanyService = require("./InsuranceCompany");

// Utils
const AppError = require("../utils/AppError");
const Roles = require("../models/Roles");

class InspectorService {
   async createInspector(userData, createdInsurance, inspectorData, host) {
      try {
         if (!userData.identifier || !userData.name) {
            return new AppError("Missing data", 400);
         }
         for (let i = 0; i < inspectorData.emails.length; i++) {
            if (!validator.isEmail(inspectorData.emails[i])) {
               return new AppError("Invalid Email", 400);
            }
         }
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
         let getRole = await Roles.findOne({
            where: {
               name: {
                  [Op.iLike]: "%Inspector",
               },
            },
         });
         if (!getRole) {
            return new AppError("Please create Inspector role first");
         }
         getRole = getRole.get({ plain: true });
         const user = await userService.createUserAsAdmin({
            ...userData,
            roleId: getRole.id,
            password,
            email: inspectorData.emails[0],
            PhoneNumber: inspectorData.phoneNumbers[0],
         });
         if (user.message === "This user already exists") {
            let userr = await userService.findUserByIdentifier(
               userData.identifier
            );
            // if (
            //    userr.Role.name !== "Inspector" &&
            //    userr.Role.name !== "InspectionManger"
            // ) {
            //    return user;
            //    let inspect = await userService.updateAnyUser({
            //       userId: userr.id,
            //       data: {
            //          roleId: getRole.id,
            //          createdInsurance,
            //          phoneNumbers: inspectorData.phoneNumbers,
            //          emails: inspectorData.emails,
            //       },
            //    });
            //    await InspectorInsurance.create({
            //       InspectorId: inspect.id,
            //       insuranceCompanyId: createdInsurance,
            //    });
            //    return inspect;
            // }
            if (userr.Role.name === "Inspector") {
               let inspector = await Inspector.findOne({
                  where: {
                     UserId: userr.id,
                  },
               });
               // console.log(userr);
               // console.log(inspector);
               await InspectorInsurance.create({
                  InspectorId: inspector.id,
                  insuranceCompanyId: createdInsurance,
               });
               return inspector;
            } else {
               return user;
            }
         } else if (user.statusCode) return user;
         else {
            console.log(password);
            // console.log("Sending sms");
            await smsService.sendSms({
               mobile: `${userData.identifier}`,
               message: `لقد تم تعيينكم إلكترونيا للمعاينات  في هيلبو ، برجاء استخدام كلمة المرور هذه \n pass code :${password}`,
            });
         }
         // console.log(user);
         const newInspector = await Inspector.create({
            UserId: user.id,
            phoneNumbers: inspectorData.phoneNumbers,
            emails: inspectorData.emails,
         });
         const insCompany = await InsuranceCompanyService.getInsurance(
            createdInsurance
         );
         await InspectorInsurance.create({
            InspectorId: newInspector.id,
            insuranceCompanyId: createdInsurance,
         });
         let message = `لقد تم تعيينكم إلكترونيا للمعاينات من قبل شركة ${insCompany.ar_name}`;
         // console.log(message);
         await smsService.sendSms({
            mobile: `${userData.identifier}`,
            message,
         });
         // await smsService.sendSms({
         //    mobile: `${userData.identifier}`,
         //    message: `لقد تم تعيينكم إلكترونيا للمعاينات من قبل شركة الدلتا للتأمين`,
         // });

         // let insurance = await insuranceCompany.getInsurance(createdInsurance)
         return newInspector;
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 500);
      }
   }
   async addInspector(userData, inspectionCompanyId, inspectorData, host) {
      if (!userData.identifier || !userData.name) {
         return new AppError("Missing data", 400);
      }
      for (let i = 0; i < inspectorData.emails.length; i++) {
         if (!validator.isEmail(inspectorData.emails[i])) {
            return new AppError("Invalid Email", 400);
         }
      }
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

      let getRole = await Roles.findOne({
         where: {
            name: {
               [Op.iLike]: "%Inspector",
            },
         },
      });
      if (!getRole) {
         return new AppError("Please create Inspector role first");
      }
      getRole = getRole.get({ plain: true });
      const user = await userService.createUserAsAdmin({
         ...userData,
         roleId: getRole.id,
         password,
      });
      if (user.message === "This user already exists") {
         let userr = await userService.findUserByIdentifier(
            userData.identifier
         );
         // if (
         //    userr.Role.name !== "Inspector" &&
         //    userr.Role.name !== "InspectionManger"
         // ) {
         //    let inspect = await userService.updateAnyUser({
         //       userId: userr.id,
         //       data: {
         //          roleId: getRole.id,
         //          inspectionCompanyId,
         //          phoneNumbers: inspectorData.phoneNumbers,
         //          emails: inspectorData.emails,
         //       },
         //    });
         //    await InspectorInspection.create({
         //       InspectorId: inspect.id,
         //       InspectionCompanyId: inspectionCompanyId,
         //    });
         //    return inspect;
         // }
         if (userr.Role.name === "Inspector") {
            let inspector = await Inspector.findOne({
               where: {
                  UserId: userr.id,
               },
            });
            await InspectorInspection.create({
               InspectorId: inspector.id,
               InspectionCompanyId: inspectionCompanyId,
            });
            return inspector;
         } else {
            return user;
         }
      } else if (user.statusCode) {
         return user;
      } else {
         console.log(password);
         // console.log("Sending sms");
         await smsService.sendSms({
            mobile: `${userData.identifier}`,
            message: `لقد تم تعيينكم إلكترونيا للمعاينات  في هيلبو ، برجاء استخدام كلمة المرور هذه \n pass code :${password}`,
         });
      }
      const newInspector = await Inspector.create({
         UserId: user.id,
         phoneNumbers: inspectorData.phoneNumbers,
         emails: inspectorData.emails,
      });
      await InspectorInspection.create({
         InspectorId: newInspector.id,
         InspectionCompanyId: inspectionCompanyId,
      });
      await smsService.sendSms({
         mobile: `${userData.identifier}`,
         message: `لقد تم تعيينكم إلكترونيا للمعاينات من قبل شركة الدلتا للتأمين`,
      });

      return newInspector;
   }
   async getAllInspectorForIns(insuranceId) {
      let inspectorsIds = await InspectorInsurance.findAll({
         where: {
            insuranceCompanyId: insuranceId,
         },
      });
      if (inspectorsIds.length === 0) return [];
      else {
         inspectorsIds = inspectorsIds.map((inspector) =>
            inspector.get({ plain: true })
         );
         inspectorsIds = inspectorsIds.map(
            (inspector) => inspector.InspectorId
         );
         let inspectors = await Inspector.findAll({
            where: {
               id: {
                  [Op.or]: inspectorsIds,
               },
            },
            include: [User],
         });
         return inspectors;
      }
   }

   async getAllInspectorForInspection(inspectionCompanyId) {
      let inspectorsIds = await InspectorInspection.findAll({
         where: {
            InspectionCompanyId: inspectionCompanyId,
         },
      });
      if (inspectorsIds.length === 0) return [];
      else {
         inspectorsIds = inspectorsIds.map((inspector) =>
            inspector.get({ plain: true })
         );
         inspectorsIds = inspectorsIds.map(
            (inspector) => inspector.InspectorId
         );
         let inspectors = await Inspector.findAll({
            where: {
               id: {
                  [Op.or]: inspectorsIds,
               },
            },
            include: [User],
         });
         return inspectors;
      }
   }

   async assignInspector(accidentReportId, inspectorId) {
      let accidentReport = await AccidentReport.findByPk(accidentReportId);
      if (!accidentReport)
         return new AppError("This Accident Report does not exist", 404);
      let inspector = await Inspector.findByPk(inspectorId, {
         include: [User],
      });
      if (!inspector) return new AppError("No inspector with this Id", 404);
      try {
         await AccidentReport.update(
            {
               InspectorId: inspectorId,
            },
            {
               where: {
                  id: accidentReportId,
               },
            }
         );
         inspector = inspector.get({ plain: true });
         return inspector;
      } catch (err) {
         return new AppError(err, 500);
      }
      // await smsService.sendMail(inspector.User.email, "New inspection", "You Received a new inspection")
      // await smsService.sendSms({mobile:inspector.User.PhoneNumber, message:"You Received a new inspection"})
   }
}
const inspectorService = new InspectorService();
module.exports = inspectorService;
