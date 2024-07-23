const express = require("express");
const catchAsync = require("../utils/catchAsync");
const auth = require("../middlewares/auth");
const restriction = require("../middlewares/restriction");
const settingsService = require("../services/SettingsService");
const targetService = require("../services/targetService");
const polyUtil = require("polyline-encoded");
const router = express.Router();

router.get(
   "/",
   auth,
   restriction("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      const settings = await settingsService.getSettings();
      res.json(settings);
   })
);

router.post(
   "/encodeString",
   catchAsync(async (req, res, next) => {
      const { decoded } = req.body;
      const encodedString = polyUtil.decode(decoded);
      res.status(200).json({
         status: "success",
         encodedString,
      });
   })
);

router.get(
   "/allConfig",
   catchAsync(async (req, res, next) => {
      const config = await settingsService.getAllConfig();
      res.status(200).json({
         status: "success",
         config,
      });
   })
);

router.patch(
   "/config/:id",
   catchAsync(async (req, res, next) => {
      const config = await settingsService.updateConfig(
         req.params.id,
         req.body
      );
      if (config.statusCode) return next(config);
      else
         res.status(200).json({
            status: "success",
            config,
         });
   })
);

router.post(
   "/createConfig",
   catchAsync(async (req, res, next) => {
      const config = await settingsService.createConfig(req.body);
      if (config.statusCode) return next(config);
      else
         res.status(200).json({
            status: "success",
            config,
         });
   })
);

router.post(
   "/callGETApi",
   catchAsync(async (req, res, next) => {
      let { url, isMap } = req.body;
      let response = await settingsService.callGetRequests(url, isMap);
      if (response.statusCode) return next(response);
      else {
         res.status(200).json({
            status: "success",
            response: response,
            // response: JSON.stringify(response),
         });
      }
   })
);

router.put(
   "/",
   auth,
   restriction("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['update settings'] = {
            in: 'body',
            schema: {
                $PhoneNumbers: "0123456789",
                $email: "test@email.com",
                $hotline: "19700",
                $about : "about us",
                $WALink : "https://wa.me/20123456789",
            }
        }
    */
      const settings = await settingsService.updateSettings(req.body);
      res.json(settings);
   })
);

router.post(
   "/wizard",
   auth,
   restriction("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['create wizard'] = {
            in: 'body',
            schema: {
                $textAr: "مرحبا بكم في موقعنا",
                $textEn: "Welcome to our website",
                $img: "Base64 image",
                $name: "welcome",
                $headlineAr: "مرحبا بكم",
                $headlineEn: "Welcome",
                $apiKey: "123456789",
                $time: "10",
                $timeAfter: "10",
                $timeBefore: "10",
            }
        }
     */
      const wizard = await settingsService.createWizard(req.body);
      if (wizard.statusCode) {
         return next(wizard);
      }
      res.status(201).json({
         status: "success",
         wizard,
      });
   })
);
router.get(
   "/wizard",
   /* auth, restriction("Admin"),  */ catchAsync(async (req, res, next) => {
      const wizards = await settingsService.getWizards();
      res.status(200).json({
         status: "success",
         wizards,
      });
   })
);

router.get(
   "/wizard/getByName/:name",
   auth,
   restriction("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      const wizard = await settingsService.getWizardByName(req.params.name);
      if (wizard.statusCode) return next(wizard);
      res.status(200).json({
         status: "success",
         wizard,
      });
   })
);

router.get(
   "/wizard/getOne/:id",
   auth,
   restriction("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      const wizard = await settingsService.getWizardById(req.params.id);
      if (wizard.statusCode) return next(wizard);
      res.status(200).json({
         status: "success",
         wizard,
      });
   })
);

router.put(
   "/wizard/:id",
   /* auth, restriction("Admin"),  */ catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['update wizard'] = {
            in: 'body',
            schema: {
                $textAr: "مرحبا بكم في موقعنا",
                $textEn: "Welcome to our website",
                $img: "Base64 image",
                $name: "welcome",
                $headlineAr: "مرحبا بكم",
                $headlineEn: "Welcome",
                $apiKey: "123456789",
                $time: "10",
                $timeAfter: "10",
                $timeBefore: "10",
            }
        }
    */
      const wizard = await settingsService.updateWizard(
         req.body,
         req.params.id
      );
      if (wizard.statusCode) return next(wizard);
      else
         res.status(200).json({
            status: "success",
            wizard,
         });
   })
);

router.delete(
   "/wizard/:id",
   /* auth, restriction("Admin"),  */ catchAsync(async (req, res, next) => {
      const wizard = await settingsService.deleteWizard(req.params.id);
      if (wizard.statusCode) return next(wizard);
      res.status(200).json({
         status: "success",
         wizard,
      });
   })
);

router.get(
   "/stats",
   catchAsync(async (req, res, next) => {
      let { sDate, eDate } = req.query;
      let stats;
      if (sDate) {
         stats = await settingsService.getStatsWithDates(sDate, eDate);
      } else {
         stats = await settingsService.getStats();
      }
      if (stats.statusCode) return next(stats);
      else
         res.status(200).json({
            stats,
         });
   })
);

router.get(
   "/promoStats",
   catchAsync(async (req, res, next) => {
      let { sDate, eDate } = req.query;
      let stats;
      if (sDate) {
         stats = await settingsService.promoStatsWithDates(sDate, eDate);
      } else {
         stats = await settingsService.promoStats();
      }
      if (stats.statusCode) return next(stats);
      else
         res.status(200).json({
            status: "success",
            stats,
         });
   })
);

router.get(
   "/targets/getAll",
   catchAsync(async (req, res, next) => {
      const targets = await targetService.getAll();
      res.status(200).json({
         status: "success",
         targets,
      });
   })
);

router.get(
   "/targets/getOne/:id",
   catchAsync(async (req, res, next) => {
      const id = req.params.id;
      const target = await targetService.getTarget(id);
      if (target.statusCode) return next(target);
      else
         res.status(200).json({
            status: "success",
            target,
         });
   })
);

router.post(
   "/targets/create",
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['create target'] = {
            in: 'body',
            schema: {
                $month: "December",
                $target: 1000,
                $revenue: 1000,
                $achieved: true,
                $achievedPercentage: 12.5,
                $year: 2021
            }
        }
    */
      const newTarget = await targetService.createTarget(req.body);
      if (newTarget.statusCode) return next(newTarget);
      else
         res.status(200).json({
            status: "success",
            newTarget,
         });
   })
);

router.patch(
   "/targets/update/:id",
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['update target'] = {
            in: 'body',
            schema: {
                $month: "December",
                $target: 1000,
                $revenue: 1000,
                $achieved: true,
                $achievedPercentage: 12.5,
                $year: 2021
            }
        }
    */
      const id = req.params.id;
      const target = await targetService.updateTarget(id, req.body);
      if (target.statusCode) return next(target);
      else
         res.status(200).json({
            status: "success",
            target,
         });
   })
);

router.delete(
   "/targets/delete/:id",
   catchAsync(async (req, res, next) => {
      const id = req.params.id;
      const target = await targetService.deleteTarget(id);
      if (target.statusCode) return next(target);
      else
         res.status(204).json({
            status: "success",
            msg: target,
         });
   })
);

module.exports = router;
