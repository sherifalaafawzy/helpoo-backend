//  IMPORT MODULES
const AppError = require("./AppError");
// CREATING DB ERROR HANDLERS
const handleCastErrorDB = (err) => {
   const message = `Invalid ${err.path}: ${err.value}.`;
   return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
   const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
   const message = `Duplicate field value: ${value}. Please use another value`;
   return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
   const errors = Object.values(err.errors).map((el) => el.message);

   const message = `Invalid input data. ${errors.join(". ")}`;
   return new AppError(message, 400);
};

const handleJWTError = (err) =>
   new AppError("Invalid token. Please log in again", 401);
const handleJWTExpiredError = (err) =>
   new AppError("Your token has expired! Please log in again.", 401);

const handleSequelizeValidationError = (err) => {
   const errors = err.errors.map((err) => err.message);

   return new AppError(errors.join("\n"), 400);
};
const handleSequelizeDatabaseError = (err) => {
   const type = err.message.split("type ")[1];
   const errMsg = `Invalid input data for ${type}`;
   return new AppError(errMsg, 500);
};
// CREATING ERROR RES
const sendErrorProd = (err, req, res, next) => {
   // A) API
   if (req.originalUrl.startsWith("/api")) {
      // Operational, trusted error: send message to client
      if (err.isOperational) {
         return res.status(err.statusCode).json({
            status: err.status || "failed",
            msg: res.__(err.message),
         });

         // Programming or other unknown error: don't leak error details
      }
      // 1) Log error
      console.error("ERROR 💥", err);

      // 2) Send generic message
      return res.status(500).json({
         status: "failed",
         msg: res.__("Something went wrong"),
      });
   }
   // B) Rendered Website
   if (err.isOperational) {
      return res.status(err.statusCode).send({
         title: "Something went wrong!",
         msg: res.__(err.message),
      });

      // Programming or other unknown error: don't leak error details
   }
   // 1) Log error
   console.error("ERROR 💥", err);

   // 2) Send generic message
   return res.status(err.statusCode).send({
      title: "Something went wrong!",
      msg: res.__("Please try again later."),
   });
};

// EXPORTS THE ERROR HANDLED MESSAGES
module.exports = (err, req, res, next) => {
   // console.log(err.stack);

   err.statusCode = err.statusCode || 500;
   err.status = "failed";

   // if (process.env.NODE_ENV === 'development') {
   //     sendErrorDev(err, req, res, next);
   // } else if (process.env.NODE_ENV === 'production') {
   let error = { ...err };

   error.message = err.message;
   if (err.name === "CastError") {
      error = handleCastErrorDB(error);
   }
   if (err.code === 11000) {
      error = handleDuplicateFieldsDB(err);
   }
   if (err.name === "ValidationError") {
      error = handleValidationErrorDB(error);
   }
   if (err.name === "JsonWebTokenError") {
      error = handleJWTError(error);
   }
   if (err.name === "TokenExpiredError") {
      error = handleJWTExpiredError(error);
   }
   if (error.name === "SequelizeValidationError") {
      error = handleSequelizeValidationError(error);
   }
   if (error.name === "SequelizeUniqueConstraintError") {
      error = handleSequelizeValidationError(error);
   }
   if (error.name === "SequelizeDatabaseError") {
      error = handleSequelizeDatabaseError(error);
   }
   sendErrorProd(error, req, res, next);
   // }
};
