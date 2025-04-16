import twilio from 'twilio';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_NUMBER, // Your Twilio number: +14243178845
    TARGET_NUMBER  // The agent’s number: +17026753265
  } = process.env;

  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  try {
    const conferenceName = `live-support-${Date.now()}`;

    // 1. Add original caller (already in call) to conference (if needed, via other TwiML)
    // 2. Dial out to agent and join them to the same conference
    const call = await client.calls.create({
      to: process.env.TARGET_NUMBER,
      from: process.env.TWILIO_NUMBER,
      twiml: `
        <Response>
          <Say>You are being connected to a live support caller.</Say>
          <Dial>
            <Conference>${conferenceName}</Conference>
          </Dial>
        </Response>
      `
    });

    res.status(200).json({ message: 'Call to agent started', sid: call.sid });
  } catch (error) {
    console.error('Twilio call error:', error);
    res.status(500).json({ message: 'Call failed', error: error.message });
  }
}
