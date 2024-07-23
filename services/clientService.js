// Models
const ClientModel = require("../models/Client");
const PromoCode = require("../models/PromoCode");
const User = require("../models/User");
const Roles = require("../models/Roles");
const ClientPackage = require("../models/ClientPackage");
const Package = require("../models/Package");

// Utils
const AppError = require("../utils/AppError");
class Client {
   async getClientByUserId(id) {
      const client = await ClientModel.findOne({
         where: {
            UserId: id,
         },
      });
      if (!client) return new AppError("client not found", 404);
      return client;
   }
   async getClientById(id) {
      let client = await ClientModel.findOne({
         where: {
            id,
         },
         include: [
            {
               model: User,
               include: [
                  {
                     model: PromoCode,
                     // where:{
                     //     PromoCodeUser:{
                     //         active:true
                     //     }
                     // }
                  },
               ],
            },
            {
               model: ClientPackage,
               include: [Package],
            },
         ],
      });
      if (!client) return new AppError("Couldn't find this client", 404);
      else {
         client = client.get({ plain: true });
         return client;
      }
   }
   async updateClient({ clientId, data }) {
      const updatedClient = await ClientModel.update(
         { ...data },
         {
            where: {
               id: clientId,
            },
         }
      );
      if (!updatedClient) return new AppError("something went wrong!", 400);

      return updatedClient;
   }
   async getAllClients() {
      const clients = await ClientModel.findAll({
         include: [
            {
               model: User,
               include: [Roles],
            },
         ],
      });
      return clients;
   }

   async deleteClient(id) {
      try {
         const deletedClient = await ClientModel.destroy({
            where: {
               id,
            },
            cascade: true,
         });
         return deletedClient;
      } catch (err) {
         console.error(err);
         return new AppError("Can't delete this client", 400);
      }
   }
}

const clientService = new Client();
module.exports = clientService;
