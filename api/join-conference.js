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

  console.log('[DEBUG] Incoming transfer for:', repName);
  console.log('[DEBUG] Full body:', req.body);

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_NUMBER) {
    return res.status(500).json({ message: 'Missing required environment variables' });
  }

  if (!repName) {
    return res.status(400).json({ message: 'Missing repName in request body' });
  }

  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  const repDirectory = {
    "Anthony Goros": { number: "+14158799000", conference: "Conference_Anthony" },
    "Jared Wolff": { number: "+19093409000", conference: "Conference_Jared" },
    "Louie Goros": { number: "+14243439000", conference: "Conference_Louie" },
    "Matt Ayer": { number: "+15624529000", conference: "Conference_Matt" },
    "Troy Reese": { number: "+18582409000", conference: "Conference_Alex" },
    "Mason Kalashian": { number: "+17026753265", conference: "Conference_Mason" },
    "Front Desk": { number: "+17026753263", conference: "Conference_Front" },
    "Fallback": { number: "+19493019000", conference: "Conference_Fallback" }
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

    console.log('[JOIN-CONFERENCE] Outbound call started to:', repName);

    // Step 2: Find the most recent inbound call from any of your Twilio numbers
    const recentInboundCalls = await client.calls.list({
      status: 'in-progress',
      startTimeAfter: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      limit: 10
    });

    const acceptedInboundNumbers = ["+14243178845", "+14245411031"];

    const inboundCall = recentInboundCalls.find(call =>
      call.direction === 'inbound' && acceptedInboundNumbers.includes(call.to)
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

    console.log('[JOIN-CONFERENCE] Inbound caller redirected to conference:', inboundCall.sid);

    return res.status(200).json({
      message: 'Both parties connected to conference',
      outboundCallSid: outboundCall.sid,
      inboundCallSid: updatedCall.sid
    });

  } catch (error) {
    console.error('[JOIN-CONFERENCE] Error:', error);
    return res.status(500).json({ message: 'Transfer failed', error: error.message });
  }
}
