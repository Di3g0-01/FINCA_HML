const mysql = require('mysql2/promise');

async function checkRequests() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'finca_hml'
    });

    const [rows] = await connection.execute('SELECT * FROM requests ORDER BY created_at DESC LIMIT 5');
    console.log('--- RECENT REQUESTS ---');
    console.log(JSON.stringify(rows, null, 2));

    const [animals] = await connection.execute('SELECT * FROM animals ORDER BY created_at DESC LIMIT 5');
    console.log('--- RECENT ANIMALS ---');
    console.log(JSON.stringify(animals, null, 2));

    await connection.end();
  } catch (e) {
    console.error(e);
  }
}

checkRequests();
