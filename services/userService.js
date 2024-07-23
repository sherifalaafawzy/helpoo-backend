// node modules
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const validator = require("validator");

// models
const UserModel = require("../models/User");
const Roles = require("../models/Roles");
const Client = require("../models/Client");
const Driver = require("../models/Driver");
const Vehicle = require("../models/Vehicle");
const Insurance = require("../models/Insurance");
const Inspector = require("../models/Inspector");
const Corporate = require("../models/Corporate");
const Broker = require("../models/Broker");
const CorporateCompany = require("../models/CorporateCompany");
const InsuranceCompany = require("../models/InsuranceCompany");
const Package = require("../models/Package");
const CarPackage = require("../models/CarPackage");
const ClientPackage = require("../models/ClientPackage");
const InspectionManager = require("../models/InspectionManager");
const UsedPromosPackages = require("../models/UsedPromosPackages");
const PackagePromoCode = require("../models/PackagePromoCode");

// Other Services
const promoCodeServices = require("../services/promoCodeServices");
const InsuranceCompanyServices = require("../services/InsuranceCompany");
const roleService = require("../services/roleService");
const sendingSmsService = require("./smsService");
const clientService = require("./clientService");
const driverService = require("./DriverService");
const corporateCompanyService = require("./CorporateCompanyService");
const ClientPackageServices = require("./ClientPackageService");

// Utils
const AppError = require("../utils/AppError");
const RolesEnum = require("../enums/Roles");
const clientPackageService = require("./ClientPackageService");
const VehicleType = require("../models/VehicleType");
const UsersLoginHistory = require("../models/UsersLoginHistory");

// functions
const signToken = (id) => {
   return jwt.sign(
      {
         id,
      },
      process.env.JWT_SECRET,
      {
         expiresIn: process.env.JWT_EXPIRES_AT,
      }
   );
};

