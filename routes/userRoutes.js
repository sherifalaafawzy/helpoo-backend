const express = require("express");
const axios = require("axios");

const userService = require("../services/userService");
const clientService = require("../services/clientService");
const carService = require("../services/carService");
const roleService = require("../services/roleService");

const auth = require("../middlewares/auth");
const restriction = require("../middlewares/restriction");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

const Roles = require("../enums/Roles");
const smsService = require("../services/smsService");

const router = express.Router();

router.post(
   "/login",
   catchAsync(async (req, res, next) => {
      const loginCandidates = req.body;
      if (!loginCandidates.loginData) {
         loginCandidates.loginData = {};
      }
      if (!loginCandidates.loginData?.userAgent) {
         loginCandidates.loginData.userAgent = req.useragent;
      }
      let data = await userService.login(loginCandidates);
      /* #swagger.parameters['login'] ={
        in: 'body',
        schema:{
            $identifier : "01234567891",
            $password : "#someStrong14",
            $fcmtoken : "token"
        }
    }*/

      if (data.statusCode) {
         return next(data);
      } else {
         if (data.user.RoleName == Roles.Client) {
            const userCars = await carService.getUserCars(data.user.id);

            res.status(200).json({
               status: "success",
               ...data,
               cars: userCars,
            });
         } else if (data.user.RoleName === "Driver") {
            res.status(200).json({
               status: "success",
               ...data,
            });
            // await axios.post(
            //    "https://hook.eu1.make.com/yjpn07e9l3q5eqglbovpf6ghhls56i50",
            //    {
            //       ...data,
            //    }
            // );
         } else
            res.status(200).json({
               status: "success",
               ...data,
            });
      }
   })
);

router.post(
   "/loginWithOTP",
   catchAsync(async (req, res, next) => {
      let { fcmtoken, mobileNumber, message, otp, loginData = {} } = req.body;
      let mobile = await smsService.verifyOtp(req.body);
      if (mobile.statusCode) {
         return next(mobile);
      }
      if (!loginData?.userAgent) {
         console.log(req.useragent);
         loginData.userAgent = req.useragent;
      }
      let data = await userService.loginWithOtp(mobile, fcmtoken, {
         lastLogInData: loginData,
      });
      if (data.statusCode) {
         return next(data);
      } else {
         if (data.user.RoleName == Roles.Client) {
            const userCars = await carService.getUserCars(data.user.id);

            res.status(200).json({
               status: "success",
               ...data,
               cars: userCars,
            });
         } else if (data.user.RoleName === "Driver") {
            res.status(200).json({
               status: "success",
               ...data,
            });
            // await axios.post(
            //    "https://hook.eu1.make.com/yjpn07e9l3q5eqglbovpf6ghhls56i50",
            //    {
            //       ...data,
            //    }
            // );
         } else
            res.status(200).json({
               status: "success",
               ...data,
            });
      }
   })
);

router.post(
   "/signupWithOTP",
   catchAsync(async (req, res, next) => {
      let {
         fcmtoken,
         mobileNumber,
         message,
         otp,
         name,
         email,
         loginData = {},
      } = req.body;
      req.body["identifier"] = mobileNumber;
      let mobile = await smsService.verifyOtp(req.body);
      if (mobile.statusCode) {
         return next(mobile);
      }
      req.body.lastLogInData = loginData;
      if (!loginData.userAgent) {
         req.body.lastLogInData.userAgent = req.useragent;
      } else {
      }
      const user = await userService.signUpWithOTP(req.body);
      res.status(201).json({
         status: "success",
         ...user,
      });
   })
);

router.post(
   "/createUserRequest",
   auth,
   catchAsync(async (req, res, next) => {
      const user = await userService.createUserRequest(req.body);
      /* #swagger.parameters['Create User for Request'] ={
        in: 'body',
        schema:{
            $identifier : "01234567891",
            $name : "Customer name",
            $email : "test@test.com",
        }
    }
    #swagger.responses[200] = {
        schema:{
            PhoneNumber: "01234567891",
            name: "Customer name",
            email: "test@test.com",
            RoleId: "2",
            id: "1",
            userId:"5",
        }
    }
    */
      res.status(200).json({
         status: "success",
         user,
      });
   })
);

