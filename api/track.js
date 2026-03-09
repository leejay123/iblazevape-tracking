// iblazevape-tracking/api/track.js

export default async function handler(req, res) {
  // 1. Setup CORS so your Shopify storefront can talk to this Vercel server
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { order, email } = req.query;

  // 2. Validate user input
  if (!order || !email) {
    return res.status(400).json({ error: 'Missing order number or email' });
  }

  // 3. YOUR VERIFIED CREDENTIALS
  const SHOPIFY_DOMAIN = "6jjpzt-jz.myshopify.com"; 
  const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID; 
  const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

  try {
    // ---------------------------------------------------------
    // STEP A: Request a temporary Access Token from Shopify
    // ---------------------------------------------------------
    const tokenResponse = await fetch(`https://${SHOPIFY_DOMAIN}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Vercel-Order-Tracker-v1'
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'client_credentials'
      })
    });

    const tokenData = await tokenResponse.json();
    
    // If Shopify rejects the Client ID or Secret, this will show the reason
    if (!tokenData.access_token) {
      return res.status(401).json({ 
        error: 'Shopify Auth Failed', 
        details: tokenData.error_description || tokenData.error || 'Check Client ID/Secret in Vercel'
      });
    }

    const API_TOKEN = tokenData.access_token;

    // ---------------------------------------------------------
    // STEP B: Search the Admin API for the Order details
    // ---------------------------------------------------------
    const orderName = encodeURIComponent(order.startsWith('#') ? order : `#${order}`);
    const orderUrl = `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/orders.json?name=${orderName}&status=any`;
    
    const orderResponse = await fetch(orderUrl, {
      headers: {
        'X-Shopify-Access-Token': API_TOKEN,
        'Content-Type': 'application/json',
        'User-Agent': 'Vercel-Order-Tracker-v1'
      }
    });

    const orderData = await orderResponse.json();

    if (!orderData.orders || orderData.orders.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // ---------------------------------------------------------
    // STEP C: Match the email to ensure the customer is authorized
    // ---------------------------------------------------------
    const matchedOrder = orderData.orders.find(o => o.email && o.email.toLowerCase() === email.toLowerCase());

    if (!matchedOrder) {
      return res.status(403).json({ error: 'Email match failed. Please check the email used for the order.' });
    }

    // ---------------------------------------------------------
    // STEP D: Return the secure 13-digit Shopify link
    // ---------------------------------------------------------
    // Your Shop ID is 94153834761
    const secureUrl = `https://shopify.com/94153834761/account/orders/${matchedOrder.id}`;
    
    return res.status(200).json({ success: true, url: secureUrl });

  } catch (error) {
    // If the server crashes, this tells us why (e.g., Network timeout)
    return res.status(500).json({ error: `Server Crash: ${error.message}` });
  }
}
