import twilio from 'twilio';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_NUMBER,
    TARGET_NUMBER
  } = process.env;

  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  const conferenceName = 'KB_LiveSupport'; // Must match the TwiML Bin conference name

  try {
    const call = await client.calls.create({
      to: TARGET_NUMBER,
      from: TWILIO_NUMBER,
      twiml: `
        <Response>
          <Say>You are being connected to a customer who was speaking with our AI assistant.</Say>
          <Dial>
            <Conference>${conferenceName}</Conference>
          </Dial>
        </Response>
      `
    });

    console.log('[TRANSFER] Call to agent started:', call.sid);
    res.status(200).json({ message: 'Agent is being dialed', sid: call.sid });
  } catch (error) {
    console.error('[TRANSFER] Error:', error);
    res.status(500).json({ message: 'Call to agent failed', error: error.message });
  }
}
