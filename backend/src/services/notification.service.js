let client;

export async function sendWhatsAppMessage(number, message) {
  if (!number) return;
  try {
    const { Client, LocalAuth } = await import('whatsapp-web.js');
    if (!client) {
      client = new Client({ authStrategy: new LocalAuth(), puppeteer: { headless: true } });
      client.initialize();
    }
    await client.sendMessage(`${number}@c.us`, message);
  } catch (error) {
    console.warn('WhatsApp notification skipped:', error.message);
  }
}
