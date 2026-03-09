// iblazevape-tracking/api/track.js

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { order, email } = req.query;
  if (!order || !email) return res.status(400).json({ error: 'Missing input' });

  const SHOPIFY_DOMAIN = "6jjpzt-jz.myshopify.com"; 
  const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID; 
  const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

  try {
    // STEP 1: AUTHENTICATION
    // We are adding 'Accept' and ensuring no extra fields are in the body
    const tokenResp = await fetch(`https://${SHOPIFY_DOMAIN}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: CLIENT_ID.trim(), // Force removal of accidental spaces
        client_secret: CLIENT_SECRET.trim(), // Force removal of accidental spaces
        grant_type: 'client_credentials'
      })
    });

    const tokenData = await tokenResp.json();
    
    if (!tokenResp.ok) {
       console.error("SHOPIFY ERROR DETAIL:", tokenData);
       return res.status(tokenResp.status).json({ 
         error: 'Shopify Rejected Request', 
         details: tokenData.error_description || tokenData.error || "Check App Permissions"
       });
    }

    const API_TOKEN = tokenData.access_token;

    // STEP 2: SEARCH ORDER
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

    const matchedOrder = orderData.orders.find(o => o.email && o.email.toLowerCase() === email.toLowerCase());
    if (!matchedOrder) return res.status(403).json({ error: 'Email match failed.' });

    // Shop ID: 94153834761
    return res.status(200).json({ 
      success: true, 
      url: `https://shopify.com/94153834761/account/orders/${matchedOrder.id}` 
    });

  } catch (err) {
    return res.status(500).json({ error: `Debug: ${err.message}` });
  }
}
