const express = require("express");
const axios = require("axios");

const originalFees = require("../services/service_requests/originalFees");
const discountService = require("../services/service_requests/DiscountService");
const commentService = require("../services/service_requests/commentService");
const ratingService = require("../services/service_requests/ratingService");
const serviceRequest = require("../services/ServiceRequestService");
const corporateService = require("../services/CorporateService");
const clientService = require("../services/clientService");
const driverService = require("../services/DriverService");

const auth = require("../middlewares/auth");
const restrict = require("../middlewares/restriction");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

const RolesEnum = require("../enums/Roles");
const CheckTimes = require("../models/CheckTimes");

const router = express.Router();

router.get(
   "/types",
   auth,
   catchAsync(async (req, res, next) => {
      const serviceRequestsTypes =
         await serviceRequest.getServiceRequestsTypes();

      res.status(200).json({
         status: "success",
         serviceRequestsTypes,
      });
   })
);
router.get(
   "/check/:id",
   auth,
   catchAsync(async (req, res, next) => {
      const clientId = req.params.id;
      const carId = req.body.carId;
      const client = await clientService.getClientById(clientId);
      const request = await serviceRequest.checkIfClientHasAReq(client, carId);
      if (request) {
         res.status(200).json({
            status: "success",
            ...request,
         });
      } else {
         res.status(200).json({
            status: "approved",
            request,
         });
      }
   })
);

router.post(
   "/approveReject",
   auth,
   catchAsync(async (req, res, next) => {
      let { requestId } = req.body;
      let request = await serviceRequest.approvedReject(requestId);
      if (request.statusCode) {
         return next(request);
      }
      res.status(200).json({
         status: "success",
         ...request,
      });
   })
);

router.post(
   "/rejectRequest",
   auth,
   restrict("Driver"),
   catchAsync(async (req, res, next) => {
      let { requestId, driverId } = req.body;
      let request = await serviceRequest.requestReject(requestId, driverId);
      if (request.statusCode) {
         return next(request);
      }
      res.status(200).json({
         status: "success",
         request,
      });
   })
);

router.post(
   "/refuseReject",
   auth,
   catchAsync(async (req, res, next) => {
      let { requestId } = req.body;
      let request = await serviceRequest.refuseReject(requestId);
      if (request.statusCode) {
         return next(request);
      }
      res.status(200).json({
         status: "success",
         request,
      });
   })
);

