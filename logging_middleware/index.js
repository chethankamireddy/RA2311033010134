const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://20.207.122.201/evaluation-service';

const pushLog = async (logPayload) => {
    try {
        await axios.post(`${API_BASE_URL}/log`, logPayload);
    } catch (error) {
        console.error('Failed to push log to server:', error.message);
    }
};

const logger = (req, res, next) => {
    // Determine package context based on URL or logic
    let logPackage = 'route';
    if (req.originalUrl.includes('/schedule')) {
        logPackage = 'handler';
    }

    const start = Date.now();
    
    // To capture response body
    const originalJson = res.json;
    const originalSend = res.send;
    
    let responseBody;
    
    res.json = function (body) {
        responseBody = body;
        return originalJson.call(this, body);
    };

    res.send = function (body) {
        responseBody = body;
        return originalSend.call(this, body);
    };

    res.on('finish', () => {
        const duration = Date.now() - start;
        
        let level = 'info';
        if (res.statusCode >= 400 && res.statusCode < 500) level = 'warn';
        if (res.statusCode >= 500) level = 'error';

        const message = `[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`;

        const logEntry = {
            stack: "backend",
            level: level,
            package: logPackage,
            message: message
        };

        // Output locally
        console.log(JSON.stringify({ ...logEntry, details: { reqBody: req.body, resBody: responseBody } }));

        // Push to external logging service
        pushLog(logEntry);
    });

    next();
};

module.exports = logger;
