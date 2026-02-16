# Integração Mercado Pago - Documentação API

## Visão Geral

Sistema completo de integração com Mercado Pago para pagamentos via PIX e Cartão de Crédito, com webhook para receber notificações e envio automático de pedidos para WhatsApp.

## Checklist de Configuração

✅ **Variaveis de Ambiente Configuradas:**
- `MERCADO_PAGO_PUBLIC_KEY` - Chave pública para produção
- `MERCADO_PAGO_ACESS_TOKEN_KEY` - Token de acesso para produção
- `MERCADO_PAGO_CLIENTE_ID` - ID do cliente
- `MERCADO_PAGO_CLIENTE_SECRET` - Secret do cliente
- `WEBHOOKS_NOTIFICACOES` - Chave para validação de webhook

✅ **Banco de Dados:**
- Tabela `orders` - Armazena dados completos dos pedidos
- Tabela `payments` - Registro de notificações do Mercado Pago
- Enums: `PaymentStatus`, `PaymentMethod`

## Endpoints da API

### 1. Criar Pagamento PIX

**POST** `/api/payment/pix`

**Request Body:**
```json
{
  "amount": 150.50,
  "description": "Compra de produtos - Sabor à Vida",
  "payer": {
    "email": "cliente@email.com",
    "firstName": "João",
    "lastName": "Silva",
    "cpf": "12345678900"
  },
  "externalReference": "order_1234567890",
  "orderData": {
    "customerName": "João Silva",
    "customerEmail": "cliente@email.com",
    "customerPhone": "(79) 98888-8888",
    "customerCpf": "123.456.789-00",
    "addressStreet": "Rua das Flores",
    "addressNumber": "123",
    "addressComplement": "Apto 45",
    "addressNeighborhood": "Centro",
    "addressCity": "Aracaju",
    "addressState": "SE",
    "addressZip": "49000-000",
    "addressReference": "Próximo à praça",
    "addressType": "apartment",
    "deliveryNotes": "Deixar com porteiro",
    "items": [
      {
        "productId": "product-123",
        "name": "Bolo de Chocolate",
        "quantity": 1,
        "price": 120.00
      }
    ],
    "cakeSize": "GRANDE",
    "subtotal": 120.00,
    "deliveryPrice": 30.50,
    "totalPrice": 150.50
  }
}
```

**Response:**
```json
{
  "success": true,
  "paymentId": "1234567890",
  "status": "pending",
  "statusDetail": "pending_waiting_payment",
  "qrCode": "00020126580014br.gov.bcb.pix...",
  "pixData": {
    "qr_code": "00020126580014br.gov.bcb.pix...",
    "in_store_order_id": "order_123"
  },
  "orderReference": "order_1234567890"
}
```

---

### 2. Criar Pagamento com Cartão

**POST** `/api/payment/card`

**Request Body:**
```json
{
  "amount": 150.50,
  "token": "ff8080814c11e8c014c11eec0640000",
  "cardType": "visa",
  "cardHolder": "João Silva",
  "installments": 3,
  "description": "Compra de produtos - Sabor à Vida",
  "payer": {
    "email": "cliente@email.com",
    "firstName": "João",
    "lastName": "Silva",
    "cpf": "12345678900"
  },
  "orderData": {
    "customerName": "João Silva",
    "customerEmail": "cliente@email.com",
    "customerPhone": "(79) 98888-8888",
    "customerCpf": "123.456.789-00",
    "addressStreet": "Rua das Flores",
    "addressNumber": "123",
    "addressComplement": "Apto 45",
    "addressNeighborhood": "Centro",
    "addressCity": "Aracaju",
    "addressState": "SE",
    "addressZip": "49000-000",
    "addressReference": "Próximo à praça",
    "addressType": "apartment",
    "deliveryNotes": "Deixar com porteiro",
    "items": [
      {
        "productId": "product-123",
        "name": "Bolo de Chocolate",
        "quantity": 1,
        "price": 120.00
      }
    ],
    "cakeSize": "GRANDE",
    "subtotal": 120.00,
    "deliveryPrice": 30.50,
    "totalPrice": 150.50
  }
}
```

