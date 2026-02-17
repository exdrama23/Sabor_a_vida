import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import fs from 'fs/promises';
import prisma from './db';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { getWhatsAppMarkupLink, OrderData, sendOrderToWhatsApp } from './whatsapp';
import { v2 as cloudinary } from 'cloudinary';
import auth, { 
  authMiddleware, 
  loginRateLimitMiddleware, 
  loginHandler, 
  refreshHandler, 
  logoutHandler,
  getCsrfTokenHandler,
  authStatusHandler 
} from './auth';

console.log('[Server] Iniciando servidor...');

const JWT_SECRET = process.env.JWT_SECRET as string;
const isProd = process.env.NODE_ENV === 'production';

const mercadopagoAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN_KEY || '';
const mercadopagoPublicKey = process.env.MERCADO_PAGO_PUBLIC_KEY || '';
const webhookSignatureKey = process.env.WEBHOOKS_NOTIFICACOES || '';

const clientConfig = new MercadoPagoConfig({ accessToken: mercadopagoAccessToken });
const paymentClient = new Payment(clientConfig);

const app = express();
const port = process.env.PORT || 2923;
const server = http.createServer(app);
app.set('trust proxy', 1);
app.use(cors({
    origin: function(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
        if (!origin) return callback(null, true);

        if (['http://localhost:2923', 'http://localhost:5173', 'https://wealthy-courtney-sabor-a-vida-f6291b31.koyeb.app', 'https://sabor-a-vida.onrender.com'].includes(origin)) {
            return callback(null, true);
        } else {
            return callback(null, false);
        }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Authorization',
        'Content-Type',
        'X-CSRF-Token',
    ],
    exposedHeaders: ['Content-Disposition'],
    credentials: true,
    optionsSuccessStatus: 200,
    maxAge: 24*60*60
}))

app.use(cookieParser());

const frontend = path.join(__dirname, '../../dist');

app.use(express.json());
if (isProd) app.use(express.static(path.join(frontend)));

app.use('/api/uploads', express.static('uploads'));

async function uploadToCloudinary(buffer: Buffer, productId?: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const uploadOptions: any = {
            folder: 'sabor_a_vida/produtos',
            resource_type: 'image',
            format: 'webp', 
            quality: 'auto:good',
            fetch_format: 'auto'
        };
        
        if (productId) {
            uploadOptions.public_id = productId;
            uploadOptions.overwrite = true;
        }

        const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
                if (error) {
                    console.error('Erro no upload Cloudinary:', error);
                    reject(error);
                } else if (result) {
                    resolve(result.secure_url);
                } else {
                    reject(new Error('Upload sem resultado'));
                }
            }
        );
        
        uploadStream.end(buffer);
    });
}

async function deleteFromCloudinary(imageUrl: string): Promise<void> {
    try {
        const urlParts = imageUrl.split('/');
        const folderIndex = urlParts.findIndex(p => p === 'sabor_a_vida');
        if (folderIndex !== -1) {
            const publicIdWithExt = urlParts.slice(folderIndex).join('/');
            const publicId = publicIdWithExt.replace(/\.[^/.]+$/, ''); 
            await cloudinary.uploader.destroy(publicId);
        }
    } catch (error) {
        console.warn('Erro ao deletar imagem do Cloudinary:', error);
    }
}

const jwtValidate = authMiddleware;

const router = express.Router();

router.post('/auth/login', loginRateLimitMiddleware, loginHandler);

router.post('/auth/refresh', refreshHandler);

router.post('/auth/logout', logoutHandler);

router.get('/auth/csrf', getCsrfTokenHandler);

router.get('/auth/status', authStatusHandler);

router.post('/loginadmin', loginRateLimitMiddleware, loginHandler);