router.post(
   "/create",
   auth,
   catchAsync(async (req, res, next) => {
      /*
    #swagger.parameters['create service request'] = {
        in: 'body',
        schema: {
            $carServiceTypeId: [1,2,3],
            $distance: {
                $distance: {
                    $value: 1,
                },
            },
            $destinationDistance: {
                $distance: {
                    $value: 1,
                }
            },
            $corporateId: 1,
            $clientLatitude: 1,
            $clientLongitude: 1,
            $destinationAddress: "destinationAddress",
            $destinationLat: 1,
            $destinationLng: 1,
            $clientAddress: "clientAddress",
            $carId: 1,
            $corporateCompany:1
            $paymentMethod: "paymentMethod",
            
        }
    }
    */
      // const { carServiceTypeId, distance, destinationDistance, corporateId } = req.body
      // if (!req.body.paymentMethod)
      // else {
      let carServiceTypeId = JSON.parse(req.body.carServiceTypeId);
      let distance;
      let destinationDistance;
      if (req.body.distance) {
         distance = JSON.parse(req.body.distance);
      }
      if (req.body.destinationDistance) {
         destinationDistance = JSON.parse(req.body.destinationDistance);
      }
      // console.log(destinationDistance);
      let {
         corporateId,
         clientLatitude,
         clientLongitude,
         destinationAddress,
         destinationLat,
         destinationLng,
         clientAddress,
      } = req.body;
      destinationDistanceBefore = await driverService.getDurationAndDistance(
         `${clientLatitude},${clientLongitude}`,
         `${destinationLat},${destinationLng}`,
         [],
         "server",
         undefined
      );
      destinationDistance = {
         distance: destinationDistanceBefore.driverDistanceMatrix.distance,
         duration: destinationDistanceBefore.driverDistanceMatrix.duration,
         points: destinationDistanceBefore.points,
      };
      // console.log(destinationDistance);

      let createdByUser = req.user.id;
      let corporateCompany = undefined;
      if (corporateId) {
         let corporateUser = await corporateService.getUserCompany(corporateId);

         createdByUser = corporateUser.User.id;
         corporateCompany = corporateUser.CorporateCompany.id;
      }
      if (req.body.corporateCompany) {
         corporateCompany = req.body.corporateCompany;
      }
      // let originFees = 0;
      // for (let i = 0; i < carServiceTypeId.length; i++) {
      //    originFees = Math.max(
      //       originFees,
      //       await originalFees.getOriginalFees(
      //          carServiceTypeId[i],
      //          distance,
      //          destinationDistance
      //       )
      //    );
      // }
      let newDestinationDistance = await originalFees.getCalculateDistance(
         distance,
         destinationDistance
      );
      if (newDestinationDistance.statusCode) {
         return next(newDestinationDistance);
      }

      let originFees = await originalFees.getOriginalFees(
         carServiceTypeId,
         distance,
         newDestinationDistance
      );

      const response = await serviceRequest.createRequest({
         ...req.body,
         original_fees: originFees,
         createdByUser,
         corporateCompany,
         location: {
            distance,
            destinationDistance,
            calculatedDistance: newDestinationDistance,
            clientLatitude,
            clientLongitude,
            destinationAddress,
            destinationLat,
            destinationLng,
            clientAddress,
         },
      });
      if (response.statusCode) return next(response);
      else
         res.status(200).json({
            status: "success",
            ...response,
         });
      // let resp = await axios.post(
      //    "https://hook.eu1.make.com/yjpn07e9l3q5eqglbovpf6ghhls56i50",
      //    {
      //       ...response.request,
      //    }
      // );
      // }
   })
);

router.post(
   "/createOtherServices",
   auth,
   catchAsync(async (req, res, next) => {
      /*
    #swagger.parameters['create service request'] = {
        in: 'body',
        schema: {
            $services: {
               1:2,
               2:3,
               3:1
            },
            $distance: {
                $distance: {
                    $value: 1,
                },
            },
            $destinationDistance: {
                $distance: {
                    $value: 1,
                }
            },
            $corporateId: 1,
            $clientLatitude: 1,
            $clientLongitude: 1,
            $destinationLat: 1,
            $destinationLng: 1,
            $clientAddress: "clientAddress",
            $carId: 1,
            $corporateCompany:1
            $paymentMethod: "paymentMethod",
            
        }
    }
    */
      // const { carServiceTypeId, distance, destinationDistance, corporateId } = req.body
      // if (!req.body.paymentMethod)
      // else {
      let serviceIds = Object.keys(req.body.services);
      let distance = req.body.distance;

      let { corporateId, clientLatitude, clientLongitude, clientAddress } =
         req.body;
      let createdByUser = req.user.id;
      let corporateCompany = undefined;
      if (corporateId) {
         let corporateUser = await corporateService.getUserCompany(corporateId);

         createdByUser = corporateUser.User.id;
         corporateCompany = corporateUser.CorporateCompany.id;
      }
      if (req.body.corporateCompany) {
         corporateCompany = req.body.corporateCompany;
      }

      let originFees = await originalFees.getOtherServicesOriginalFees(
         serviceIds,
         req.body.services,
         distance
      );

      const response = await serviceRequest.createRequestOtherServices({
         ...req.body,
         original_fees: originFees,
         createdByUser,
         corporateCompany,
         location: {
            distance,
            clientLatitude,
            clientLongitude,
            clientAddress,
         },
      });
      if (response.statusCode) return next(response);
      else
         res.status(200).json({
            status: "success",
            ...response,
         });
      // let resp = await axios.post(
      //    "https://hook.eu1.make.com/yjpn07e9l3q5eqglbovpf6ghhls56i50",
      //    {
      //       ...response.request,
      //    }
      // );
      // }
   })
);

