// iblazevape-tracking/api/track.js

export default async function handler(req, res) {
  // 1. Enable CORS so your Shopify frontend can talk to Vercel securely
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { order, email } = req.query;

  if (!order || !email) {
    return res.status(400).json({ error: 'Missing order number or email' });
  }

  const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN; 
  const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID; 
  const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

  try {
    // 2. THE 2026 UPDATE: Exchange Client ID & Secret for an Access Token
    const tokenResponse = await fetch(`https://${SHOPIFY_DOMAIN}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'client_credentials'
      })
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      return res.status(401).json({ error: 'Failed to authenticate with Shopify Dev Dashboard.' });
    }

    const API_TOKEN = tokenData.access_token;

    // 3. PING THE API FOR THE ORDER DATA
    const orderName = encodeURIComponent(order.startsWith('#') ? order : `#${order}`);
    const url = `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/orders.json?name=${orderName}&status=any`;
    
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': API_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!data.orders || data.orders.length === 0) {
      return res.status(404).json({ error: 'Order not found in database.' });
    }

    // 4. VERIFY THE EMAIL MATCHES THE ORDER
    const matchedOrder = data.orders.find(o => o.email && o.email.toLowerCase() === email.toLowerCase());

    if (!matchedOrder) {
      return res.status(403).json({ error: 'Email does not match this order credentials.' });
    }

    // 5. SUCCESS: Construct the massive 13-digit URL securely
    const secureUrl = `https://shopify.com/94153834761/account/orders/${matchedOrder.id}`;

    // Hand the URL back to the frontend form
    return res.status(200).json({ success: true, url: secureUrl });

 } catch (error) {
    console.error("FULL CRASH LOG:", error);
    return res.status(500).json({ error: `Vercel crashed: ${error.message}` });
  }
}
