// Built-in Node.js modules
let fs = require('fs');
let path = require('path');

// NPM modules
let express = require('express');
let sqlite3 = require('sqlite3')

let db_filename = path.join(__dirname, 'db', 'stpaul_crime.sqlite3');

let app = express();
let port = 8000;

app.use(express.json());

// Open SQLite3 database (in read-only mode)
let db = new sqlite3.Database(db_filename, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.log('Error opening ' + path.basename(db_filename));
    }
    else {
        console.log('Now connected to ' + path.basename(db_filename));
    }
});


// GET request handler for crime codes
app.get('/codes', (req, res) => {
    console.log(req.query);

    let query = "SELECT Codes.code, Codes.incident_type AS type FROM Codes";
    let params = [];
    let clause = "WHERE";
    if (req.query.hasOwnProperty("code")) {
        query = query + " " + clause + " Codes.code IN (";
        let commaCheck = req.query.code.split(",");
        if (commaCheck.length >= 1) {
            const placeholders = commaCheck.map(() => "?").join(",");
            query = query + placeholders + ", ";
            params.push(commaCheck);
        }
        query = query + commaCheck + ") ORDER BY code";
    }

    databaseSelect(query, params)
    .then((data) => {
        res.status(200).type("json").send(data);
    })
    .catch((err) => {
        console.log(err);
    })
});

// GET request handler for neighborhoods
app.get('/neighborhoods', (req, res) => {
    console.log(req.query);

    let query = 'SELECT Neighborhoods.neighborhood_number AS id, Neighborhoods.neighborhood_name AS name FROM Neighborhoods';
    let params = [];
    let clause = 'WHERE';

    //This commented-out section works, trying to do this a better way...
    /*
    if(req.query.hasOwnProperty('id')){ //jerry-rigged solution..
        query = query + ' ' + clause + ' id IN ('; //put ? back and push the array as a string with just ints and commas. 
        let commaCheck = req.query.id.split(',');
        let id;
        if(commaCheck.length > 1){
            let i;
            for(i = 0; i <= commaCheck.length - 1; i++){
                query = query + commaCheck[i]; //Should we force throw an error if user enters an invalid id..?? 
                //params.push(parseInt(commaCheck[i])); //struggled pushing the list of ints so went another route.
                if(i !== commaCheck.length - 1){ //don't add comma if last item
                    query = query + ', ';
                } else{
                    query = query + ') ORDER BY id';
                }
            }
        }
    }
    */

    if (req.query.hasOwnProperty('id')) {
        query = query + ' ' + clause + ' id IN (';
        let commaCheck = req.query.id.split(',');
        if (commaCheck.length >= 1) {
            const placeholders = commaCheck.map(() => "?").join(",");
            query = query + placeholders + ', ';
            params.push(commaCheck);
        }
        query = query + commaCheck + ') ORDER BY id';
    }

    databaseSelect(query, params)
    .then((data) => {
        res.status(200).type("json").send(data);
    })
    .catch((err) => {
        console.log(err);
    });
});

