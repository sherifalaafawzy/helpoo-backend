const Joi = require('joi')
exports.EditClientValidation = Joi.object().keys({
    identifier : Joi.string().required().length(11).pattern(/^[0-9]+$/),
    PhoneNumber : Joi.string().required().length(11).pattern(/^[0-9]+$/),
    password: Joi.string().min(4).required().regex(/^[a-zA-Z0-9_][a-zA-Z0-9_.]*/),
    email: Joi.string().email().required(),
    blocked: Joi.boolean().default(false).required(),
    name: Joi.string().required(),
    promocode: Joi.string().required(),
})

