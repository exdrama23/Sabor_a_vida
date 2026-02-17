import axios from 'axios';

const WHATSAPP_NUMBER = '557999113824';
const WHATSAPP_MESSAGE_URL = `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=`;

export interface OrderData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCpf: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement?: string;
  addressNeighborhood: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  addressReference?: string;
  addressType?: string;
  deliveryNotes?: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  cakeSize?: string;
  subtotal: number;
  deliveryPrice: number;
  totalPrice: number;
  paymentMethod: string;
  paymentStatus: string;
  cardLastFour?: string;
  installments?: number;
}

export function generateOrderMessage(order: OrderData): string {
  const itemsList = order.items
    .map(
      (item) =>
        `• ${item.name} - Qtd: ${item.quantity} x R$ ${item.price.toFixed(2)} = R$ ${(item.price * item.quantity).toFixed(2)}`
    )
    .join('\n');

  const paymentInfo =
    order.paymentStatus === 'APPROVED'
      ? `✅ *Pagamento Aprovado* (${order.paymentMethod})`
      : `⏳ *Aguardando Confirmação de Pagamento* (${order.paymentMethod})`;

  const cardInfo = order.cardLastFour ? `\nCartão: •••• ${order.cardLastFour}` : '';
  const installmentInfo =
    order.installments && order.installments > 1 ? `\n${order.installments}x de R$ ${(order.totalPrice / order.installments).toFixed(2)}` : '';

  const message = `
*🎂 PEDIDO CONFIRMADO - Sabor à Vida*

*DADOS PESSOAIS*
Nome: ${order.customerName}
Telefone: ${order.customerPhone}
Email: ${order.customerEmail}
CPF: ${order.customerCpf}

*ENDEREÇO DE ENTREGA*
Rua: ${order.addressStreet}, ${order.addressNumber}
${order.addressComplement ? `Complemento: ${order.addressComplement}\n` : ''}Bairro: ${order.addressNeighborhood}
Cidade: ${order.addressCity}/${order.addressState}
CEP: ${order.addressZip}
Tipo: ${order.addressType || 'Casa'}
${order.addressReference ? `Ponto de Referência: ${order.addressReference}\n` : ''}${order.deliveryNotes ? `Observações: ${order.deliveryNotes}\n` : ''}

*ITENS DO PEDIDO*
${itemsList}

${order.cakeSize ? `*TAMANHO DO BOLO*\n${order.cakeSize}\n` : ''}

*RESUMO DO PAGAMENTO*
Subtotal: R$ ${order.subtotal.toFixed(2)}
Entrega: R$ ${order.deliveryPrice.toFixed(2)}
*TOTAL: R$ ${order.totalPrice.toFixed(2)}*

*MÉTODO DE PAGAMENTO*
${paymentInfo}${cardInfo}${installmentInfo}

${
  order.paymentStatus === 'APPROVED'
    ? '✅ Pagamento confirmado! Seu pedido será preparado em breve.'
    : '⏳ Aguardando confirmação do pagamento para iniciar o preparo.'
}

_Obrigado por escolher Sabor à Vida!_
  `.trim();

  return message;
}

export async function sendOrderToWhatsApp(order: OrderData): Promise<boolean> {
  const ADMIN_NUMBER = process.env.ADMIN_WHATSAPP_NUMBER;

  // Z-API configuration (preferred)
  const ZAPI_SEND_URL = process.env.ZAPI_SEND_URL; // optional full send URL
  const ZAPI_INSTANCE_ID = process.env.ZAPI_INSTANCE_ID;
  const ZAPI_TOKEN = process.env.ZAPI_TOKEN;
  const ZAPI_APIKEY_HEADER = process.env.ZAPI_APIKEY_HEADER; // optional header name for API key (eg. x-api-key)

  // WhatsApp Business fallback
  const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
  const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_ID;

  const message = generateOrderMessage(order);

  // Try Z-API first
  try {
    let url: string | undefined;
    if (ZAPI_SEND_URL) {
      url = ZAPI_SEND_URL;
    } else if (ZAPI_INSTANCE_ID && ZAPI_TOKEN) {
      url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/sendText`;
    }

    if (url) {
      const payload = {
        phone: ADMIN_NUMBER,
        message,
      };

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ZAPI_APIKEY_HEADER && ZAPI_TOKEN) headers[ZAPI_APIKEY_HEADER] = ZAPI_TOKEN;

      await axios.post(url, payload, { headers });
      console.log('Mensagem enviada automaticamente via Z-API');
      return true;
    }
  } catch (err) {
    const errMsg = (err && typeof err === 'object')
      ? ((err as any).response?.data || (err as any).message || JSON.stringify(err))
      : String(err);
    console.error('Erro ao enviar via Z-API:', errMsg);
  }

  // Fallback to WhatsApp Business API (Graph API)
  if (WHATSAPP_TOKEN && PHONE_NUMBER_ID) {
    try {
      await axios.post(
        `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          to: ADMIN_NUMBER,
          type: 'text',
          text: { body: message },
        },
        {
          headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
        }
      );
      console.log('Mensagem enviada automaticamente via WhatsApp Business (fallback)');
      return true;
    } catch (err) {
      const errMsg = (err && typeof err === 'object')
        ? ((err as any).response?.data || (err as any).message || JSON.stringify(err))
        : String(err);
      console.error('Erro ao enviar via WhatsApp Business (fallback):', errMsg);
      return false;
    }
  }

  console.warn('Nenhuma configuração de Z-API ou WhatsApp Business encontrada. Mensagem não enviada.');
  return false;
}

export function getWhatsAppMarkupLink(order: OrderData): string {
  const message = generateOrderMessage(order);
  const encodedMessage = encodeURIComponent(message);
  return WHATSAPP_MESSAGE_URL + encodedMessage;
}