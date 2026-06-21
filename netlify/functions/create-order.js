// netlify/functions/create-order.js
// Creates a Razorpay "order" server-side before checkout opens. This is
// required for proper payment verification — Razorpay's signature check
// (in verify-payment.js) only works against an order_id that was created
// through their API using your secret key, not one made up client-side.

const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server missing RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET environment variables' }),
    };
  }

  const payload = JSON.stringify({
    amount: 4900, // ₹49.00 in paise
    currency: 'INR',
    receipt: 'docuchat_' + Date.now(),
  });

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.razorpay.com',
      path: '/v1/orders',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const order = JSON.parse(data);
          resolve({
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: order.id, amount: order.amount, currency: order.currency }),
          });
        } catch (e) {
          resolve({ statusCode: 500, body: JSON.stringify({ error: 'Could not parse Razorpay response' }) });
        }
      });
    });

    req.on('error', (e) => resolve({ statusCode: 500, body: JSON.stringify({ error: e.message }) }));
    req.write(payload);
    req.end();
  });
};