router.post(
   "/driverImages",
   auth,
   catchAsync(async (req, res, next) => {
      /*
    #swagger.parameters['driver images'] = {
        in: 'body',
        schema: {
            $requestId: 1,
            $images: ["image1","image2"]
        }
    }
    */
      const { requestId, images } = req.body;
      const response = await serviceRequest.uploadRequestImage({
         requestId,
         images: JSON.parse(images),
      });
      if (response.statusCode) return next(response);
      else
         res.status(200).json({
            status: "success",
            request: response,
         });
   })
);

router.get(
   "/driver/:id",
   auth,
   catchAsync(async (req, res, next) => {
      const requests = await serviceRequest.getDriverRequest(req.params.id);
      res.status(200).json({
         status: "success",
         requests,
      });
   })
);

router.post(
   "/addWaitingTime",
   auth,
   catchAsync(async (req, res, next) => {
      let requestId = req.body.id;
      let waitingTimeInMinutes = req.body.waitingTime;
      let waitingFees = req.body.waitingFees;

      const requests = await serviceRequest.addWaitingTime(
         requestId,
         waitingTimeInMinutes,
         waitingFees
      );
      if (requests.statusCode) return next(requests);
      else
         res.status(200).json({
            status: "success",
            requests,
         });
   })
);

router.post(
   "/applyWaitingTime",
   auth,
   catchAsync(async (req, res, next) => {
      let requestId = req.body.id;

      const requests = await serviceRequest.applyWaitingTime(requestId);
      if (requests.statusCode) return next(requests);
      else
         res.status(200).json({
            status: "success",
            requests,
         });
   })
);

router.post(
   "/removeWaitingTime",
   auth,
   catchAsync(async (req, res, next) => {
      let requestId = req.body.id;

      const requests = await serviceRequest.removeWaitingTime(requestId);
      if (requests.statusCode) return next(requests);
      else
         res.status(200).json({
            status: "success",
            requests,
         });
   })
);

router.post(
   "/addAdminDiscount",
   auth,
   catchAsync(async (req, res, next) => {
      let requestId = req.body.id;
      let discount = req.body.discount;

      const requests = await serviceRequest.addAdminDiscount(
         requestId,
         discount
      );
      if (requests.statusCode) return next(requests);
      else
         res.status(200).json({
            status: "success",
            requests,
         });
   })
);

router.post(
   "/applyAdminDiscount",
   auth,
   catchAsync(async (req, res, next) => {
      let requestId = req.body.id;
      let approvedBy = req.body.approvedBy;
      let reason = req.body.reason;

      const requests = await serviceRequest.applyAdminDiscount(
         requestId,
         approvedBy,
         reason
      );
      if (requests.statusCode) return next(requests);
      else
         res.status(200).json({
            status: "success",
            requests,
         });
   })
);

router.post(
   "/removeAdminDiscount",
   auth,
   catchAsync(async (req, res, next) => {
      let requestId = req.body.id;

      const requests = await serviceRequest.removeAdminDiscount(requestId);
      if (requests.statusCode) return next(requests);
      else
         res.status(200).json({
            status: "success",
            requests,
         });
   })
);

router.post(
   "/calculateFeesOtherServices",
   auth,
   catchAsync(async (req, res, next) => {
      /*
    #swagger.parameters['calculate fees'] = {
        in: 'body',
        schema: {
            $distance: {
                $distance: {
                    $value: 1,
                }
            },
            $userId: 1,
            $carId: 1,
            services:{
               1: 2,
               2:1,
               3:1
            }
        }
    }
    */
      let distance = req.body.distance;
      if (!distance)
         return next(new AppError("Please provide a distance", 400));

      try {
         let serivcesIds = Object.keys(req.body.services);
         let originFees = await originalFees.getOtherServicesOriginalFees(
            serivcesIds,
            req.body.services,
            distance
         );
         // console.log(originFees);
         let checkIfCreated = await CheckTimes.findOne({
            where: {
               UserId: req.user.id,
            },
         });
         if (checkIfCreated) {
            await CheckTimes.update(
               {
                  times: checkIfCreated.times + 1,
               },
               {
                  where: {
                     UserId: req.user.id,
                  },
               }
            );
         } else {
            await CheckTimes.create({
               UserId: req.user.id,
               times: 1,
            });
         }
         if (req.user.Role.name === "Corporate") {
            let fees = await discountService.calculateDiscountAsCorporate({
               original_fees: originFees,
               corporateUserId: req.user.id,
            });
            const data = {
               status: "success",
               originalFees: originFees,
               fees: fees.discount ? originFees - fees.discount : originFees,
               discountPercent: fees.discountPercentage
                  ? fees.discountPercentage
                  : 0,
            };
            res.status(200).json(data);
         } else {
            let fees = await discountService.calculateDiscountUser(
               originFees,
               req.body.userId,
               req.body.carId,
               serivcesIds
            );
            const data = {
               status: "success",
               originalFees: originFees,
               fees: fees.discount ? originFees - fees.discount : originFees,
               discountPercent: fees.discountPercentage
                  ? fees.discountPercentage
                  : 0,
            };
            res.status(200).json(data);
         }
      } catch (err) {
         return next(err);
      }
   })
);

