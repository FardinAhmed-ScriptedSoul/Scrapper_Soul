/**
 * Global Query Validation Middleware
 * Ensures required scraping search fields exist before spawning background worker threads.
 */
const validateScraperQuery = (requiredParams) => {
  return (req, res, next) => {
    const missingParams = [];

    requiredParams.forEach((param) => {
      if (!req.query[param] || req.query[param].trim() === '') {
        missingParams.push(param);
      }
    });

    if (missingParams.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Validation Failed. Missing required query parameter(s): ${missingParams.join(', ')}`
      });
    }

    next();
  };
};

module.exports = { validateScraperQuery };