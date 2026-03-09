// iblazevape-tracking/api/track.js

export default async function handler(req, res) {
  // 1. Enable CORS so your Shopify storefront can talk to this server
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { order, email } = req.query;

  // 2. Validate input
  if (!order || !email) {
    return res.status(400).json({ error: 'Missing order number or email' });
  }

  // 3. YOUR VERIFIED SHOPIFY CREDENTIALS
  const SHOPIFY_DOMAIN = "6jjpzt-jz.myshopify.com"; 
  const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID; 
  const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

  try {
    // ---------------------------------------------------------
    // STEP A: The Client Credentials Grant (The 2026 Shopify Method)
    // ---------------------------------------------------------
    const tokenResponse = await fetch(`https://${SHOPIFY_DOMAIN}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'client_credentials'
      })
    });

    // Check if Shopify returned HTML (means domain is wrong) or JSON (correct)
    const contentType = tokenResponse.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") === -1) {
      return res.status(500).json({ error: 'Shopify returned HTML. Check your Client ID and Secret in Vercel.' });
    }

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      return res.status(401).json({ error: 'Failed to generate access token.', details: tokenData });
    }

    const API_TOKEN = tokenData.access_token;

    // ---------------------------------------------------------
    // STEP B: Search the Admin API for the Order ID
    // ---------------------------------------------------------
    const orderName = encodeURIComponent(order.startsWith('#') ? order : `#${order}`);
    const orderUrl = `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/orders.json?name=${orderName}&status=any`;
    
    const orderResponse = await fetch(orderUrl, {
      headers: {
        'X-Shopify-Access-Token': API_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    const orderData = await orderResponse.json();

    if (!orderData.orders || orderData.orders.length === 0) {
      return res.status(404).json({ error: 'Order not found in store history.' });
    }

    // ---------------------------------------------------------
    // STEP C: Security Check - Match Email to Order
    // ---------------------------------------------------------
    const matchedOrder = orderData.orders.find(o => o.email && o.email.toLowerCase() === email.toLowerCase());

    if (!matchedOrder) {
      return res.status(403).json({ error: 'The email provided does not match our records for this order.' });
    }

    // ---------------------------------------------------------
    // STEP D: Generate and Return the Secure Tracking Link
    // ---------------------------------------------------------
    // Your Shop ID is 94153834761
    const secureUrl = `https://shopify.com/94153834761/account/orders/${matchedOrder.id}`;
    
    return res.status(200).json({ 
      success: true, 
      url: secureUrl 
    });

  } catch (error) {
    console.error("Vercel Crash Log:", error);
    return res.status(500).json({ error: `Server crash: ${error.message}` });
  }
}
