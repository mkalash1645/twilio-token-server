export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { CallStatus, To } = req.body;

  console.log('[FALLBACK-HANDLER] Call status:', CallStatus);

  // If the rep didn't answer, you could log or take further action here.
  if (CallStatus !== 'completed') {
    console.warn(`[FALLBACK-HANDLER] Call to ${To} was not completed.`);
  }

  return res.status(200).json({ message: 'Callback received' });
}
