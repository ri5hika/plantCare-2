const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors()); // Enable CORS for all origins (for development)
app.use(express.json()); // Enable JSON body parsing

// Connect to SQLite database
const db = new sqlite3.Database('./plantcare.db', (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // Create plants table if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS plants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            species TEXT,
            lastWatered TEXT NOT NULL,
            wateringFrequency INTEGER NOT NULL,
            lightPref TEXT,
            notes TEXT,
            imageUrl TEXT,
            nextWatering TEXT
        )`, (err) => {
            if (err) {
                console.error('Error creating table:', err.message);
            } else {
                console.log('Plants table created or already exists.');
                // Optional: Insert some dummy data if the table is empty
                db.get("SELECT COUNT(*) AS count FROM plants", (err, row) => {
                    if (err) {
                        console.error("Error checking plant count:", err.message);
                        return;
                    }
                    if (row.count === 0) {
                        console.log("Inserting dummy data...");
                        db.run(`INSERT INTO plants (name, species, lastWatered, wateringFrequency, lightPref, notes, imageUrl, nextWatering) VALUES
                            ('Pothos', 'Epipremnum aureum', '2023-10-20', 7, 'bright-indirect', 'Easy to care for, loves humidity.', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Golden_Pothos_plant_in_a_pot.jpg/800px-Golden_Pothos_plant_in_a_pot.jpg', '2023-10-27'),
                            ('Fiddle Leaf Fig', 'Ficus lyrata', '2023-10-15', 10, 'bright-indirect', 'Needs consistent watering, avoid drafts.', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Fiddle_Leaf_Fig_%28Ficus_lyrata%29_-_Botanical_Garden%2C_Singapore_-_2015-08-04.jpg/800px-Fiddle_Leaf_Fig_%28Ficus_lyrata%29_-_Botanical_Garden%2C_Singapore_-_2015-08-04.jpg', '2023-10-25'),
                            ('Snake Plant', 'Sansevieria trifasciata', '2023-10-01', 14, 'low-light', 'Very forgiving, tolerates neglect.', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Sansevieria_trifasciata_%27Laurentii%27_on_display_at_the_Conservatory_of_Flowers.jpg/800px-Sansevieria_trifasciata_%28Laurentii%29_on_display_at_the_Conservatory_of_Flowers.jpg', '2023-10-15')
                        `, (err) => {
                            if (err) {
                                console.error("Error inserting dummy data:", err.message);
                            } else {
                                console.log("Dummy data inserted.");
                            }
                        });
                    }
                });
            }
        });
    }
});

// API Endpoints

// Get all plants
app.get('/plants', (req, res) => {
    db.all('SELECT * FROM plants', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get a single plant by ID (optional, but good for robust API)
app.get('/plants/:id', (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM plants WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (row) {
            res.json(row);
        } else {
            res.status(404).json({ message: 'Plant not found' });
        }
    });
});

// Add a new plant
app.post('/plants', (req, res) => {
    const { name, species, lastWatered, wateringFrequency, lightPref, notes, imageUrl } = req.body;

    if (!name || !lastWatered || !wateringFrequency) {
        return res.status(400).json({ error: 'Name, lastWatered, and wateringFrequency are required.' });
    }

    // Calculate initial nextWatering date
    const lastWateredDate = new Date(lastWatered);
    lastWateredDate.setDate(lastWateredDate.getDate() + wateringFrequency);
    const nextWatering = lastWateredDate.toISOString().split('T')[0]; // Format to YYYY-MM-DD

    db.run(`INSERT INTO plants (name, species, lastWatered, wateringFrequency, lightPref, notes, imageUrl, nextWatering) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, species, lastWatered, wateringFrequency, lightPref, notes, imageUrl, nextWatering],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.status(201).json({ id: this.lastID, ...req.body, nextWatering });
        });
});

// Update a plant (e.g., update watering date, notes)
app.put('/plants/:id', (req, res) => {
    const { id } = req.params;
    const { name, species, lastWatered, wateringFrequency, lightPref, notes, imageUrl, nextWatering } = req.body;

    db.run(`UPDATE plants SET
        name = COALESCE(?, name),
        species = COALESCE(?, species),
        lastWatered = COALESCE(?, lastWatered),
        wateringFrequency = COALESCE(?, wateringFrequency),
        lightPref = COALESCE(?, lightPref),
        notes = COALESCE(?, notes),
        imageUrl = COALESCE(?, imageUrl),
        nextWatering = COALESCE(?, nextWatering)
        WHERE id = ?`,
        [name, species, lastWatered, wateringFrequency, lightPref, notes, imageUrl, nextWatering, id],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ message: 'Plant not found' });
            } else {
                res.json({ message: 'Plant updated successfully' });
            }
        });
});

// Update only the nextWatering reminder for a plant
app.put('/plants/:id/reminder', (req, res) => {
    const { id } = req.params;
    const { nextWatering } = req.body;

    if (!nextWatering) {
        return res.status(400).json({ error: 'nextWatering date is required.' });
    }

    db.run(`UPDATE plants SET nextWatering = ? WHERE id = ?`,
        [nextWatering, id],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ message: 'Plant not found' });
            } else {
                res.json({ message: 'Reminder updated successfully', nextWatering });
            }
        });
});

// Delete a plant
app.delete('/plants/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM plants WHERE id = ?', id, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ message: 'Plant not found' });
        } else {
            res.json({ message: 'Plant deleted successfully' });
        }
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
