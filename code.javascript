const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3000;

// Middleware to parse JSON requests
app.use(express.json());

// Connect to SQLite database
const db = new sqlite3.Database('./wellness.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the wellness database.');
});

// Create tables if they don't exist
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS mental_wellness (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mood_rating INTEGER,
        meditation_minutes INTEGER,
        sleep_hours REAL,
        notes TEXT,
        entry_date TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('Tables created or already exist.');
});

// API Routes

// Add Expense
app.post('/api/expenses', (req, res) => {
    const { title, amount, category } = req.body;
    if (!title || !amount || !category) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    db.run(`INSERT INTO expenses (title, amount, category) VALUES (?, ?, ?)`,
        [title, amount, category],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ id: this.lastID, title, amount, category });
        }
    );
});

// Get all Expenses
app.get('/api/expenses', (req, res) => {
    db.all(`SELECT * FROM expenses`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Save Mental Wellness Entry
app.post('/api/mental-wellness-entries', (req, res) => {
    const { mood_rating, meditation_minutes, sleep_hours, notes } = req.body;
    db.run(`INSERT INTO mental_wellness (mood_rating, meditation_minutes, sleep_hours, notes) VALUES (?, ?, ?, ?)`,
        [mood_rating, meditation_minutes, sleep_hours, notes],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ id: this.lastID, mood_rating, meditation_minutes, sleep_hours, notes });
        }
    );
});

// Serve static frontend files (if your frontend is in a 'public' folder)
// app.use(express.static('public'));

app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});
