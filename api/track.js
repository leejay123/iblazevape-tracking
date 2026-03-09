export default async function handler(req, res) {
  // 1. Allow frontend form to talk to Vercel
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
    // ---------------------------------------------------------
    // STEP A: The Client Credentials Grant (Per Shopify Docs)
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

    // Catch the HTML error if the domain is wrong
    const contentType = tokenResponse.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") === -1) {
      return res.status(500).json({ error: `Shopify returned HTML. Ensure SHOPIFY_DOMAIN is exactly your .myshopify.com URL.` });
    }

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      return res.status(401).json({ error: 'Failed to generate access token.', details: tokenData });
    }

    const API_TOKEN = tokenData.access_token;

    // ---------------------------------------------------------
    // STEP B: Look up the Order with the new Token
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
      return res.status(404).json({ error: 'Order not found.' });
    }

    // Security check: Match the email
    const matchedOrder = orderData.orders.find(o => o.email && o.email.toLowerCase() === email.toLowerCase());

    if (!matchedOrder) {
      return res.status(403).json({ error: 'Email does not match this order.' });
    }

    // ---------------------------------------------------------
    // STEP C: Return the secure URL to the frontend
    // ---------------------------------------------------------
    const secureUrl = `https://shopify.com/94153834761/account/orders/${matchedOrder.id}`;
    return res.status(200).json({ success: true, url: secureUrl });

  } catch (error) {
    console.error("Vercel Crash Log:", error);
    return res.status(500).json({ error: `Server crash: ${error.message}` });
  }
}
