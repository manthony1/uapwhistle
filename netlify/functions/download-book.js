const fs = require('fs');
const path = require('path');
const stripeSecret = process.env.STRIPE_SECRET_KEY;

exports.handler = async (event, context) => {
  const sessionId = event.queryStringParameters.session_id;

  if (!sessionId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing session_id query parameter.' })
    };
  }

  // Determine if we are running in mock verification mode
  const isMockSession = sessionId.startsWith('mock_checkout_');

  if (!stripeSecret || isMockSession) {
    if (isMockSession) {
      console.log(`Mock verification successful for session: ${sessionId}`);
    } else {
      console.warn("STRIPE_SECRET_KEY not set. Serving PDF in mock mode.");
    }

    try {
      const pdfPath = path.resolve(__dirname, '../../private/uap_book.pdf');
      const fileBuffer = fs.readFileSync(pdfPath);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="UAP_Summoning_Guide_Handbook.pdf"',
          'Cache-Control': 'no-cache'
        },
        body: fileBuffer.toString('base64'),
        isBase64Encoded: true
      };
    } catch (err) {
      console.error('Error reading mock PDF file:', err);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Could not read e-book template.', details: err.message })
      };
    }
  }

  // Live Mode: verify session status with Stripe
  try {
    const stripe = require('stripe')(stripeSecret);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Access denied: Payment status not completed.' })
      };
    }

    // Read and return the PDF file
    const pdfPath = path.resolve(__dirname, '../../private/uap_book.pdf');
    const fileBuffer = fs.readFileSync(pdfPath);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="UAP_Summoning_Guide_Handbook.pdf"',
        'Cache-Control': 'no-cache'
      },
      body: fileBuffer.toString('base64'),
      isBase64Encoded: true
    };
  } catch (err) {
    console.error('Error during Stripe session validation:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Verification failed.', details: err.message })
    };
  }
};
