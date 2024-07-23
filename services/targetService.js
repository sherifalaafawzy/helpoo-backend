const Targets = require('../models/Targets');
const AppError = require('../utils/AppError');

class Target {
  async getAll() {
    const targets = await Targets.findAll();
    return targets;
  }

  async getTarget(id) {
    const checkExist = await Targets.findByPk(id);
    if (!checkExist) return new AppError('Target does not exist', 404);
    return checkExist;
  }

  async createTarget(data) {
    try {
      const target = await Targets.create(data);
      return target;
    } catch (err) {
      console.error(err);
      return new AppError(err.message, 400);
    }
  }

  async updateTarget(id, data) {
    const checkExist = await Targets.findByPk(id);
    if (!checkExist) return new AppError('Target does not exist', 404);
    await Targets.update(data, {
      where: {
        id,
      },
    });
    const target = await Targets.findByPk(id);
    return target;
  }
  async deleteTarget(id) {
    const checkExist = await Targets.findByPk(id);
    if (!checkExist) return new AppError('Target does not exist', 404);
    await Targets.destroy({ where: { id } });
    return 'deleted';
  }
}
const targetService = new Target();
module.exports = targetService;