// GET request handler for crime incidents
app.get('/incidents', (req, res) => {
    //Return JSON object with list of crime incidents (ordered by date/time). Note date and time should be separate fields.
    //Filter for start_date and end_date
    //Filter for code from comma separated list
    //Filter for police grid numbers from comma separated list
    //Filter for neighborhood id number from comma separated list
    //Filter for limit number for max number of incidents to include in returned json

    let query = 'SELECT case_number, SUBSTRING(date_time, 1, 10) AS date, SUBSTRING(date_time, 12, 19) AS time, code, incident, police_grid, neighborhood_number, block FROM Incidents'; //'SELECT * FROM Incidents'
    let params = []; //do we want params out here or individual ones for the properties..?? Or might not need this at all...

    if (req.query.hasOwnProperty('start_date')) { //DATE/TIME NEED TO BE SEPARATED 
        let params = [];
        let clause = 'WHERE';
        if(query.includes(clause)){ 
            clause = 'AND';
        }
        query = query + ' ' + clause + ' date >= '; //check this comparison
        let startDate = req.query.start_date;
        params.push(req.query.start_date);
        query = query + startDate;

    }

    if (req.query.hasOwnProperty('end_date')) {
        let params = [];
        let clause = 'WHERE';
        if(query.includes(clause)){ 
            clause = 'AND';
        }
        query = query + ' ' + clause + ' date <= '; //check this comparison
        let endDate = req.query.end_date;
        params.push(req.query.end_date);
        query = query + endDate;

    }

    if (req.query.hasOwnProperty('code')) { //ADD SUPPORT FOR COMMAS
        let params = [];
        let clause = 'WHERE';
        if(query.includes(clause)){ 
            clause = 'AND';
        }
        query = query + ' ' + clause + ' Incidents.code = ';
        let code = req.query.code;
        params.push(req.query.code);
        query = query + code;

    }

    if (req.query.hasOwnProperty('grid')) { 
        let params = [];
        let clause = 'WHERE';
        if(query.includes(clause)){ 
            clause = 'AND';
        }
        query = query + ' ' + clause + ' Incidents.police_grid IN ('; 
        let grid = req.query.grid.split(',');
        if(grid.length >= 1){
            const placeholders = grid.map(() => "?").join(",");
            query = query + placeholders + ', ';
            params.push(grid);
        }
        query = query + grid + ')';
    }

    if (req.query.hasOwnProperty('neighborhood')) {
        let params = [];
        let clause = 'WHERE';
        if(query.includes(clause)){ 
            clause = 'AND';
        }
        query = query + ' ' + clause + ' Incidents.neighborhood_number IN (';
        let commaCheck = req.query.neighborhood.split(',');
        if (commaCheck.length >= 1) {
            const placeholders = commaCheck.map(() => "?").join(",");
            query = query + placeholders + ', ';
            params.push(commaCheck);
        }
        query = query + commaCheck + ')';
    }

    query = query + ' ORDER BY date, time'; //Adds ORDER BY clause before LIMIT clause.

    if (req.query.hasOwnProperty('limit')) {
        let params = [];
        query = query + ' LIMIT ';
        let limit = req.query.limit;
        params.push(limit);
        query = query + limit;
    } else{ //by default the limit should be 1000
        query = query + ' LIMIT 1000';
    }


    databaseSelect(query, params)
    .then((data) => {
        res.status(200).type("json").send(data);
    })
    .catch((err) => {
        console.log(err);
    });
});

// PUT request handler for new crime incident
app.put('/new-incident', (req, res) => {
    console.log(req.body); // uploaded data
    //Upload incident data to be inserted into the SQLite3 database
    //Data fields: case_number, date, time, code, incident, police_grid, neighborhood_number, block
    //Note: response should reject (status 500) if the case number already exists in the database

    res.status(200).type('txt').send('OK'); // <-- you may need to change this
});

// DELETE request handler for new crime incident
app.delete('/remove-incident', (req, res) => {
    let case_number = req.body.case_number;
    console.log(case_number);

    let query = "SELECT * FROM Incidents WHERE case_number = ?";
    let queryDelete = "DELETE FROM Incidents WHERE case_number = ?";
    let params = [];
    params.push(case_number);

    databaseSelect(query, params)
    .then((data) => {
        if(data.length === 0) {
            res.status(500).type("text").send("Case number not exist");
            return false;
        } else {
            return databaseRun(queryDelete, params);
        }
    })
    .then((data) => {
        if(data !== false) {
            res.status(200).type("text").send("Case number has been delete");
        }
    })
    .then((err) => {
        console.log(err);
    })
});


// Create Promise for SQLite3 database SELECT query 
function databaseSelect(query, params) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(rows);
            }
        })
    })
}

// Create Promise for SQLite3 database INSERT or DELETE query
function databaseRun(query, params) {
    return new Promise((resolve, reject) => {
        db.run(query, params, (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    })
}


// Start server - listen for client connections
app.listen(port, () => {
    console.log('Now listening on port ' + port);
});

