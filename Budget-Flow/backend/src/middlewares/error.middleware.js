function notFound(req, res) {
  res.status(404).json({ message: "Route not found" });
}

function errorHandler(error, req, res, next) {
  // eslint-disable-line no-unused-vars
  console.error(error);

  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    message: error.message || "Server error"
  });
}

module.exports = {
  notFound,
  errorHandler
};