router.get('/product/image/:id', async(req: Request, res: Response)=>{
    try {
        const id = req.params.id as string;
        const product = await prisma.products.findUnique({ 
            where: { id },
            select: { imageUrl: true, image: true }
        });

        if (!product) {
            return res.status(404).json({error: 'Produto não encontrado'});
        }

        if (product.imageUrl) {
            return res.redirect(301, product.imageUrl);
        }

        if (!product.image) {
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

        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Content-Length', imageBuffer.length);
        res.setHeader('Cache-Control', 'public, max-age=86400'); 
        res.send(imageBuffer);
    } catch (error) {
        console.error('Erro ao buscar imagem:', error)
        res.status(500).json({error: 'Erro ao buscar imagem.'})
    }
})

router.get('/product', async(req: Request, res: Response)=>{
    try {
        const products = await prisma.products.findMany({
            orderBy: {created_at: 'desc'},
            omit: {
                created_at: true, 
                updated_at: true,
                image: true 
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

router.post('/product', jwtValidate, upload.single('image_file'), async(req: Request, res: Response)=>{
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

        console.log('[Cloudinary] Fazendo upload de nova imagem...');
        const imageUrl = await uploadToCloudinary(req.file.buffer);
        console.log('[Cloudinary] Upload concluído:', imageUrl);
        
        const newProduct = await prisma.products.create({
            data: {
                name, 
                category, 
                description, 
                price: parseFloat(price),
                size: normalizedSize as 'PEQUENO' | 'MEDIO' | 'GRANDE',
                featured: featured === 'true' || featured === true,
                imageUrl // Salva URL do Cloudinary
            },
            omit: {created_at: true, updated_at: true, image: true}
        });

        res.status(201).json(newProduct);
    } catch (error) {
        console.error('Erro ao cadastrar produto:', error)
        res.status(500).json({error: 'Erro ao cadastrar produto.'})
    }
})

router.put('/product/:id', jwtValidate, upload.single('image_file'), async (req: Request, res: Response) => {
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
            console.log('[Cloudinary] Atualizando imagem do produto', id);

            const currentProduct = await prisma.products.findUnique({ 
                where: { id }, 
                select: { imageUrl: true } 
            });

            const newImageUrl = await uploadToCloudinary(req.file.buffer, id);
            updateData.imageUrl = newImageUrl;

            if (currentProduct?.imageUrl) {
                await deleteFromCloudinary(currentProduct.imageUrl);
            }
            
            console.log('[Cloudinary] Imagem atualizada:', newImageUrl);
        }

        const updated = await prisma.products.update({
            where: { id },
            data: updateData,
            omit: { created_at: true, updated_at: true, image: true }
        });

        res.status(200).json(updated);
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        res.status(500).json({ error: 'Erro ao atualizar produto.' });
    }
});

router.delete('/product/:id', jwtValidate, async(req: Request, res: Response)=>{
    try {
        const id = req.params.id as string;
        
        // Busca produto para deletar imagem do Cloudinary
        const product = await prisma.products.findUnique({ 
            where: { id }, 
            select: { imageUrl: true } 
        });
        
        await prisma.products.delete({where: {id}});
        
        // Deleta imagem do Cloudinary
        if (product?.imageUrl) {
            await deleteFromCloudinary(product.imageUrl);
        }
        
        res.status(200).json({message: 'Removido com sucesso.'});
    } catch (error) {
        console.error('Erro ao remover produto:', error)
        res.status(500).json({error: 'Erro ao remover produto.'})
    }
})

router.post('/migrate-images', jwtValidate, async(req: Request, res: Response) => {
    try {
        console.log('[Migração] Iniciando migração de imagens para Cloudinary...');

        const products = await prisma.products.findMany({
            where: {
                image: { not: null },
                imageUrl: null
            },
            select: { id: true, name: true, image: true }
        });

        console.log(`[Migração] ${products.length} produtos para migrar`);
        
        let migrated = 0;
        let failed = 0;
        const errors: string[] = [];

        for (const product of products) {
            try {
                if (!product.image) continue;
                
                let imageBuffer: Buffer;
                if (Buffer.isBuffer(product.image)) {
                    imageBuffer = product.image as Buffer;
                } else {
                    imageBuffer = Buffer.from(product.image as any);
                }

                console.log(`[Migração] Migrando produto: ${product.name} (${product.id})`);
                
                const imageUrl = await uploadToCloudinary(imageBuffer, product.id);
                
                await prisma.products.update({
                    where: { id: product.id },
                    data: { 
                        imageUrl,
                        image: null 
                    }
                });
                
                migrated++;
                console.log(`[Migração] ✓ Produto migrado: ${product.name}`);

                await new Promise(r => setTimeout(r, 500));
                
            } catch (err: any) {
                failed++;
                errors.push(`${product.name}: ${err.message}`);
                console.error(`[Migração] ✗ Erro no produto ${product.name}:`, err.message);
            }
        }

        console.log(`[Migração] Concluída! ${migrated} migrados, ${failed} falhas`);
        
        res.status(200).json({
            success: true,
            message: 'Migração concluída',
            total: products.length,
            migrated,
            failed,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        console.error('Erro na migração:', error);
        res.status(500).json({ error: 'Erro ao migrar imagens' });
    }
})

router.post('/payment/card', async(req: Request, res: Response) => {
    try {
        const { 
            amount, 
            token, 
            cardType,
            cardHolder, 
            installments,
            description,
            payer,
            orderData 
        } = req.body;

        if (!amount || !token || !cardHolder || !payer) {
            return res.status(400).json({ error: 'Dados incompletos para o pagamento' });
        }

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

        const phoneClean = orderData?.customerPhone?.replace(/\D/g, '') || '';
        const phoneAreaCode = phoneClean.slice(0, 2) || '11';
        const phoneNumber = phoneClean.slice(2) || '';

        const webhookUrl = isProd 
            ? 'https://sabor-a-vida.onrender.com/api/webhook/mercadopago'
            : 'http://localhost:2923/api/webhook/mercadopago';

        const items = orderData?.items?.map((item: any, index: number) => ({
            id: item.productId || `item_${index}`,
            title: item.name || 'Produto',
            description: item.size ? `Tamanho: ${item.size}` : 'Produto Sabor à Vida',
            category_id: 'food',
            quantity: item.quantity || 1,
            unit_price: parseFloat(item.price) || 0
        })) || [];

        const createPaymentRequest = {
            transaction_amount: parseFloat(amount),
            payment_method_id: paymentMethodId,
            installments: parseInt(installments) || 1,
            description: description || 'Compra - Sabor à Vida',
            statement_descriptor: 'SABOR A VIDA',
            notification_url: webhookUrl,
            token: token,
            external_reference: externalReference,
            payer: {
                email: payer.email,
                first_name: payer.firstName,
                last_name: payer.lastName,
                identification: {
                    type: 'CPF',
                    number: payer.cpf?.replace(/\D/g, '') || ''
                },
                phone: {
                    area_code: phoneAreaCode,
                    number: phoneNumber
                },
                address: orderData ? {
                    zip_code: orderData.addressZip?.replace(/\D/g, '') || '',
                    street_name: orderData.addressStreet || '',
                    street_number: orderData.addressNumber || '',
                    neighborhood: orderData.addressNeighborhood || '',
                    city: orderData.addressCity || '',
                    federal_unit: orderData.addressState || ''
                } : undefined
            },
            additional_info: {
                items: items.length > 0 ? items : undefined,
                payer: {
                    first_name: payer.firstName,
                    last_name: payer.lastName,
                    phone: {
                        area_code: phoneAreaCode,
                        number: phoneNumber
                    },
                    address: orderData ? {
                        zip_code: orderData.addressZip?.replace(/\D/g, '') || '',
                        street_name: orderData.addressStreet || '',
                        street_number: orderData.addressNumber || ''
                    } : undefined
                },
                shipments: orderData ? {
                    receiver_address: {
                        zip_code: orderData.addressZip?.replace(/\D/g, '') || '',
                        street_name: orderData.addressStreet || '',
                        street_number: orderData.addressNumber || '',
                        floor: orderData.addressComplement || ''
                    }
                } : undefined
            }
        };

        console.log('Processing card payment:', { ...createPaymentRequest, token: '***' });

        const paymentData = await paymentClient.create({
            body: createPaymentRequest
        });

        if (paymentData && paymentData.id) {
            console.log('Card payment successful:', paymentData.id, 'Status:', paymentData.status);

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

router.post('/payment/pix', async(req: Request, res: Response) => {
    try {
        const { 
            amount, 
            description, 
            payer,
            externalReference,
            orderData
        } = req.body;

        console.log('=== PIX PAYMENT REQUEST ===' );
        console.log('Amount:', amount);
        console.log('Payer:', JSON.stringify(payer, null, 2));
        console.log('OrderData presente:', !!orderData);

        if (!amount) {
            console.log('ERRO: amount está vazio ou undefined');
            return res.status(400).json({ error: 'Valor do pagamento é obrigatório', field: 'amount' });
        }

        if (!payer) {
            console.log('ERRO: payer está vazio ou undefined');
            return res.status(400).json({ error: 'Dados do pagador são obrigatórios', field: 'payer' });
        }

        if (!payer.cpf) {
            console.log('ERRO: payer.cpf está vazio ou undefined');
            return res.status(400).json({ error: 'CPF é obrigatório para Pix', field: 'cpf' });
        }

        const cpfClean = payer.cpf?.replace(/\D/g, '') || '';
        if (cpfClean.length !== 11) {
            console.log('ERRO: CPF inválido, tamanho:', cpfClean.length);
            return res.status(400).json({ error: 'CPF deve ter 11 dígitos', field: 'cpf' });
        }

        if (!payer.email) {
            console.log('ERRO: payer.email está vazio ou undefined');
            return res.status(400).json({ error: 'Email é obrigatório', field: 'email' });
        }

        const firstName = (payer.firstName && payer.firstName.trim()) || 'Cliente';
        const lastName = (payer.lastName && payer.lastName.trim()) || 'Sabor a Vida';
        
        console.log('Nome processado: firstName=', firstName, 'lastName=', lastName);

        const amountParsed = parseFloat(amount);
        if (isNaN(amountParsed) || amountParsed <= 0) {
            console.log('ERRO: amount inválido:', amount);
            return res.status(400).json({ error: 'Valor do pagamento deve ser maior que zero', field: 'amount' });
        }

        if (orderData) {
            const subtotal = parseFloat(orderData.subtotal);
            const deliveryPrice = parseFloat(orderData.deliveryPrice);
            const totalPrice = parseFloat(orderData.totalPrice);
            
            console.log('OrderData valores: subtotal=', subtotal, 'delivery=', deliveryPrice, 'total=', totalPrice);
            
            if (isNaN(subtotal) || isNaN(deliveryPrice) || isNaN(totalPrice)) {
                console.log('ERRO: valores numéricos inválidos no orderData');
                return res.status(400).json({ error: 'Valores de subtotal, frete ou total inválidos', field: 'orderData' });
            }
        }

        const finalExternalReference = externalReference || `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        if (orderData) {
            try {
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
            } catch (orderError) {
                console.error('Erro ao criar pedido no banco:', orderError);
                return res.status(500).json({ error: 'Erro ao salvar pedido', details: orderError instanceof Error ? orderError.message : 'Erro desconhecido' });
            }
        }

        const phoneClean = orderData?.customerPhone?.replace(/\D/g, '') || '';
        const phoneAreaCode = phoneClean.slice(0, 2) || '11';
        const phoneNumber = phoneClean.slice(2) || '';

        const webhookUrl = isProd 
            ? 'https://sabor-a-vida.onrender.com/api/webhook/mercadopago'
            : 'http://localhost:2923/api/webhook/mercadopago';

        const items = orderData?.items?.map((item: any, index: number) => ({
            id: item.productId || `item_${index}`,
            title: item.name || 'Produto',
            description: item.size ? `Tamanho: ${item.size}` : 'Produto Sabor à Vida',
            category_id: 'food',
            quantity: item.quantity || 1,
            unit_price: parseFloat(item.price) || 0
        })) || [];

        const createPaymentRequest = {
            transaction_amount: parseFloat(amount),
            payment_method_id: 'pix',
            description: description || 'Compra - Sabor à Vida',
            statement_descriptor: 'SABOR A VIDA',
            notification_url: webhookUrl,
            payer: {
                email: payer.email,
                first_name: firstName,
                last_name: lastName,
                identification: {
                    type: 'CPF',
                    number: payer.cpf?.replace(/\D/g, '') || ''
                },
                phone: {
                    area_code: phoneAreaCode,
                    number: phoneNumber
                },
                address: orderData ? {
                    zip_code: orderData.addressZip?.replace(/\D/g, '') || '',
                    street_name: orderData.addressStreet || '',
                    street_number: orderData.addressNumber || '',
                    neighborhood: orderData.addressNeighborhood || '',
                    city: orderData.addressCity || '',
                    federal_unit: orderData.addressState || ''
                } : undefined
            },
            external_reference: finalExternalReference,
            additional_info: {
                items: items.length > 0 ? items : undefined,
                payer: {
                    first_name: firstName,
                    last_name: lastName,
                    phone: {
                        area_code: phoneAreaCode,
                        number: phoneNumber
                    },
                    address: orderData ? {
                        zip_code: orderData.addressZip?.replace(/\D/g, '') || '',
                        street_name: orderData.addressStreet || '',
                        street_number: orderData.addressNumber || ''
                    } : undefined
                },
                shipments: orderData ? {
                    receiver_address: {
                        zip_code: orderData.addressZip?.replace(/\D/g, '') || '',
                        street_name: orderData.addressStreet || '',
                        street_number: orderData.addressNumber || '',
                        floor: orderData.addressComplement || ''
                    }
                } : undefined
            }
        };

        console.log('Processing PIX payment:', JSON.stringify(createPaymentRequest, null, 2));

        let paymentData;
        try {
            paymentData = await paymentClient.create({
                body: createPaymentRequest
            });
        } catch (mpError: any) {
            console.error('=== ERRO MERCADO PAGO ===');
            console.error('Mensagem:', mpError?.message);
            console.error('Causa:', mpError?.cause);
            console.error('Response:', JSON.stringify(mpError?.response?.data || mpError?.cause, null, 2));

            const errorDetails = mpError?.cause?.[0]?.description 
                || mpError?.response?.data?.message 
                || mpError?.message 
                || 'Erro desconhecido do Mercado Pago';
            
            return res.status(400).json({ 
                error: 'Erro ao criar pagamento no Mercado Pago',
                details: errorDetails,
                mpCause: mpError?.cause || null
            });
        }

        if (paymentData && paymentData.id) {
            const transactionData = (paymentData as any).point_of_interaction?.transaction_data;

            const qrCode = transactionData?.qr_code || null;
            const qrCodeBase64 = transactionData?.qr_code_base64 || null;
            console.log('PIX payment successful:', paymentData.id, 'Amount:', amountParsed);

            res.status(200).json({
                success: true,
                paymentId: paymentData.id,
                status: paymentData.status,
                statusDetail: (paymentData as any).status_detail,
                qrCode,              
                qrCodeBase64,        
                orderReference: finalExternalReference,
                amount: amountParsed
            });
        } else {
            console.error('PIX payment failed:', paymentData);
            res.status(400).json({ 
                error: 'Erro ao gerar Pix',
                details: (paymentData as any)?.message || 'Unknown error'
            });
        }
    } catch (error: any) {
        console.error('Erro ao processar pagamento Pix:', error);
        
        if (error?.cause) {
            console.error('Causa do erro:', error.cause);
        }
        if (error?.response?.data) {
            console.error('Resposta do Mercado Pago:', JSON.stringify(error.response.data, null, 2));
        }
        
        const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
        const mpError = error?.response?.data?.message || error?.cause?.message || null;
        
        res.status(500).json({ 
            error: 'Erro ao processar pagamento Pix',
            details: mpError || errorMsg
        });
    }
});

router.get('/order/status/:externalReference', async(req: Request, res: Response) => {
    try {
        const externalReference = req.params.externalReference as string;

        const order = await prisma.orders.findUnique({
            where: { externalReference },
            select: {
                id: true,
                externalReference: true,
                paymentStatus: true,
                mercadoPagoPaymentId: true,
                customerName: true,
                updated_at: true
            }
        });

        if (!order) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }

        res.status(200).json({
            success: true,
            order: {
                id: order.id,
                externalReference: order.externalReference,
                paymentStatus: order.paymentStatus,
                mercadoPagoPaymentId: order.mercadoPagoPaymentId,
                customerName: order.customerName,
                updatedAt: order.updated_at
            }
        });
    } catch (error) {
        console.error('Erro ao verificar status do pedido:', error);
        res.status(500).json({ error: 'Erro ao verificar status do pedido' });
    }
});

router.post('/payment/card-token', async(req: Request, res: Response) => {
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

router.post('/webhook/mercadopago', async(req: Request, res: Response) => {
    try {
        console.log('=== WEBHOOK MERCADO PAGO RECEBIDO ===');
        console.log('Headers:', JSON.stringify(req.headers, null, 2));
        console.log('Body:', JSON.stringify(req.body, null, 2));
        console.log('Query:', JSON.stringify(req.query, null, 2));

        let type = req.body?.type || req.body?.action || req.query?.type;
        let paymentId = req.body?.data?.id || req.query?.['data.id'];

        if (!paymentId && req.body?.id) {
            paymentId = req.body.id;
        }

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

        const dbStatus = status === 'approved' ? 'APPROVED' : status === 'rejected' ? 'REJECTED' : status === 'cancelled' ? 'CANCELLED' : 'PENDING';

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
            console.log(`[OK] Payment record saved/updated with status: ${dbStatus}`);
        } catch (dbError) {
            console.error('Erro ao salvar payment no banco:', dbError);
        }

        try {
            await prisma.orders.updateMany({
                where: { externalReference },
                data: {
                    paymentStatus: dbStatus,
                    mercadoPagoPaymentId: String(paymentId),
                    updated_at: new Date()
                }
            });
            console.log(`[OK] Order updated with payment status: ${dbStatus}`);
        } catch (orderUpdateError) {
            console.error('Erro ao atualizar order no banco:', orderUpdateError);
        }

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
            }
        } else if (status === 'rejected' || status === 'cancelled') {
            console.log(`Payment ${status}, order marked as failed`);
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Erro no webhook:', error);
        res.status(200).json({ success: false, error: 'Internal error processing webhook' });
    }
});

router.post('/order', async(req: Request, res: Response) => {
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


router.get('/order/:externalReference/whatsapp-link', async(req: Request, res: Response) => {
    try {
        const externalReference = req.params.externalReference as string;

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

router.get('/orders', async(req: Request, res: Response) => {
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

router.get('/payments', async(req: Request, res: Response) => {
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

router.put('/order/:id/complete', jwtValidate, async(req: Request, res: Response) => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

        const updated = await prisma.orders.update({
            where: { id },
            data: { 
                deliveryStatus: 'DELIVERED',
                deliveredAt: new Date(),
                updated_at: new Date()
            }
        });

        res.status(200).json({ success: true, order: updated });
    } catch (error) {
        console.error('Erro ao concluir pedido:', error);
        res.status(500).json({ error: 'Erro ao concluir pedido' });
    }
});

router.delete('/logs/cleanup', jwtValidate, async(req: Request, res: Response) => {
    try {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const deletedPayments = await prisma.payments.deleteMany({
            where: {
                created_at: {
                    lt: oneYearAgo
                }
            }
        });

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

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

async function getCoordinatesFromCep(cep: string): Promise<{lat: number, lng: number} | null> {
    try {
        const cepClean = cep.replace(/\D/g, '');
        
        const viaCepResponse = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`);
        const viaCepData = await viaCepResponse.json() as { 
            erro?: boolean; 
            logradouro?: string; 
            bairro?: string; 
            localidade?: string; 
            uf?: string; 
        };
        
        if (viaCepData.erro) {
            console.log('CEP não encontrado no ViaCEP:', cepClean);
            return null;
        }

        const address = `${viaCepData.logradouro || ''}, ${viaCepData.bairro || ''}, ${viaCepData.localidade || ''}, ${viaCepData.uf || ''}, Brasil`;
        const encodedAddress = encodeURIComponent(address);
        
        const nominatimResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
            {
                headers: {
                    'User-Agent': 'SaborAVida-DeliveryCalc/1.0'
                }
            }
        );
        
        const nominatimData = await nominatimResponse.json() as Array<{ lat: string; lon: string }>;
        
        if (nominatimData && nominatimData.length > 0) {
            return {
                lat: parseFloat(nominatimData[0].lat),
                lng: parseFloat(nominatimData[0].lon)
            };
        }

        const cityAddress = `${viaCepData.localidade || ''}, ${viaCepData.uf || ''}, Brasil`;
        const cityResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityAddress)}&limit=1`,
            {
                headers: {
                    'User-Agent': 'SaborAVida-DeliveryCalc/1.0'
                }
            }
        );
        
        const cityData = await cityResponse.json() as Array<{ lat: string; lon: string }>;
        
        if (cityData && cityData.length > 0) {
            return {
                lat: parseFloat(cityData[0].lat),
                lng: parseFloat(cityData[0].lon)
            };
        }
        
        return null;
    } catch (error) {
        console.error('Erro ao buscar coordenadas:', error);
        return null;
    }
}

router.get('/delivery/config', async(req: Request, res: Response) => {
    try {
        const config = await prisma.delivery_config.findFirst({
            where: { isActive: true },
            include: {
                delivery_ranges: {
                    orderBy: { minKm: 'asc' }
                }
            }
        });

        res.status(200).json({ 
            success: true, 
            config: config || null 
        });
    } catch (error) {
        console.error('Erro ao buscar config de frete:', error);
        res.status(500).json({ error: 'Erro ao buscar configuração de frete' });
    }
});

router.post('/delivery/config', jwtValidate, async(req: Request, res: Response) => {
    try {
        const { 
            originCep, 
            originAddress, 
            originNumber,
            originNeighborhood, 
            originCity, 
            originState,
            ranges 
        } = req.body;

        if (!originCep || !originAddress || !originCity || !originState) {
            return res.status(400).json({ error: 'Dados de endereço incompletos' });
        }

        if (!ranges || !Array.isArray(ranges) || ranges.length === 0) {
            return res.status(400).json({ error: 'Faixas de preço são obrigatórias' });
        }

        const coords = await getCoordinatesFromCep(originCep);

        await prisma.delivery_config.updateMany({
            where: { isActive: true },
            data: { isActive: false }
        });

        const newConfig = await prisma.delivery_config.create({
            data: {
                originCep: originCep.replace(/\D/g, ''),
                originAddress,
                originNumber: originNumber || 'S/N',
                originNeighborhood: originNeighborhood || '',
                originCity,
                originState,
                originLat: coords?.lat || null,
                originLng: coords?.lng || null,
                isActive: true,
                delivery_ranges: {
                    create: ranges.map((range: any) => ({
                        minKm: parseFloat(range.minKm),
                        maxKm: parseFloat(range.maxKm),
                        price: parseFloat(range.price)
                    }))
                }
            },
            include: {
                delivery_ranges: {
                    orderBy: { minKm: 'asc' }
                }
            }
        });

        console.log('Config de frete criada:', newConfig.id, 'Coords:', coords);

        res.status(200).json({ 
            success: true, 
            config: newConfig,
            message: 'Configuração de frete salva com sucesso'
        });
    } catch (error) {
        console.error('Erro ao salvar config de frete:', error);
        res.status(500).json({ error: 'Erro ao salvar configuração de frete' });
    }
});

router.post('/delivery/calculate', async(req: Request, res: Response) => {
    try {
        const { cep } = req.body;

        if (!cep) {
            return res.status(400).json({ error: 'CEP é obrigatório' });
        }

        const config = await prisma.delivery_config.findFirst({
            where: { isActive: true },
            include: {
                delivery_ranges: {
                    orderBy: { minKm: 'asc' }
                }
            }
        });

        if (!config) {
            return res.status(200).json({ 
                success: true, 
                deliveryPrice: 0,
                distance: null,
                noConfig: true,
                message: 'Configure o frete na área administrativa'
            });
        }

        let originLat = config.originLat ? Number(config.originLat) : null;
        let originLng = config.originLng ? Number(config.originLng) : null;

        if (!originLat || !originLng) {
            const originCoords = await getCoordinatesFromCep(config.originCep);
            if (originCoords) {
                originLat = originCoords.lat;
                originLng = originCoords.lng;

                await prisma.delivery_config.update({
                    where: { id: config.id },
                    data: { 
                        originLat: originCoords.lat, 
                        originLng: originCoords.lng 
                    }
                });
            }
        }

        if (!originLat || !originLng) {
            return res.status(200).json({ 
                success: true, 
                deliveryPrice: 0,
                distance: null,
                message: 'Não foi possível calcular distância - frete grátis'
            });
        }

        const destCoords = await getCoordinatesFromCep(cep);

        if (!destCoords) {
            return res.status(200).json({ 
                success: true, 
                deliveryPrice: 0,
                distance: null,
                message: 'CEP de destino não encontrado - frete grátis'
            });
        }

        const distance = haversineDistance(
            originLat, 
            originLng, 
            destCoords.lat, 
            destCoords.lng
        );

        console.log('Cálculo de frete - Origem:', originLat, originLng, 'Destino:', destCoords, 'Distância:', distance.toFixed(2), 'km');

        let deliveryPrice = 0;
        let rangeFound = false;

        for (const range of config.delivery_ranges) {
            const minKm = Number(range.minKm);
            const maxKm = Number(range.maxKm);
            const price = Number(range.price);

            if (distance >= minKm && distance < maxKm) {
                deliveryPrice = price;
                rangeFound = true;
                break;
            }
        }

        if (!rangeFound && config.delivery_ranges.length > 0) {
            const lastRange = config.delivery_ranges[config.delivery_ranges.length - 1];
            const maxConfiguredKm = Number(lastRange.maxKm);
            
            if (distance >= maxConfiguredKm) {
                return res.status(200).json({ 
                    success: true, 
                    deliveryPrice: -1, 
                    distance: parseFloat(distance.toFixed(2)),
                    outOfRange: true,
                    message: `Fora da área de entrega (${distance.toFixed(1)} km). Máximo: ${maxConfiguredKm} km`
                });
            }
            deliveryPrice = Number(lastRange.price);
        }

        res.status(200).json({ 
            success: true, 
            deliveryPrice,
            distance: parseFloat(distance.toFixed(2)),
            message: deliveryPrice === 0 ? 'Frete grátis!' : `Taxa de entrega: R$ ${deliveryPrice.toFixed(2)}`
        });
    } catch (error) {
        console.error('Erro ao calcular frete:', error);
        res.status(500).json({ error: 'Erro ao calcular frete' });
    }
});

router.delete('/delivery/config/:id', jwtValidate, async(req: Request, res: Response) => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

        await prisma.delivery_config.delete({
            where: { id }
        });

        res.status(200).json({ 
            success: true, 
            message: 'Configuração deletada com sucesso'
        });
    } catch (error) {
        console.error('Erro ao deletar config de frete:', error);
        res.status(500).json({ error: 'Erro ao deletar configuração' });
    }
});

console.log('[Server] Registrando rotas...');
app.use('/api', router);
console.log('[Server] Rotas registradas!');

if (isProd) app.get(/.*/, (req: Request, res: Response) => res.sendFile(path.join(frontend, '/index.html')));

console.log(frontend)
console.log(isProd)

server.listen(port, ()=>console.log(`Servidor rodando em http://localhost:${port}`));