const hashPassword = async function (password) {
   const hashed = await bcrypt.hash(password, 12);
   return hashed;
};
// the service
class User {
   async loginWithOtp(mobileNumber, fcmtoken, loginCandidates = {}) {
      let user = await UserModel.findOne({
         where: {
            username: mobileNumber,
         },
         include: Roles,
      });
      if (!user) {
         return new AppError("Please try again after sign up", 400);
      }
      // if (user.Role.name !== RolesEnum.Client) {
      //    return new AppError("This user is not a client", 400);
      // }
      if (!loginCandidates.lastLogInData) {
         return new AppError("Please send the login data", 400);
      }
      loginCandidates["fcmtoken"] = fcmtoken;
      const token = signToken(user.id);
      // let roleData = await this.findUserRoleData(user, user.Role.name);
      // let update = await Client.update(
      //    {
      //       fcmtoken: fcmtoken,
      //       active: true,
      //    },
      //    {
      //       where: {
      //          id: roleData.user.id,
      //       },
      //    }
      // );
      // let activePromoCode = await promoCodeServices.checkHasPromo(user.id);
      // let data = {
      //    user: {
      //       ...roleData.user,
      //       fcmtoken: fcmtoken,
      //       activePromoCode,
      //    },
      //    token,
      //    // client
      // };
      user = user.get({ plain: true });
      let roleName = user.Role.name;
      let data = await this.loginProcess(
         user,
         roleName,
         token,
         loginCandidates
      );
      return data;
   }
   async signUpWithOTP(data) {
      const password = "this is our dummy password";
      // if (!password) return new AppError("Password is required", 400);
      // if (password.length < 8)
      //    return new AppError("Password must be at least 8 characters", 400);
      if (!validator.isMobilePhone(data.identifier))
         return new AppError("Invalid Phone Number", 400);
      // if (!data.name) return new AppError("Name is required", 400);

      const savePassword = await hashPassword(password);
      const PhoneNumber = data.identifier;
      const blocked = false;
      const name = data.name ? data.name : "new user";
      const email = data.email ? data.email.trim() : data.email;
      const username = data.identifier;
      const promoValue = data.promoCode;
      const ifExist = await UserModel.findOne({
         where: {
            username,
         },
      });
      if (ifExist) return new AppError("This user is registered before", 400);
      let role = await Roles.findOne({
         where: {
            name: {
               [Op.iLike]: "%Client",
            },
         },
      });
      role = role.get({ plain: true });
      const RoleId = role.id;
      let newUser;
      let newClient;
      let userId;
      try {
         newUser = await UserModel.create({
            PhoneNumber,
            blocked,
            password: savePassword,
            name,
            username,
            email,
            RoleId,
            username: PhoneNumber,
         });
         newClient = await Client.create({ active: true, UserId: newUser.id });
         userId = newUser.id;
      } catch (err) {
         let messages = err.errors[0].message;
         return new AppError(messages, 400);
      }
      await UserModel.update(
         {
            lastLogInData: data.lastLogInData,
            lastLogIn: Date.now() - 5 * 1000,
         },
         {
            where: {
               id: newUser.id,
            },
         }
      );
      await UsersLoginHistory.create({
         UserId: newUser.id,
         loggedInAt: Date.now(),
         loggedInData: data.lastLogInData,
      });
      const token = signToken(newUser.id);
      let sentData = {
         user: {
            PhoneNumber: newUser.PhoneNumber,
            name: newUser.name,
            email: newUser.email,
            RoleId: newUser.RoleId,
            RoleName: role.name,
            id: newClient.id,
            userId: newClient.UserId,
            blocked: newUser.blocked,
            username: newUser.username,
         },
         token,
      };
      if (promoValue) {
         const userWithPromo = await promoCodeServices.checkAndAssignPromo({
            promoValue,
            userId,
         });

         if (userWithPromo.statusCode) {
            return sentData;
         } else {
            sentData["user"]["activePromo"] = userWithPromo.promo;
            return sentData;
         }
      } else return sentData;
   }
   async loginProcess(user, roleName, token, loginCandidates) {
      let data;
      let roleData;
      await UserModel.update(
         {
            lastLogInData: loginCandidates.lastLogInData,
            lastLogIn: Date.now() - 5 * 1000,
         },
         {
            where: {
               id: user.id,
            },
         }
      );
      await UsersLoginHistory.create({
         UserId: user.id,
         loggedInAt: Date.now(),
         loggedInData: loginCandidates.lastLogInData,
      });
      if (roleName == RolesEnum.Client) {
         roleData = await this.findUserRoleData(user, roleName);
         let update = await Client.update(
            {
               fcmtoken: loginCandidates.fcmtoken,
            },
            {
               where: {
                  id: roleData.user.id,
               },
            }
         );
         let activePromoCode = await promoCodeServices.checkHasPromo(user.id);
         data = {
            user: {
               ...roleData.user,
               fcmtoken: loginCandidates.fcmtoken,
               activePromoCode,
            },
            token,
            // client
         };
         return data;
      } else if (roleName === RolesEnum.Broker) {
         let broker = await Broker.findOne({
            where: {
               UserId: user.id,
            },
         });
         broker = broker.get({ plain: true });
         let data = {
            user: {
               id: broker.id,
               UserId: user.id,
               PhoneNumber: user.PhoneNumber,
               username: user.username,
               name: user.name,
               email: user.email,
               RoleId: user.RoleId,
               RoleName: user.Role.name,
               blocked: user.blocked,
            },
            token,
         };
         return data;
      } else if (roleName === RolesEnum.Driver) {
         let driver = await Driver.findOne({
            where: {
               UserId: user.id,
            },
         });
         const checkIfLoggedIn = await Vehicle.findOne({
            where: {
               Active_Driver: driver.id,
            },
            include: [VehicleType],
         });

         if (checkIfLoggedIn) {
            if (checkIfLoggedIn.IMEI === loginCandidates.IMEI) {
               await Driver.update(
                  {
                     fcmtoken: loginCandidates.fcmtoken,
                  },
                  {
                     where: {
                        id: driver.id,
                     },
                  }
               );
               driver = await Driver.findOne({
                  where: {
                     UserId: user.id,
                  },
               });
               driver = driver.get({ plain: true });

               data = {
                  user: {
                     PhoneNumber: user.PhoneNumber,
                     username: user.username,
                     name: user.name,
                     email: user.email,
                     RoleId: user.RoleId,
                     RoleName: user.Role.name,
                     blocked: user.blocked,
                     ...driver,
                     vecType: checkIfLoggedIn.Vec_type,
                  },
                  token,
               };

               return data;
            } else {
               return new AppError("This driver is already logged in", 400);
            }
         }

         // driver = driver.get({ plain: true });

         // assign this driver to vehicle based on imei

         const loginIMEI = loginCandidates.IMEI;

         const existIMEI = await Vehicle.findOne({
            where: {
               IMEI: loginIMEI,
            },
         });
         if (!existIMEI) {
            return new AppError("No vehicle is assigned with this phone", 400);
         }

         if (existIMEI.Active_Driver && existIMEI.Active_Driver !== driver.id) {
            let dv = await Driver.findByPk(existIMEI.Active_Driver);
            await Driver.update(
               {
                  available: false,
                  offline: true,
               },
               {
                  where: {
                     id: existIMEI.Active_Driver,
                  },
               }
            );
            await UserModel.update(
               {
                  PhoneNumber: undefined,
               },
               {
                  where: {
                     id: dv.UserId,
                  },
               }
            );
         }
         await Vehicle.update(
            {
               Active_Driver: driver.id,
               available: true,
            },
            {
               where: {
                  IMEI: loginIMEI,
               },
            }
         );
         try {
            await UserModel.update(
               {
                  PhoneNumber: existIMEI.PhoneNumber,
               },
               {
                  where: {
                     id: driver.UserId,
                  },
               }
            );
         } catch (err) {
            console.log(err);
         }
         user = await UserModel.findByPk(driver.UserId, { include: Roles });
         user = user.get({ plain: true });

         let changeOfflineDriver = await Driver.update(
            {
               offline: false,
               available: true,
               fcmtoken: loginCandidates.fcmtoken,
            },
            {
               where: {
                  UserId: user.id,
               },
            }
         );

         driver = await Driver.findOne({
            where: {
               UserId: user.id,
            },
         });
         let veh = await Vehicle.findOne({
            where: {
               IMEI: loginIMEI,
            },
         });
         driver = driver.get({ plain: true });
         data = {
            user: {
               PhoneNumber: user.PhoneNumber,
               username: user.username,
               name: user.name,
               email: user.email,
               RoleId: user.RoleId,
               RoleName: user.Role.name,
               blocked: user.blocked,
               ...driver,
               vecType: veh.Vec_type,
            },
            token,
         };

         return data;
      } else if (roleName === RolesEnum.Corporate) {
         roleData = await this.findUserRoleData(user, roleName);
         data = {
            ...roleData,
            token,
         };
         return data;
      } else if (roleName == RolesEnum.Insurance) {
         roleData = await this.findUserRoleData(user, roleName);
         data = {
            ...roleData,
            token,
         };
         return data;
      } else if (roleName === RolesEnum.Inspector) {
         roleData = await this.findUserRoleData(user, roleName);
         let update = await Inspector.update(
            {
               fcmtoken: loginCandidates.fcmtoken,
            },
            {
               where: {
                  id: roleData.user.id,
               },
            }
         );
         data = {
            user: {
               ...roleData.user,
               fcmtoken: loginCandidates.fcmtoken,
            },
            token,
         };

         return data;
      } else if (roleName === "InspectionManager") {
         roleData = await this.findUserRoleData(user, roleName);
         let update = await InspectionManager.update(
            {
               fcmtoken: loginCandidates.fcmtoken,
            },
            {
               where: {
                  id: roleData.user.id,
               },
            }
         );
         data = {
            user: {
               ...roleData.user,
               fcmtoken: loginCandidates.fcmtoken,
            },
            token,
         };
         return data;
      } else
         return {
            user: {
               username: user.username,
               PhoneNumber: user.PhoneNumber,
               name: user.name,
               email: user.email,
               RoleId: user.RoleId,
               RoleName: user.Role.name,
               blocked: user.blocked,
               id: user.id,
            },
            token,
         };
   }
   async login(loginCandidates) {
      if (!loginCandidates.identifier || !loginCandidates.password)
         return new AppError("Enter your identifier and password", 400);
      // console.log(loginCandidates);

      let user = await UserModel.findOne({
         where: {
            username: loginCandidates.identifier.startsWith("0")
               ? `+2${loginCandidates.identifier}`
               : loginCandidates.identifier,
         },
         include: Roles,
      });
      if (
         !user ||
         !(await bcrypt.compare(loginCandidates.password, user.password))
      )
         return new AppError("Incorrect identifier or password", 401);
      user = user.get({ plain: true });
      // According to each role we populate the necessary fields
      // Edit the response with the required fields in object for all of the next ones
      let roleName = user.Role.name;
      const token = signToken(user.id);
      let data;
      let roleData;

      // if (roleName == RolesEnum.Client) {
      //    roleData = await this.findUserRoleData(user, roleName);
      //    let update = await Client.update(
      //       {
      //          fcmtoken: loginCandidates.fcmtoken,
      //       },
      //       {
      //          where: {
      //             id: roleData.user.id,
      //          },
      //       }
      //    );
      //    let activePromoCode = await promoCodeServices.checkHasPromo(user.id);
      //    data = {
      //       user: {
      //          ...roleData.user,
      //          fcmtoken: loginCandidates.fcmtoken,
      //          activePromoCode,
      //       },
      //       token,
      //       // client
      //    };
      //    return data;
      // } else if (roleName === RolesEnum.Broker) {
      //    let broker = await Broker.findOne({
      //       where: {
      //          UserId: user.id,
      //       },
      //    });
      //    broker = broker.get({ plain: true });
      //    let data = {
      //       user: {
      //          id: broker.id,
      //          UserId: user.id,
      //          PhoneNumber: user.PhoneNumber,
      //          username: user.username,
      //          name: user.name,
      //          email: user.email,
      //          RoleId: user.RoleId,
      //          RoleName: user.Role.name,
      //          blocked: user.blocked,
      //       },
      //       token,
      //    };
      //    return data;
      // } else if (roleName === RolesEnum.Driver) {
      //    let driver = await Driver.findOne({
      //       where: {
      //          UserId: user.id,
      //       },
      //    });
      //    const checkIfLoggedIn = await Vehicle.findOne({
      //       where: {
      //          Active_Driver: driver.id,
      //       },
      //       include: [VehicleType],
      //    });

      //    if (checkIfLoggedIn) {
      //       if (checkIfLoggedIn.IMEI === loginCandidates.IMEI) {
      //          await Driver.update(
      //             {
      //                fcmtoken: loginCandidates.fcmtoken,
      //             },
      //             {
      //                where: {
      //                   id: driver.id,
      //                },
      //             }
      //          );
      //          driver = await Driver.findOne({
      //             where: {
      //                UserId: user.id,
      //             },
      //          });
      //          driver = driver.get({ plain: true });

      //          data = {
      //             user: {
      //                PhoneNumber: user.PhoneNumber,
      //                username: user.username,
      //                name: user.name,
      //                email: user.email,
      //                RoleId: user.RoleId,
      //                RoleName: user.Role.name,
      //                blocked: user.blocked,
      //                ...driver,
      //                vecType: checkIfLoggedIn.Vec_type,
      //             },
      //             token,
      //          };

      //          return data;
      //       } else {
      //          return new AppError("This driver is already logged in", 400);
      //       }
      //    }

      //    // driver = driver.get({ plain: true });

      //    // assign this driver to vehicle based on imei

      //    const loginIMEI = loginCandidates.IMEI;

      //    const existIMEI = await Vehicle.findOne({
      //       where: {
      //          IMEI: loginIMEI,
      //       },
      //    });
      //    if (!existIMEI) {
      //       return new AppError("No vehicle is assigned with this phone", 400);
      //    }

      //    if (existIMEI.Active_Driver && existIMEI.Active_Driver !== driver.id) {
      //       let dv = await Driver.findByPk(existIMEI.Active_Driver);
      //       await Driver.update(
      //          {
      //             available: false,
      //             offline: true,
      //          },
      //          {
      //             where: {
      //                id: existIMEI.Active_Driver,
      //             },
      //          }
      //       );
      //       await UserModel.update(
      //          {
      //             PhoneNumber: undefined,
      //          },
      //          {
      //             where: {
      //                id: dv.UserId,
      //             },
      //          }
      //       );
      //    }
      //    await Vehicle.update(
      //       {
      //          Active_Driver: driver.id,
      //          available: true,
      //       },
      //       {
      //          where: {
      //             IMEI: loginIMEI,
      //          },
      //       }
      //    );
      //    try {
      //       await UserModel.update(
      //          {
      //             PhoneNumber: existIMEI.PhoneNumber,
      //          },
      //          {
      //             where: {
      //                id: driver.UserId,
      //             },
      //          }
      //       );
      //    } catch (err) {
      //       console.log(err);
      //    }
      //    user = await UserModel.findByPk(driver.UserId, { include: Roles });
      //    user = user.get({ plain: true });

      //    let changeOfflineDriver = await Driver.update(
      //       {
      //          offline: false,
      //          available: true,
      //          fcmtoken: loginCandidates.fcmtoken,
      //       },
      //       {
      //          where: {
      //             UserId: user.id,
      //          },
      //       }
      //    );

      //    driver = await Driver.findOne({
      //       where: {
      //          UserId: user.id,
      //       },
      //    });
      //    let veh = await Vehicle.findOne({
      //       where: {
      //          IMEI: loginIMEI,
      //       },
      //    });
      //    driver = driver.get({ plain: true });
      //    data = {
      //       user: {
      //          PhoneNumber: user.PhoneNumber,
      //          username: user.username,
      //          name: user.name,
      //          email: user.email,
      //          RoleId: user.RoleId,
      //          RoleName: user.Role.name,
      //          blocked: user.blocked,
      //          ...driver,
      //          vecType: veh.Vec_type,
      //       },
      //       token,
      //    };

      //    return data;
      // } else if (roleName === RolesEnum.Corporate) {
      //    roleData = await this.findUserRoleData(user, roleName);
      //    data = {
      //       ...roleData,
      //       token,
      //    };
      //    return data;
      // } else if (roleName == RolesEnum.Insurance) {
      //    roleData = await this.findUserRoleData(user, roleName);
      //    data = {
      //       ...roleData,
      //       token,
      //    };
      //    return data;
      // } else if (roleName === RolesEnum.Inspector) {
      //    roleData = await this.findUserRoleData(user, roleName);
      //    let update = await Inspector.update(
      //       {
      //          fcmtoken: loginCandidates.fcmtoken,
      //       },
      //       {
      //          where: {
      //             id: roleData.user.id,
      //          },
      //       }
      //    );
      //    data = {
      //       user: {
      //          ...roleData.user,
      //          fcmtoken: loginCandidates.fcmtoken,
      //       },
      //       token,
      //    };

      //    return data;
      // } else if (roleName === "InspectionManager") {
      //    roleData = await this.findUserRoleData(user, roleName);
      //    let update = await InspectionManager.update(
      //       {
      //          fcmtoken: loginCandidates.fcmtoken,
      //       },
      //       {
      //          where: {
      //             id: roleData.user.id,
      //          },
      //       }
      //    );
      //    data = {
      //       user: {
      //          ...roleData.user,
      //          fcmtoken: loginCandidates.fcmtoken,
      //       },
      //       token,
      //    };
      //    return data;
      // } else
      //    return {
      //       user: {
      //          username: user.username,
      //          PhoneNumber: user.PhoneNumber,
      //          name: user.name,
      //          email: user.email,
      //          RoleId: user.RoleId,
      //          RoleName: user.Role.name,
      //          blocked: user.blocked,
      //          id: user.id,
      //       },
      //       token,
      //    };
      data = await this.loginProcess(user, roleName, token, loginCandidates);
      return data;
   }
   async updateAnyUser({ userId, data }) {
      try {
         const existUser = await UserModel.findByPk(userId, {
            include: [Roles],
         });
         data.email = data.email ? data.email.trim() : data.email;
         if (!existUser) return new AppError("User not found", 404);
         if (data.roleId === existUser.RoleId) return existUser;
         let oldRoleName = await roleService.getRole(existUser.RoleId);
         const removeRole = await this.removeUserRole(
            userId,
            oldRoleName.dataValues.name
         );
         if (removeRole && removeRole.statusCode) return removeRole;
         let updateUser = await UserModel.update(
            {
               RoleId: data.roleId,
            },
            {
               where: { id: userId },
            }
         );
         const role = await roleService.getRole(data.roleId);
         const roleName = role.dataValues.name;
         if (roleName === RolesEnum.Client) {
            // const client = await clientService.getClientByUserId(userId)
            // if (!client.statusCode) return new AppError("! already exist", 400)
            // else {
            const client = await Client.create({
               active: false,
               UserId: userId,
            });
            return {
               username: existUser.username,
               PhoneNumber: existUser.PhoneNumber,
               name: existUser.name,
               email: existUser.email,
               RoleId: existUser.RoleId,
               ...client,
            };
            // }
         }
         // check if role is Driver
         else if (roleName === RolesEnum.Driver) {
            // const driver = driverService.getDriverByUserId(userId)
            // if (driver) return new AppError("! already exist", 400)
            // else {
            const driver = await Driver.create({
               UserId: userId,
               offline: true,
               available: false,
               average_rating: 0,
               rating_count: 0,
            });

            return {
               username: existUser.username,
               name: existUser.name,
               email: existUser.email,
               RoleId: existUser.RoleId,
               userId: existUser.id,
               ...driver,
            };
            // }
         }
         //check if role is insurance
         if (roleName === RolesEnum.Insurance) {
            const insuranceCompanyId = data.insuranceCompanyId;
            // const insurance = await InsuranceCompanyServices.getInsuranceByUserId(userId)
            // if (insurance) return new AppError("! already exists", 400)
            // else {
            const insurance = await Insurance.create({
               UserId: userId,
               insuranceCompanyId: insuranceCompanyId,
            });
            return {
               username: existUser.username,
               name: existUser.name,
               email: existUser.email,
               RoleId: existUser.RoleId,
               userId: existUser.id,
               ...insurance,
            };
            // }
         }
         // check if role is Corporate
         else if (roleName === RolesEnum.Corporate) {
            const CorporateCompanyId = data.corporateCompanyId;
            const corporateCompany = await CorporateCompany.findByPk(
               CorporateCompanyId
            );
            // const corporate = corporateCompanyService.getCorporateByUserId(userId)
            // if (corporate) return new AppError("! already exist", 400)
            // else {
            const corporate = await Corporate.create({
               UserId: userId,
               CorporateCompanyId,
            });

            return {
               id: corporate.id,
               username: existUser.username,
               name: existUser.name,
               corporate: corporateCompany,
               email: existUser.email,
               RoleId: existUser.RoleId,
               userId: existUser.id,
            };
            // }
         } else if (roleName === RolesEnum.Inspector) {
            let inspector = await Inspector.create({
               UserId: userId,
               phoneNumbers: data.phoneNumbers,
               emails: data.emails,
            });
            inspector = inspector({ plain: true });
            return {
               ...inspector,
               username: existUser.username,
               name: existUser.name,
               email: existUser.email,
               RoleId: existUser.RoleId,
               userId: existUser.id,
            };
         } else {
            return {
               username: existUser.username,
               name: existUser.name,
               email: existUser.email,
               RoleId: existUser.RoleId,
               userId: existUser.id,
            };
         }
      } catch (error) {
         return new AppError(error.message, 400);
      }
   }

