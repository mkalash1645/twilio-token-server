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
    "Front Desk": { number: "+17026753265", conference: "Conf_Front" }
  };

  const selectedRep = repDirectory[repName];

  if (!selectedRep) {
    return res.status(404).json({ message: 'Representative not found' });
  }

  try {
    const call = await client.calls.create({
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
    res.status(200).json({ message: 'Transfer call initiated', sid: call.sid });
  } catch (error) {
    console.error('[TRANSFER-CALL] Error:', error);
    res.status(500).json({ message: 'Call failed', error: error.message });
  }
}
