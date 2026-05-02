const express = require('express');
const dotenv = require('dotenv');
const logger = require('../../logging_middleware/index');
const { fetchNotifications } = require('./services/fetchData');
const { getPriorityInbox } = require('./services/priorityInbox');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Mandatory Logging Middleware
app.use(logger);

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Priority Inbox endpoint (returns top N unread notifications)
app.get('/priority-inbox', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 10;
        
        // Fetch raw notifications from external API
        const notifications = await fetchNotifications();

        // Pass through priority logic
        const topNotifications = getPriorityInbox(notifications, limit);

        res.status(200).json({
            count: topNotifications.length,
            priorityInbox: topNotifications
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Failed to generate priority inbox', 
            details: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Notification Backend running on port ${PORT}`);
});