**Response:**
```json
{
  "success": true,
  "paymentId": "1234567890",
  "status": "approved OR pending",
  "statusDetail": "accredited OR under_review",
  "orderReference": "order_1234567890"
}
```

---

### 3. Webhook - Receber Notificações

**POST** `/api/webhook/mercadopago`

Mercado Pago enviará automáticamente notificações para este endpoint quando:
- Pagamento for aprovado
- Pagamento for rejeitado
- Pagamento for cancelado

**Headers:**
```
x-signature: {assinatura}
x-request-id: {request-id}
```

**Request Body (Example):**
```json
{
  "type": "payment",
  "data": {
    "id": "1234567890"
  }
}
```

**O que acontece automaticamente:**
1. Sistema busca dados completos do pagamento no Mercado Pago
2. Atualiza status do pedido em `orders` e `payments`
3. Se aprovado: **Gera mensagem com dados do pedido para WhatsApp**
4. Registra logs para rastreamento

---

### 4. Obter Link do WhatsApp

**GET** `/api/order/{externalReference}/whatsapp-link`

Retorna um link pré-formatado com todos os dados do pedido para enviar via WhatsApp.

**Response:**
```json
{
  "success": true,
  "whatsappLink": "https://web.whatsapp.com/send?phone=5579981468281&text=...",
  "message": "Link do WhatsApp gerado com sucesso"
}
```

---

### 5. Salvar Pedido Manualmente

**POST** `/api/order`

Para salvar pedidos que não passam por pagamento online.

**Request Body:**
```json
{
  "externalReference": "order_1234567890",
  "customerName": "João Silva",
  "customerEmail": "cliente@email.com",
  "customerPhone": "(79) 98888-8888",
  "customerCpf": "123.456.789-00",
  "addressStreet": "Rua das Flores",
  "addressNumber": "123",
  "addressComplement": "Apto 45",
  "addressNeighborhood": "Centro",
  "addressCity": "Aracaju",
  "addressState": "SE",
  "addressZip": "49000-000",
  "addressReference": "Próximo à praça",
  "addressType": "apartment",
  "deliveryNotes": "Deixar com porteiro",
  "items": [...],
  "cakeSize": "GRANDE",
  "subtotal": 120.00,
  "deliveryPrice": 30.50,
  "totalPrice": 150.50,
  "paymentMethod": "PIX OR CREDIT_CARD OR WHATSAPP",
  "cardLastFour": "4111",
  "installments": 3
}
```

---

## Fluxo de Pagamento

### PIX Flow:
```
1. Cliente seleciona PIX no checkout
   ↓
2. Frontend chama POST /api/payment/pix
   ↓
3. Sistema cria pedido no banco (status: PENDING)
   ↓
4. Mercado Pago retorna QR Code
   ↓
5. Cliente escaneia e paga
   ↓
6. Mercado Pago notifica via webhook
   ↓
7. Sistema atualiza pedido (status: APPROVED)
   ↓
8. Mensagem WhatsApp é gerada automaticamente
```

### Cartão Flow:
```
1. Cliente seleciona Cartão no checkout
   ↓
2. Frontend tokeniza cartão (Mercado Pago.js)
   ↓
3. Frontend chama POST /api/payment/card com token
   ↓
4. Sistema cria pedido no banco
   ↓
5. Processamento imediato
   ↓
6. Se aprovado: Pedido recebe status APPROVED
   ↓
7. Mensagem WhatsApp é gerada automaticamente
```

---

## Modelos de Dados

