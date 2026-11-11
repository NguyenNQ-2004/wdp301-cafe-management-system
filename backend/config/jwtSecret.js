const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');

const getJwtSecret = () => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production.');
  }

  const secretPath = path.join(__dirname, '..', '.jwt-secret');
  try {
    process.env.JWT_SECRET = fs.readFileSync(secretPath, 'utf8').trim();
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const generated = randomBytes(32).toString('hex');
    try {
      fs.writeFileSync(secretPath, generated, { flag: 'wx', mode: 0o600 });
      process.env.JWT_SECRET = generated;
    } catch (writeError) {
      if (writeError.code !== 'EEXIST') throw writeError;
      process.env.JWT_SECRET = fs.readFileSync(secretPath, 'utf8').trim();
    }
  }
  if (!process.env.JWT_SECRET) throw new Error('JWT secret is empty.');
  return process.env.JWT_SECRET;
};

module.exports = getJwtSecret;
