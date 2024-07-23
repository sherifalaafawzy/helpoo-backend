const AppError = require('../../utils/AppError');
const ServiceRequest = require('../../models/ServiceRequest');

class CommentService {
  async addComment(ServiceRequestId, data) {
    try {
      const ServiceRequestExist = await ServiceRequest.findOne({
        where: {
          id: ServiceRequestId,
        },
      });
      if (ServiceRequestExist) {
        const updatedCommentAndRate = await ServiceRequest.update(data, {
          where: {
            id: ServiceRequestExist.id,
          },
        });
        if (!updatedCommentAndRate)
          return new AppError('something went wrong!', 400);
        return updatedCommentAndRate;
      }
      return new AppError('No service found', 404);
    } catch (error) {
      return new AppError(error.message, 400);
    }
  }
  async getComment(ServiceRequestId) {
    try {
      const serviceRequestExist = await ServiceRequest.findOne({
        where: { id: ServiceRequestId },
      });
      if (serviceRequestExist) {
        return serviceRequestExist;
      }
      return new AppError('No service found', 404);
    } catch (error) {
      return new AppError(error.message, 400);
    }
  }
  async deleteComment(ServiceRequestId) {
    const serviceRequest = await ServiceRequest.update(
      {
        comment: null,
      },
      {
        where: { id: ServiceRequestId },
      }
    );
    return serviceRequest;
  }
}
const commentService = new CommentService();
module.exports = commentService;
