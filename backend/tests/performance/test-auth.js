const jwt = require('jsonwebtoken');
const token = jwt.sign({ sub: 1, email: 'admin@finca.com', role: 'admin' }, 'local_dev_secret_key', { expiresIn: '1h' });
fetch('http://localhost:3001/animals', {
  headers: { Authorization: `Bearer ${token}` }
})
.then(async r => {
    const text = await r.text();
    console.log({status: r.status, body: text});
})
.catch(console.error);
