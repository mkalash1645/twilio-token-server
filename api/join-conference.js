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
    CONFERENCE_NAME,
  } = process.env;

  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  try {
    // Step 1: Dial out to human and place in conference
    const outboundCall = await client.calls.create({
      to: TARGET_NUMBER,
      from: TWILIO_NUMBER,
      twiml: `
        <Response>
          <Say>Connecting you to a potential investor who was speaking with our AI assistant.</Say>
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

    console.log('[TRANSFER] Outbound call started:', outboundCall.sid);

    // Step 2: Look for inbound call from the last 5 minutes
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

    // Step 3: Redirect the inbound caller into the conference
    const updatedCall = await client.calls(inboundCall.sid).update({
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

    console.log('[TRANSFER] Inbound call redirected:', updatedCall.sid);

    return res.status(200).json({
      message: 'Both parties redirected to conference',
      outboundCallSid: outboundCall.sid,
      inboundCallSid: updatedCall.sid
    });

  } catch (error) {
    console.error('[TRANSFER] Error:', error);
    return res.status(500).json({ message: 'Transfer failed', error: error.message });
  }
}
