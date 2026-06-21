// netlify/functions/verify-payment.js
// Verifies a Razorpay payment signature server-side. Without this, a user
// could open the browser console and just run setPlan('pro') to get Pro
// access for free — client-side state alone is never trustworthy for paid
// features. This function re-derives the expected signature using your
// secret key (which only lives on the server, never in browser code) and
// confirms it matches what Razorpay sent back.
//
// Wire-up note: call this from startCheckout()'s `handler` callback, passing
// response.razorpay_payment_id, response.razorpay_order_id, and
// response.razorpay_signature, and only call setPlan('pro') if this returns
// { valid: true }.

const crypto = require('crypto');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = JSON.parse(event.body || '{}');

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return { statusCode: 400, body: JSON.stringify({ valid: false, error: 'Missing payment fields' }) };
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return { statusCode: 500, body: JSON.stringify({ valid: false, error: 'Server not configured with RAZORPAY_KEY_SECRET' }) };
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const valid = expectedSignature === razorpay_signature;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valid }),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ valid: false, error: e.message }) };
  }
};
