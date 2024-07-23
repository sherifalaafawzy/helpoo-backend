const AppError = require("../utils/AppError");

const restriction = (...roles) => {
   return (req, res, next) => {
      let user = JSON.stringify(req.user);
      user = JSON.parse(user);
      let roleName = req.user.Role.name;
      if (!roles.includes(roleName)) {
         // return next(new AppError('You do not have a permission to preform this action', 403))
         return next(
            // res.status(403).json({
            //    status: "failed",
            //    msg: "You do not have a permission to preform this action",
            // })
            new AppError(
               "You do not have a permission to preform this action",
               403
            )
         );
      }
      next();
   };
};

module.exports = restriction;
