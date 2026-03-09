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
    const tokenResp = await fetch(`https://${SHOPIFY_DOMAIN}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID.trim(),
        client_secret: CLIENT_SECRET.trim(),
        grant_type: 'client_credentials'
      })
    });

    const tokenData = await tokenResp.json();
    if (!tokenData.access_token) return res.status(401).json({ error: 'Auth failed' });

    const cleanOrder = order.replace('#', '').trim();
    const orderName = `#${cleanOrder}`;
    
    const orderUrl = `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/orders.json?name=${encodeURIComponent(orderName)}&status=any`;
    const orderResponse = await fetch(orderUrl, {
      headers: { 'X-Shopify-Access-Token': tokenData.access_token }
    });

    const orderData = await orderResponse.json();
    const finalOrders = orderData.orders || [];

    if (finalOrders.length === 0) return res.status(404).json({ error: 'Order not found.' });

    const matchedOrder = finalOrders.find(o => o.email && o.email.toLowerCase() === email.toLowerCase());
    if (!matchedOrder) return res.status(403).json({ error: 'Email match failed.' });

    // SUCCESS - Send user to the Guest-Friendly Status URL
    // This URL includes a security token so they don't have to log in
    const targetUrl = matchedOrder.order_status_url || `https://shopify.com/94153834761/account/orders/${matchedOrder.id}`;
    
    return res.status(200).json({ success: true, url: targetUrl });

  } catch (err) {
    return res.status(500).json({ error: `System Error: ${err.message}` });
  }
}
