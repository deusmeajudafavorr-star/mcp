import crypto from 'node:crypto';
import { shopeeClient, ShopeeAffiliateClient } from '../shopee/client.ts';
import { validateShopeeUrl, sanitizeData } from '../shopee/security.ts';
import { mcpServer, MCP_TOOLS } from '../mcp/server.ts';
import { JsonRpcRequest } from '../mcp/types.ts';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<void> | void) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    results.push({ name, passed: true, message: 'OK', durationMs });
    console.log(`  ✓ [PASS] ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({ name, passed: false, message: err.message, durationMs });
    console.error(`  ✗ [FAIL] ${name} (${durationMs}ms): ${err.message}`);
  }
}

async function main() {
  console.log('\n=============================================================');
  console.log('   BUSCA BUSCA — SUÍTE DE TESTES AUTOMATIZADOS');
  console.log('   Shopee Affiliate API + Servidor MCP + Segurança & SSRF');
  console.log('=============================================================\n');

  // 1. TESTE DE CÁLCULO DE ASSINATURA SHA256 CONFORME DOCUMENTAÇÃO OFICIAL DA SHOPEE
  await runTest('Assinatura Shopee: cálculo HMAC-SHA256 e formato do Authorization Header', () => {
    const testClient = new ShopeeAffiliateClient();
    // Injeta credenciais de teste temporárias para validar algoritmo matemático
    (testClient as any).appId = '123456';
    (testClient as any).appSecret = 'secret_abc_xyz';

    const testPayload = JSON.stringify({ query: '{ test }' });
    const { authHeader, timestamp, signature } = testClient.generateAuthHeader(testPayload);

    // Valida estrutura exata do cabeçalho
    if (!authHeader.startsWith('SHA256 Credential=123456, Timestamp=')) {
      throw new Error(`Formato do cabeçalho inválido: ${authHeader}`);
    }
    if (!authHeader.includes(', Signature=')) {
      throw new Error('Cabeçalho não inclui campo Signature');
    }

    // Valida cálculo do SHA256 de appId + timestamp + payload + appSecret
    const expectedBase = `123456${timestamp}${testPayload}secret_abc_xyz`;
    const expectedSignature = crypto.createHash('sha256').update(expectedBase).digest('hex');

    if (signature !== expectedSignature) {
      throw new Error(`Assinatura calculada (${signature}) difere do esperado (${expectedSignature})`);
    }
  });

  // 2. TESTE DE PROTEÇÃO CONTRA SSRF E VALIDAÇÃO DE URLs
  await runTest('Segurança & SSRF: Bloqueio de IPs locais, portas internas e esquemas perigosos', () => {
    // Casos que DEVEM ser bloqueados
    const maliciousUrls = [
      'http://localhost:3000/admin',
      'http://127.0.0.1:8080',
      'http://169.254.169.254/latest/meta-data', // AWS/cloud metadata
      'http://10.0.0.1/internal-network',
      'http://192.168.1.1/router',
      'https://google.com/malicious',
      'ftp://shopee.com.br/file',
      'file:///etc/passwd',
      'https://admin:pass@shopee.com.br/item',
      '',
    ];

    for (const url of maliciousUrls) {
      const res = validateShopeeUrl(url);
      if (res.valid) {
        throw new Error(`Falha de segurança! A URL insegura deveria ter sido bloqueada: ${url}`);
      }
    }

    // Casos legítimos da Shopee que DEVEM ser aceitos
    const legitimateUrls = [
      'https://shopee.com.br/product/123456/78910',
      'https://shopee.com.br/Fone-Bluetooth-i.18392104921.20491823901',
      'https://shp.ee/abc1234',
      'https://shope.ee/xyz5678',
    ];

    for (const url of legitimateUrls) {
      const res = validateShopeeUrl(url);
      if (!res.valid) {
        throw new Error(`URL legítima da Shopee foi rejeitada incorretamente: ${url} (${res.error})`);
      }
    }
  });

  // 3. TESTE DE SANITIZAÇÃO DE DADOS E LOGS
  await runTest('Segurança: Sanitização de dados confidenciais e mascaramento de segredos', () => {
    const sensitiveLog = {
      message: 'Requisição enviada com Authorization: SHA256 Credential=123, Timestamp=456, Signature=abcdef123456',
      appSecret: 'meu_segredo_super_confidencial',
      adminKey: 'chave_mestra_123',
    };

    const sanitized: any = sanitizeData(sensitiveLog);

    if (sanitized.appSecret !== '[REDACTED]') {
      throw new Error('Falha ao sanitizar appSecret em log');
    }
    if (sanitized.adminKey !== '[REDACTED]') {
      throw new Error('Falha ao sanitizar adminKey em log');
    }
    if (sanitized.message.includes('Signature=abcdef123456')) {
      throw new Error('Assinatura bruta vazada na mensagem');
    }
  });

  // 4. TESTE DO PROTOCOLO MCP: initialize
  await runTest('MCP Protocol: Inicialização (initialize) e negociação de capacidades', async () => {
    const initReq: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0' },
      },
    };

    const res = await mcpServer.handleJsonRpc(initReq);

    if (res.error) {
      throw new Error(`Erro retornado pelo initialize: ${res.error.message}`);
    }
    if (res.result.protocolVersion !== '2024-11-05') {
      throw new Error(`Versão do protocolo inesperada: ${res.result.protocolVersion}`);
    }
    if (res.result.serverInfo.name !== 'busca-busca-shopee-mcp') {
      throw new Error(`Nome do servidor MCP incorreto: ${res.result.serverInfo.name}`);
    }
    if (!res.result.capabilities.tools) {
      throw new Error('Capacidade "tools" não informada na inicialização MCP');
    }
  });

  // 5. TESTE DO PROTOCOLO MCP: tools/list
  await runTest('MCP Protocol: Descoberta de Ferramentas (tools/list)', async () => {
    const listReq: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
    };

    const res = await mcpServer.handleJsonRpc(listReq);

    if (res.error) {
      throw new Error(`Erro ao listar ferramentas: ${res.error.message}`);
    }

    const tools = res.result?.tools || [];
    const expectedToolNames = ['buscar_ofertas_shopee', 'detalhes_produto_shopee', 'converter_link_afiliado'];

    for (const expected of expectedToolNames) {
      const found = tools.find((t: any) => t.name === expected);
      if (!found) {
        throw new Error(`Ferramenta MCP obrigatória não encontrada: "${expected}"`);
      }
      if (!found.inputSchema || !found.inputSchema.properties) {
        throw new Error(`Schema de entrada inválido para "${expected}"`);
      }
    }
  });

  // 6. TESTE DO PROTOCOLO MCP: tools/call buscar_ofertas_shopee
  await runTest('MCP Protocol: Execução da ferramenta buscar_ofertas_shopee', async () => {
    const callReq: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'buscar_ofertas_shopee',
        arguments: {
          query: 'fone bluetooth',
          limit: 3,
          sort_by: 'sales',
        },
      },
    };

    const res = await mcpServer.handleJsonRpc(callReq);

    if (res.error) {
      throw new Error(`tools/call falhou com erro: ${res.error.message}`);
    }
    if (res.result.isError) {
      throw new Error(`A ferramenta retornou isError=true`);
    }

    const content = res.result.content?.[0]?.text;
    if (!content || !content.includes('OFERTAS NA SHOPEE')) {
      throw new Error('Conteúdo textual da resposta não contém ofertas');
    }

    // Validação obrigatória da transparência do link de afiliado
    if (!content.includes('Este é um link de afiliado. Podemos receber comissão')) {
      throw new Error('Aviso de conformidade de afiliado ausente no retorno da ferramenta!');
    }

    // Valida metadados compatíveis com OpenAI Apps SDK
    if (!res.result._meta?.chatgpt_widget) {
      throw new Error('Widget estruturado para ChatGPT Apps SDK ausente nos metadados');
    }
  });

  // 7. TESTE DO PROTOCOLO MCP: Validação de Erros em Parâmetros
  await runTest('MCP Protocol: Tratamento de erros de validação em tools/call', async () => {
    // Chamada sem parâmetro obrigatório "query"
    const callReq: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'buscar_ofertas_shopee',
        arguments: {},
      },
    };

    const res = await mcpServer.handleJsonRpc(callReq);
    if (!res.result.isError) {
      throw new Error('Deveria ter retornado isError: true para query vazia');
    }
  });

  // 8. TESTE DO CONVERSOR DE LINKS DE AFILIADO
  await runTest('Conversor de Links: Validação segura e aviso quando sem credenciais', async () => {
    // Testa com URL válida
    const linkRes = await shopeeClient.generateShortLink('https://shopee.com.br/product/123/456', ['test-tag']);

    // Valida que o aviso de conformidade está presente mesmo se não houver credenciais
    if (!linkRes.affiliateDisclaimer.includes('Este é um link de afiliado')) {
      throw new Error('Aviso legal de afiliado ausente na resposta de conversão');
    }

    // Testa com URL inválida
    const invalidRes = await shopeeClient.generateShortLink('http://not-shopee.com/item');
    if (invalidRes.success) {
      throw new Error('Conversor não deve permitir sucesso em domínios não autorizados');
    }
  });

  // 9. TESTE DO DIAGNÓSTICO DE CREDENCIAIS
  await runTest('Diagnóstico: Verificação segura de credenciais sem expor segredos', async () => {
    const status = shopeeClient.getConfigurationStatus();

    if (typeof status.configured !== 'boolean') {
      throw new Error('Status configured deve ser booleano');
    }
    if ((status as any).appSecret) {
      throw new Error('Vazamento de segurança: appSecret exposto no status!');
    }
  });

  // RELATÓRIO FINAL
  console.log('\n-------------------------------------------------------------');
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  console.log(`Total de testes: ${results.length}`);
  console.log(`Passaram: ${passedCount}`);
  console.log(`Falharam: ${failedCount}`);
  console.log('-------------------------------------------------------------\n');

  if (failedCount > 0) {
    console.error('ALERTA: Um ou mais testes falharam!');
    process.exit(1);
  } else {
    console.log('SUCESSO: Todos os testes automatizados passaram com êxito! 🎉\n');
  }
}

main().catch(err => {
  console.error('Erro na execução dos testes:', err);
  process.exit(1);
});
