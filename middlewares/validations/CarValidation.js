const Joi = require('joi')
exports.carValidation = Joi.object().keys({
    phoneNumber: Joi.string().required(),
    email: Joi.string().email(),
    car: Joi.object().keys({
        plateNumber: Joi.string().required(),
        year: Joi.number().min(1).required(),
        color:Joi.string(),
        policyNumber: Joi.string().required(),
        policyEnds: Joi.date().required(),
        vin_number: Joi.string().required(),
        policyCanceled: Joi.boolean().required(),
        appendix_number: Joi.string().required(),
        insuranceCompanyId: Joi.number().min(1).required(),
        ManufacturerId: Joi.number().min(1).required(),
        CarModelId: Joi.number().min(1).required(),
     })
})
