const ManufacturerModel = require('../models/Manufacturer');
const AppError = require('../utils/AppError');

class Manufacturer {
  async getAllManufacturer() {
    const manufacturers = await ManufacturerModel.findAll();
    return manufacturers;
  }

  async createManufacturer(data) {
    const manufacturer = await ManufacturerModel.create(data);
    return manufacturer;
  }

  async getManufacturer(id) {
    const manufacturer = await ManufacturerModel.findOne({
      where: {
        id,
      },
    });
    if (!manufacturer) return new AppError("Can't find this manufacturer", 404);
    return manufacturer;
  }

  async updateManufacturer(id, data) {
    let manufacturer = await ManufacturerModel.findOne({
      where: {
        id,
      },
    });
    if (!manufacturer) return new AppError("Can't find this manufacturer", 404);
    await ManufacturerModel.update(data, {
      where: {
        id,
      },
    });
    manufacturer = ManufacturerModel.findByPk(id);
    manufacturer = manufacturer.get({ plain: true });
    return manufacturer;
  }

  async deleteManufacturer(id) {
    const manufacturer = await ManufacturerModel.findByPk(id);
    if (!manufacturer) return new AppError("Can't find this manufacturer", 404);

    await ManufacturerModel.destroy({
      where: {
        id,
      },
    });

    return 'Deleted';
  }
}

const manufacturerService = new Manufacturer();
module.exports = manufacturerService;
