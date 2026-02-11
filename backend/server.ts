import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import prisma from './db';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { MercadoPagoConfig, Payment } from 'mercadopago';

const JWT_SECRET = process.env.JWT_SECRET as string;
const isProd = process.env.NODE_ENV === 'production';

// Configurar Mercado Pago
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
        const {name, category, description, price, featured, image} = req.body;
        const newProduct = await prisma.products.create({
            data: {
                name, category, description, price,
                featured: featured==='true', image: req.file? `http://localhost:${port}/api/uploads/${req.file.filename}` : image
            },
            omit: {created_at: true, updated_at: true}
        });
        res.status(201).json(newProduct);
    } catch (error) {
        console.error('Erro ao cadastrar produto:', error)
        res.status(500).json({error: 'Erro ao cadastrar produto.'})
    }
})

router.delete('/product/:id', jwtValidate, async(req, res)=>{
    try {
        const id = req.params.id as string;
        await prisma.products.delete({where: {id}});
        res.status(200).json({message: 'Removido com sucesso.'});
    } catch (error) {
        console.error('Erro ao remover produto:', error)
        res.status(500).json({error: 'Erro ao remover produto.'})
    }
})

// Endpoint para pagamento com cartão de crédito
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

        // Validar dados obrigatórios
        if (!amount || !token || !cardHolder || !payer) {
            return res.status(400).json({ error: 'Dados incompletos para o pagamento' });
        }

        // Determinar o payment_method_id baseado no tipo de cartão
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
            token: token, // Token gerado no frontend
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

// Endpoint para pagamento com Pix
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
            // Extrair QR Code do Pix
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

// Endpoint para obter token do cartão (front-end deve chamar)
router.post('/payment/card-token', async(req, res) => {
    try {
        const { cardNumber, cardHolder, expirationMonth, expirationYear, securityCode } = req.body;

        if (!cardNumber || !cardHolder || !expirationMonth || !expirationYear || !securityCode) {
            return res.status(400).json({ error: 'Dados incompletos do cartão' });
        }

        // Remover espaços do número do cartão
        const cleanCardNumber = cardNumber.replace(/\s/g, '');

        // Este endpoint é apenas informativo - a tokenização real deve ser feita no frontend
        // usando a biblioteca JS do Mercado Pago
        res.status(200).json({
            message: 'Use a biblioteca JavaScript do Mercado Pago para tokenizar o cartão',
            publicKey: mercadopagoPublicKey
        });
    } catch (error) {
        console.error('Erro ao gerar token do cartão:', error);
        res.status(500).json({ error: 'Erro ao gerar token do cartão' });
    }
});

// Webhook para notificações do Mercado Pago
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