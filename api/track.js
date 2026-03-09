// iblazevape-tracking/api/track.js

export default async function handler(req, res) {
  // 1. Enable CORS so your Shopify storefront can talk to Vercel
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { order, email } = req.query;

  // 2. Validate input
  if (!order || !email) {
    return res.status(400).json({ error: 'Missing order number or email' });
  }

  // 3. YOUR VERIFIED STORE CREDENTIALS
  const SHOPIFY_DOMAIN = "6jjpzt-jz.myshopify.com"; 
  const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID; 
  const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

  try {
    // ---------------------------------------------------------
    // STEP A: Get Access Token (Client Credentials Grant)
    // ---------------------------------------------------------
    const tokenResponse = await fetch(`https://${SHOPIFY_DOMAIN}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'VercelOrderTracker/1.0'
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'client_credentials'
      })
    });

    const tokenData = await tokenResponse.json();
    
    // Check if the keys were accepted
    if (!tokenData.access_token) {
      console.error("Shopify Auth Error:", tokenData);
      return res.status(401).json({ 
        error: 'Shopify Auth Failed', 
        details: tokenData.error_description || tokenData.error || 'Check Secret/ID' 
      });
    }

    const API_TOKEN = tokenData.access_token;

    // ---------------------------------------------------------
    // STEP B: Search for the Order ID
    // ---------------------------------------------------------
    const orderName = encodeURIComponent(order.startsWith('#') ? order : `#${order}`);
    const orderUrl = `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/orders.json?name=${orderName}&status=any`;
    
    const orderResponse = await fetch(orderUrl, {
      headers: {
        'X-Shopify-Access-Token': API_TOKEN,
        'Content-Type': 'application/json',
        'User-Agent': 'VercelOrderTracker/1.0'
      }
    });

    const orderData = await orderResponse.json();

    if (!orderData.orders || orderData.orders.length === 0) {
      return res.status(404).json({ error: 'Order not found in store history.' });
    }

    // ---------------------------------------------------------
    // STEP C: Security Match - Verify Email
    // ---------------------------------------------------------
    const matchedOrder = orderData.orders.find(o => o.email && o.email.toLowerCase() === email.toLowerCase());

    if (!matchedOrder) {
      return res.status(403).json({ error: 'The email provided does not match this order.' });
    }

    // ---------------------------------------------------------
    // STEP D: Return the Secure Link (Shop ID: 94153834761)
    // ---------------------------------------------------------
    const secureUrl = `https://shopify.com/94153834761/account/orders/${matchedOrder.id}`;
    
    return res.status(200).json({ success: true, url: secureUrl });

  } catch (error) {
    console.error("Server Crash Log:", error);
    return res.status(500).json({ error: `Debug Log: ${error.message}` });
  }
}
