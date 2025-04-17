import twilio from 'twilio';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_NUMBER,
    TARGET_NUMBER,
  } = process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_NUMBER || !TARGET_NUMBER) {
    return res.status(500).json({ message: 'Missing required environment variables' });
  }

  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  try {
    const call = await client.calls.create({
      to: TARGET_NUMBER,
      from: TWILIO_NUMBER,
      url: "https://handler.twilio.com/twiml/EH0c65c99c31072a9ddf8245c6af471c54" // 👈 Your TwiML Bin URL
    });

    console.log('[TRANSFER] Call started:', call.sid);
    res.status(200).json({ message: 'Agent is being called', sid: call.sid });
  } catch (error) {
    console.error('[TRANSFER] Error:', error);
    res.status(500).json({ message: 'Call failed', error: error.message });
  }
}