router.post(
   "/createUser",
   auth,
   restriction("Admin", "Insurance", "Broker", "Super", "CallCenter"),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['Create User'] ={
            in: 'body',
            schema:{
                $identifier : "01234567891",
                $name : "Customer name",
                $email : "test@email.com",
                $promoCode: "promoCode",
                $roleId: "2",
                $PhoneNumber: "01234567891",
                $password: "password",
            }
        }
        #swagger.responses[201] = {
            schema:{
                user: {
                    id: 1,
                    name: "Customer name",
                    email: "test@email.com",
                    RoleId: 2,
                    PhoneNumber: "01234567891",
                    userId: 5,
                }
            },
        }
    */
      let role = await roleService.getRole(req.user.RoleId);
      if (!role) {
         return next(new AppError("Can't find this role", 400));
      }

      if (
         Roles.Insurance === role.name ||
         Roles.Broker === role.name ||
         Roles.CallCenter === role.name
      ) {
         const createdUser = await userService.createUser({ ...req.body });
         if (createdUser.statusCode) {
            return next(createdUser);
         }
         res.status(201).json({
            status: "success",
            ...createdUser,
         });
      } else if (Roles.Admin === role.name || role.name === "Super") {
         let newRole = await roleService.getRole(req.body.roleId);
         if (newRole.name === "Client") {
            const user = await userService.createUser({ ...req.body });
            if (user.statusCode) {
               return next(user);
            }
            res.status(201).json({
               status: "success",
               ...user,
            });
         } else {
            const createdUser = await userService.createUserAsAdmin({
               ...req.body,
               role: newRole.name,
            });
            if (createdUser instanceof AppError) {
               return next(createdUser);
            } else
               res.status(201).json({
                  status: "success",
                  createdUser,
               });
         }
      }
   })
);
router.patch(
   "/updateUserRole/:userId",
   auth,
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['Update User Role'] ={
                in: 'body',
                schema:{
                    $roleId: "2",
                }
            }
    
        #swagger.responses[200] = {
            schema:{
                status: "success",
                user: {
                    username: "Customer name",
                    name: "Customer name",
                    email: "test@email.com",
                    RoleId: 2,
                    userId: 5,
                }
            }
        }
    */
      const updateData = req.body;
      const userId = req.params.userId;
      const user = await userService.updateAnyUser({
         userId,
         data: updateData,
      });
      if (user.statusCode) {
         return next(user);
      } else
         res.status(200).json({
            status: "success",
            user,
         });
   })
);

router.post(
   "/signup",
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['Signup'] ={
            in: 'body',
            schema:{
                $identifier : "01234567891",
                $name : "Customer name",
                $email : "test@email.com",
                $password: "password",
                $promoCode: "promoCode",
            }
        }
        #swagger.responses[201] = {
            schema:{
                status: "success",
                user: {
                    id: 1,
                    name: "Customer name",
                    email: "test@email.com",
                    RoleId: 2,
                    RoleName: "Client",
                    PhoneNumber: "01234567891",
                    userId: 5,
                    blocked: false,
                    username: "Customer name",
                },
                token: "token"
            }
        }
    */
      const newUser = await userService.signUp(req.body);
      if (newUser.statusCode) {
         return next(newUser);
      } else
         res.status(201).json({
            status: "success",
            ...newUser,
         });
   })
);

router.get(
   "/roles/:roleId",
   auth,
   restriction("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['Get Roles'] ={
                in: 'path',
                name: 'roleId',
                schema:{
                    $roleId: "1",
                }
        }
    */
      const roleId = Number(req.params.roleId);
      let { page, size } = req.query;
      if (!page) page = 1;
      if (!size) size = 10;
      if (size > 100) size = 100;
      const users = await userService.getUsers(roleId, page, size);
      res.status(200).json({
         ...users,
      });
   })
);

router.patch(
   "/clients/update",
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['Update Client'] ={
            in: 'body',
            schema:{
                $id: "1",
                $name : "Customer name",
                $email : "test@email.com",
                PhoneNumber: "01234567891",
            }
        }
    */
      const updateData = req.body;
      const id = req.body.id;
      const updateClient = await clientService.updateClient({
         id,
         data: updateData,
      });
      if (updateClient.statusCode) {
         return next(updateClient);
      }
      res.status(200).json({
         status: "updated",
         updateClient,
      });
   })
);

router.post(
   "/resetPassword",
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['Reset Password'] ={
            in: 'body',
            schema:{
                $newPassword: "password",
                $identifier: "01234567891",
            }
        }
    */
      const data = req.body;
      const user = await userService.resetPassword(data);
      if (user.statusCode) {
         return next(user);
      } else
         res.status(200).json({
            status: "success",
            msg: user,
         });
   })
);

router.post(
   "/forgotPassword",
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['Forgot Password'] ={
            in: 'body',
            schema:{
                $identifier: "01234567891",
            }
        }
    */
      const data = req.body;
      const user = await userService.forgetPassword(data);
      if (user.statusCode) {
         return next(user);
      }
      res.status(200).json({
         status: "success",
         ...user,
      });
   })
);

router.get(
   "/getOne/:id",
   auth,
   restriction("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['Get One User'] ={
                in: 'path',
                name: 'id',
                schema:"1"
        }
    */
      const user = await userService.getOneUser(Number(req.params.id));

      if (user.statusCode) {
         return next(user);
      }
      res.status(200).json({
         status: "success",
         user,
      });
   })
);

