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

  const { repNumber, repName, conferenceName } = req.body;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_NUMBER || !conferenceName || !repNumber) {
    return res.status(500).json({ message: 'Missing required parameters or environment variables' });
  }

  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  try {
    // Step 1: Dial out to human and place in conference
    const outboundCall = await client.calls.create({
      to: repNumber,
      from: TWILIO_NUMBER,
      twiml: `
        <Response>
          <Say>Connecting you to a potential investor who was speaking with our AI assistant.</Say>
          <Dial>
            <Conference 
              startConferenceOnEnter="true" 
              endConferenceOnExit="false" 
              waitUrl="http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical">
              ${conferenceName}
            </Conference>
          </Dial>
        </Response>
      `.trim()
    });

    console.log('[JOIN-CONFERENCE] Outbound call to rep started:', outboundCall.sid);

    // Step 2: Find the active inbound caller
    const recentInboundCalls = await client.calls.list({
      to: TWILIO_NUMBER,
      status: 'in-progress',
      startTimeAfter: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      limit: 5
    });

    const inboundCall = recentInboundCalls.find(call => call.direction === 'inbound');

    if (!inboundCall) {
      return res.status(404).json({ message: 'No active inbound call found to redirect.' });
    }

    const updatedCall = await client.calls(inboundCall.sid).update({
      method: 'POST',
      twiml: `
        <Response>
          <Say>Please hold while we transfer you to ${repName || 'our representative'}.</Say>
          <Dial>
            <Conference 
              startConferenceOnEnter="true" 
              endConferenceOnExit="false" 
              waitUrl="http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical">
              ${conferenceName}
            </Conference>
          </Dial>
        </Response>
      `.trim()
    });

    console.log('[JOIN-CONFERENCE] Inbound caller redirected:', updatedCall.sid);

    return res.status(200).json({
      message: 'Both parties redirected to conference',
      outboundCallSid: outboundCall.sid,
      inboundCallSid: updatedCall.sid
    });

  } catch (error) {
    console.error('[JOIN-CONFERENCE] Error:', error);
    return res.status(500).json({ message: 'Transfer failed', error: error.message });
  }
}
