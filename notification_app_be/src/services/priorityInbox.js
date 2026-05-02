const getPriorityInbox = (notifications, limit = 10) => {
    const weights = {
        'Placement': 300,
        'Result': 200,
        'Event': 100
    };

    // Calculate a score for each notification combining weight and recency
    const scoredNotifications = notifications.map(notif => {
        const baseWeight = weights[notif.Type] || 0;
        
        // Convert timestamp to a numeric value (e.g. milliseconds)
        // A newer notification will have a higher timestamp value.
        // We normalize the timestamp so it acts as a tie-breaker or recency booster.
        const timeValue = new Date(notif.Timestamp).getTime();
        
        // We can just sort by Base Weight first, then by Time Value descending.
        // Alternatively, we can calculate a combined score. 
        // Here we use primary/secondary sorting strategy for reliable weighting.
        return {
            ...notif,
            baseWeight,
            timeValue
        };
    });

    // Sort: Primary by weight (desc), Secondary by time (desc)
    scoredNotifications.sort((a, b) => {
        if (b.baseWeight !== a.baseWeight) {
            return b.baseWeight - a.baseWeight;
        }
        return b.timeValue - a.timeValue;
    });

    // Return top 'limit' notifications without the extra sorting properties
    return scoredNotifications.slice(0, limit).map(({ baseWeight, timeValue, ...rest }) => rest);
};

module.exports = { getPriorityInbox };