router.get(
   "/me",
   auth,
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['Get Me'] ={
            in: 'header',
            name: 'authentication',
            schema: "Bearer token"
        }
    */
      const userId = req.user.id;
      const user = await userService.getMe(userId);
      if (user.statusCode) {
         return next(user);
      }
      res.status(200).json({
         status: "success",
         user,
      });
   })
);

router.get(
   "/",
   auth,
   restriction("Admin", "Super", "CallCenter"),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['Get All users'] ={
            in: 'header',
            name: 'authentication',
            schema: "Bearer token"
        }
    */
      let { page, size } = req.query;
      if (!page) page = 1;
      if (!size) size = 10;
      if (size > 100) size = 100;
      const users = await userService.getAllUsers(page, size);
      res.status(200).json({
         status: "success",
         ...users,
      });
   })
);

router.post(
   "/checkExist",
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['Check Exist'] ={
            in: 'body',
            schema:{
                $PhoneNumber: "01234567891",
            }
        }
    */
      const result = await userService.checkExist(req.body.PhoneNumber);
      if (result === "Not Exist") {
         res.status(200).json({
            status: 1,
         });
      } else if (result === "Exist and active") {
         res.status(200).json({
            status: 2,
         });
      } else if (result === "Exist and inactive") {
         res.status(200).json({
            status: 3,
         });
      } else if (result.statusCode) return next(result);
      else
         res.status(200).json({
            msg: "working",
         });
   })
);

router.patch(
   "/updateMe",
   auth,
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['Update Me'] ={
            in: 'body',
            schema:{
                $name : "Customer name",
                $email : "test@email.com",
                $password: "password",
            }
        }
    */
      const userId = req.user.id;
      const data = {
         userId: userId,
         ...req.body,
      };
      if (data.password && data.password.length < 8) {
         return next(
            new AppError("password should be at least 8 characters", 400)
         );
      } else {
         const user = await userService.updateUser(data);
         if (user.statusCode) {
            return next(user);
         } else
            res.status(200).json({
               status: "success",
               user,
            });
      }
   })
);

router.delete(
   "/delete/:id",
   auth,
   restriction("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['Delete User'] ={
            in: 'path',
            name: 'id',
            schema: "1"
        }
    */
      const deletedUser = await userService.deleteUser(req.params.id);
      if (deletedUser.statusCode) {
         res.status(200).json({
            status: "success",
            message: "deleted successfully",
         });
      }
   })
);

router.patch(
   "/updateUser/:id",
   auth,
   restriction("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['Update User'] ={
            in: 'body',
            schema:{
                $name : "Customer name",
                $email : "test@email.com",
                $password: "password",
            }
        }
    ]
    */
      let userId = req.params.id;
      const data = {
         userId,
         ...req.body,
      };
      if (data.password && data.password.length < 8) {
         return next(
            new AppError("password should be at least 8 characters", 400)
         );
      } else {
         const user = await userService.updateUser(data);
         if (user.statusCode) {
            return next(user);
         } else
            res.status(200).json({
               status: "success",
               user,
            });
      }
   })
);
router.patch(
   "/updateUserStatus/:userId",
   auth,
   restriction("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['Update User Status'] =[{
            in: 'body',
            schema:{
                $blocked : true,
            }   
        },{
            in: 'path',
            name: 'userId',
            schema: "1"
        }]
    */
      const userId = req.params.userId;
      const updateUser = await userService.updateStatus({
         userId,
         data: req.body,
      });
      if (updateUser.statusCode) {
         return next(updateUser);
      }
      res.status(200).json({
         status: "success",
         updateUser,
      });
   })
);

router.patch(
   "/uploadPhoto",
   auth,
   restriction(Roles.Admin, Roles.Super),
   catchAsync(async (req, res, next) => {
      let { userId, image } = req.body;
      let user = await userService.uploadPhoto(userId, image);
      if (user.status) return next(user);
      else
         res.status(200).json({
            status: "success",
            user,
         });
   })
);

router.get(
   "/checkToken",
   auth,
   catchAsync(async (req, res, next) => {
      res.status(200).json({
         status: "valid",
      });
   })
);

router.get(
   "/getOneByPhoneNumber/:phoneNumber",
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['Get One User By Phone Number'] ={
            in: 'path',
            name: 'phoneNumber',
            schema:"01234567891"
        }
    */
      const phoneNumber = req.params.phoneNumber;
      const user = await userService.findUserByPhoneNumber(phoneNumber);
      if (user.statusCode) {
         return next(user);
      }
      res.status(200).json({
         status: "success",
         ...user,
      });
   })
);

module.exports = router;
