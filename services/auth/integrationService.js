const IntegrationToken = require('../../models/IntegrationTokens');
const IntegrationUser = require('../../models/IntegrationUsers');
const AppError = require('../../utils/AppError');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

class IntegrationService {
  async RegisterClient(clientName, secret) {
    const hashedSecret = await bcrypt.hash(secret, 12);
    const client = await IntegrationUser.create({
      clientName,
      secret: hashedSecret,
    });
    return client;
  }

  async GetUsers() {
    const clients = await IntegrationUser.findAll();
    return clients;
  }

  async ResetClientSecret(clientId, secret) {
    if (!clientId || !secret) return new AppError('Missing data', 400);
    const hashedSecret = await bcrypt.hash(secret, 12);
    const client = await IntegrationUser.findOne({
      where: {
        clientId,
      },
    });
    if (!client) {
      return new AppError('Client not found', 404);
    }
    client.secret = hashedSecret;
    await client.save();
    return client;
  }

  async authenticateClient(clientId, secret) {
    const client = await IntegrationUser.findOne({
      where: {
        clientId,
      },
    });
    if (!client) {
      return new AppError('Client not found', 404);
    }
    const isMatch = await bcrypt.compare(secret, client.secret);
    if (!isMatch) {
      return new AppError('Invalid credentials', 401);
    }
    const token = jwt.sign(
      {
        clientId,
      },
      process.env.AUTH_JWT_SECRET,
      {
        expiresIn: '24h',
      }
    );
    let registeredToken = await IntegrationToken.findOne({
      where: {
        ClientId: client.clientId,
      },
    });
    if (!registeredToken) {
      registeredToken = await IntegrationToken.create({
        token,
        ClientId: client.clientId,
      });
    } else {
      registeredToken.token = token;
      await registeredToken.save();
    }
    return token;
  }

  async verifyToken(token) {
    const registeredToken = await IntegrationToken.findOne({
      where: {
        token,
      },
    });
    if (!registeredToken) {
      return new AppError('Token not found', 404);
    }
    try {
      const decoded = jwt.verify(token, process.env.AUTH_JWT_SECRET);
      return decoded;
    } catch (error) {
      return new AppError(error.message, 400);
    }
  }
}

const integrationService = new IntegrationService();
module.exports = integrationService;
