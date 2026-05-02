# Notification System Design

## Stage 2: Storage & Schema
**Suggested Persistent Storage:** PostgreSQL
**Justification:** PostgreSQL is a robust, ACID-compliant relational database. Given that notifications have structured properties (Type, Message, Timestamp, isRead, studentID) and require complex queries (e.g., sorting by recency and filtering by read status), a relational database is ideal. PostgreSQL also supports advanced indexing techniques which are necessary for the scale mentioned in the subsequent stages.

### Database Schema
```sql
CREATE TABLE Users (
    studentID SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE Notifications (
    notificationID UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studentID INT REFERENCES Users(studentID) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'Placement', 'Result', 'Event'
    message TEXT NOT NULL,
    isRead BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Scalability Issues & Solutions
- **Issue:** As the Notifications table grows (millions of rows), read/write performance will degrade.
- **Solution:** Table partitioning (e.g., partitioning by `createdAt` per month). Archiving old, read notifications to cold storage (e.g., S3) to keep the active database small.

---

## Stage 3: Optimization
**Scenario:** 50,000 students, 5,000,000 notifications.
**Slow Query:** `SELECT * FROM notifications WHERE studentID = 1042 AND isRead = false ORDER BY createdAt DESC;`

### Indexing Strategy
We should **not** index every column, as excessive indexing slows down `INSERT` operations (which are frequent for notifications) and consumes memory. 
To optimize the specific slow query, we need a **Composite Index**.

```sql
CREATE INDEX idx_student_unread_recent ON Notifications(studentID, isRead, createdAt DESC);
```
**Why this works:** The query filters on `studentID` and `isRead`, and then sorts by `createdAt`. A composite index covering exactly these three fields allows the database engine to find the relevant rows already sorted, bypassing a costly sequential scan and in-memory sort.

### Recent Placement Notifications Query
Write a query for placement notifications in the last 7 days:
```sql
SELECT * FROM Notifications 
WHERE type = 'Placement' 
  AND createdAt >= NOW() - INTERVAL '7 days'
ORDER BY createdAt DESC;
```
*(An index on `(type, createdAt DESC)` would optimize this query).*

---

## Stage 4: Performance
**Scenario:** The database gets overwhelmed during peak times due to excessive page loads polling for unread notifications.

### Caching Solution
Implement a distributed in-memory cache like **Redis**.
1. **Unread Count Cache:** Instead of querying the DB for the unread count on every page load, store an integer in Redis (`user:{studentID}:unread_count`).
2. **Cache Invalidation:** When a new notification is inserted into the DB, increment the Redis counter. When a user marks notifications as read, decrement it.
3. **Trade-offs:** 
   - *Pros:* Drastically reduces database read load, sub-millisecond response times.
   - *Cons:* Stale data risk (cache invalidation is notoriously difficult), requires managing additional infrastructure (Redis cluster).

---

## Stage 5: Mass Notifications
**Scenario:** HR clicks "Notify All" for 50,000 students.

### Pseudocode Analysis
A synchronous loop iterating 50,000 times will likely timeout the HTTP request and block the main execution thread, causing the application to crash or become unresponsive to other users.

### Optimized Architecture (Message Broker + Workers)
Instead of processing synchronously, we should decouple the notification generation from the HTTP request.

1. HR clicks "Notify All".
2. The server instantly acknowledges the request (HTTP 202 Accepted) and pushes a single "Mass Notification Event" payload into a message broker (e.g., **RabbitMQ** or **Kafka**).
3. Background worker services consume this event.
4. The workers query the DB for the list of 50,000 students in paginated chunks (e.g., 5,000 at a time).
5. The workers perform a **Bulk Insert** into the `Notifications` table (inserting thousands of rows in a single DB transaction) rather than 50,000 individual inserts.
6. The workers increment the Redis unread cache for the affected students.