router.post(
   "/calculateFees",
   auth,
   catchAsync(async (req, res, next) => {
      /*
    #swagger.parameters['calculate fees'] = {
        in: 'body',
        schema: {
            $distanceNorm: {
                $distance: {
                    $value: 1,
                }
            },
            $distanceEuro: {
                $distance: {
                    $value: 1,
                }
            },
            $destinationDistance: {
                $distance: {
                    $value: 1,
                }
            },
            $userId: 1,
            $carId: 1
        }
    }
    */
      let distanceNorm;
      let distanceEuro;
      let destinationDistance;
      let destinationDistanceEuro;
      let destinationDistanceNorm;
      if (req.body.distanceNorm) {
         distanceNorm = JSON.parse(req.body.distanceNorm);
      }
      if (req.body.distanceEuro) {
         distanceEuro = JSON.parse(req.body.distanceEuro);
      }
      if (req.body.destinationDistance) {
         destinationDistance = JSON.parse(req.body.destinationDistance);
      }

      try {
         destinationDistanceEuro = await originalFees.getCalculateDistance(
            distanceEuro,
            destinationDistance
         );
         if (destinationDistanceEuro.statusCode) {
            return next(destinationDistanceEuro);
         }
         destinationDistanceNorm = await originalFees.getCalculateDistance(
            distanceNorm,
            destinationDistance
         );
         if (destinationDistanceNorm.statusCode) {
            return next(destinationDistanceNorm);
         }
         let checkIfCreated = await CheckTimes.findOne({
            where: {
               UserId: req.user.id,
            },
         });
         if (checkIfCreated) {
            await CheckTimes.update(
               {
                  times: checkIfCreated.times + 1,
               },
               {
                  where: {
                     UserId: req.user.id,
                  },
               }
            );
         } else {
            await CheckTimes.create({
               UserId: req.user.id,
               times: 1,
            });
         }
      } catch (err) {
         console.error(err);
      }
      let data;
      if (req.user.Role.name === "Corporate") {
         if (!req.body.serviceId || req.body.serviceId !== 6) {
            const EuroOriginalFees = await originalFees.getOriginalFees(
               [5],
               distanceEuro,
               destinationDistanceEuro
            );
            const NormOriginalFees = await originalFees.getOriginalFees(
               [4],
               distanceNorm,
               destinationDistanceNorm
            );
            let EuroFees = await discountService.calculateDiscountAsCorporate({
               original_fees: EuroOriginalFees,
               corporateUserId: req.user.id,
            });
            let NormFees = await discountService.calculateDiscountAsCorporate({
               original_fees: NormOriginalFees,
               corporateUserId: req.user.id,
            });
            data = {
               status: "success",
               EuroOriginalFees,
               EuroFees: EuroFees.discount
                  ? EuroOriginalFees - EuroFees.discount
                  : EuroOriginalFees,
               EuroPercent: EuroFees.discountPercentage
                  ? EuroFees.discountPercentage
                  : 0,
               NormOriginalFees,
               NormFees: NormFees.discount
                  ? NormOriginalFees - NormFees.discount
                  : NormOriginalFees,
               NormPercent: NormFees.discountPercentage
                  ? NormFees.discountPercentage
                  : 0,
            };
         } else {
            const originFees = await originalFees.getOriginalFees(
               req.body.serviceId,
               undefined,
               destinationDistance
            );
            const fees = await discountService.calculateDiscountAsCorporate({
               original_fees: originFees,
               corporateUserId: req.user.id,
            });
            data = {
               status: "success",
               originalFees: originFees,
               fees: fees.discount
                  ? originalFees - fees.discount
                  : originalFees,
               percent: fees.discountPercentage ? fees.discountPercentage : 0,
            };
         }
         // console.log(data);
         res.status(200).json(data);
      } else {
         if (!req.body.serviceId || req.body.serviceId !== 6) {
            const EuroOriginalFees = await originalFees.getOriginalFees(
               [5],
               distanceEuro,
               destinationDistanceEuro
            );
            const NormOriginalFees = await originalFees.getOriginalFees(
               [4],
               distanceNorm,
               destinationDistanceNorm
            );

            let EuroFees = await discountService.calculateDiscountUser(
               EuroOriginalFees,
               req.body.userId,
               req.body.carId,
               [5]
            );
            let NormFees = await discountService.calculateDiscountUser(
               NormOriginalFees,
               req.body.userId,
               req.body.carId,
               [4]
            );
            // let EuroPercent = Math.floor((EuroOriginalFees - EuroFees)/EuroOriginalFees * 100)
            // let NormPercent = Math.floor((NormOriginalFees - NormFees)/NormOriginalFees * 100)
            // let EuroPercent
            // let NormPercent
            data = {
               status: "success",
               EuroOriginalFees,
               EuroFees: EuroFees.discount
                  ? EuroOriginalFees - EuroFees.discount
                  : EuroOriginalFees,
               EuroPercent: EuroFees.discountPercentage
                  ? EuroFees.discountPercentage
                  : 0,
               NormOriginalFees,
               NormFees: NormFees.discount
                  ? NormOriginalFees - NormFees.discount
                  : NormOriginalFees,
               NormPercent: NormFees.discountPercentage
                  ? NormFees.discountPercentage
                  : 0,
            };
         } else {
            const originFees = await originalFees.getOriginalFees(
               req.body.serviceId,
               undefined,
               destinationDistance
            );
            const fees = await discountService.calculateDiscountUser({
               original_fees: originFees,
               corporateUserId: req.user.id,
            });
            data = {
               status: "success",
               originalFees: originFees,
               fees: fees.discount
                  ? originalFees - fees.discount
                  : originalFees,
               percent: fees.discountPercentage ? fees.discountPercentage : 0,
            };
         }
         // console.log(data);
         res.status(200).json(data);
      }
   })
);

