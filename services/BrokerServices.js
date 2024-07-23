const Broker = require("../models/Broker");
const User = require("../models/User");
const AppError = require("../utils/AppError");

class BrokerService {
   async getAll() {
      const brokers = await Broker.findAll({
         include: [User],
      });
      return brokers;
   }
}

const brokerService = new BrokerService();

module.exports = brokerService;
