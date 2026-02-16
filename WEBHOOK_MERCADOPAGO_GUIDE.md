# Guia Completo: Webhook do Mercado Pago

## 📋 Visão Geral

Este guia explica como funciona o webhook do Mercado Pago e como testá-lo localmente e em produção.

### O que é um Webhook?

Um webhook é uma notificação HTTP POST que o Mercado Pago envia para seu servidor quando um pagamento muda de status. Isto permite que você:

- ✅ Aprove automaticamente pagamentos
- 📦 Prepare pedidos quando pagamento for confirmado
- ⚠️ Rejeite pedidos quando pagamento falhar
- 📲 Notifique o admin via WhatsApp/SMS

---

## 🔧 Como Implementar no Seu Servidor

### 1. Variáveis de Ambiente Necessárias

Adicione ao seu `.env`:

```env
# Mercado Pago (obrigatório para webhook)
MERCADO_PAGO_ACESS_TOKEN_KEY=YOUR_ACCESS_TOKEN
MERCADO_PAGO_PUBLIC_KEY=YOUR_PUBLIC_KEY
WEBHOOKS_NOTIFICACOES=YOUR_WEBHOOK_SIGNATURE_KEY

# Z-API (para notificação via WhatsApp - opcional)
ZAPI_INSTANCE_ID=your_instance_id
ZAPI_TOKEN=your_api_token

# Fallback WhatsApp Business (opcional)
WHATSAPP_TOKEN=your_fb_token
WHATSAPP_PHONE_ID=your_phone_id
ADMIN_WHATSAPP_NUMBER=557999113824
```

**Como obter as chaves:**
- **ACCESS_TOKEN**: Dashboard Mercado Pago → Credenciais → Código de autorização
- **PUBLIC_KEY**: Dashboard Mercado Pago → Credenciais → Chave pública
- **WEBHOOK_SIGNATURE_KEY**: Dashboard Mercado Pago → Webhooks → Segurança → Chave para assinatura

---

## 🛠️ Fluxo do Webhook

```
┌──────────────────┐
│ Cliente paga via │
│ Mercado Pago     │
└────────┬─────────┘
         │
         ↓
┌──────────────────────────────┐
│ Mercado Pago processa        │
│ pagamento (aprovado/rejeitado)
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│ MP envia POST para:          │
│ https://seu-servidor/webhook │
│ Com assinatura HMAC-SHA256   │
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│ Seu servidor:                │
│ 1. Valida assinatura         │
│ 2. Busca dados do pagamento  │
│ 3. Atualiza DB              │
│ 4. Envia WhatsApp admin     │
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│ Retorna 200 OK ao MP         │
└──────────────────────────────┘
```

---

## 🔐 Validação de Assinatura

O Mercado Pago envia 3 headers para validar a autenticidade:

```javascript
// Headers do webhook:
x-signature: "abc123def456..."
x-request-id: "abc-123"
x-timestamp: "1707926400000"

// Seu servidor valida assim:
HMAC-SHA256(timestamp.request_id, WEBHOOK_SIGNATURE_KEY) === x-signature
```

**Nosso código valida:**
- ✅ Assinatura HMAC-SHA256
- ✅ Timestamp (rejeita > 5 min antigas)
- ✅ Headers obrigatórios presentes

---

## 📝 Configurar URL do Webhook no Painel

### Via Dashboard Web (Recomendado)

1. Acesse: https://www.mercadopago.com.br/developers/panel
2. Vá a **Configurações** → **Webhooks** → **URLs de notificação**
3. Clique em **+ Adicionar webhook**
4. Preencha:
   - **URL**: `https://seu-dominio.com/api/webhook/mercadopago`
   - **Eventos**: Selecione `payment` (Pagamento)
5. Clique em **Adicionar webhook**

### Via API

```bash
curl -X POST https://api.mercadopago.com/v1/notifications/webhooks \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://seu-dominio.com/api/webhook/mercadopago",
    "events": ["payment.created", "payment.updated"]
  }'
```

---

## 🧪 Testar Webhook Localmente com ngrok

### 1. Instalar ngrok

```bash
# Windows (Chocolatey)
choco install ngrok

# macOS (Homebrew)
brew install ngrok

# Linux (manual)
curl https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-linux-amd64.zip -o ngrok.zip
unzip ngrok.zip
sudo mv ngrok /usr/local/bin
```

### 2. Criar Tunel HTTP

```bash
ngrok http 2923
```

Output esperado:
```
Forwarding    https://abc123.ngrok.io -> http://localhost:2923
```

### 3. Configurar URL Temporária no Painel

Use a URL do ngrok como webhook temporário:
```
https://abc123.ngrok.io/api/webhook/mercadopago
```

### 4. Testar Webhook Manualmente

```bash
curl -X POST https://abc123.ngrok.io/api/webhook/mercadopago \
  -H "x-signature: test-signature" \
  -H "x-request-id: test-123" \
  -H "x-timestamp: $(date +%s)000" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment",
    "data": {
      "id": 123456789
    }
  }'
```

### 5. Ver Logs em Tempo Real

No ngrok:
```bash
ngrok http 2923 --log=stdout
```

No seu servidor:
```bash
# Terminal onde está rodando o node
npm run dev
```

---

## 🧪 Simular Pagamento no Mercado Pago (Sandbox)

### 1. Usar Conta Sandbox

Mercado Pago oferece ambiente de testes:

```env
# Use credenciais SANDBOX
MERCADO_PAGO_ACESS_TOKEN_KEY=TEST_ACCESS_TOKEN_...
```

### 2. Criar Pagamento de Teste

