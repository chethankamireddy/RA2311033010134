const scheduleTasks = (depotsData, vehiclesData) => {
    // Check if the APIs return objects wrapping arrays, e.g. { depots: [...] } or just arrays
    const depots = Array.isArray(depotsData) ? depotsData : (depotsData.depots || []);
    let vehicles = Array.isArray(vehiclesData) ? vehiclesData : (vehiclesData.vehicles || []);

    // Clone depots to keep track of remaining hours
    const remainingDepots = depots.map(depot => ({
        ...depot,
        assignedTasks: [],
        remainingHours: depot.MechanicHours
    }));

    // Sort vehicles by Impact-to-Duration ratio descending (Greedy approach for MKP)
    // If ratios are equal, prefer the one with higher Impact
    vehicles.sort((a, b) => {
        const ratioA = a.Impact / a.Duration;
        const ratioB = b.Impact / b.Duration;
        if (ratioB !== ratioA) {
            return ratioB - ratioA;
        }
        return b.Impact - a.Impact;
    });

    let totalImpact = 0;

    for (const vehicle of vehicles) {
        // Find a depot that can accommodate this vehicle
        // We could also sort depots by remainingHours ascending to pack tightly
        remainingDepots.sort((a, b) => a.remainingHours - b.remainingHours);
        
        let assigned = false;
        for (const depot of remainingDepots) {
            if (depot.remainingHours >= vehicle.Duration) {
                depot.assignedTasks.push(vehicle.TaskID);
                depot.remainingHours -= vehicle.Duration;
                totalImpact += vehicle.Impact;
                assigned = true;
                break;
            }
        }
    }

    // Format the response
    const schedule = remainingDepots.map(depot => ({
        depotID: depot.ID,
        assignedTasks: depot.assignedTasks,
        remainingHours: depot.remainingHours
    }));

    return {
        schedule,
        totalImpact,
        totalScheduledTasks: schedule.reduce((sum, d) => sum + d.assignedTasks.length, 0)
    };
};

module.exports = { scheduleTasks };
