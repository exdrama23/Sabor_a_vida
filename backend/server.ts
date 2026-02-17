import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import fs from 'fs/promises';
import prisma from './db';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import crypto  from 'crypto';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { getWhatsAppMarkupLink, OrderData, sendOrderToWhatsApp } from './whatsapp';

console.log('🚀 Iniciando servidor...');

const JWT_SECRET = process.env.JWT_SECRET as string;
const isProd = process.env.NODE_ENV === 'production';

// Usar credenciais de produção do Mercado Pago
const mercadopagoAccessToken = process.env.MERCADO_PAGO_ACESS_TOKEN_KEY || process.env.MERCADO_PAGO_ACESS_TOKEN || '';
const mercadopagoPublicKey = process.env.MERCADO_PAGO_PUBLIC_KEY || '';
const webhookSignatureKey = process.env.WEBHOOKS_NOTIFICACOES || '';

const clientConfig = new MercadoPagoConfig({ accessToken: mercadopagoAccessToken });
const paymentClient = new Payment(clientConfig);

const app = express();
const port = process.env.PORT || 2923;
const server = http.createServer(app);
app.set('trust proxy', 1);
app.use(cors({
    origin: function(origin, callback) {
        if (!origin) return callback(null, true);

        if (['http://localhost:2923', 'http://localhost:5173', 'https://wealthy-courtney-sabor-a-vida-f6291b31.koyeb.app'].includes(origin)) {
            return callback(null, true);
        } else {
            return callback(null, false);
        }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Authorization',
        'Content-Type',
    ],
    exposedHeaders: ['Content-Disposition'],
    credentials: true,
    optionsSuccessStatus: 200,
    maxAge: 24*60*60
}))

const frontend = path.join(__dirname, '../../dist');

app.use(express.json());
if (isProd) app.use(express.static(path.join(frontend)));

app.use('/api/uploads', express.static('uploads'));

type ImageCacheEntry = {
    buffer: Buffer;
    contentType: string;
    expiresAt: number;
};

const IMAGE_CACHE_TTL_MS = 1000 * 60 * 60;
const imageCache = new Map<string, ImageCacheEntry>();

function jwtValidate(req: Request & {admin?: object}, res: Response, next: NextFunction){
    const accessToken = req.headers.authorization?.split(' ')[1];
    if(!accessToken) return res.status(401).json({error: 'AccessToken deve ser fornecido.'});

    try {
        const admin = jwt.verify(accessToken, JWT_SECRET);
        req.admin = admin as jwt.JwtPayload;
        next()
    } catch (err) {
        if(err instanceof jwt.TokenExpiredError){
            return res.status(401).json({error: 'Sessão expirada.'})
        }
        res.status(401).json({error: 'Sessão inválida.'})
    }
}

const router = express.Router();

router.post('/loginadmin', async(req, res)=>{
    try {
        const {email, password} = req.body;

        const admin = await prisma.admins.findUnique({where: {email}});
        if(!admin || password !== admin.password) return res.status(400).json({error: 'Credenciais inválidas.'});

        const accessToken = jwt.sign({id: admin.id, email}, JWT_SECRET, { expiresIn: '2h' });

        res.status(200).json({accessToken});
    } catch (error) {
        console.error('Erro ao fazer login:', error)
        res.status(500).json({error: 'Erro ao fazer login.'})
    }
})

router.get('/product/image/:id', async(req, res)=>{
    try {
        const id = req.params.id as string;

        const cached = imageCache.get(id);
        if (cached && Date.now() < cached.expiresAt) {
            res.setHeader('Content-Type', cached.contentType);
            res.setHeader('Content-Length', cached.buffer.length);
            res.setHeader('Cache-Control', 'public, max-age=3600');
            return res.send(cached.buffer);
        }

        const product = await prisma.products.findUnique({ where: { id } });

        if (!product || !product.image) {
            return res.status(404).json({error: 'Imagem não encontrada'});
        }


        let imageBuffer: Buffer;
        if (Buffer.isBuffer(product.image)) {
            imageBuffer = product.image as Buffer;
        } else if (typeof product.image === 'string') {
            imageBuffer = Buffer.from(product.image, 'binary');
        } else {
            imageBuffer = Buffer.from(product.image as any);
        }

        const contentType = 'image/jpeg';

        imageCache.set(id, {
            buffer: imageBuffer,
            contentType,
            expiresAt: Date.now() + IMAGE_CACHE_TTL_MS
        });

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', imageBuffer.length);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.send(imageBuffer);
    } catch (error) {
        console.error('Erro ao buscar imagem:', error)
        res.status(500).json({error: 'Erro ao buscar imagem.'})
    }
})

