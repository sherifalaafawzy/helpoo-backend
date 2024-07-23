module.exports = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    res.status(422).json({ error: error.details[0].message });
  } else {
    next();
  }
};
