// Request logger compliant with security rule: "No patient data in application logs"
function requestLogger(req, res, next) {
  const start = Date.now();
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const requestPath = req.originalUrl || req.path || '/';
    
    // Only log metadata: method, path, status, and duration
    // Strictly NO req.body or query containing patient details
    console.log(`[HTTP] ${req.method} ${requestPath} ${statusCode} - ${duration}ms - IP: ${clientIp}`);
  });

  next();
}

module.exports = requestLogger;
