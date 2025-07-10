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
    "Anthony Goros": { number: "+14158799000", conference: "Conference_Anthony" },
    "Jared Wolff": { number: "+19093409000", conference: "Conference_Jared" },
    "Louie Goros": { number: "+14243439000", conference: "Conference_Louie" },
    "Matt Ayer": { number: "+15624529000", conference: "Conference_Matt" },
    "Troy Reese": { number: "+18582409000", conference: "Conference_Alex" },
    "Mason Kalashian": { number: "+17026753265", conference: "Conference_Mason" },
    "Front Desk": { number: "+17026753265", conference: "Conference_Front" },
    "Fallback": { number: "+19493019000", conference: "Conference_Fallback" }
  };

  const selectedRep = repDirectory[repName] || repDirectory["Fallback"];

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
      `.trim()
    });

    console.log('[TRANSFER-CALL] Outbound call started:', call.sid);
    res.status(200).json({ message: 'Call started', sid: call.sid });
  } catch (error) {
    console.error('[TRANSFER-CALL] Error:', error);
    res.status(500).json({ message: 'Call failed', error: error.message });
  }
}
