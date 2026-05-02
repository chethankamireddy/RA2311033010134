const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://20.207.122.201/evaluation-service';
let cachedToken = null;
let tokenExpiry = null;

const authenticate = async () => {
    if (cachedToken && tokenExpiry && new Date() < tokenExpiry) return cachedToken;

    try {
        const response = await axios.post(`${API_BASE_URL}/login`, {
            clientID: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET
        });
        
        cachedToken = response.data.accessToken;
        tokenExpiry = new Date(response.data.expiresAt);
        return cachedToken;
    } catch (error) {
        console.error('Authentication error (login):', error.message);
        throw new Error('Failed to obtain authorization token');
    }
};

const fetchNotifications = async () => {
    const token = await authenticate();
    try {
        const response = await axios.get(`${API_BASE_URL}/notifications`, { 
            headers: { 'Authorization': `Bearer ${token}` } 
        });
        // Handle if response is an array or an object containing an array
        return Array.isArray(response.data) ? response.data : (response.data.notifications || []);
    } catch (error) {
        console.error('Error fetching notifications:', error.message);
        throw error;
    }
};

module.exports = { fetchNotifications };
