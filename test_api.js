const axios = require('axios');
async function test() {
  try {
    // Attempt to login to get staff token
    const loginRes = await axios.post('http://localhost:3001/api/v1/auth/login', {
      phone: '0900000002', // staff phone from query_users.js
      password: 'password123'
    });
    const token = loginRes.data.data.access_token;
    
    // Now call listReservations
    const res = await axios.get('http://localhost:3001/api/v1/reservations?table_id=783bef6f-1a5e-46b9-a452-3f4e4fd0da39', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('API Response:', res.data);
  } catch (err) {
    console.error('API Error:', err.response ? err.response.data : err.message);
  }
}
test();
