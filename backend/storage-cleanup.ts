import prisma from './db.js';
import { Prisma } from './generated/prisma/client.js';

async function cleanup() {
    console.log('Iniciando limpeza de armazenamento...\n');

    try {
        const productsWithImage = await prisma.products.findMany({
            where: { image: { not: null } },
            select: { id: true, name: true, imageUrl: true }
        });

        if (productsWithImage.length > 0) {
            console.log(`Encontrados ${productsWithImage.length} produtos com imagem legado:`);
            for (const p of productsWithImage) {
                console.log(`   - ${p.name} (ID: ${p.id}) - Cloudinary: ${p.imageUrl ? '✅' : '❌'}`);
            }

            const result = await prisma.products.updateMany({
                where: { 
                    image: { not: null },
                    imageUrl: { not: null }
                },
                data: { image: null }
            });
            console.log(` ${result.count} imagens legado removidas (mantidas ${productsWithImage.length - result.count} sem Cloudinary)\n`);
        } else {
            console.log(' Nenhuma imagem legado encontrada nos produtos\n');
        }

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const webhooksCleared = await prisma.payments.updateMany({
            where: {
                created_at: { lt: sevenDaysAgo },
                webhookData: { not: Prisma.DbNull }
            },
            data: { webhookData: Prisma.DbNull }
        });
        console.log(` ${webhooksCleared.count} webhookData antigos limpos\n`);

        const tokensDeleted = await prisma.refresh_tokens.deleteMany({
            where: {
                OR: [
                    { expires_at: { lt: new Date() } },
                    { is_revoked: true }
                ]
            }
        });
        console.log(`${tokensDeleted.count} refresh tokens removidos\n`);

        const [products, payments, orders, tokens] = await Promise.all([
            prisma.products.count(),
            prisma.payments.count(),
            prisma.orders.count(),
            prisma.refresh_tokens.count()
        ]);

        console.log(' Estado atual do banco:');
        console.log(` - Produtos: ${products}`);
        console.log(` - Pagamentos: ${payments}`);
        console.log(` - Pedidos: ${orders}`);
        console.log(` - Refresh Tokens: ${tokens}`);

        console.log('\nLimpeza concluída!');
        console.log('Dica: A limpeza automática roda a cada 24h no servidor');

    } catch (error) {
        console.error('Erro durante limpeza:', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanup();
