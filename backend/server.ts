import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import fs from 'fs/promises';
import prisma from './db';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { MercadoPagoConfig, Payment } from 'mercadopago';

const JWT_SECRET = process.env.JWT_SECRET as string;
const isProd = process.env.NODE_ENV === 'production';

const mercadopagoAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || 'TEST-8225018086266291-020819-cd2a293f4c9e16780ddc5034a732286e-246177773';
const mercadopagoPublicKey = process.env.MERCADO_PAGO_PUBLIC_KEY || 'TEST-47faef05-fa43-43bb-b7e7-43501a862284';

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
            omit: {
                created_at: true, updated_at: true
            }, orderBy: {created_at: 'desc'}
        })
        res.status(200).json(products);
    } catch (error) {
        console.error('Erro ao buscar produtos:', error)
        res.status(500).json({error: 'Erro ao buscar produtos.'})
    }
})

const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (_req, file, cb) => {
        const fileName = `${Date.now()}-${file.originalname}`;
        cb(null, fileName);
    }
});
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

        const imagePath = req.file.path;
        const imageBuffer = await fs.readFile(imagePath);
        
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
                buffer: imageBuffer,
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
            const imagePath = req.file.path;
            const imageBuffer = await fs.readFile(imagePath);
            updateData.image = imageBuffer;
        }

        const updated = await prisma.products.update({
            where: { id },
            data: updateData,
            omit: { created_at: true, updated_at: true }
        });

        if (updateData.image) {
            try {
                imageCache.set(id, {
                    buffer: updateData.image,
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
            payer
        } = req.body;

        if (!amount || !token || !cardHolder || !payer) {
            return res.status(400).json({ error: 'Dados incompletos para o pagamento' });
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
            console.log('Card payment successful:', paymentData.id);
            res.status(200).json({
                success: true,
                paymentId: paymentData.id,
                status: paymentData.status,
                statusDetail: paymentData.status_detail
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
            externalReference
        } = req.body;

        if (!amount || !payer) {
            return res.status(400).json({ error: 'Dados incompletos para o pagamento Pix' });
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
            external_reference: externalReference || `order_${Date.now()}`
        };

        console.log('Processing PIX payment:', createPaymentRequest);

        const paymentData = await paymentClient.create({
            body: createPaymentRequest
        });

        if (paymentData && paymentData.id) {
            const pixQrCode = (paymentData as any).point_of_interaction?.qr_code?.qr_code || null;
            console.log('PIX payment successful:', paymentData.id);

            res.status(200).json({
                success: true,
                paymentId: paymentData.id,
                status: paymentData.status,
                statusDetail: (paymentData as any).status_detail,
                qrCode: pixQrCode,
                pixData: (paymentData as any).point_of_interaction?.qr_code || null
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
        console.log('Webhook Mercado Pago:', req.body);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Erro no webhook:', error);
        res.status(500).json({ error: 'Erro ao processar webhook' });
    }
});

app.use('/api', router);

if (isProd) app.get(/.*/, (req, res) => res.sendFile(path.join(frontend, '/index.html')));

console.log(frontend)
console.log(isProd)

server.listen(port, ()=>console.log(`Servidor rodando em http://localhost:${port}`));