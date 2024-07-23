const catchAsync = require("../utils/catchAsync");

module.exports = catchAsync(async (req, res, next) => {
   let filteredBody = {};
   let body = req.body;
   for (let prop in body) {
      filteredBody[prop] = body[prop] === "" ? undefined : body[prop];
   }
   req.body = filteredBody;
   next();
});
