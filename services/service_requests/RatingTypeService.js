const Rating = require('../../models/Rating');
const AppError = require('../../utils/AppError');

class RatingType {
  async createRatingType(data) {
    const ratingType = await Rating.create(data);
    // console.error(ratingType);
    return ratingType;
  }

  async updateRatingType({ data, ratingTypeId }) {
    const updatedRatingType = await Rating.update(
      {
        ...data,
      },
      {
        where: {
          id: ratingTypeId,
        },
      }
    );
    if (!updatedRatingType) return new AppError('Something went wrong', 400);
    return updatedRatingType;
  }

  async getAllRatingTypes() {
    const ratingTypes = await Rating.findAndCountAll({});
    if (!ratingTypes) return new AppError("Couldn't find any ratingTypes", 404);
    return ratingTypes;
  }

  async getARatingType(RatingTypeId) {
    const ratingType = await Rating.findByPk(RatingTypeId);
    if (!ratingType) return new AppError("Couldn't find this ratingType", 404);
    return ratingType;
  }

  async deleteRatingType(RatingTypeId) {
    const ratingType = await Rating.findByPk(RatingTypeId);
    if (!ratingType) return new AppError("Couldn't find this ratingType", 404);
    const deletedRatingType = await Rating.destroy({
      where: {
        id: RatingTypeId,
      },
    });
    if (deletedRatingType) {
      return deletedRatingType;
    }
    if (!deletedRatingType)
      return new AppError("Couldn't find this rating Type", 400);
  }
}
const RatingTypeService = new RatingType();
module.exports = RatingTypeService;
