const { DataSource } = require('typeorm');
const path = require('path');

const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'admin',
  password: 'admin_password',
  database: 'finca_hml',
  synchronize: false,
});

AppDataSource.initialize().then(async () => {
  const result = await AppDataSource.query('SELECT date FROM external_expenses LIMIT 1');
  console.log('Raw DB result:', result);
  process.exit();
}).catch(console.error);