### Order
```prisma
model orders {
  id                  String         // UUID
  externalReference   String         // Referência única
  customerName        String
  customerEmail       String
  customerPhone       String
  customerCpf         String
  
  // Endereço
  addressStreet       String
  addressNumber       String
  addressComplement   String?
  addressNeighborhood String
  addressCity         String
  addressState        String
  addressZip          String
  addressReference    String?
  addressType         String         // casa, apartamento, trabalho
  deliveryNotes       String?
  
  // Itens
  items               Json           // Array de produtos
  cakeSize            String?        // PEQUENO, MEDIO, GRANDE
  
  // Preços
  subtotal            Decimal
  deliveryPrice       Decimal
  totalPrice          Decimal
  
  // Pagamento
  paymentMethod       PaymentMethod  // PIX | CREDIT_CARD | WHATSAPP
  paymentStatus       PaymentStatus  // PENDING | APPROVED | REJECTED | CANCELLED
  mercadoPagoPaymentId String?
  cardLastFour        String?
  installments        Int?
  
  created_at          DateTime
  updated_at          DateTime
  whatsappSentAt      DateTime?
}

enum PaymentStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

enum PaymentMethod {
  PIX
  CREDIT_CARD
  WHATSAPP
}
```

---

## Mensagem WhatsApp Gerada

Quando um pagamento é aprovado, a seguinte mensagem é automaticamente preparada:

```
🎂 PEDIDO CONFIRMADO - Sabor à Vida

DADOS PESSOAIS
Nome: João Silva
Telefone: (79) 98888-8888
Email: joao@email.com
CPF: 123.456.789-00

ENDEREÇO DE ENTREGA
Rua: Rua das Flores, 123
Complemento: Apto 45
Bairro: Centro
Cidade: Aracaju/SE
CEP: 49000-000
Tipo: Apartamento
Ponto de Referência: Próximo à praça
Observações: Deixar com porteiro

ITENS DO PEDIDO
• Bolo de Chocolate - Qtd: 1 x R$ 120.00 = R$ 120.00

TAMANHO DO BOLO
GRANDE

RESUMO DO PAGAMENTO
Subtotal: R$ 120.00
Entrega: R$ 30.50
TOTAL: R$ 150.50

MÉTODO DE PAGAMENTO
✅ Pagamento Aprovado (PIX)

✅ Pagamento confirmado! Seu pedido será preparado em breve.
```

---

## Configuração Webhook no Mercado Pago

1. Acesse sua conta de produção no Mercado Pago
2. Vá para **Configurações → Webhooks**
3. Adicione a URL:
   ```
   https://seu-dominio.com/api/webhook/mercadopago
   ```
4. Selecione os eventos:
   - `payment.created`
   - `payment.updated`

---

## Variáveis de Ambiente Necessárias

```env
# Banco de Dados
DATABASE_URL="postgresql://..."

# JWT
JWT_SECRET="..."

# Mercado Pago (Produção)
MERCADO_PAGO_PUBLIC_KEY="APP_USR-..."
MERCADO_PAGO_ACESS_TOKEN_KEY="APP_USR-..."
MERCADO_PAGO_CLIENTE_ID="..."
MERCADO_PAGO_CLIENTE_SECRET="..."

# Webhook
WEBHOOKS_NOTIFICACOES="..."

# Ambiente
NODE_ENV="production"
PORT=2923
```

---

## Tratamento de Erros

### Possíveis Erros PIX:
- `400` - Dados incompletos
- `400` - Erro ao gerar Pix
- `500` - Erro ao processar pagamento

### Possíveis Erros Cartão:
- `400` - Token inválido
- `400` - Dados incompletos
- `400` - Cartão recusado
- `500` - Erro ao processar

---

## Próximos Passos

1. **Atualizar Frontend** para enviar `orderData` junto com requisição de pagamento
2. **Configurar Webhook** no dashboard do Mercado Pago
3. **Testar Fluxo Completo:**
   - Pagamento via PIX
   - Pagamento via Cartão
   - Recebimento de webhook
   - Envio WhatsApp automático

---

## Suporte

Para problemas:
- Verifique logs no servidor
- Valide credenciais do Mercado Pago
- Confirme banco de dados está sincronizado
- Teste webhook.site para validar payload
