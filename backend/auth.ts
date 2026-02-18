import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from './db';

const JWT_SECRET = process.env.JWT_SECRET as string;
const REFRESH_SECRET = process.env.REFRESH_SECRET || JWT_SECRET + '_refresh';
const isProd = process.env.NODE_ENV === 'production';

const ACCESS_TOKEN_EXPIRES = '15m'; 
const REFRESH_TOKEN_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000;

const BCRYPT_SALT_ROUNDS = 12;

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; 
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_BLOCK_DURATION_MS = 30 * 60 * 1000; 

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  blockedUntil?: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitStore.entries()) {
    if (now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS && (!entry.blockedUntil || now > entry.blockedUntil)) {
      rateLimitStore.delete(ip);
    }
  }
}, 5 * 60 * 1000);

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; remainingAttempts: number; blockedFor?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry) {
    return { allowed: true, remainingAttempts: RATE_LIMIT_MAX_ATTEMPTS };
  }

  if (entry.blockedUntil && now < entry.blockedUntil) {
    return { 
      allowed: false, 
      remainingAttempts: 0, 
      blockedFor: Math.ceil((entry.blockedUntil - now) / 1000 / 60) 
    };
  }

  if (now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.delete(ip);
    return { allowed: true, remainingAttempts: RATE_LIMIT_MAX_ATTEMPTS };
  }

  const remaining = RATE_LIMIT_MAX_ATTEMPTS - entry.attempts;
  return { allowed: remaining > 0, remainingAttempts: Math.max(0, remaining) };
}


function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry) {
    rateLimitStore.set(ip, { attempts: 1, firstAttempt: now });
    return;
  }

  entry.attempts++;

  if (entry.attempts >= RATE_LIMIT_MAX_ATTEMPTS) {
    entry.blockedUntil = now + RATE_LIMIT_BLOCK_DURATION_MS;
    console.warn(`[Auth] IP ${ip} bloqueado por ${RATE_LIMIT_BLOCK_DURATION_MS / 1000 / 60} minutos após ${entry.attempts} tentativas falhas`);
  }
}

function clearRateLimit(ip: string): void {
  rateLimitStore.delete(ip);
}

const csrfTokens = new Map<string, { token: string; expires: number }>();

export function generateCsrfToken(): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + 60 * 60 * 1000;
  csrfTokens.set(token, { token, expires });
  return token;
}

export function validateCsrfToken(token: string): boolean {
  const entry = csrfTokens.get(token);
  if (!entry) return false;
  
  if (Date.now() > entry.expires) {
    csrfTokens.delete(token);
    return false;
  }

  csrfTokens.delete(token);
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of csrfTokens.entries()) {
    if (now > entry.expires) {
      csrfTokens.delete(token);
    }
  }
}, 10 * 60 * 1000);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

interface TokenPayload {
  id: string;
  email: string;
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function saveRefreshToken(
  adminId: string,
  token: string,
  ip: string,
  userAgent: string
): Promise<void> {
  const tokenHash = hashRefreshToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_MS);

  await prisma.refresh_tokens.create({
    data: {
      admin_id: adminId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      ip_address: ip,
      user_agent: userAgent.substring(0, 500), 
    },
  });
}

export async function validateRefreshToken(token: string): Promise<{ admin: any; tokenId: string } | null> {
  const tokenHash = hashRefreshToken(token);

  const refreshToken = await prisma.refresh_tokens.findFirst({
    where: {
      token_hash: tokenHash,
      is_revoked: false,
      expires_at: { gt: new Date() },
    },
    include: { admin: true },
  });

  if (!refreshToken) {
    return null;
  }

  return { admin: refreshToken.admin, tokenId: refreshToken.id };
}

export async function revokeRefreshToken(tokenId: string): Promise<void> {
  await prisma.refresh_tokens.update({
    where: { id: tokenId },
    data: { is_revoked: true },
  });
}

export async function revokeAllRefreshTokens(adminId: string): Promise<void> {
  await prisma.refresh_tokens.updateMany({
    where: { admin_id: adminId },
    data: { is_revoked: true },
  });
}

export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.refresh_tokens.deleteMany({
    where: {
      OR: [
        { expires_at: { lt: new Date() } },
        { is_revoked: true },
      ],
    },
  });
  return result.count;
}

setInterval(async () => {
  try {
    const count = await cleanupExpiredTokens();
    if (count > 0) {
      console.log(`[Auth] Limpeza: ${count} refresh tokens removidos`);
    }
  } catch (error) {
    console.error('[Auth] Erro na limpeza de tokens:', error);
  }
}, 60 * 60 * 1000);

export function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie('refreshToken', token, {
    httpOnly: true,                    
    secure: isProd,                    
    sameSite: 'strict',                
    maxAge: REFRESH_TOKEN_EXPIRES_MS,  
    path: '/api/auth',                
  });
}

export function clearRefreshTokenCookie(res: Response): void {
  res.cookie('refreshToken', '', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: 0,
    path: '/api/auth',
  });
}


export function authMiddleware(req: Request & { admin?: TokenPayload }, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    req.admin = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
}

