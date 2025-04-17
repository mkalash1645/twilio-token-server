import twilio from 'twilio';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    CONFERENCE_TWIML_URL
  } = process.env;

  const { callSid } = req.body;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !CONFERENCE_TWIML_URL) {
    return res.status(500).json({ message: 'Missing environment variables' });
  }

  if (!callSid) {
    return res.status(400).json({ message: 'Missing callSid in request body' });
  }

  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  try {
    const call = await client.calls(callSid).update({
      method: 'POST',
      url: CONFERENCE_TWIML_URL
    });

    console.log('[JOIN-CONFERENCE] Updated call SID:', call.sid);
    res.status(200).json({ message: 'Caller redirected to conference', sid: call.sid });
  } catch (error) {
    console.error('[JOIN-CONFERENCE] Error:', error);
    res.status(500).json({ message: 'Failed to redirect caller', error: error.message });
  }
}