   async removeUserRole(userId, roleName) {
      if (roleName === RolesEnum.Client) {
         const client = await clientService.getClientByUserId(userId);
         if (!client.statusCode) {
            const deleting = await clientService.deleteClient(client.id);
            if (deleting.statusCode) return deleting;
         }
      } else if (roleName === RolesEnum.Driver) {
         const driver = await driverService.getDriverByUserId(userId);
         if (!driver.statusCode) {
            await driverService.deleteDriver(driver.id);
         }
      } else if (roleName === RolesEnum.Insurance) {
         const insurance = await InsuranceCompanyServices.getInsuranceByUserId(
            userId
         );
         if (insurance) {
            await InsuranceCompanyServices.deleteInsurance(insurance.id);
         }
      } else if (roleName === RolesEnum.Corporate) {
         const corporate = await corporateCompanyService.getCorporateByUserId(
            userId
         );
         if (!corporate.statusCode) {
            await corporateCompanyService.deleteCorporate(corporate.id);
         }
      }
   }

   async createUser(data) {
      let identifier = data.identifier;
      if (identifier.startsWith("01")) {
         identifier = `+2${identifier}`;
      }
      const name = data.name;
      const email = data.email ? data.email.trim() : data.email;
      let role = await Roles.findOne({
         where: {
            name: {
               [Op.iLike]: "%Client",
            },
         },
      });
      role = role.get({ plain: true });
      const RoleId = role.id;
      let password = data.password || process.env.AUTO_USER_PASSWORD;
      const savePassword = await hashPassword(password);
      const promoValue = data.promoCode;
      try {
         const newUser = await UserModel.create({
            email,
            password: savePassword,
            name,
            RoleId,
            username: identifier,
            PhoneNumber: identifier,
         });
         const newClient = await Client.create({
            active: false,
            UserId: newUser.id,
         });

         const userId = newUser.id;

         if (promoValue) {
            let assignPromo = await promoCodeServices.checkAndAssignPromo({
               promoValue,
               userId,
            });
            if (assignPromo.statusCode) {
               const data = {
                  PhoneNumber: newUser.PhoneNumber,
                  name: newUser.name,
                  email: newUser.email,
                  RoleId: newUser.RoleId,
                  id: newClient.id,
                  userId: newClient.UserId,
               };
               return {
                  user: data,
                  msg: assignPromo.message,
               };
            }
            const data = {
               PhoneNumber: newUser.PhoneNumber,
               name: newUser.name,
               email: newUser.email,
               RoleId: newUser.RoleId,
               id: newClient.id,
               userId: newClient.UserId,
            };
            return {
               user: data,
               promo: assignPromo,
            };
         }

         const data = {
            PhoneNumber: newUser.PhoneNumber,
            name: newUser.name,
            email: newUser.email,
            RoleId: newUser.RoleId,
            id: newClient.id,
            userId: newClient.UserId,
         };
         return {
            user: data,
         };
      } catch (error) {
         console.error(error);
         // return new AppError(error.message, 400);
         throw error;
      }
   }
   async createUserRequest(data) {
      let identifier = data.identifier;
      if (identifier.startsWith("01")) {
         identifier = `+2${identifier}`;
      }
      const name = data.name;
      const email = data.email ? data.email.trim() : data.email;
      const RoleId = 2;
      const password = process.env.AUTO_USER_PASSWORD;
      const savePassword = await hashPassword(password);
      try {
         const newUser = await UserModel.create({
            email,
            password: savePassword,
            name,
            RoleId,
            username: identifier,
            PhoneNumber: identifier,
         });
         const newClient = await Client.create({
            active: true,
            UserId: newUser.id,
         });

         const data = {
            PhoneNumber: newUser.PhoneNumber,
            name: newUser.name,
            email: newUser.email,
            RoleId: newUser.RoleId,
            id: newClient.id,
            userId: newClient.UserId,
         };
         return data;
      } catch (error) {
         return new AppError(error.message, 400);
      }
   }
   async signUp(data) {
      const password = data.password;
      if (!password) return new AppError("Password is required", 400);
      if (password.length < 8)
         return new AppError("Password must be at least 8 characters", 400);
      if (!validator.isMobilePhone(data.identifier))
         return new AppError("Invalid Phone Number", 400);
      if (!data.name) return new AppError("Name is required", 400);

      const savePassword = await hashPassword(password);
      const PhoneNumber = data.identifier;
      const blocked = false;
      const name = data.name;
      const email = data.email ? data.email.trim() : data.email;
      const username = data.identifier;
      const promoValue = data.promoCode;
      const ifExist = await UserModel.findOne({
         where: {
            username,
         },
      });
      if (ifExist) return new AppError("This user is registered before", 400);
      let role = await Roles.findOne({
         where: {
            name: {
               [Op.iLike]: "%Client",
            },
         },
      });
      role = role.get({ plain: true });
      const RoleId = role.id;
      let newUser;
      let newClient;
      let userId;
      try {
         newUser = await UserModel.create({
            PhoneNumber,
            blocked,
            password: savePassword,
            name,
            username,
            email,
            RoleId,
            username: PhoneNumber,
         });
         newClient = await Client.create({ active: true, UserId: newUser.id });
         userId = newUser.id;
      } catch (err) {
         let messages = err.errors[0].message;
         // [
         //  ValidationErrorItem {
         //      message: 'email must be unique',
         //      type: 'unique violation',
         //      path: 'email',
         //      value: 'bode@gmail.com',
         //      origin: 'DB',
         //      instance: User {
         //      dataValues: [Object],
         //      _previousDataValues: [Object],
         //      uniqno: 1,
         //      _changed: [Set],
         //      _options: [Object],
         //      isNewRecord: true
         //   },
         //     validatorKey: 'not_unique',
         //     validatorName: null,
         //     validatorArgs: []
         //    }
         //  ]
         return new AppError(messages, 400);
      }
      const token = signToken(newUser.id);
      if (promoValue) {
         const userWithPromo = await promoCodeServices.checkAndAssignPromo({
            promoValue,
            userId,
         });

         if (userWithPromo.statusCode) {
            return {
               user: {
                  PhoneNumber: newUser.PhoneNumber,
                  name: newUser.name,
                  email: newUser.email,
                  RoleId: newUser.RoleId,
                  RoleName: role.name,
                  id: newClient.id,
                  userId: newClient.UserId,
                  blocked: newUser.blocked,
                  username: newUser.username,
               },
               token,
            };
         } else {
            return {
               user: {
                  PhoneNumber: newUser.PhoneNumber,
                  name: newUser.name,
                  email: newUser.email,
                  RoleId: newUser.RoleId,
                  RoleName: role.name,
                  id: newClient.id,
                  userId: newClient.UserId,
                  blocked: newUser.blocked,
                  username: newUser.username,
                  activePromo: userWithPromo.promo,
               },

               token,
            };
         }
      } else
         return {
            user: {
               PhoneNumber: newUser.PhoneNumber,
               name: newUser.name,
               email: newUser.email,
               RoleId: newUser.RoleId,
               RoleName: role.name,
               id: newClient.id,
               userId: newClient.UserId,
               blocked: newUser.blocked,
               username: newUser.username,
            },
            token,
         };
   }
   async getOneUser(userId) {
      try {
         const user = await UserModel.findOne({
            where: {
               id: userId,
            },
            include: {
               model: Roles,
            },
         });
         if (!user) return new AppError("User not found", 404);
         let data = await this.findUserRoleData(user, user.Role.name);
         return data;
      } catch (error) {
         console.error(error);
         return new AppError(error.message, 500);
      }
   }
   // second comment
   // third comment
   async findUserByPhoneNumber(phoneNumber) {
      let user = await UserModel.findOne({
         where: {
            username: phoneNumber,
         },
      });
      // comment
      if (!user) return new AppError("User not found", 404);
      user = user.get({ plain: true });
      let client = await clientService.getClientByUserId(user.id);
      client = client.get({ plain: true });

      if (client.statusCode) return client;
      let packages = await ClientPackageServices.getClientPackages(client.id);
      if (packages.statusCode)
         return {
            user,
            client,
         };
      return {
         user,
         client,
         packages,
      };
   }
   async findUserByIdentifier(identifier) {
      let user = await UserModel.findOne({
         where: {
            username: identifier,
         },
         include: [Roles],
      });
      if (!user) return new AppError("User not found", 404);
      user = user.get({ plain: true });
      return user;
   }
   async getUsers(roleId, page, size) {
      try {
         const users = await UserModel.findAll({
            where: {
               RoleId: roleId,
            },
            include: [Roles],
            limit: size,
            offset: (page - 1) * size,
         });
         let totalData = await UserModel.count({
            where: {
               RoleId: roleId,
            },
         });
         const totalPages = Math.ceil(totalData / size);
         return {
            totalData,
            currentPage: page,
            totalPages,
            users,
         };
      } catch (error) {
         console.error(error);
         return new AppError(error.message, 400);
      }
   }
   async getAllUsers(page, size) {
      try {
         const users = await UserModel.findAll({
            order: [["id", "DESC"]],
            include: [Roles],
            limit: size,
            offset: (page - 1) * size,
         });
         let totalData = await UserModel.count();
         const totalPages = Math.ceil(totalData / size);
         return {
            totalData,
            currentPage: page,
            totalPages,
            users,
         };
      } catch (error) {
         console.error(error);
         return new AppError(error.message, 400);
      }
   }
   async createUserAsAdmin(data) {
      let identifier = data.identifier;
      if (identifier.startsWith("01")) {
         identifier = `+2${identifier}`;
      }
      const name = data.name;
      const email = data.email;
      const RoleId = data.roleId;
      const role = data.role;
      const PhoneNumber = data.PhoneNumber;
      const password = data.password; // process.env.AUTO_USER_PASSWORD

      let checkIfExist;
      if (email) {
         email = email.trim();
         checkIfExist = await UserModel.findOne({
            where: {
               [Op.or]: {
                  email: email,
                  username: identifier,
               },
            },
         });
      } else if (!email) {
         checkIfExist = await UserModel.findOne({
            where: {
               username: identifier,
            },
         });
      }

      if (checkIfExist) return new AppError("This user already exists", 400);
      const savePassword = await hashPassword(password);
      try {
         const newUser = await UserModel.create({
            // PhoneNumber: identifier,
            username: identifier,
            email,
            password: savePassword,
            PhoneNumber,
            name,
            RoleId,
         });
         if (role == RolesEnum.Driver) {
            return await Driver.create({
               UserId: newUser.id,
               offline: true,
               available: false,
               average_rating: 0,
               rating_count: 0,
            });
         } else if (role == RolesEnum.Admin) {
            //await Admin.create({ UserId: newUser.id })
         } else if (role === RolesEnum.Insurance) {
            const insuranceCompany = data.insuranceCompany;
            return await Insurance.create({
               UserId: newUser.id,
               insuranceCompanyId: insuranceCompany,
            });
         } else if (role === RolesEnum.Broker) {
            const broker = await Broker.create({
               UserId: newUser.id,
            });
            return {
               id: broker.id,
               username: newUser.username,
               name: newUser.name,
               email: newUser.email,
               RoleId: newUser.RoleId,
               userId: newUser.id,
            };
         } else if (role === RolesEnum.Corporate) {
            const CorporateCompanyId = data.corporateCompanyId;
            const corporateCompany = await CorporateCompany.findByPk(
               CorporateCompanyId
            );
            const corporate = await Corporate.create({
               UserId: newUser.id,
               CorporateCompanyId,
            });

            return {
               id: corporate.id,
               username: newUser.username,
               name: newUser.name,
               corporate: corporateCompany,
               email: newUser.email,
               RoleId: newUser.RoleId,
               userId: newUser.id,
            };
         }
         return newUser.get({ plain: true });
      } catch (error) {
         console.error(error);
         // let messages = error.errors[0].message;
         // return new AppError(messages, 400);
         throw error;
      }
   }

