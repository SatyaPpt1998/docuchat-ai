// netlify/functions/chat.js
// Secure proxy — your Anthropic API key stays on the server, never in the browser.

const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { question, context, history = [] } = JSON.parse(event.body || '{}');

  if (!question || !context) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing question or context' }) };
  }

  const systemPrompt = `You are DocuChat AI, a precise and helpful document analysis assistant.

The user has uploaded the following documents. Answer all questions ONLY based on the document content. If the answer is not in the documents, say so clearly. When referencing information, mention which document it comes from. Be concise, accurate, and well-structured.

${context}`;

  const messages = [
    ...history.slice(-8),
    { role: 'user', content: question },
  ];

  const payload = JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    system: systemPrompt,
    messages,
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const reply  = parsed?.content?.[0]?.text || 'No response.';
          resolve({
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ reply }),
          });
        } catch (e) {
          resolve({ statusCode: 500, body: JSON.stringify({ error: 'Parse error' }) });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ statusCode: 500, body: JSON.stringify({ error: e.message }) });
    });

    req.write(payload);
    req.end();
  });
};