router.get('/product', async(req, res)=>{
    try {
        const products = await prisma.products.findMany({
            orderBy: {created_at: 'desc'},
            omit: {
                created_at: true, 
                updated_at: true
            }
        })
        res.status(200).json(products);
    } catch (error) {
        console.error('Erro ao buscar produtos:', error)
        res.status(500).json({error: 'Erro ao buscar produtos.'})
    }
})

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/product', jwtValidate, upload.single('image_file'), async(req, res)=>{
     try {
        const {name, category, description, price, featured, size} = req.body;
        
        if (!name || !price || !size) {
            return res.status(400).json({
                error: 'Nome, preço e tamanho são obrigatórios.'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                error: 'Imagem é obrigatória.'
            });
        }

        const validSizes = ['PEQUENO', 'MEDIO', 'GRANDE'] as const;
        const normalizedSize = String(size).toUpperCase();
        
        if (!normalizedSize || !validSizes.includes(normalizedSize as any)) {
            return res.status(400).json({error: `Tamanho inválido. Use: ${validSizes.join(', ')}`});
        }

        // memoryStorage armazena em buffer, não em path
        // Converter Buffer para Uint8Array para compatibilidade com Prisma
        const imageBuffer = new Uint8Array(req.file.buffer);
        
        const newProduct = await prisma.products.create({
            data: {
                name, 
                category, 
                description, 
                price: parseFloat(price),
                size: normalizedSize as 'PEQUENO' | 'MEDIO' | 'GRANDE',
                featured: featured === 'true' || featured === true,
                image: imageBuffer
            },
            omit: {created_at: true, updated_at: true}
        });

        try {
            imageCache.set(newProduct.id, {
                buffer: Buffer.from(imageBuffer),
                contentType: 'image/jpeg',
                expiresAt: Date.now() + IMAGE_CACHE_TTL_MS
            });
        } catch (err) {
            console.warn('Não foi possível armazenar imagem no cache:', err);
        }
        res.status(201).json(newProduct);
    } catch (error) {
        console.error('Erro ao cadastrar produto:', error)
        res.status(500).json({error: 'Erro ao cadastrar produto.'})
    }
})

router.put('/product/:id', jwtValidate, upload.single('image_file'), async (req, res) => {
    try {
        const id = req.params.id as string;
        const { name, category, description, price, featured, size } = req.body;

        const updateData: any = {};
        if (typeof name !== 'undefined') updateData.name = name;
        if (typeof category !== 'undefined') updateData.category = category;
        if (typeof description !== 'undefined') updateData.description = description;
        if (typeof price !== 'undefined' && price !== '') updateData.price = parseFloat(price);
        if (typeof size !== 'undefined') updateData.size = size;
        if (typeof featured !== 'undefined') updateData.featured = featured === 'true' || featured === true;

        if (req.file) {
            // Converter Buffer para Uint8Array para compatibilidade com Prisma
            updateData.image = new Uint8Array(req.file.buffer);
        }

        const updated = await prisma.products.update({
            where: { id },
            data: updateData,
            omit: { created_at: true, updated_at: true }
        });

        if (updateData.image) {
            try {
                imageCache.set(id, {
                    buffer: Buffer.from(updateData.image),
                    contentType: 'image/jpeg',
                    expiresAt: Date.now() + IMAGE_CACHE_TTL_MS
                });
            } catch (err) {
                console.warn('Não foi possível atualizar cache de imagem:', err);
            }
        }

        res.status(200).json(updated);
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        res.status(500).json({ error: 'Erro ao atualizar produto.' });
    }
});