router.post(
   "/calculateFeesByService",
   auth,
   catchAsync(async (req, res, next) => {
      /*
    #swagger.parameters['calculate fees'] = {
        in: 'body',
        schema: {
            $distance: {
                $distance: {
                    $value: 1,
                }
            },
            $destinationDistance: {
                $distance: {
                    $value: 1,
                }
            },
            $userId: 1,
            $carId: 1
        }
    }
    */
      try {
         let checkIfCreated = await CheckTimes.findOne({
            where: {
               UserId: req.user.id,
            },
         });
         if (checkIfCreated) {
            await CheckTimes.update(
               {
                  times: checkIfCreated.times + 1,
               },
               {
                  where: {
                     UserId: req.user.id,
                  },
               }
            );
         } else {
            await CheckTimes.create({
               UserId: req.user.id,
               times: 1,
            });
         }
      } catch (err) {
         console.error(err);
      }
      let { distance, destinationDistance, services, userId, carId } = req.body;
      // let distance = req.body.distance;
      // let destinationDistance = req.body.destinationDistance;
      // let services = req.body.services;
      // distance = JSON.parse(distance)
      const fees = await originalFees.getOriginalFees(
         services,
         distance,
         destinationDistance
      );
      let finalFees = await discountService.calculateDiscountUser(
         originalFees,
         userId,
         carId,
         services
      );
      // let EuroPercent = Math.floor((EuroOriginalFees - EuroFees)/EuroOriginalFees * 100)
      // let NormPercent = Math.floor((NormOriginalFees - NormFees)/NormOriginalFees * 100)
      // let EuroPercent
      // let NormPercent
      const data = {
         status: "success",
         fees,
         finalFees: finalFees.discount ? fees - finalFees.discount : fees,
         EuroPercent: finalFees.discountPercentage
            ? finalFees.discountPercentage
            : 0,
      };
      // console.log(data);
      res.status(200).json(data);
   })
);

