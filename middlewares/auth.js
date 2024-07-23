const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Roles = require("../models/Roles");
const HistoryLogs = require("../models/historyLogs");

module.exports = catchAsync(async function (req, res, next) {
   if (!req.headers.authentication) {
      return next(new AppError("Provide us login token", 401));
   }
   const token = req.headers.authentication.split(" ")[1];
   const data = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

   if (!data || !data.id) {
      return next(new AppError("Provide us login token again", 401));
   }
   const id = data.id;
   let user = await User.findOne({
      where: {
         id,
      },
      include: {
         model: Roles,
      },
   });
   if (!user) {
      return next(new AppError("check the login token again", 401));
   }
   if (new Date(user.lastLogIn).getTime() > Number(data.iat) * 1000) {
      return next(
         new AppError(
            "someone has logged into your account, please log in again",
            401
         )
      );
   }
   req.user = user.get({ plain: true });
   if (user.blocked) {
      return next(
         new AppError(
            "Your account has been blocked due to some suspicious activity",
            401
         )
      );
   }
   // console.log(req.originalUrl);
   if (
      !req.originalUrl.includes("updateLocation") &&
      (req.method == "POST" || req.method == "PATCH")
   ) {
      await HistoryLogs.create({
         API: req.originalUrl,
         requestType: req.method,
         body: req.body,
         query: req.query,
         UserId: id,
      });
   }
   next();
});
