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

  const { callSid, agent } = req.body;

  const agentMap = {
    anthony: { number: '+14158799000', conference: 'Conference_Anthony' },
    jared: { number: '+19093409000', conference: 'Conference_Jared' },
    louie: { number: '+14243439000', conference: 'Conference_Louie' },
    matt: { number: '+15624529000', conference: 'Conference_Matt' },
    alex: { number: '+18582409000', conference: 'Conference_Alex' },
    front_desk: { number: '+17026753265', conference: 'Conference_Front' },
  };

  const fallbackNumber = '+19493019000';
  const fallbackConference = 'Conference_Fallback';

  const agentInfo = agentMap[agent?.toLowerCase()];

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_NUMBER) {
    return res.status(500).json({ message: 'Missing environment variables' });
  }

  if (!callSid || !agentInfo) {
    return res.status(400).json({ message: 'Missing or invalid callSid or agent' });
  }

  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  try {
    // Step 1: Dial the selected agent and place them into a conference
    const outboundCall = await client.calls.create({
      to: agentInfo.number,
      from: TWILIO_NUMBER,
      twiml: `
        <Response>
          <Say>Connecting you to the caller.</Say>
          <Dial timeout="20">
            <Conference 
              startConferenceOnEnter="true"
              endConferenceOnExit="false"
              waitUrl="http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical">
              ${agentInfo.conference}
            </Conference>
          </Dial>
        </Response>
      `.trim(),
      statusCallback: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/fallback-call`,
      statusCallbackEvent: ['completed'],
      statusCallbackMethod: 'POST'
    });

    console.log('[TRANSFER] Outbound call to agent started:', outboundCall.sid);

    // Step 2: Redirect the caller into the same conference
    const updatedCall = await client.calls(callSid).update({
      method: 'POST',
      twiml: `
        <Response>
          <Say>You are being transferred to a live representative.</Say>
          <Dial>
            <Conference 
              startConferenceOnEnter="true" 
              endConferenceOnExit="false" 
              waitUrl="http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical">
              ${agentInfo.conference}
            </Conference>
          </Dial>
        </Response>
      `.trim()
    });

    console.log('[TRANSFER] Caller redirected to conference:', updatedCall.sid);

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