router.delete('/product/:id', jwtValidate, async(req, res)=>{
    try {
        const id = req.params.id as string;
        await prisma.products.delete({where: {id}});
        try { imageCache.delete(id); } catch (err) {}
        res.status(200).json({message: 'Removido com sucesso.'});
    } catch (error) {
        console.error('Erro ao remover produto:', error)
        res.status(500).json({error: 'Erro ao remover produto.'})
    }
})

router.post('/payment/card', async(req, res) => {
    try {
        const { 
            amount, 
            token, 
            cardType,
            cardHolder, 
            installments,
            description,
            payer,
            orderData // Novos dados do pedido
        } = req.body;

        if (!amount || !token || !cardHolder || !payer) {
            return res.status(400).json({ error: 'Dados incompletos para o pagamento' });
        }

        // Primeiro, salvar o pedido
        const externalReference = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        if (orderData) {
            await prisma.orders.create({
                data: {
                    externalReference,
                    customerName: orderData.customerName,
                    customerEmail: orderData.customerEmail,
                    customerPhone: orderData.customerPhone,
                    customerCpf: orderData.customerCpf,
                    addressStreet: orderData.addressStreet,
                    addressNumber: orderData.addressNumber,
                    addressComplement: orderData.addressComplement || null,
                    addressNeighborhood: orderData.addressNeighborhood,
                    addressCity: orderData.addressCity,
                    addressState: orderData.addressState,
                    addressZip: orderData.addressZip,
                    addressReference: orderData.addressReference || null,
                    addressType: orderData.addressType,
                    deliveryNotes: orderData.deliveryNotes || null,
                    items: orderData.items || [],
                    cakeSize: orderData.cakeSize || null,
                    subtotal: parseFloat(orderData.subtotal),
                    deliveryPrice: parseFloat(orderData.deliveryPrice),
                    totalPrice: parseFloat(orderData.totalPrice),
                    paymentMethod: 'CREDIT_CARD',
                    paymentStatus: 'PENDING',
                    cardLastFour: (token as string).slice(-4),
                    installments: parseInt(installments) || 1
                }
            });
        }

        let paymentMethodId = 'credit_card';
        if (cardType) {
            const cardTypeMap: Record<string, string> = {
                'visa': 'visa',
                'mastercard': 'mastercard',
                'amex': 'amex',
                'elo': 'elo',
                'hipercard': 'hipercard'
            };
            paymentMethodId = cardTypeMap[cardType.toLowerCase()] || 'credit_card';
        }

        const createPaymentRequest = {
            transaction_amount: parseFloat(amount),
            payment_method_id: paymentMethodId,
            installments: parseInt(installments) || 1,
            description: description || 'Compra - Sabor à Vida',
            token: token,
            external_reference: externalReference,
            payer: {
                email: payer.email,
                first_name: payer.firstName,
                last_name: payer.lastName,
                identification: {
                    type: 'CPF',
                    number: payer.cpf?.replace(/\D/g, '') || ''
                }
            }
        };

        console.log('Processing card payment:', { ...createPaymentRequest, token: '***' });

        const paymentData = await paymentClient.create({
            body: createPaymentRequest
        });

        if (paymentData && paymentData.id) {
            console.log('Card payment successful:', paymentData.id, 'Status:', paymentData.status);

            // Se o pagamento foi aprovado imediatamente, atualizar o pedido
            if (paymentData.status === 'approved') {
                try {
                    await prisma.orders.updateMany({
                        where: { externalReference },
                        data: {
                            paymentStatus: 'APPROVED',
                            mercadoPagoPaymentId: String(paymentData.id),
                            updated_at: new Date()
                        }
                    });
                    console.log('Order updated with approved status');
                } catch (updateError) {
                    console.error('Error updating order status:', updateError);
                }
            }

            res.status(200).json({
                success: true,
                paymentId: paymentData.id,
                status: paymentData.status,
                statusDetail: (paymentData as any).status_detail,
                orderReference: externalReference
            });
        } else {
            console.error('Card payment failed:', paymentData);
            res.status(400).json({ 
                error: 'Erro ao processar pagamento com cartão',
                details: (paymentData as any)?.message || 'Unknown error'
            });
        }
    } catch (error) {
        console.error('Erro ao processar pagamento com cartão:', error);
        const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
        res.status(500).json({ 
            error: 'Erro ao processar pagamento com cartão',
            details: errorMsg
        });
    }
});

