export const PUBLIC_KEY = 'TEST-47faef05-fa43-43bb-b7e7-43501a862284';

export function initMercadoPago() {
  if (typeof window !== 'undefined' && (window as any).MercadoPago) {
    return new (window as any).MercadoPago(PUBLIC_KEY, { locale: 'pt-BR' });
  }
  return null;
}

export async function tokenizeCard(
  cardData: {
    number: string;
    name: string;
    expiration_month: number;
    expiration_year: number;
    security_code: string;
  }
) {
  try {
    let attempts = 0;
    while (attempts < 50 && !(window as any).MercadoPago?.cardToken) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!(window as any).MercadoPago?.cardToken) {
      throw new Error('Mercado Pago SDK not fully loaded');
    }

    const token = await (window as any).MercadoPago.cardToken.create({
      cardNumber: cardData.number.replace(/\s/g, ''),
      cardholderName: cardData.name,
      cardExpirationMonth: String(cardData.expiration_month).padStart(2, '0'),
      cardExpirationYear: String(cardData.expiration_year),
      securityCode: cardData.security_code,
    });

    if (token.status !== 200) {
      throw new Error('Tokenization failed: ' + (token.cause?.[0]?.description || 'Unknown error'));
    }

    return token.data;
  } catch (error) {
    console.error('Error tokenizing card:', error);
    throw new Error(`Card tokenization error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function getMercadoPagoInstance() {
  if (typeof window !== 'undefined' && (window as any).MercadoPago) {
    return new (window as any).MercadoPago(PUBLIC_KEY, { locale: 'pt-BR' });
  }
  return null;
}