   async resetPassword(data) {
      const { identifier, newPassword } = data;
      if (newPassword.length < 8)
         return new AppError("Password must be at least 8 characters", 400);
      const hashedPassword = await hashPassword(newPassword);
      const user = await UserModel.findOne({ where: { username: identifier } });
      await UserModel.update(
         { password: hashedPassword, name: data.name ? data.name : user.name },
         { where: { username: identifier } }
      );
      // if(data.name) await UserModel.update
      await Client.update({ active: true }, { where: { UserId: user.id } });

      return "ok";
   }

   async forgetPassword(data) {
      const { identifier } = data;
      const user = await UserModel.findOne({
         where: {
            username: {
               [Op.endsWith]: identifier,
            },
         },
      });
      if (!user) return new AppError("User not found", 404);
      let response = await sendingSmsService.sendOtp(identifier);
      return response;
   }

   async getMe(userId) {
      const user = await UserModel.findOne({
         where: {
            id: userId,
         },
         include: {
            model: Roles,
         },
      });
      if (!user) return new AppError("User not found", 404);
      let activePromoCode = await promoCodeServices.checkHasPromo(user.id);

      const returnUser = user.get({ plain: true });
      return {
         ...returnUser,
         activePromoCode,
      };
   }

   async checkExist(PhoneNumber) {
      const user = await UserModel.findOne({
         where: {
            username: PhoneNumber,
         },
      });
      if (!user) return "Not Exist";
      let client = await Client.findOne({
         where: {
            UserId: user.id,
         },
      });
      if (!client)
         return new AppError(
            "something went wrong or this user is not a client",
            400
         );
      client = client.get({ plain: true });
      if (client && client.active) return "Exist and active";
      if (client && !client.active) return "Exist and inactive";
   }

