const RoleModel = require('../models/Roles');
const AppError = require('../utils/AppError');

class Roles {
  async createRole(body) {
    if (body.name === null) return new AppError('Enter the role Name', 400);
    try {
      const existRole = await RoleModel.findOne({
        where: {
          name: body.name,
        },
      });
      if (existRole) {
        return new AppError('This Vehicle already exists', 400);
      }
    } catch (err) {
      return new AppError(err.message);
    }
    const data = await RoleModel.create(body);

    return data;
  }

  async getRoles() {
    const data = await RoleModel.findAll();

    return data;
  }

  async getRole(roleId) {
    const data = await RoleModel.findOne({
      where: {
        id: roleId,
      },
    });
    return data;
  }
}

const roleService = new Roles();
module.exports = roleService;
