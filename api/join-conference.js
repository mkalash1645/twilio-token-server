import twilio from 'twilio';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_NUMBER,
    CONFERENCE_NAME,
  } = process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_NUMBER || !CONFERENCE_NAME) {
    return res.status(500).json({ message: 'Missing environment variables' });
  }

  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  // Get calls from the last 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  try {
    const recentCalls = await client.calls.list({
      from: TWILIO_NUMBER,
      status: 'in-progress',
      startTimeAfter: fiveMinutesAgo,
      limit: 5,
    });

    if (!recentCalls || recentCalls.length === 0) {
      return res.status(404).json({ message: 'No active call found to redirect.' });
    }

    const activeCall = recentCalls[0];

    const response = await client.calls(activeCall.sid).update({
      method: 'POST',
      twiml: `
        <Response>
          <Say>You are now being connected to a live representative.</Say>
          <Dial>
            <Conference 
              startConferenceOnEnter="true" 
              endConferenceOnExit="false" 
              waitUrl="http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical">
              ${CONFERENCE_NAME}
            </Conference>
          </Dial>
        </Response>
      `.trim()
    });

    console.log('[AUTO-CONFERENCE] Call redirected:', response.sid);
    return res.status(200).json({ message: 'Caller redirected to conference', sid: response.sid });

  } catch (error) {
    console.error('[AUTO-CONFERENCE] Error:', error);
    return res.status(500).json({ message: 'Failed to redirect caller', error: error.message });
  }
}
