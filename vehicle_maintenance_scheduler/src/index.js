const express = require('express');
const dotenv = require('dotenv');
const logger = require('../../logging_middleware/index');
const { fetchDepots, fetchVehicles } = require('./services/fetchData');
const { scheduleTasks } = require('./services/scheduler');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON bodies
app.use(express.json());

// Mandatory Logging Middleware
app.use(logger);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Scheduling endpoint
app.post('/schedule', async (req, res) => {
    try {
        // Fetch data from external APIs
        const [depotsData, vehiclesData] = await Promise.all([
            fetchDepots(),
            fetchVehicles()
        ]);

        // Run scheduling algorithm
        const result = scheduleTasks(depotsData, vehiclesData);

        // Return scheduled data
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ 
            error: 'Failed to generate schedule', 
            details: error.message 
        });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Vehicle Maintenance Scheduler running on port ${PORT}`);
});
