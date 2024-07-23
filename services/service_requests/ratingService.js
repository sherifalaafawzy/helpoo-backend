const AppError = require("../../utils/AppError");
const ServiceRequest = require("../../models/ServiceRequest");
const Driver = require("../../models/Driver");
const sequelize = require("../../loaders/sequelize");

class RatingService {
   async addRating(ServiceRequestId, rating) {
      try {
         const ServiceRequestExist = await ServiceRequest.findOne({
            where: {
               id: ServiceRequestId,
            },
         });
         if (ServiceRequestExist) {
            if (ServiceRequestExist.rated == false) {
               const DriverExist = await Driver.findOne({
                  where: {
                     id: ServiceRequestExist.DriverId,
                  },
               });
               const updateRating = await ServiceRequest.update(
                  {
                     rating,
                     rated: true,
                  },
                  {
                     where: {
                        id: ServiceRequestId,
                     },
                  }
               );
               const UpdateDriverRatingCount = await Driver.increment(
                  "rating_count",
                  {
                     where: {
                        id: DriverExist.id,
                     },
                  }
               );
               // console.log("here");
               let avgRate = await ServiceRequest.findAll({
                  attributes: [
                     [
                        sequelize.fn(
                           "AVG",
                           sequelize.cast(sequelize.col("rating"), "FLOAT")
                        ),
                        "averageRating",
                     ],
                  ],

                  where: {
                     DriverId: DriverExist.id,
                  },
               });

               // console.log(avgRate[0].dataValues.averageRating);

               // console.log(UpdateDriverRatingCount);
               // console.log(
               //    (DriverExist.rating_count + ServiceRequestExist.rating) /
               //       DriverExist.rating_count
               // );
               const UpdateDriverAverageRating = await Driver.update(
                  {
                     average_rating:
                        Math.round(avgRate[0].dataValues.averageRating * 10) /
                        10,
                  },
                  {
                     where: {
                        id: DriverExist.id,
                     },
                  }
               );
               return {
                  newRating: avgRate[0].dataValues.averageRating,
                  UpdateDriverRatingCount,
                  UpdateDriverAverageRating,
               };
            }
            return new AppError("Service Request is already Rated", 405);
         }
         return new AppError("No service found", 404);
      } catch (error) {
         console.log(error);
         return new AppError(error.message, 400);
      }
   }
   async updateRating(ServiceRequestId, rating) {
      try {
         const ServiceRequestExist = await ServiceRequest.findOne({
            where: {
               id: ServiceRequestId,
            },
         });
         if (ServiceRequestExist) {
            const newRating = await ServiceRequest.update(
               {
                  rating,
                  rated: true,
               },
               {
                  where: {
                     id: ServiceRequestId,
                  },
               }
            );

            return newRating;
         }
         return new AppError("No service found", 404);
      } catch (error) {
         return new AppError(error.message, 400);
      }
   }
   async getRating(ServiceRequestId) {
      try {
         const serviceRequestExist = await ServiceRequest.findOne({
            where: { id: ServiceRequestId },
         });
         if (serviceRequestExist) {
            return serviceRequestExist;
         }
         return new AppError("No service found", 404);
      } catch (error) {
         return new AppError(error.message, 400);
      }
   }
   async deleteRating(ServiceRequestId) {
      const serviceRequest = await ServiceRequest.update(
         {
            rating: null,
         },
         {
            where: { id: ServiceRequestId },
         }
      );
      return serviceRequest;
   }
}

const ratingService = new RatingService();
module.exports = ratingService;
