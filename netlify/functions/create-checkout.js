const stripeSecret = process.env.STRIPE_SECRET_KEY;
const priceId = process.env.STRIPE_PRICE_ID;

exports.handler = async (event, context) => {
  // Determine hostname from request to build callback URLs
  const host = event.headers.host || 'uapwhistle.com';
  const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
  const siteUrl = `${protocol}://${host}`;

  // Fallback: If Stripe credentials are not set, run in mock mode
  if (!stripeSecret) {
    console.warn("STRIPE_SECRET_KEY environment variable is not defined. Redirecting in MOCK mode.");
    
    const mockSessionId = 'mock_checkout_' + Math.random().toString(36).substring(2, 11);
    const mockRedirectUrl = `${siteUrl}/thank-you.html?session_id=${mockSessionId}&mock=true`;

    return {
      statusCode: 303,
      headers: {
        'Location': mockRedirectUrl,
        'Cache-Control': 'no-cache'
      },
      body: ''
    };
  }

  // Live Mode: Initialize Stripe and create Checkout Session
  try {
    const stripe = require('stripe')(stripeSecret);
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId || 'price_placeholder', // User must configure this in Stripe
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${siteUrl}/thank-you.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/`,
    });

    return {
      statusCode: 303,
      headers: {
        'Location': session.url,
        'Cache-Control': 'no-cache'
      },
      body: ''
    };
  } catch (err) {
    console.error('Error creating Stripe checkout session:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to create checkout session.',
        message: err.message,
        hint: 'Make sure STRIPE_SECRET_KEY and STRIPE_PRICE_ID are correctly set in the environment.'
      })
    };
  }
};
