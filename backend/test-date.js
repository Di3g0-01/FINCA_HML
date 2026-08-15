const { Client } = require('pg');
const client = new Client({ user: 'admin', password: 'admin_password', host: 'localhost', database: 'finca_hml' });
client.connect().then(async () => {
  try {
    await client.query("INSERT INTO external_expenses (id, category, description, amount, date) VALUES (gen_random_uuid(), 'Test', 'Test', 10.0, '2026-08-07')");
    const res = await client.query('SELECT date FROM external_expenses LIMIT 1');
    console.log('Value:', res.rows[0].date);
    console.log('ISOString:', res.rows[0].date.toISOString());
  } catch (e) {
    console.error(e.message);
  }
  process.exit();
}).catch(e => { console.error(e.message); process.exit(); });
