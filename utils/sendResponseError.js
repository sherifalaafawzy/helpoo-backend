const log = require("npmlog");

module.exports = (res, code = 500, message) => {
   log.error(`Error : ${message}`);
   res.status(code).json({
      status: "failed",
      msg: res.__(message) || res.__("Something went wrong"),
   });
};
