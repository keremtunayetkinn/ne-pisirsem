const Anthropic = require('@anthropic-ai/sdk');

// Module-level client — reused across warm invocations (P2)
const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

// Per-IP rate limit — best-effort in serverless (resets on cold start) (S1)
const ipRequests = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const WINDOW = 60_000;
  const MAX = 10;
  const entry = ipRequests.get(ip);
  if (!entry || now - entry.start > WINDOW) {
    ipRequests.set(ip, { start: now, count: 1 });
    return true;
  }
  if (entry.count >= MAX) return false;
  entry.count++;
  return true;
}

const SISTEM_PROMPTU = `Yemek asistanısın. Türk ve dünya mutfağından özgün tarifler (tarhana, keşkek, kimchi pilavı vb. dahil) öner. 2-3 tarif ver.

SADECE bu JSON'u döndür, başka hiçbir şey yazma:
{"tarifler":[{"ad":"","aciklama":"2 cümle.","sure":"","zorluk":"","kisi":0,"malzemeler":["ölçülü"],"adimlar":["adım"],"tat_profili":{"aci":0,"eksi":0,"tuzlu":0,"tatli":0,"umami":0,"bitter":0},"pexels_arama":"english"}]}

Kurallar: puanlar 0-10 tam sayı · pexels_arama İngilizce · malzemeleri ölçülü yaz · markdown ekleme`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Rate limiting (S1)
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Çok fazla istek. Lütfen bir dakika bekleyin.' });
  }

  // Input validation (S2)
  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Geçersiz istek formatı.' });
  }
  if (messages.length > 20) {
    return res.status(400).json({ error: 'Sohbet geçmişi çok uzun.' });
  }
  const totalLen = messages.reduce((sum, m) => sum + (typeof m.content === 'string' ? m.content.length : 0), 0);
  if (totalLen > 50_000) {
    return res.status(400).json({ error: 'İstek içeriği çok uzun.' });
  }

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1600,
      system: SISTEM_PROMPTU,
      messages
    });

    return res.status(200).json({ content: response.content[0].text });
  } catch (hata) {
    return res.status(500).json({ error: 'API hatası: ' + hata.message });
  }
};
