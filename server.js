const fs = require('fs');
const csv = require('csv-parser');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./db.sqlite', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the sqlite database.');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS Counts (
        name TEXT PRIMARY KEY,
        value INTEGER NOT NULL DEFAULT 0
    )`, (err) => {
        if (err) {
            console.error(err.message);
        }
    });

    db.run(`INSERT OR IGNORE INTO Counts (name, value) VALUES ('done', 0)`, (err) => {
        if (err) {
            console.error(err.message);
        }
    });
});



let issues = [];

fs.createReadStream('input/G3 - Defects (JIRA).csv')
    .pipe(csv())
    .on('data', (row) => {
        issues.push(row);
    })
    .on('end', () => {
        let statuses = ['In Progress - Vendor', 'In Progress', 'In QA', 'To Do', 'Prod Validation', 'On Hold'];
        console.log('CSV file successfully processed');
        console.log('Number of issues total: ' + issues.filter(issue => statuses.includes(issue['Status'])).length);

        statuses.forEach(status => {
            let count = issues.filter(issue => issue['Status'] === status).length;
            if (count > 0) {
                console.log(`Number of issues with status "${status}": ${count}`);
            }
        });

        let doneCount = issues.filter(issue => issue['Status'] === 'Done').length;

        let db = new sqlite3.Database('./db.sqlite', sqlite3.OPEN_READWRITE, (err) => {
            if (err) {
                console.error(err.message);
            }
        });

        db.get('SELECT value FROM Counts WHERE name="done"', (err, row) => {
            if (err) {
                console.error(err.message);
            } else {
                let lastDoneCount = row ? row.value : 0;
                console.log('Issues resolved since last report: ' + (doneCount - lastDoneCount));
            }
        });

        db.run('UPDATE Counts SET value = ? WHERE name="done"', doneCount, (err) => {
            if (err) {
                console.error(err.message);
            }
        });

        db.close();
    });