router.post(
   "/addDestination",
   auth,
   catchAsync(async (req, res, next) => {
      let {
         requestId,
         destinationAddress,
         destinationLat,
         destinationLng,
         destinationDistance,
      } = req.body;
      const request = await serviceRequest.addDestination(
         requestId,
         destinationAddress,
         destinationLat,
         destinationLng,
         destinationDistance
      );
      if (request.statusCode) return next(request);
      else res.status(200).json({ status: "success", request });
   })
);

router.get(
   "/search",
   auth,
   catchAsync(async (req, res, next) => {
      let { id, name, mobile } = req.query;
      let requests = await serviceRequest.searchInRequests(id, name, mobile);
      res.status(200).json({
         status: "success",
         requests,
      });
   })
);

router.get(
   "/corporateRequests/:id",
   auth,
   catchAsync(async (req, res, next) => {
      let corpId = req.params.id;
      if (!corpId) {
         return next(new AppError("Please logout and re-login again", 400));
      }
      let { page, size } = req.query;
      const requests = await serviceRequest.getCorporateRequests(
         corpId,
         page,
         size
      );
      if (requests.statusCode) return next(requests);
      else
         res.status(200).json({
            status: "success",
            ...requests,
         });
   })
);

router.post(
   "/commentAndRate/create",
   auth,
   catchAsync(async (req, res, next) => {
      /*
    #swagger.parameters['comment and rate'] = {
        in: 'body',
        schema: {
            $ServiceRequestId: 1,
            $comment: "comment",
            $rating: 1
        }
    }
    */
      const ServiceRequestId = req.body.ServiceRequestId;
      if (req.body.rating) {
         let addRate = await ratingService.addRating(
            ServiceRequestId,
            req.body.rating
         );
         if (addRate.statusCode) {
            return next(addRate);
         }
      }
      const commentAndRate = await commentService.addComment(
         ServiceRequestId,
         req.body
      );
      if (commentAndRate.statusCode) return next(commentAndRate);

      res.status(201).json({
         status: "success",
         comment: commentAndRate,
      });
   })
);
router.get(
   "/comment/get/:serviceRequestId",
   auth,
   catchAsync(async (req, res, next) => {
      const ServiceRequestId = req.params.serviceRequestId;
      const serviceRequest = await commentService.getComment(ServiceRequestId);
      if (serviceRequest.statusCode) return next(serviceRequest);

      res.status(200).json({
         status: "success",
         comment: serviceRequest.comment,
      });
   })
);
router.delete(
   "/comment",
   auth,
   catchAsync(async (req, res, next) => {
      /*
    #swagger.parameters['delete comment'] = {
        in: 'body',
        schema: {
            $ServiceRequestId: 1
        }
    }
    */
      const { ServiceRequestId } = req.body;
      await commentService.deleteComment(Number(ServiceRequestId));
      res.status(200).json({
         status: "success",
      });
   })
);
router.post(
   "/rating/create",
   auth,
   catchAsync(async (req, res, next) => {
      /*
    #swagger.parameters['rating'] = {
        in: 'body',
        schema: {
            $ServiceRequestId: 1,
            $rating: 1
        }
    }
    */
      const { ServiceRequestId, rating } = req.body;
      const newRating = await ratingService.addRating(ServiceRequestId, rating);
      if (newRating instanceof AppError) return next(newRating);
      res.status(201).json({
         status: "success",
         newRate: newRating,
      });
   })
);
router.patch(
   "/rating/update/:ServiceRequestId",
   auth,
   catchAsync(async (req, res, next) => {
      /*
    #swagger.parameters['update rating'] = {
        in: 'body',
        schema: {
            $rating: 1
        }
    }
    */
      const ServiceRequestId = req.params.ServiceRequestId;
      const rating = req.body;
      const newRating = await ratingService.updateRating(
         ServiceRequestId,
         rating
      );
      if (newRating instanceof AppError) return next(newRating);
      res.status(200).json({
         status: "success",
         newRate: rating,
      });
   })
);
router.get(
   "/rating/get/:serviceRequestId",
   auth,
   catchAsync(async (req, res, next) => {
      const ServiceRequestId = req.params.serviceRequestId;
      const serviceRequest = await ratingService.getRating(ServiceRequestId);
      if (serviceRequest.statusCode) return next(serviceRequest);

      res.status(200).json({
         status: "success",
         rating: serviceRequest.rating,
      });
   })
);
router.delete(
   "/rating",
   auth,
   catchAsync(async (req, res, next) => {
      /*
    #swagger.parameters['delete rating'] = {
        in: 'body',
        schema: {
            $ServiceRequestId: 1
        }
    }
    */
      const { ServiceRequestId } = req.body;
      await ratingService.deleteRating(Number(ServiceRequestId));
      res.status(200).json({
         status: "success",
      });
   })
);
router.patch(
   "/updatePayment",
   auth,
   catchAsync(async (req, res, next) => {
      /*
    #swagger.parameters['update payment'] = {
        in: 'body',
        schema: {
            $id: 1,
            $paymentStatus: "paid",
            $paymentMethod: "cash",
            $PaymentResponse: {}
        }
    }
    */
      const response = await serviceRequest.updatePayment(req.body);
      res.status(200).json({
         status: "success",
      });
   })
);
router.get(
   "/latestRequests/:id",
   auth,
   catchAsync(async (req, res, next) => {
      const id = Number(req.params.id);
      const serviceRequests = await serviceRequest.findUserOldRequest(id);
      if (serviceRequests.statusCode) {
         return next(serviceRequests);
      } else
         res.status(200).json({
            status: "success",
            requests: serviceRequests,
         });
   })
);