export function loginRateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const result = checkRateLimit(ip);

  if (!result.allowed) {
    console.warn(`[Auth] Tentativa de login bloqueada para IP: ${ip}`);
    return res.status(429).json({
      error: 'Muitas tentativas de login',
      blockedFor: result.blockedFor,
      message: `Tente novamente em ${result.blockedFor} minutos`,
    });
  }

  (req as any).rateLimitInfo = { ip, remainingAttempts: result.remainingAttempts };
  next();
}

export function csrfMiddleware(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const csrfToken = req.headers['x-csrf-token'] as string;
  
  if (!csrfToken || !validateCsrfToken(csrfToken)) {
    return res.status(403).json({ error: 'Token CSRF inválido' });
  }

  next();
}

export async function loginHandler(req: Request, res: Response) {
  const { email, password } = req.body;
  const { ip } = (req as any).rateLimitInfo || { ip: getClientIp(req) };
  const userAgent = req.headers['user-agent'] || 'unknown';

  console.log(`[Auth DEBUG] Tentativa de login:`);
  console.log(`[Auth DEBUG] Email recebido: "${email}"`);
  console.log(`[Auth DEBUG] Senha recebida: "${password ? '***' : 'VAZIA'}"`);

  try {
    const admin = await prisma.admins.findUnique({ where: { email } });
    console.log(`[Auth DEBUG] Admin encontrado: ${admin ? 'SIM' : 'NÃO'}`);
    if (admin) {
      console.log(`[Auth DEBUG] Email no banco: "${admin.email}"`);
      console.log(`[Auth DEBUG] Hash no banco: "${admin.password.substring(0, 20)}..."`);
    }

    if (!admin) {
      recordFailedAttempt(ip);
      console.log(`[Auth DEBUG] Falha: Admin não encontrado`);
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const isValidPassword = await verifyPassword(password, admin.password);

    console.log(`[Auth DEBUG] Senha válida: ${isValidPassword}`);

    if (!isValidPassword) {
      recordFailedAttempt(ip);
      console.log(`[Auth DEBUG] Falha: Senha inválida`);
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    clearRateLimit(ip);

    const accessToken = generateAccessToken({ id: admin.id, email: admin.email });
    const refreshToken = generateRefreshToken();

    await saveRefreshToken(admin.id, refreshToken, ip, userAgent);

    setRefreshTokenCookie(res, refreshToken);
    const csrfToken = generateCsrfToken();

    console.log(`[Auth] Login bem-sucedido: ${email} (IP: ${ip})`);

    res.json({
      accessToken,
      csrfToken,
      expiresIn: 15 * 60, 
    });
  } catch (error) {
    console.error('[Auth] Erro no login:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
}

export async function refreshHandler(req: Request, res: Response) {
  const refreshToken = req.cookies?.refreshToken;
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'unknown';

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token não encontrado' });
  }

  try {
    const result = await validateRefreshToken(refreshToken);

    if (!result) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({ error: 'Refresh token inválido ou expirado' });
    }

    const { admin, tokenId } = result;

    await revokeRefreshToken(tokenId);

    const newAccessToken = generateAccessToken({ id: admin.id, email: admin.email });
    const newRefreshToken = generateRefreshToken();

    await saveRefreshToken(admin.id, newRefreshToken, ip, userAgent);

    setRefreshTokenCookie(res, newRefreshToken);

    const csrfToken = generateCsrfToken();

    console.log(`[Auth] Token renovado: ${admin.email} (IP: ${ip})`);

    res.json({
      accessToken: newAccessToken,
      csrfToken,
      expiresIn: 15 * 60,
    });
  } catch (error) {
    console.error('[Auth] Erro no refresh:', error);
    clearRefreshTokenCookie(res);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
}

export async function logoutHandler(req: Request, res: Response) {
  const refreshToken = req.cookies?.refreshToken;

  try {
    if (refreshToken) {
      const result = await validateRefreshToken(refreshToken);
      if (result) {
        await revokeRefreshToken(result.tokenId);
      }
    }

    clearRefreshTokenCookie(res);

    console.log('[Auth] Logout realizado');
    res.json({ success: true });
  } catch (error) {
    console.error('[Auth] Erro no logout:', error);
    clearRefreshTokenCookie(res);
    res.json({ success: true });
  }
}

export function getCsrfTokenHandler(req: Request, res: Response) {
  const token = generateCsrfToken();
  res.json({ csrfToken: token });
}

export async function authStatusHandler(req: Request, res: Response) {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    return res.json({ authenticated: false });
  }

  try {
    const result = await validateRefreshToken(refreshToken);
    
    if (!result) {
      return res.json({ authenticated: false });
    }

    res.json({ 
      authenticated: true, 
      email: result.admin.email 
    });
  } catch (error) {
    res.json({ authenticated: false });
  }
}

export default {
  authMiddleware,
  loginRateLimitMiddleware,
  csrfMiddleware,
  loginHandler,
  refreshHandler,
  logoutHandler,
  getCsrfTokenHandler,
  authStatusHandler,
  hashPassword,
  verifyPassword,
};
