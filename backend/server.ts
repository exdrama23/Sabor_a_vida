import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import prisma from './db';
import jwt from 'jsonwebtoken';
import multer from 'multer';

const JWT_SECRET = process.env.JWT_SECRET as string;
const isProd = process.env.NODE_ENV === 'production';

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

app.use('/api', router);

if (isProd) app.get(/.*/, (req, res) => res.sendFile(path.join(frontend, '/index.html')));

console.log(frontend)
console.log(isProd)

server.listen(port, ()=>console.log(`Servidor rodando em http://localhost:${port}`));