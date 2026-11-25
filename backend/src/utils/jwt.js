const jwt = require('jsonwebtoken');
const config = require('../config/env');

function signToken(payload) {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (err) {
    throw new Error('Invalid or expired authentication token');
  }
}

module.exports = {
  signToken,
  verifyToken,
};

