// iblazevape-tracking/api/track.js

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { order, email } = req.query;
  if (!order || !email) return res.status(400).json({ error: 'Missing input' });

  // Use the verified internal domain from your screenshot
  const SHOPIFY_DOMAIN = "6jjpzt-jz.myshopify.com"; 
  const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID; 
  const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

  try {
    // 1. GET THE ACCESS TOKEN
    const authUrl = `https://${SHOPIFY_DOMAIN}/admin/oauth/access_token`;
    const tokenResp = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'client_credentials'
      })
    });

    // CRITICAL: Check if Shopify sent HTML instead of JSON
    const contentType = tokenResp.headers.get("content-type");
    if (!tokenResp.ok || (contentType && contentType.includes("text/html"))) {
      const errorBody = await tokenResp.text();
      console.error("SHOPIFY REJECTED AUTH ATTEMPT. Status:", tokenResp.status);
      return res.status(500).json({ 
        error: "Shopify API Connection Failed", 
        details: `Shopify returned ${tokenResp.status}. Ensure your Custom App is fully INSTALLED on the store.` 
      });
    }

    const tokenData = await tokenResp.json();
    if (!tokenData.access_token) {
       return res.status(401).json({ error: 'Invalid Credentials', details: tokenData });
    }

    // 2. SEARCH FOR THE ORDER
    const orderName = encodeURIComponent(order.startsWith('#') ? order : `#${order}`);
    const orderUrl = `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/orders.json?name=${orderName}&status=any`;
    
    const orderResp = await fetch(orderUrl, {
      headers: { 'X-Shopify-Access-Token': tokenData.access_token }
    });

    const orderData = await orderResp.json();

    if (!orderData.orders || orderData.orders.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const matchedOrder = orderData.orders.find(o => o.email && o.email.toLowerCase() === email.toLowerCase());
    if (!matchedOrder) return res.status(403).json({ error: 'Email match failed.' });

    // 3. RETURN SUCCESS (Shop ID 94153834761)
    return res.status(200).json({ 
      success: true, 
      url: `https://shopify.com/94153834761/account/orders/${matchedOrder.id}` 
    });

  } catch (err) {
    return res.status(500).json({ error: `Debug: ${err.message}` });
  }
}
