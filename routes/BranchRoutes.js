const express = require("express");

const catchAsync = require("../utils/catchAsync");
const auth = require("../middlewares/auth");
const branchService = require("../services/BranchService");

const router = express.Router();

router.post(
   "/",
   auth,
   catchAsync(async (req, res, next) => {
      let { CorporateCompanyId, name, phoneNumber, address } = req.body;
      const branch = await branchService.createBranch({
         CorporateCompanyId,
         name,
         phoneNumber,
         address,
      });
      if (branch.statusCode) {
         return next(branch);
      }
      res.status(201).json({
         status: "success",
         branch,
      });
   })
);

router.get(
   "/corp/:corpId",
   auth,
   catchAsync(async (req, res, next) => {
      const branches = await branchService.getAllBranchesForCompany(
         req.params.corpId
      );
      res.status(200).json({ status: "success", branches });
   })
);

router
   .route("/one/:id")
   .get(
      auth,
      catchAsync(async (req, res, next) => {
         const branch = await branchService.getBranch(req.params.id);
         if (branch.statusCode) {
            return next(branch);
         }
         res.status(200).json({
            status: "success",
            branch,
         });
      })
   )
   .patch(
      auth,
      catchAsync(async (req, res, next) => {
         let { name, phoneNumber, address } = req.body;
         const branch = await branchService.updateBranch(
            req.params.id,
            name,
            phoneNumber,
            address
         );
         if (branch.statusCode) {
            return next(branch);
         }
         res.status(200).json({
            status: "success",
            branch,
         });
      })
   )
   .delete(
      auth,
      catchAsync(async (req, res, next) => {
         const branch = await branchService.deleteBranch(req.params.id);
         res.status(204).send();
      })
   );

module.exports = router;
