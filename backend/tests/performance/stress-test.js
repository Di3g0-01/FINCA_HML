const autocannon = require('autocannon');
const jwt = require('jsonwebtoken');

const token = jwt.sign({ sub: 1, email: 'admin@finca.com', role: 'admin' }, 'super-secret-key-finca-hml-2026', { expiresIn: '1h' });

const runStressTest = () => {
  const connectionSteps = [50, 150, 300];
  let currentStep = 0;

  const runNextStep = () => {
    if (currentStep >= connectionSteps.length) {
      console.log('Stress test completed.');
      return;
    }

    const connections = connectionSteps[currentStep];
    console.log(`\n--- Running Stress Test with ${connections} connections ---`);

    const instance = autocannon({
      url: 'http://localhost:3001',
      connections: connections,
      duration: 15,
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
        console.error('Error:', err);
      } else {
        console.log(`Resultados para ${connections} conexiones:`);
        console.log(`Requests/sec: ${result.requests.average}`);
        console.log(`Latency p99: ${result.latency.p99} ms`);
        console.log(`Errors (Non-2xx): ${result.non2xx}`);
        currentStep++;
        runNextStep();
      }
    });

    autocannon.track(instance, { renderProgressBar: true });
  };

  runNextStep();
};

runStressTest();
