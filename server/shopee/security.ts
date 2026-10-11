import { LogEntry } from './types.ts';

// Domínios estritamente autorizados da Shopee
const ALLOWED_SHOPEE_DOMAINS = [
  'shopee.com.br',
  'shp.ee',
  'shope.ee',
  'open-api.affiliate.shopee.com.br',
  'affiliate.shopee.com.br',
];

// Faixas de IP bloqueadas para mitigação rigorosa de SSRF
const BLOCKED_IP_PATTERNS = [
  /^localhost$/i,
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^0\.0\.0\.0$/,
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/,
  /^169\.254\.\d{1,3}\.\d{1,3}$/, // Link-local / metadata AWS/GCP
  /^::1$/,
  /^fe80:/i,
  /^fc00:/i,
  /^fd00:/i,
];

/**
 * Validação rigorosa de URLs para prevenir SSRF e acessos indevidos.
 */
export function validateShopeeUrl(rawUrl: string): { valid: boolean; normalizedUrl?: string; error?: string } {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'A URL do produto é obrigatória e deve ser um texto válido.' };
  }

  const trimmed = rawUrl.trim();

  if (trimmed.length > 2048) {
    return { valid: false, error: 'URL excede o comprimento máximo permitido de 2048 caracteres.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Formato de URL inválido.' };
  }

  // Apenas protocolo HTTPS é permitido
  if (parsed.protocol !== 'https:') {
    return { valid: false, error: 'Apenas URLs com protocolo seguro https:// são permitidas.' };
  }

  // Não permitir credenciais embutidas na URL (ex: https://user:pass@shopee.com.br)
  if (parsed.username || parsed.password) {
    return { valid: false, error: 'URLs contendo credenciais de autenticação não são permitidas.' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Bloqueio de IPs privados e locais
  for (const pattern of BLOCKED_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return { valid: false, error: 'Endereço de rede local ou IP privado bloqueado por segurança (SSRF).' };
    }
  }

  // Validação de domínio oficial Shopee
  const isAllowedDomain = ALLOWED_SHOPEE_DOMAINS.some(domain => 
    hostname === domain || hostname.endsWith(`.${domain}`)
  );

  if (!isAllowedDomain) {
    return {
      valid: false,
      error: `Domínio não autorizado (${hostname}). Somente links oficiais da Shopee (shopee.com.br, shp.ee) são aceitos.`,
    };
  }

  return {
    valid: true,
    normalizedUrl: parsed.toString(),
  };
}

/**
 * Sanitiza objetos ou strings removendo dados sensíveis como tokens, senhas e chaves de API.
 */
export function sanitizeData(input: unknown): unknown {
  if (input === null || input === undefined) return input;

  if (typeof input === 'string') {
    let sanitized = input;
    // Reduz assinaturas e credenciais
    sanitized = sanitized.replace(/Credential=[a-zA-Z0-9_-]+/g, 'Credential=[REDACTED]');
    sanitized = sanitized.replace(/Signature=[a-fA-F0-9]+/g, 'Signature=[REDACTED]');
    sanitized = sanitized.replace(/Bearer\s+[a-zA-Z0-9_\-.]+/gi, 'Bearer [REDACTED]');
    sanitized = sanitized.replace(/SHOPEE_APP_SECRET=[^\s&]+/gi, 'SHOPEE_APP_SECRET=[REDACTED]');
    sanitized = sanitized.replace(/ADMIN_SECRET_KEY=[^\s&]+/gi, 'ADMIN_SECRET_KEY=[REDACTED]');
    sanitized = sanitized.replace(/"appSecret":\s*"[^"]+"/gi, '"appSecret":"[REDACTED]"');
    sanitized = sanitized.replace(/"secret":\s*"[^"]+"/gi, '"secret":"[REDACTED]"');
    sanitized = sanitized.replace(/"token":\s*"[^"]+"/gi, '"token":"[REDACTED]"');
    return sanitized;
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeData);
  }

  if (typeof input === 'object') {
    const copy: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('secret') ||
        lowerKey.includes('password') ||
        lowerKey.includes('token') ||
        lowerKey.includes('key') && (lowerKey.includes('admin') || lowerKey.includes('api')) ||
        lowerKey.includes('auth')
      ) {
        copy[key] = '[REDACTED]';
      } else {
        copy[key] = sanitizeData(value);
      }
    }
    return copy;
  }

  return input;
}

// Buffer de logs sanitizados mantidos em memória para visualização segura no painel admin
const MAX_LOGS = 100;
const logBuffer: LogEntry[] = [];

export function logSecurityEvent(
  level: 'info' | 'warn' | 'error',
  category: string,
  message: string,
  data?: Record<string, unknown>
): void {
  const sanitizedMsg = typeof sanitizeData(message) === 'string' ? (sanitizeData(message) as string) : String(message);
  const sanitizedData = data ? (sanitizeData(data) as Record<string, unknown>) : undefined;

  const entry: LogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    level,
    category,
    message: sanitizedMsg,
    data: sanitizedData,
  };

  logBuffer.unshift(entry);
  if (logBuffer.length > MAX_LOGS) {
    logBuffer.pop();
  }

  // Imprime no console do servidor apenas versão segura
  const prefix = `[BuscaBusca:${category}]`;
  if (level === 'error') {
    console.error(prefix, sanitizedMsg, sanitizedData || '');
  } else if (level === 'warn') {
    console.warn(prefix, sanitizedMsg, sanitizedData || '');
  } else {
    console.log(prefix, sanitizedMsg, sanitizedData || '');
  }
}

export function getSanitizedLogs(): LogEntry[] {
  return [...logBuffer];
}
