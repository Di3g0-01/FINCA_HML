async function run() {
  try {
    const loginRes = await fetch('http://localhost:3001/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'superuser',
        password: 'super123'
      })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) {
        console.error("LOGIN FAILED:", loginData);
        return;
    }
    const token = loginData.access_token;
    console.log("Logged in successfully. Token:", token.slice(0, 15) + "...");

    const res = await fetch('http://localhost:3001/animals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        identifier: "TEST_001",
        gender: "H",
        status: "VENDIDO",
        type: "VACA",
        origin: "HISTORICO"
      })
    });
    const text = await res.text();
    console.log("STATUS:", res.status);
    console.log("BODY:", text);
  } catch (err) {
    console.error("ERROR:", err.message);
  }
}

run();
