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

  console.log('[DEBUG] Incoming transfer for:', repName);
  console.log('[DEBUG] Full body:', req.body);

  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  const repDirectory = {
    "Anthony Goros": { number: "+14158799000", conference: "Conference_Anthony" },
    "Jared Wolff": { number: "+19093409000", conference: "Conference_Jared" },
    "Louie Goros": { number: "+14243439000", conference: "Conference_Louie" },
    "Matt Ayer": { number: "+15624529000", conference: "Conference_Matt" },
    "Alex Hardick": { number: "+18582409000", conference: "Conference_Alex" },
    "Front Desk": { number: "+17026753263", conference: "Conference_Front" },
    "Mason Kalashian": { number: "+17026753265", conference: "Conference_Mason" },
    "Fallback": { number: "+19493019000", conference: "Conference_Fallback" }
  };

  const selectedRep = repDirectory[repName] || repDirectory["Fallback"];

  try {
    // Step 1: Call the rep
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

    // Step 2: Search for any recent inbound calls (any status)
    const recentInboundCalls = await client.calls.list({
      to: TWILIO_NUMBER,
      startTimeAfter: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      limit: 10
    });

    console.log('[DEBUG] Recent Inbound Calls:', recentInboundCalls.map(c => ({
      sid: c.sid,
      status: c.status,
      direction: c.direction,
      from: c.from
    })));

    const inboundCall = recentInboundCalls.find(call =>
      call.direction === 'inbound' &&
      ['queued', 'ringing', 'in-progress'].includes(call.status)
    );

    if (!inboundCall) {
      return res.status(404).json({ message: 'No active inbound call found to redirect.' });
    }

    const updatedCall = await client.calls(inboundCall.sid).update({
      method: 'POST',
      twiml: `
        <Response>
          <Say>Please hold while we connect you to a live representative.</Say>
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