router.post('/payment/pix', async(req, res) => {
    try {
        const { 
            amount, 
            description, 
            payer,
            externalReference,
            orderData // Novos dados do pedido
        } = req.body;

        if (!amount || !payer) {
            return res.status(400).json({ error: 'Dados incompletos para o pagamento Pix' });
        }

        const finalExternalReference = externalReference || `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Primeiro, salvar o pedido
        if (orderData) {
            await prisma.orders.create({
                data: {
                    externalReference: finalExternalReference,
                    customerName: orderData.customerName,
                    customerEmail: orderData.customerEmail,
                    customerPhone: orderData.customerPhone,
                    customerCpf: orderData.customerCpf,
                    addressStreet: orderData.addressStreet,
                    addressNumber: orderData.addressNumber,
                    addressComplement: orderData.addressComplement || null,
                    addressNeighborhood: orderData.addressNeighborhood,
                    addressCity: orderData.addressCity,
                    addressState: orderData.addressState,
                    addressZip: orderData.addressZip,
                    addressReference: orderData.addressReference || null,
                    addressType: orderData.addressType,
                    deliveryNotes: orderData.deliveryNotes || null,
                    items: orderData.items || [],
                    cakeSize: orderData.cakeSize || null,
                    subtotal: parseFloat(orderData.subtotal),
                    deliveryPrice: parseFloat(orderData.deliveryPrice),
                    totalPrice: parseFloat(orderData.totalPrice),
                    paymentMethod: 'PIX',
                    paymentStatus: 'PENDING'
                }
            });
        }

        const createPaymentRequest = {
            transaction_amount: parseFloat(amount),
            payment_method_id: 'pix',
            description: description || 'Compra - Sabor à Vida',
            payer: {
                email: payer.email,
                first_name: payer.firstName,
                last_name: payer.lastName,
                identification: {
                    type: 'CPF',
                    number: payer.cpf?.replace(/\D/g, '') || ''
                }
            },
            external_reference: finalExternalReference
        };

        console.log('Processing PIX payment:', createPaymentRequest);

        const paymentData = await paymentClient.create({
            body: createPaymentRequest
        });

        if (paymentData && paymentData.id) {
            // const pixQrCode = (paymentData as any).point_of_interaction?.qr_code?.qr_code || null;
            const transactionData = (paymentData as any).point_of_interaction?.transaction_data;

            const qrCode = transactionData?.qr_code || null;
            const qrCodeBase64 = transactionData?.qr_code_base64 || null;
            console.log('PIX payment successful:', paymentData.id);

            // res.status(200).json({
            //     success: true,
            //     paymentId: paymentData.id,
            //     status: paymentData.status,
            //     statusDetail: (paymentData as any).status_detail,
            //     qrCode: pixQrCode,
            //     pixData: (paymentData as any).point_of_interaction?.qr_code || null,
            //     orderReference: finalExternalReference
            // });
            res.status(200).json({
                success: true,
                paymentId: paymentData.id,
                status: paymentData.status,
                statusDetail: (paymentData as any).status_detail,
                qrCode,              
                qrCodeBase64,        
                orderReference: finalExternalReference
            });
        } else {
            console.error('PIX payment failed:', paymentData);
            res.status(400).json({ 
                error: 'Erro ao gerar Pix',
                details: (paymentData as any)?.message || 'Unknown error'
            });
        }
    } catch (error) {
        console.error('Erro ao processar pagamento Pix:', error);
        const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
        res.status(500).json({ 
            error: 'Erro ao processar pagamento Pix',
            details: errorMsg
        });
    }
});

router.post('/payment/card-token', async(req, res) => {
    try {
        const { cardNumber, cardHolder, expirationMonth, expirationYear, securityCode } = req.body;

        if (!cardNumber || !cardHolder || !expirationMonth || !expirationYear || !securityCode) {
            return res.status(400).json({ error: 'Dados incompletos do cartão' });
        }

        const cleanCardNumber = cardNumber.replace(/\s/g, '');

        res.status(200).json({
            message: 'Use a biblioteca JavaScript do Mercado Pago para tokenizar o cartão',
            publicKey: mercadopagoPublicKey
        });
    } catch (error) {
        console.error('Erro ao gerar token do cartão:', error);
        res.status(500).json({ error: 'Erro ao gerar token do cartão' });
    }
});

router.post('/webhook/mercadopago', async(req, res) => {
    try {
        console.log('=== WEBHOOK MERCADO PAGO RECEBIDO ===');
        console.log('Headers:', JSON.stringify(req.headers, null, 2));
        console.log('Body:', JSON.stringify(req.body, null, 2));
        console.log('Query:', JSON.stringify(req.query, null, 2));

        // O Mercado Pago envia webhooks de duas formas:
        // 1. IPN (Instant Payment Notification) com action e data.id no body
        // 2. Webhook com type e data.id no body
        // 3. Query params: ?type=payment&data.id=123

        // Verificar tipo de notificação
        let type = req.body?.type || req.body?.action || req.query?.type;
        let paymentId = req.body?.data?.id || req.query?.['data.id'];

        // Formato alternativo IPN
        if (!paymentId && req.body?.id) {
            paymentId = req.body.id;
        }

        // Formato topic/id (IPN antigo)
        if (!paymentId && req.query?.topic === 'payment' && req.query?.id) {
            paymentId = req.query.id;
            type = 'payment';
        }

        console.log(`Tipo de notificação: ${type}, Payment ID: ${paymentId}`);

        if (type !== 'payment' && type !== 'payment.created' && type !== 'payment.updated') {
            console.log(`Ignoring webhook type: ${type}`);
            return res.status(200).json({ success: true, message: 'Ignored - not a payment notification' });
        }

        if (!paymentId) {
            console.error('Payment ID não encontrado no webhook');
            console.log('Body completo:', req.body);
            return res.status(200).json({ success: true, message: 'No payment ID' });
        }

        console.log(`=== Processando pagamento ID: ${paymentId} ===`);

        // Buscar dados do pagamento do Mercado Pago usando SDKv2
        let paymentData;
        try {
            paymentData = await paymentClient.get({ id: String(paymentId) });
            console.log('Dados do pagamento do MP:', JSON.stringify(paymentData, null, 2));
        } catch (fetchError) {
            console.error('Erro ao buscar dados do pagamento:', fetchError);
            return res.status(500).json({ error: 'Failed to fetch payment data from Mercado Pago' });
        }

        const externalReference = (paymentData as any).external_reference;
        const status = (paymentData as any).status;
        const statusDetail = (paymentData as any).status_detail;
        const transactionAmount = (paymentData as any).transaction_amount;
        const paymentMethodId = (paymentData as any).payment_method_id;

        console.log(`External Reference: ${externalReference}`);
        console.log(`Status: ${status} - ${statusDetail}`);
        console.log(`Amount: ${transactionAmount}`);
        console.log(`Payment Method: ${paymentMethodId}`);

        if (!externalReference) {
            console.warn('No external_reference found in payment data');
            return res.status(200).json({ success: true, message: 'No external reference' });
        }

        // Mapear status do Mercado Pago para status do banco
        const dbStatus = status === 'approved' ? 'APPROVED' : status === 'rejected' ? 'REJECTED' : status === 'cancelled' ? 'CANCELLED' : 'PENDING';

        // Salvar dados do pagamento no banco
        try {
            await prisma.payments.upsert({
                where: { mercadoPagoId: String(paymentId) },
                update: {
                    status: dbStatus,
                    statusDetail: statusDetail || null,
                    webhookData: paymentData as any,
                    updated_at: new Date()
                },
                create: {
                    mercadoPagoId: String(paymentId),
                    orderExternalRef: externalReference,
                    status: dbStatus,
                    statusDetail: statusDetail || null,
                    transactionAmount: (paymentData as any).transaction_amount || 0,
                    paymentMethodId: (paymentData as any).payment_method_id || 'unknown',
                    webhookData: paymentData as any
                }
            });
            console.log(`✓ Payment record saved/updated with status: ${dbStatus}`);
        } catch (dbError) {
            console.error('Erro ao salvar payment no banco:', dbError);
            // Continua mesmo se falhar para tentar atualizar order
        }

        // Atualizar pedido no banco com novo status
        try {
            await prisma.orders.updateMany({
                where: { externalReference },
                data: {
                    paymentStatus: dbStatus,
                    mercadoPagoPaymentId: String(paymentId),
                    updated_at: new Date()
                }
            });
            console.log(`✓ Order updated with payment status: ${dbStatus}`);
        } catch (orderUpdateError) {
            console.error('Erro ao atualizar order no banco:', orderUpdateError);
        }

        // Se pagamento foi aprovado, enviar notificação ao WhatsApp admin
        if (status === 'approved') {
            try {
                const fullOrder = await prisma.orders.findFirst({
                    where: { externalReference }
                });

                if (fullOrder) {
                    console.log(`Pedido encontrado: ${fullOrder.customerName}`);

                    const orderData: OrderData = {
                        customerName: fullOrder.customerName,
                        customerEmail: fullOrder.customerEmail,
                        customerPhone: fullOrder.customerPhone,
                        customerCpf: fullOrder.customerCpf,
                        addressStreet: fullOrder.addressStreet,
                        addressNumber: fullOrder.addressNumber,
                        addressComplement: fullOrder.addressComplement || undefined,
                        addressNeighborhood: fullOrder.addressNeighborhood,
                        addressCity: fullOrder.addressCity,
                        addressState: fullOrder.addressState,
                        addressZip: fullOrder.addressZip,
                        addressReference: fullOrder.addressReference || undefined,
                        addressType: fullOrder.addressType || undefined,
                        deliveryNotes: fullOrder.deliveryNotes || undefined,
                        items: (fullOrder.items as any) || [],
                        cakeSize: fullOrder.cakeSize || undefined,
                        subtotal: Number(fullOrder.subtotal),
                        deliveryPrice: Number(fullOrder.deliveryPrice),
                        totalPrice: Number(fullOrder.totalPrice),
                        paymentMethod: fullOrder.paymentMethod,
                        paymentStatus: 'APPROVED',
                        cardLastFour: fullOrder.cardLastFour || undefined,
                        installments: fullOrder.installments || undefined
                    };

                    // Enviar para WhatsApp via Z-API ou Business API (com fallback)
                    const whatsappSent = await sendOrderToWhatsApp(orderData);
                    if (whatsappSent) {
                        console.log('WhatsApp notification sent successfully');
                    } else {
                        console.warn('WhatsApp notification failed, but continuing');
                    }
                } else {
                    console.warn(`Order not found for external reference: ${externalReference}`);
                }
            } catch (whatsappError) {
                console.error('Erro ao enviar WhatsApp:', whatsappError);
                // Não falha o webhook por erro no WhatsApp
            }
        } else if (status === 'rejected' || status === 'cancelled') {
            console.log(`Payment ${status}, order marked as failed`);
        }

        // Sempre retornar 200 para confirmar ao Mercado Pago
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Erro no webhook:', error);
        // Retornar 200 mesmo em caso de erro (para Mercado Pago não ficar tentando)
        res.status(200).json({ success: false, error: 'Internal error processing webhook' });
    }
});

// Novo endpoint para salvar pedido
router.post('/order', async(req, res) => {
    try {
        const {
            customerName,
            customerEmail,
            customerPhone,
            customerCpf,
            addressStreet,
            addressNumber,
            addressComplement,
            addressNeighborhood,
            addressCity,
            addressState,
            addressZip,
            addressReference,
            addressType,
            deliveryNotes,
            items,
            cakeSize,
            subtotal,
            deliveryPrice,
            totalPrice,
            paymentMethod,
            externalReference,
            cardLastFour,
            installments
        } = req.body;

        if (!externalReference) {
            return res.status(400).json({ error: 'External reference é obrigatório' });
        }

        // Criar pedido
        const order = await prisma.orders.create({
            data: {
                externalReference,
                customerName,
                customerEmail,
                customerPhone,
                customerCpf,
                addressStreet,
                addressNumber,
                addressComplement: addressComplement || null,
                addressNeighborhood,
                addressCity,
                addressState,
                addressZip,
                addressReference: addressReference || null,
                addressType,
                deliveryNotes: deliveryNotes || null,
                items: items || [],
                cakeSize: cakeSize || null,
                subtotal: parseFloat(subtotal),
                deliveryPrice: parseFloat(deliveryPrice),
                totalPrice: parseFloat(totalPrice),
                paymentMethod,
                paymentStatus: 'PENDING',
                cardLastFour: cardLastFour || null,
                installments: installments || null
            }
        });

        res.status(201).json({ success: true, orderId: order.id });
    } catch (error) {
        console.error('Erro ao criar pedido:', error);
        res.status(500).json({ error: 'Erro ao criar pedido' });
    }
});


router.get('/order/:externalReference/whatsapp-link', async(req, res) => {
    try {
        const { externalReference } = req.params;

        const order = await prisma.orders.findUnique({
            where: { externalReference }
        });

        if (!order) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }

        const orderData: OrderData = {
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            customerPhone: order.customerPhone,
            customerCpf: order.customerCpf,
            addressStreet: order.addressStreet,
            addressNumber: order.addressNumber,
            addressComplement: order.addressComplement || undefined,
            addressNeighborhood: order.addressNeighborhood,
            addressCity: order.addressCity,
            addressState: order.addressState,
            addressZip: order.addressZip,
            addressReference: order.addressReference || undefined,
            items: (order.items as any) || [],
            cakeSize: order.cakeSize || undefined,
            subtotal: Number(order.subtotal),
            deliveryPrice: Number(order.deliveryPrice),
            totalPrice: Number(order.totalPrice),
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            cardLastFour: order.cardLastFour || undefined,
            installments: order.installments || undefined
        };

        const whatsappLink = getWhatsAppMarkupLink(orderData);

        res.status(200).json({
            success: true,
            whatsappLink,
            message: 'Link do WhatsApp gerado com sucesso'
        });
    } catch (error) {
        console.error('Erro ao gerar link WhatsApp:', error);
        res.status(500).json({ error: 'Erro ao gerar link WhatsApp' });
    }
});

// Listar todos os pedidos
router.get('/orders', async(req, res) => {
    try {
        const orders = await prisma.orders.findMany({
            orderBy: { created_at: 'desc' }
        });
        res.status(200).json(orders);
    } catch (error) {
        console.error('Erro ao listar pedidos:', error);
        res.status(500).json({ error: 'Erro ao listar pedidos' });
    }
});

// Listar todos os pagamentos
router.get('/payments', async(req, res) => {
    try {
        const payments = await prisma.payments.findMany({
            orderBy: { created_at: 'desc' }
        });
        res.status(200).json(payments);
    } catch (error) {
        console.error('Erro ao listar pagamentos:', error);
        res.status(500).json({ error: 'Erro ao listar pagamentos' });
    }
});

// Marcar pedido como concluído (atualiza o status do pagamento para APPROVED)
router.put('/order/:id/complete', jwtValidate, async(req, res) => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

        const updated = await prisma.orders.update({
            where: { id },
            data: { 
                paymentStatus: 'APPROVED',
                updated_at: new Date()
            }
        });

        res.status(200).json({ success: true, order: updated });
    } catch (error) {
        console.error('Erro ao concluir pedido:', error);
        res.status(500).json({ error: 'Erro ao concluir pedido' });
    }
});

// Deletar logs com mais de 1 ano
router.delete('/logs/cleanup', jwtValidate, async(req, res) => {
    try {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        // Deletar pagamentos antigos
        const deletedPayments = await prisma.payments.deleteMany({
            where: {
                created_at: {
                    lt: oneYearAgo
                }
            }
        });

        // Deletar pedidos antigos
        const deletedOrders = await prisma.orders.deleteMany({
            where: {
                created_at: {
                    lt: oneYearAgo
                }
            }
        });

        res.status(200).json({
            success: true,
            deletedPayments: deletedPayments.count,
            deletedOrders: deletedOrders.count,
            message: 'Limpeza de logs realizada com sucesso'
        });
    } catch (error) {
        console.error('Erro ao limpar logs:', error);
        res.status(500).json({ error: 'Erro ao limpar logs' });
    }
});

app.use('/api', router);

if (isProd) app.get(/.*/, (req, res) => res.sendFile(path.join(frontend, '/index.html')));

console.log(frontend)
console.log(isProd)

server.listen(port, ()=>console.log(`Servidor rodando em http://localhost:${port}`));