   async updateUser(data) {
      try {
         const email = data.email ? data.email.trim() : data.email;
         const name = data.name;
         const password = data.password;
         if (password && password.length < 8)
            return new AppError("Password must be at least 8 characters", 400);
         let id = data.userId;
         const existUser = await UserModel.findByPk(id);
         if (existUser) {
            if (email) {
               console.log(email);
               if (email !== existUser.email) {
                  const user = await this.findUserByEmail(email, id);
                  console.log(user);
                  if (user)
                     return new AppError("This email is already exist", 400);
               }
            }
            const updatedUser = await UserModel.update(
               {
                  email,
                  name,
                  password: password
                     ? await hashPassword(password)
                     : existUser.password,
               },
               {
                  where: {
                     id: data.userId,
                  },
               }
            );
            return updatedUser;
         } else {
            return new AppError("There is no user with this id", 404);
         }
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 400);
      }
   }
   async updateStatus({ userId, data }) {
      const updatedUser = await UserModel.update(
         { blocked: data.blocked },
         {
            where: {
               id: userId,
            },
         }
      );
      if (!updatedUser) return new AppError("something went wrong!", 400);

      return updatedUser;
   }
   async deleteUser(id) {
      const user = await UserModel.findByPk(id);
      if (!user) return new AppError("Can't find this user", 404);
      await UserModel.destroy({
         where: { id },
      });
      return "Deleted";
   }
   async findUserByEmail(email, id) {
      let where = {
         email: {
            [Op.like]: `${email}`,
         },
      };
      if (id) {
         where["id"] = {
            [Op.ne]: id,
         };
      }

      let user = await UserModel.findOne({
         where: {
            email: {
               [Op.like]: `${email}`,
            },
         },
      });
      return user;
   }
   async findUserRoleData(user, roleName) {
      if (roleName == RolesEnum.Client) {
         let client = await Client.findOne({
            where: {
               UserId: user.id,
            },
         });
         client = client.get({ plain: true });
         const pkgs = await clientPackageService.getClientPackages(client.id);
         // const packages = await ClientPackage.findAll({
         //    where: {
         //       ClientId: client.id,
         //    },
         // });
         let data = {
            user: {
               id: client.id,
               UserId: user.id,
               PhoneNumber: user.PhoneNumber,
               username: user.username,
               name: user.name,
               email: user.email,
               RoleId: user.RoleId,
               RoleName: user.Role.name,
               blocked: user.blocked,
               packages: pkgs,
               PackagePromoCodeId: user.PackagePromoCodeId,
            },
         };
         return data;
      } else if (roleName === RolesEnum.Driver) {
         let driver = await Driver.findOne({
            where: {
               UserId: user.id,
            },
         });

         driver = driver.get({ plain: true });

         let data = {
            user: {
               PhoneNumber: user.PhoneNumber,
               username: user.username,
               name: user.name,
               email: user.email,
               RoleId: user.RoleId,
               RoleName: user.Role.name,
               blocked: user.blocked,
               ...driver,
            },
         };

         return data;
      } else if (roleName === RolesEnum.Broker) {
         let broker = await Broker.findOne({
            where: {
               UserId: user.id,
            },
         });
         broker = broker.get({ plain: true });
         let data = {
            user: {
               id: broker.id,
               UserId: user.id,
               PhoneNumber: user.PhoneNumber,
               username: user.username,
               name: user.name,
               email: user.email,
               RoleId: user.RoleId,
               RoleName: user.Role.name,
               blocked: user.blocked,
            },
         };
         return data;
      } else if (roleName === RolesEnum.Corporate) {
         let corporate = await Corporate.findOne({
            where: {
               UserId: user.id,
            },
            include: [CorporateCompany],
         });
         corporate = corporate.get({ plain: true });
         let data = {
            user: {
               ...corporate,
               PhoneNumber: user.PhoneNumber,
               username: user.username,
               name: user.name,
               email: user.email,
               RoleId: user.RoleId,
               RoleName: user.Role.name,
               blocked: user.blocked,
            },
         };
         return data;
      } else if (roleName == RolesEnum.Insurance) {
         let insurance = await Insurance.findOne({
            where: {
               UserId: user.id,
            },
            include: [{ model: InsuranceCompany }],
         });
         insurance = insurance.get({ plain: true });
         let data = {
            user: {
               username: user.username,
               ...insurance,
               PhoneNumber: user.PhoneNumber,
               name: user.name,
               email: user.email,
               RoleId: user.RoleId,
               RoleName: user.Role.name,
               blocked: user.blocked,
            },
         };
         return data;
      } else if (roleName === RolesEnum.Inspector) {
         let inspector = await Inspector.findOne({
            where: {
               UserId: user.id,
            },
         });
         inspector = await inspector.get({ plain: true });
         let data = {
            user: {
               username: user.username,
               ...inspector,
               PhoneNumber: user.PhoneNumber,
               name: user.name,
               email: user.email,
               RoleId: user.RoleId,
               RoleName: user.Role.name,
               blocked: user.blocked,
            },
         };
         return data;
      } else if (roleName === "InspectionManager") {
         let inspectionManager = await InspectionManager.findOne({
            where: {
               UserId: user.id,
            },
         });
         inspectionManager = inspectionManager.get({ plain: true });
         let data = {
            user: {
               username: user.username,
               ...inspectionManager,
               PhoneNumber: user.PhoneNumber,
               name: user.name,
               email: user.email,
               RoleId: user.RoleId,
               RoleName: user.Role.name,
               blocked: user.blocked,
            },
         };
         return data;
      } else {
         let data = {
            user: {
               username: user.username,
               PhoneNumber: user.PhoneNumber,
               name: user.name,
               email: user.email,
               RoleId: user.RoleId,
               RoleName: user.Role.name,
               blocked: user.blocked,
               // userId: user.id,
               id: user.id,
            },
         };
         return data;
      }
   }

   async findUserWithId(userId) {
      let user = await UserModel.findByPk(userId);
      return user;
   }
   async uploadPhoto(userId, image) {
      let user = await UserModel.findByPk(userId, { include: [Roles] });
      if (!user) return new AppError("user not found", 404);
      if (user.Role.name === "Driver") {
         let pic = decodeImages(
            `drivers/${user.name.replaceAll(" ", "-")}-${Date.now()}`,
            image
         );
         await UserModel.update(
            {
               photo: pic,
            },
            {
               where: {
                  id: userId,
               },
            }
         );
      } else if (user.Role.name == "Broker") {
         let pic = decodeImages(
            `brokers/${user.name.replaceAll(" ", "-")}-${Date.now()}`,
            image
         );
         await UserModel.update(
            {
               photo: pic,
            },
            {
               where: {
                  id: userId,
               },
            }
         );
      } else if (user.Role.name === "Client") {
         let pic = decodeImages(
            `clients/${user.name.replaceAll(" ", "-")}-${Date.now()}`,
            image
         );
         await UserModel.update(
            {
               photo: pic,
            },
            {
               where: {
                  id: userId,
               },
            }
         );
      } else {
         let pic = decodeImages(
            `${user.name.replaceAll(" ", "-")}-${Date.now()}`,
            image
         );
         await UserModel.update(
            {
               photo: pic,
            },
            {
               where: {
                  id: userId,
               },
            }
         );
      }
      user = await UserModel.findByPk(userId, { include: [Roles] });
      return user;
   }
}

const decodeImages = (imageName, image) => {
   // const base64Image = image.split(';base64,').pop();
   let filename = `/public/users/${imageName}.jpg`;
   require("fs").writeFile(`.${filename}`, image, "base64", function (err) {
      if (err) console.error(err);
   });
   return filename;
};

const userService = new User();
module.exports = userService;
