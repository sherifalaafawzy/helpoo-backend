const moment = require("moment");
const { Op } = require("sequelize");
const AppError = require("../utils/AppError");

// models
const PromoAccessModel = require("../models/promoAccess");
const PromoCodeModel = require("../models/PromoCode");
const PromoCodeUser = require("../models/PromoCodeUser");
const User = require("../models/User");

class PromoCode {
   async cancelOldPromo(UserId) {
      await PromoCodeUser.update(
         {
            active: false,
         },
         {
            where: {
               UserId: UserId,
            },
         }
      );
      return "done";
   }

   async hasAccess(promo, PhoneNumber) {
      const valid = await PromoAccessModel.findOne({
         where: {
            name: promo.name,
            PhoneNumber: PhoneNumber,
         },
      });
      if (!valid) return false;
      return true;
   }

   async renewPromo(promo, userId) {
      const renewPromo = await PromoCodeUser.update(
         {
            active: true,
         },
         {
            where: {
               UserId: userId,
               PromoCodeId: promo.id,
            },
         }
      );
      let sentUser = await User.findByPk(userId);
      let sentPromo = await PromoCodeModel.findOne({
         where: {
            id: promo.id,
         },
      });
      sentUser = sentUser.get({ plain: true });
      sentPromo = sentPromo.get({ plain: true });
      const data = {
         ...sentUser,
         promo: { ...sentPromo },
      };
      return data;
   }

   async assignPromo(promo, userId) {
      const currentPromo = await PromoCodeUser.findOne({
         where: {
            UserId: userId,
            PromoCodeId: promo.id,
         },
      });
      if (currentPromo) {
         await this.cancelOldPromo(userId);
      }
      const newPromo = await PromoCodeUser.create({
         UserId: userId,
         PromoCodeId: promo.id,
         active: true,
         count: 0,
      });
      let createdPromo = newPromo.get({ plain: true });
      let increasedCount = promo.count + 1;
      let updateCount = await PromoCodeModel.update(
         {
            count: increasedCount,
         },
         {
            where: {
               id: promo.id,
            },
         }
      );
      let sentUser = await User.findByPk(userId);
      let sentPromo = await PromoCodeModel.findOne({
         where: {
            id: promo.id,
         },
      });
      sentUser = sentUser.get({ plain: true });
      sentPromo = sentPromo.get({ plain: true });
      const data = {
         ...sentUser,
         promo: { ...sentPromo },
      };
      return data;
   }

   async checkAndAssignPromo({ promoValue, userId }) {
      const promo = await PromoCodeModel.findOne({
         where: {
            value: promoValue,
         },
      });

      // check if promoCode exist
      if (!promo) return new AppError("Couldn't find this promo", 400);

      const isActive = promo.active;
      if (!isActive) {
         return new AppError("This promo has been expired", 400);
      }

      const isVoucher = promo.voucher;
      if (isVoucher) {
         return new AppError("This is a voucher", 400);
      }

      const user = await User.findByPk(userId);

      // check if user exist
      if (!user) return new AppError("Couldn't find this user", 400);

      // validate through maxCount and expiryDate
      const currentDateFormatted = moment(Date.now()).format("YYYY/MM/DD");
      const currentDate = new Date(currentDateFormatted);
      const promoExpiryDate = new Date(promo.expiryDate);

      // check if used before
      const used = await PromoCodeUser.findOne({
         where: {
            UserId: userId,
            PromoCodeId: promo.id,
         },
      });

      if (
         currentDate.getTime() > promoExpiryDate.getTime() ||
         (promo.count >= promo.maxCount && promoExpiryDate.maxCount > 0)
      ) {
         return new AppError("This promo has been expired", 400);
      }
      if (used) {
         // check if usageExpiryDate hasn't passed and the max trips hasn't expired
         const promoUsageExpiry = new Date(promo.usageExpiryDate);
         if (
            currentDate > promoUsageExpiry ||
            (promo.maxUse <= used.count && promo.maxUse != 0)
         ) {
            return new AppError(
               "You used this promoCode before and expired",
               400
            );
         }
         if (used.active) {
            return new AppError("You are using this promo", 400);
         }
      }

      // check if the promo is private for specific users
      if (promo.private) {
         // check if this user is valid to take this promo or not
         const valid = await this.hasAccess(promo, user.PhoneNumber);
         if (!valid) {
            return new AppError(
               "You don't have the permission to use this promo",
               400
            );
         }
         if (used) {
            await this.cancelOldPromo(userId);
            const data = await this.renewPromo(promo, userId);
            return data;
         }
         await this.cancelOldPromo(userId);
         const data = await this.assignPromo(promo, userId);
         return data;
      }
      if (used) {
         await this.cancelOldPromo(userId);
         const data = await this.renewPromo(promo, userId);
         return data;
      }
      await this.cancelOldPromo(userId);
      const data = await this.assignPromo(promo, userId);
      return data;
   }

