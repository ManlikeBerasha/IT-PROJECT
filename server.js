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
        category TEXT NOT NULL,
        date_created TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS mental_wellness (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mood_rating INTEGER,
        meditation_minutes INTEGER,
        sleep_hours REAL,
        notes TEXT,
        entry_date TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS intellectual_wellness (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        learning_goal TEXT,
        reading_time INTEGER,
        current_book TEXT,
        progress_percentage INTEGER DEFAULT 0,
        entry_date TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        monthly_budget REAL NOT NULL,
        date_created TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    
    console.log('All tables created or already exist.');
});

// API Routes

// Financial Wellness Routes
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

app.get('/api/expenses', (req, res) => {
    db.all(`SELECT * FROM expenses ORDER BY date_created DESC`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.post('/api/budget', (req, res) => {
    const { monthly_budget } = req.body;
    if (!monthly_budget) {
        return res.status(400).json({ error: 'Monthly budget is required' });
    }
    db.run(`INSERT INTO budgets (monthly_budget) VALUES (?)`,
        [monthly_budget],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ id: this.lastID, monthly_budget });
        }
    );
});

app.get('/api/budget/latest', (req, res) => {
    db.get(`SELECT * FROM budgets ORDER BY date_created DESC LIMIT 1`, [], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(row || { monthly_budget: 0 });
    });
});

// Mental Wellness Routes
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

app.get('/api/mental-wellness-entries', (req, res) => {
    db.all(`SELECT * FROM mental_wellness ORDER BY entry_date DESC`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Intellectual Wellness Routes
app.post('/api/intellectual-wellness-entries', (req, res) => {
    const { learning_goal, reading_time, current_book, progress_percentage } = req.body;
    db.run(`INSERT INTO intellectual_wellness (learning_goal, reading_time, current_book, progress_percentage) VALUES (?, ?, ?, ?)`,
        [learning_goal, reading_time, current_book, progress_percentage || 0],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ id: this.lastID, learning_goal, reading_time, current_book, progress_percentage });
        }
    );
});

app.get('/api/intellectual-wellness-entries', (req, res) => {
    db.all(`SELECT * FROM intellectual_wellness ORDER BY entry_date DESC`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Dashboard Stats
app.get('/api/dashboard-stats', (req, res) => {
    const stats = {};
    
    // Get financial health score
    db.get(`SELECT SUM(amount) as total_expenses FROM expenses WHERE date(date_created) = date('now')`, [], (err, expenseRow) => {
        db.get(`SELECT monthly_budget FROM budgets ORDER BY date_created DESC LIMIT 1`, [], (err, budgetRow) => {
            const dailyBudget = budgetRow ? budgetRow.monthly_budget / 30 : 100;
            const todayExpenses = expenseRow ? expenseRow.total_expenses || 0 : 0;
            const financialScore = Math.max(0, Math.min(100, 100 - (todayExpenses / dailyBudget * 100)));
            
            // Get mental health score
            db.get(`SELECT AVG(mood_rating) as avg_mood FROM mental_wellness WHERE date(entry_date) >= date('now', '-7 days')`, [], (err, mentalRow) => {
                const mentalScore = mentalRow && mentalRow.avg_mood ? (mentalRow.avg_mood * 20) : 75;
                
                // Get intellectual score
                db.get(`SELECT AVG(progress_percentage) as avg_progress FROM intellectual_wellness WHERE date(entry_date) >= date('now', '-7 days')`, [], (err, intellectualRow) => {
                    const intellectualScore = intellectualRow && intellectualRow.avg_progress ? intellectualRow.avg_progress : 70;
                    
                    const overallScore = Math.round((financialScore + mentalScore + intellectualScore) / 3);
                    
                    res.json({
                        financial: Math.round(financialScore),
                        mental: Math.round(mentalScore),
                        intellectual: Math.round(intellectualScore),
                        overall: overallScore
                    });
                });
            });
        });
    });
});

// Serve static files
app.use(express.static('.'));

app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});