```bash
curl -X POST https://api.sandbox.mercadopago.com/v1/payments \
  -H "Authorization: Bearer TEST_ACCESS_TOKEN_..." \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_amount": 100,
    "payment_method_id": "visa",
    "payer": {
      "email": "test@test.com"
    },
    "token": "TEST_CARD_TOKEN",
    "external_reference": "order_12345"
  }'
```

Respostas esperadas:
```json
{
  "id": 123456,
  "status": "approved",
  "external_reference": "order_12345"
}
```

### 3. Testar Webhook Manualmente

Após criar pagamento, simule o webhook:

```bash
curl -X POST https://abc123.ngrok.io/api/webhook/mercadopago \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment",
    "data": { "id": 123456 }
  }'
```

---

## 🔒 Boas Práticas de Segurança

### 1. Sempre Validar Assinatura ✅

```typescript
// Seu código já faz isso:
if (webhookSignatureKey) {
    const hmac = crypto.createHmac('sha256', webhookSignatureKey);
    hmac.update(`${timestamp}.${requestId}`);
    const expectedSignature = hmac.digest('hex');
    
    if (signature !== expectedSignature) {
        return res.status(401).json({ error: 'Invalid signature' });
    }
}
```

### 2. Verificar Timestamp ✅

Rejeite webhooks muito antigos (> 5 min):

```typescript
const timeDiff = Math.abs(currentTime - webhookTime);
if (timeDiff > 5 * 60 * 1000) {
    return res.status(401).json({ error: 'Request too old' });
}
```

### 3. Usar HTTPS em Produção ✅

- Sempre use HTTPS na URL do webhook
- Mercado Pago não aceita HTTP em produção

### 4. Implementar Idempotência ✅

```typescript
// Se receber webhook duplicado, não processa 2x:
await prisma.payments.upsert({
    where: { mercadoPagoId: String(paymentId) },
    update: { /* ... */ },
    create: { /* ... */ }
});
```

### 5. Log de Segurança ✅

```typescript
console.log('🔔 Webhook recebido');
console.log('✓ Signature validated');
console.log(`Processing payment: ${paymentId}`);
```

### 6. Nunca Processar Webhook 2x ✅

Sempre retorne 200 OK, mesmo em caso de erro:

```typescript
res.status(200).json({ success: true }); // Confirma ao MP
```

Se houver erro, Mercado Pago tentará novamente depois.

### 7. Proteger Credenciais 🔐

```
# ❌ NÃO faça:
const secret = "abc123"; // Hardcoded!

# ✅ FAÇA:
const secret = process.env.WEBHOOKS_NOTIFICACOES; // Variável de ambiente
```

### 8. Rate Limiting (Opcional)

```typescript
// Adicione rate limiting se receber muitos webhooks:
const rateLimit = require('express-rate-limit');

const webhookLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 100 // max 100 requests por minuto
});

router.post('/webhook/mercadopago', webhookLimiter, async(req, res) => {
    // ... webhook code
});
```

---

## 📊 Fluxo Completo: Pagamento Aprovado

```
1️⃣  Cliente clica "Pagar via Cartão"
       ↓
2️⃣  Frontend cria pagamento via POST /payment/card
       ↓
3️⃣  Backend salva order com status "PENDING"
       ↓
4️⃣  Mercado Pago valida cartão
       ↓
5️⃣  MP envia webhook POST /webhook/mercadopago
       ↓
6️⃣  Seu servidor:
     - Valida assinatura ✓
     - Busca pagamento via Mercado Pago API ✓
     - Atualiza order.paymentStatus = "APPROVED" ✓
     - Envia message ao admin via Z-API ✓
       ↓
7️⃣  Admin recebe mensagem no WhatsApp
       ↓
8️⃣  Admin prepara o bolo 🎂
```

---

## 🔍 Troubleshooting

### Webhook não chega?

1. Verifique se URL está correta (com `/api/webhook/mercadopago`)
2. Verifique firewall / CORS
3. Use ngrok para testar localmente
4. Verifique logs do Mercado Pago no painel

### Assinatura inválida?

1. Copie `WEBHOOKS_NOTIFICACOES` corretamente do painel
2. Verifique timestamp (não pode estar 2+ horas atrasado)
3. Verifique se está usando JWT_SECRET correto

### WhatsApp não notifica?

1. Verifique se `ZAPI_TOKEN` e `ZAPI_INSTANCE_ID` estão configurados
2. Ou configure `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_ID` para fallback
3. Verifique logs: `console.error('Erro ao enviar WhatsApp')`

---

## 📚 Referências

- [Documentação Mercado Pago Webhooks](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/how-tos/notifications/webhooks)
- [API Mercado Pago - Get Payment](https://www.mercadopago.com.br/developers/pt/docs/payment-gateway/get-payment)
- [ngrok Documentation](https://ngrok.com/docs)
- [HMAC-SHA256 Validation](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/sign)

---

## ✅ Checklist antes de Ir Para Produção

- [ ] Configurou `MERCADO_PAGO_ACESS_TOKEN_KEY` em produção
- [ ] Configurou `WEBHOOKS_NOTIFICACOES` (chave de assinatura)
- [ ] URL webhook está em HTTPS
- [ ] Registrou webhook no painel (não ngrok)
- [ ] Testou pagamento real (ou sandbox)
- [ ] Verificou logs após pagamento
- [ ] WhatsApp notifica quando pagamento aprovado
- [ ] Admin recebe notificação de novo pedido
- [ ] Banco de dados atualiza status corretamente
- [ ] Tratamento de erro: retorna 200 mesmo em falha

---

**Criado em**: 14 de Fevereiro de 2026
**Última atualização**: 14 de Fevereiro de 2026