   async validateVoucher(voucher, userId) {
      const isActive = voucher.active;
      if (!isActive) {
         return new AppError("This promo has been expired", 400);
      }

      const currentDateFormatted = moment(Date.now()).format("YYYY/MM/DD");
      const currentDate = new Date(currentDateFormatted);
      const voucherExpiryDate = new Date(voucher.expiryDate);

      if (
         currentDate > voucherExpiryDate ||
         (voucher.count >= voucher.maxCount && voucherExpiryDate.maxCount > 0)
      ) {
         return new AppError("This voucher has been expired", 400);
      }

      let used = await PromoCodeUser.findOne({
         where: {
            UserId: userId,
            PromoCodeId: voucher.id,
         },
      });
      if (used) {
         // check if it has max use limit
         if (used.count === voucher.maxUse && voucher.maxUse !== 0) {
            return new AppError("This voucher has been used before!", 400);
         }
         // check if it's available to use
         if (!used.active) {
            return new AppError("This voucher has been used before!", 400);
         }
         if (used.active) return 1;
      }
      return "done";
   }

   async useVoucher(value, userId) {
      const voucher = await PromoCodeModel.findOne({
         where: {
            value,
         },
      });

      const isVoucher = voucher.voucher;
      if (!isVoucher) {
         return new AppError("This is a promoCode", 400);
      }

      const validate = await this.validateVoucher(voucher, userId);

      if (validate.statusCode) return validate;
      if (validate !== 1) {
         const assign = await PromoCodeUser.create({
            UserId: userId,
            PromoCodeId: voucher.id,
            active: true,
         });
         voucher.count += 1;
         await voucher.save();
      }

      let data = await PromoCodeModel.findByPk(voucher.id);
      data = data.get({ plain: true });
      return {
         voucher: data,
      };
   }

   async createPromo(data) {
      if (
         !data ||
         !data.name ||
         !data.value ||
         !data.startDate ||
         !data.expiryDate ||
         !data.usageExpiryDate
      )
         return new AppError("Missing data ", 400);
      try {
         const existPromo = await PromoCodeModel.findOne({
            where: {
               value: {
                  [Op.like]: `%${data.value}%`,
               },
            },
         });
         if (existPromo) {
            return new AppError("This promocode already exists", 400);
         }
         const promo = await PromoCodeModel.create(data);
         return promo;
      } catch (err) {
         return new AppError("Something went wrong", 400);
      }
   }

   async updatePromo({ promoId, data }) {
      const checkIfExist = await PromoCodeModel.findByPk(promoId);
      if (!checkIfExist) return new AppError("No promoCode with this id", 400);
      let isEmpty = Object.keys(data).length === 0;
      if (isEmpty) return new AppError("No data has been sent", 400);
      const promo = await PromoCodeModel.update(
         {
            ...data,
         },
         {
            where: {
               id: promoId,
            },
         }
      );
      let sentPromo = await PromoCodeModel.findByPk(promoId);
      sentPromo = sentPromo.get({ plain: true });
      return sentPromo;
   }

   async getAllPromos(page = 1, limit = 10) {
      const promoCodes = await PromoCodeModel.findAll({
         order: [["id", "DESC"]],
         limit: limit,
         offset: (page - 1) * limit,
      });
      const totaldata = await PromoCodeModel.count();
      return {
         promoCodes,
         totaldata,
         totalPages: Math.ceil(totaldata / limit),
      };
   }