router.get(
   "/latestCorpRequests/:id",
   auth,
   catchAsync(async (req, res, next) => {
      const id = Number(req.params.id);
      if (!id) {
         return next(
            new AppError("Please provide us a corporate company id", 400)
         );
      }
      const serviceRequests = await serviceRequest.findCorporateUserOldRequest(
         id
      );
      if (serviceRequests.statusCode) {
         return next(serviceRequests);
      } else {
         res.status(200).json({
            status: "success",
            requests: serviceRequests,
         });
      }
   })
);

router.get(
   "/getAllOpen",
   auth,
   catchAsync(async (req, res, next) => {
      let requests = await serviceRequest.getAllOpenRequests();
      res.status(200).json({
         status: "success",
         requests,
      });
   })
);

router.post(
   "/addAdminComment",
   auth,
   restrict(RolesEnum.Admin, RolesEnum.Super, RolesEnum.CallCenter),
   catchAsync(async (req, res, next) => {
      let { id, comment } = req.body;
      let request = await serviceRequest.addAdminComment(id, comment);
      if (request.statusCode) return next(request);
      else {
         res.status(200).json({
            status: "success",
            request,
         });
      }
   })
);

router.post(
   "/getReports",
   auth,
   // restrict(RolesEnum.Admin, RolesEnum.Super, RolesEnum.CallCenter),
   catchAsync(async (req, res, next) => {
      /*
    #swagger.parameters['getReports'] = {
        in: 'body',
        schema: {
            $startDate: "2021-01-01",
            $endDate: "2021-01-01"
        }
    }
    */
      let { startDate, endDate, filterBy, ClientId, CorporateId, status } =
         req.body;

      const serviceRequests = await serviceRequest.getServiceRequestsBetDates(
         startDate,
         endDate,
         filterBy,
         ClientId,
         CorporateId,
         status
      );
      res.status(200).json({
         status: "success",
         ...serviceRequests,
      });
   })
);

router.get(
   "/getOne/:serviceRequestId",
   catchAsync(async (req, res, next) => {
      const serviceReq = await serviceRequest.getAServiceRequest(
         Number(req.params.serviceRequestId)
      );
      if (serviceReq.statusCode) {
         return next(serviceReq);
      } else
         res.status(200).json({
            status: "success",
            ...serviceReq,
         });
   })
);

