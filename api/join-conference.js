import twilio from 'twilio';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_NUMBER,
  } = process.env;

  const { repName } = req.body;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_NUMBER) {
    return res.status(500).json({ message: 'Missing required environment variables' });
  }

  if (!repName) {
    return res.status(400).json({ message: 'Missing repName in request body' });
  }

  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  const repDirectory = {
    "Anthony Goros": { number: "+14158799000", conference: "Conf_Anthony" },
    "Jared Wolff": { number: "+19093409000", conference: "Conf_Jared" },
    "Louie Goros": { number: "+14243439000", conference: "Conf_Louie" },
    "Matt Ayer": { number: "+15624529000", conference: "Conf_Matt" },
    "Alex Hardick": { number: "+18582409000", conference: "Conf_Alex" },
    "Front Desk": { number: "+17026753263", conference: "Conf_Front" },
    "Fallback": { number: "+19493019000", conference: "Conf_Fallback" }
  };

  const selectedRep = repDirectory[repName] || repDirectory["Fallback"];

  try {
    // Step 1: Dial out to rep and place in conference
    const outboundCall = await client.calls.create({
      to: selectedRep.number,
      from: TWILIO_NUMBER,
      twiml: `
        <Response>
          <Say>Connecting you to a potential investor who was speaking with our AI assistant.</Say>
          <Dial>
            <Conference 
              startConferenceOnEnter="true" 
              endConferenceOnExit="false" 
              waitUrl="http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical">
              ${selectedRep.conference}
            </Conference>
          </Dial>
        </Response>
      `.trim(),
    });

    console.log('[TRANSFER-CALL] Call initiated to:', repName);

    // Step 2: Redirect the active inbound caller into the same conference
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
          <Say>Please hold while we connect you to a regional VP.</Say>
          <Dial>
            <Conference 
              startConferenceOnEnter="true" 
              endConferenceOnExit="false" 
              waitUrl="http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical">
              ${selectedRep.conference}
            </Conference>
          </Dial>
        </Response>
      `.trim(),
    });

    console.log('[TRANSFER-CALL] Inbound caller redirected to conference:', inboundCall.sid);

    return res.status(200).json({
      message: 'Both parties connected to conference',
      outboundCallSid: outboundCall.sid,
      inboundCallSid: updatedCall.sid
    });
  } catch (error) {
    console.error('[TRANSFER-CALL] Error:', error);
    return res.status(500).json({ message: 'Transfer failed', error: error.message });
  }
}