   async getAPromo(promoId) {
      const promo = await PromoCodeModel.findByPk(promoId);
      if (!promo) return new AppError("No promoCode with this id", 404);
      return promo;
   }

   async deletePromo(promoId) {
      const deletePromo = await PromoCodeModel.destroy({
         where: {
            id: promoId,
         },
      });
      return "deleted!";
   }

   async getPromosUsers(promoId) {
      const promoCheck = await PromoCodeModel.findByPk(promoId);
      if (!promoCheck) return new AppError("No Promo Code with this Id", 400);

      const promosUsersActive = await PromoCodeUser.findAndCountAll({
         where: {
            PromoCodeId: promoId,
            active: true,
         },
         // include:[User]
      });
      let users = [];
      if (promosUsersActive.count === 0) return [];
      for (let i = 0; i < promosUsersActive.count; i++) {
         let userId = promosUsersActive.rows[i].UserId;
         let user = await User.findOne({
            where: {
               id: userId,
            },
         });
         if (!user) return null;
         user = user.get({ plain: true });
         users.push(user);
      }

      return users;
   }

   async deactivatePromo(promoId) {
      let promoCheck = await PromoCodeModel.findByPk(promoId);
      if (!promoCheck) return new AppError("No promoCode with this Id", 404);
      // * DeActivate the promo in its model
      let updatePromo = await PromoCodeModel.update(
         {
            active: false,
         },
         {
            where: {
               id: promoId,
            },
         }
      );

      // * DeActivate the promo from the users

      let updateUsersPromo = await PromoCodeUser.update(
         {
            active: false,
         },
         {
            where: {
               PromoCodeId: promoId,
            },
         }
      );
      // * get and send promo
      let promo = await PromoCodeModel.findByPk(promoId);
      return promo;
   }

   async getAllAccess() {
      const access = await PromoAccessModel.findAll({});
      return access;
   }

   async getOneAccess(id) {
      const access = await PromoAccessModel.findOne({
         where: {
            id,
         },
      });
      if (!access) return new AppError("No access data for this id", 404);
      return access;
   }

   async getAccessForPhone(PhoneNumber) {
      const access = await PromoAccessModel.findAll({
         where: {
            PhoneNumber,
         },
      });
      if (access.length === 0)
         return new AppError("No access data for this phoneNumber", 404);
      return access;
   }

   async getAccessForPromo(name) {
      const access = await PromoAccessModel.findAll({
         where: {
            name,
         },
      });
      if (access.length === 0)
         return new AppError("No access data for this PromoName", 404);
      return access;
   }

   async createAccess({ phoneNumber, name }) {
      if (!phoneNumber || !name)
         return new AppError(
            "Missing data , check sending phoneNumber and promoCode name",
            400
         );
      const giveAccess = await PromoAccessModel.create({
         PhoneNumber: phoneNumber,
         name,
      });
      return giveAccess;
   }

   async updateAccess(data, id) {
      let access = await PromoAccessModel.findByPk(id);
      if (!access)
         return new AppError("There's no access model for this id", 404);
      await PromoAccessModel.update(data, {
         where: {
            id,
         },
      });
      access = await PromoAccessModel.findByPk(id);
      return access;
   }

   async deleteAccess(id) {
      let access = await PromoAccessModel.findByPk(id);
      if (!access)
         return new AppError("There's no access model for this id", 404);
      await PromoAccessModel.destroy({
         where: {
            id,
         },
      });
      return "deleted";
   }
   async checkHasPromo(UserId) {
      let activePromoCode = await PromoCodeUser.findOne({
         where: {
            UserId,
            active: true,
         },
      });
      if (!activePromoCode) {
         return null;
      } else {
         let removedIds = [];
         let promoId = activePromoCode.PromoCodeId;
         let promocode = await PromoCodeModel.findOne({
            where: {
               id: promoId,
            },
         });
         let promoCodeData = {
            id: promocode.id,
            value: promocode.value,
            startDate: promocode.startDate,
            expiryDate: promocode.expiryDate,
            percentage: promocode.percentage,
         };
         return promoCodeData;
      }
   }
}

const promoCodeService = new PromoCode();
module.exports = promoCodeService;

// * code must be cleaned :)
