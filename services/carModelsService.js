const { Op } = require('sequelize');
const carModel = require('../models/CarModel');
const Manufacturer = require('../models/Manufacturer');
const AppError = require('../utils/AppError');

class CarModel {
  async createModel(data) {
    try {
      const existCarModel = await carModel.findOne({
        where: {
          [Op.or]: [
            {
              ar_name: {
                [Op.like]: `%${data.ar_name}%`,
              },
            },
            {
              en_name: {
                [Op.like]: `%${data.en_name}%`,
              },
            },
          ],
        },
      });
      if (existCarModel) {
        return new AppError('This car Model already exists', 400);
      } else {
        const model = await carModel.create(data);
        return model;
      }
    } catch (e) {
      return new AppError(e.message);
    }
  }

  async getAllModels() {
    const models = await carModel.findAll();
    return models;
  }

  async getModelByManu(ManufacturerId) {
    const models = await carModel.findAll({
      where: {
        ManufacturerId,
      },
    });
    return models;
  }

  async getAModel(id) {
    const model = await carModel.findOne({
      where: {
        id,
      },
      include: [Manufacturer],
    });
    if (!model) return new AppError("Can't find this car model", 404);
    return model;
  }

  async updateModel(id, data) {
    let model = await carModel.findByPk(id);
    if (!model) return new AppError("Can't find this car model", 404);
    await carModel.update(data, {
      where: {
        id,
      },
    });
    model = await carModel.findByPk(id, { include: [Manufacturer] });
    return model;
  }

  async deleteModel(id) {
    let model = await carModel.findByPk(id);
    if (!model) return new AppError("Can't find this car model", 404);

    await carModel.destroy({
      where: {
        id,
      },
    });
    return 'Deleted';
  }
}

const carModelService = new CarModel();
module.exports = carModelService;
