export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { CallSid, CallStatus } = req.body;

  console.log('[FALLBACK] Call SID:', CallSid);
  console.log('[FALLBACK] Call Status:', CallStatus);

  if (CallStatus === 'no-answer' || CallStatus === 'busy' || CallStatus === 'failed') {
    // Here you could implement a fallback call or send alert notification
    console.warn(`[FALLBACK] Call ${CallSid} failed or was unanswered.`);
  }

  return res.status(200).json({ message: 'Fallback handler processed' });
}
