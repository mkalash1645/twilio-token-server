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
  const conferenceName = 'KB_LiveSupport';

  try {
    const call = await client.calls.create({
      to: TARGET_NUMBER,
      from: TWILIO_NUMBER,
twiml: `
  <Response>
    <Say>Connecting you to a potential investor who was speaking with our AI assistant.</Say>
    <Dial>
      <Conference 
        startConferenceOnEnter="true" 
        endConferenceOnExit="false" 
        waitUrl="http://com.twilio.music.classical.s3.amazonaws.com/BusyStrings.mp3">
        ${conferenceName}
      </Conference>
    </Dial>
  </Response>
`.trim()

    });

    console.log('[TRANSFER] Call started:', call.sid);
    res.status(200).json({ message: 'Agent is being called', sid: call.sid });
  } catch (error) {
    console.error('[TRANSFER] Error:', error);
    res.status(500).json({ message: 'Call failed', error: error.message });
  }
}
