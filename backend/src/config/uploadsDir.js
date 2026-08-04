const path = require('path');

function getUploadsDir() {
  return process.env.UPLOADS_DIR || path.join(__dirname, '..', '..', 'uploads');
}

module.exports = { getUploadsDir };