router.get(
   "/getAll",
   auth,
   restrict("Admin", RolesEnum.CallCenter, RolesEnum.Super),
   catchAsync(async (req, res, next) => {
      let { page, size, sortBy, sortOrder, status, serviceType, clientType } =
         req.query;
      if (!page) page = 1;
      if (!size) size = 10;
      if (size > 100) size = 100;
      const requests = await serviceRequest.getAllServiceRequests(
         Number(page),
         Number(size),
         sortBy,
         sortOrder,
         status,
         serviceType,
         clientType
      );
      res.status(200).json({
         status: "success",
         ...requests,
      });
   })
);

router.patch(
   "/update/:id",
   auth,
   catchAsync(async (req, res, next) => {
      /*
    #swagger.parameters['update service request'] = {
        in: 'body',
        schema: {
            $status: "pending",
            $paymentMethod: "online-card",
        }
    }
    */
      const requestId = req.params.id;

      const response = await serviceRequest.updateRequestStatus(
         req.body,
         requestId
      );
      if (response.statusCode) return next(response);
      else {
         res.status(200).json({
            status: "success",
            request: response,
         });
         // await axios.post(
         //    "https://hook.eu1.make.com/yjpn07e9l3q5eqglbovpf6ghhls56i50",
         //    response
         // );
      }
   })
);

router.post(
   "/cancel/:id",
   auth,
   catchAsync(async (req, res, next) => {
      let id = req.params.id;
      const request = await serviceRequest.cancelRequest(id);
      if (request.statusCode) return next(request);
      else
         res.status(200).json({
            status: "success",
            request,
         });
      // await axios.post(
      //    "https://hook.eu1.make.com/yjpn07e9l3q5eqglbovpf6ghhls56i50",
      //    {
      //       ...request,
      //    }
      // );
   })
);

router.post(
   "/cancelWithPayment/:id",
   auth,
   catchAsync(async (req, res, next) => {
      let id = req.params.id;
      let { fees, comment } = req.body;
      const request = await serviceRequest.cancelWithPayment({
         requestId: id,
         fees,
         comment,
      });
      if (request.statusCode) return next(request);
      else
         res.status(200).json({
            status: "success",
            request,
         });
      // await axios.post(
      //    "https://hook.eu1.make.com/yjpn07e9l3q5eqglbovpf6ghhls56i50",
      //    {
      //       ...response,
      //    }
      // );
   })
);
router.post(
   "/checkPlate",
   auth,
   catchAsync(async (req, res, next) => {
      /*
    #swagger.parameters['check plate'] = {
        in: 'body',
        schema: {
            $plateNumber: "1234",
            $requestId: 1
        }
    }
    */
      let plateNumber = req.body.plateNumber;
      let requestId = req.body.requestId;
      const check = await serviceRequest.checkPlateNumber(
         plateNumber,
         requestId
      );
      if (!check)
         return next(new AppError("the insured car plate doesn't match", 400));
      if (check.statusCode) return next(check);

      res.status(200).json({
         status: "success",
         msg: "Updated!",
      });
   })
);

router.patch(
   "/finish",
   auth,
   catchAsync(async (req, res, next) => {
      /*
    #swagger.parameters['finish request'] = {
        in: 'body',
        schema: {
            $requestId: 1,
            $driverId: 1
        }
    }
    */
      const finish = await driverService.finishRequest(
         req.body.requestId,
         req.body.driverId
      );
      const request = await serviceRequest.getAServiceRequest(
         req.body.requestId
      );
      res.status(200).json({
         status: "success",
         msg: "ok",
      });
      // await axios.post(
      //    "https://hook.eu1.make.com/yjpn07e9l3q5eqglbovpf6ghhls56i50",
      //    {
      //       ...request,
      //    }
      // );
   })
);

router.post(
   "/getXYEquations",
   catchAsync(async (req, res, next) => {
      let { sDate, eDate } = req.body;
      let requests = await serviceRequest.getRequestsWithXYEqu(sDate, eDate);
      res.status(200).json({
         status: "success",
         requests,
      });
   })
);

router.post(
   "/driversRequestsMove",
   catchAsync(async (req, res, next) => {
      let { sDate, eDate } = req.body;
      let requests = await serviceRequest.getDriversAndWenchesKMS(sDate, eDate);
      res.status(200).json({
         status: "success",
         ...requests,
      });
   })
);

module.exports = router;
