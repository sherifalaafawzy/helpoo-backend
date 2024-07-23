const AppError = require('../utils/AppError');

const CarServiceType = require('../models/CarServiceType');

class ServiceTypes {
  async getAll() {
    const types = await CarServiceType.findAll({});
    return types;
  }

  async getOne(id) {
    let type = await CarServiceType.findByPk(id);
    if (!type) return new AppError('no service type with this id', 404);
    return type;
  }

  async createType(data) {
    try {
      let newType = await CarServiceType.create(data);
      return newType;
    } catch (err) {
      console.error(err);
      return new AppError('Something went wrong', 400);
    }
  }

  async updateType(id, data) {
    let checkExist = await CarServiceType.findByPk(id);
    if (!checkExist) return new AppError('No service type with this id', 404);
    try {
      await CarServiceType.update(data, {
        where: {
          id,
        },
      });
      return 'updated';
    } catch (err) {
      console.error(err);
      return new AppError(err.message, 400);
    }
  }
}

const serviceTypes = new ServiceTypes();
module.exports = serviceTypes;
