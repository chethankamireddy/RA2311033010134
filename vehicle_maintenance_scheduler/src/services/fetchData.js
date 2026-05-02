const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://20.207.122.201/evaluation-service';
let cachedToken = null;
let tokenExpiry = null;

const authenticate = async () => {
    // If token is cached and not expired, return it
    if (cachedToken && tokenExpiry && new Date() < tokenExpiry) {
        return cachedToken;
    }

    try {
        const response = await axios.post(`${API_BASE_URL}/login`, {
            clientID: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET
        });
        
        const data = response.data;
        cachedToken = data.accessToken;
        tokenExpiry = new Date(data.expiresAt);
        return cachedToken;
    } catch (error) {
        console.error('Authentication error (login endpoint):', error.message);
        if (error.response) {
            console.error('Server responded with:', error.response.status, error.response.data);
        }
        throw new Error('Failed to obtain authorization token');
    }
};

const fetchDepots = async () => {
    const token = await authenticate();
    try {
        const response = await axios.get(`${API_BASE_URL}/depots`, { 
            headers: { 'Authorization': `Bearer ${token}` } 
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching depots:', error.message);
        throw error;
    }
};

const fetchVehicles = async () => {
    const token = await authenticate();
    try {
        const response = await axios.get(`${API_BASE_URL}/vehicles`, { 
            headers: { 'Authorization': `Bearer ${token}` } 
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching vehicles:', error.message);
        throw error;
    }
};

module.exports = {
    fetchDepots,
    fetchVehicles
};
