import twilio from 'twilio';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  console.log('[TRANSFER API] Request received');

  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_NUMBER,
    TARGET_NUMBER
  } = process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_NUMBER || !TARGET_NUMBER) {
    console.error('[TRANSFER API] Missing env vars');
    return res.status(500).json({ message: 'Missing environment variables' });
  }

  console.log('[TRANSFER API] Making outbound call via Twilio...');
  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  try {
    const call = await client.calls.create({
      to: TARGET_NUMBER,
      from: TWILIO_NUMBER,
      twiml: `
        <Response>
          <Say>You are being connected to a live support caller.</Say>
          <Dial>
            <Number>${TARGET_NUMBER}</Number>
          </Dial>
        </Response>
      `
    });

    console.log('[TRANSFER API] Call created:', call.sid);
    res.status(200).json({ message: 'Call started', sid: call.sid });

  } catch (error) {
    console.error('[TRANSFER API] Twilio error:', error);
    res.status(500).json({ message: 'Twilio call failed', error: error.message });
  }
}
