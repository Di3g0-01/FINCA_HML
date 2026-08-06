const autocannon = require('autocannon');
const jwt = require('jsonwebtoken');

// Generate valid token to bypass 401 Unauthorized
const token = jwt.sign({ sub: 1, email: 'admin@finca.com', role: 'admin' }, 'super-secret-key-finca-hml-2026', { expiresIn: '1h' });

const runLoadTest = () => {
  const instance = autocannon({
    url: 'http://localhost:3001',
    connections: 100, // 100 concurrent users
    duration: 15,     // 15 seconds per test
    requests: [
      {
        method: 'GET',
        path: '/animals?page=1&limit=20&status=ACTIVO',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    ]
  }, (err, result) => {
    if (err) {
      console.error('Error running load test:', err);
    } else {
      console.log('--- Resultados Load Test (Animals GET) ---');
      console.log(`Requests/sec: ${result.requests.average}`);
      console.log(`Latency p99: ${result.latency.p99} ms`);
      console.log(`Errors (Non-2xx): ${result.non2xx}`);
      console.log('------------------------------------------');
    }
  });

  autocannon.track(instance, { renderProgressBar: true });
};

runLoadTest();
