const twilio = require('twilio');

export default function handler(req, res) {
  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_API_KEY,
    TWILIO_API_SECRET,
    TWILIO_APP_SID,
  } = process.env;

  const identity = req.query.identity || 'anonymous';

  const AccessToken = twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: TWILIO_APP_SID,
    incomingAllow: true,
  });

  const token = new AccessToken(
    TWILIO_ACCOUNT_SID,
    TWILIO_API_KEY,
    TWILIO_API_SECRET,
    { identity }
  );

  token.addGrant(voiceGrant);

  res.status(200).json({ token: token.toJwt() });
}
