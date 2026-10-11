# 🛍️ Busca Busca — Shopee Offers, MCP Server & ChatGPT Apps SDK

Backend em TypeScript preparado para **Vercel** e **Node.js**, integrando a **API Oficial de Afiliados da Shopee Brasil**, servidor remoto do protocolo **Model Context Protocol (MCP)** e suporte a widgets visuais do **OpenAI Apps SDK**.

---

## 📋 Sumário
1. [Visão Geral e Arquitetura](#-visão-geral-e-arquitetura)
2. [Ferramentas MCP Implementadas](#-ferramentas-mcp-implementadas)
3. [Segurança e Mitigação de Riscos](#-segurança-e-mitigação-de-riscos)
4. [Instalação e Execução Local no Windows](#-instalação-e-execução-local-no-windows)
5. [Configuração de Variáveis de Ambiente na Vercel](#-configuração-de-variáveis-de-ambiente-na-vercel)
6. [Instruções de Deployment na Vercel](#-instruções-de-deployment-na-vercel)
7. [Conectando ao App do ChatGPT (OpenAI Apps SDK)](#-conectando-ao-app-do-chatgpt-openai-apps-sdk)
8. [Painel Administrativo & Diagnósticos Protegidos](#-painel-administrativo--diagnósticos-protegidos)
9. [Limitações Conhecidas da API Shopee](#-limitações-conhecidas-da-api-shopee)

---

## 🏛️ Visão Geral e Arquitetura

O **Busca Busca** funciona como a ponte inteligente entre assistentes de IA (como ChatGPT, Claude e Cursor) e o ecossistema oficial da Shopee Brasil:

```
[ Usuário no ChatGPT ]
         │
         ▼
[ ChatGPT Apps SDK ]
         │ (JSON-RPC 2.0 via POST /mcp)
         ▼
[ Busca Busca Backend (Vercel Serverless / Node Express) ]
         │
         ├── Validação rigorosa de Schema e proteção anti-SSRF
         ├── Geração de assinatura HMAC-SHA256 com timestamp em segundos
         │
         ▼
[ API Oficial Shopee GraphQL: https://open-api.affiliate.shopee.com.br/graphql ]
         │
         ▼
[ Resposta Estruturada MCP + Widget de Cartões Visuais ]
```

### Tecnologias Utilizadas
- **TypeScript & Node.js**: Código estritamente tipado.
- **Express + Vite**: Servidor fullstack com middleware Vite para desenvolvimento local.
- **Vercel Serverless Functions (`/api`)**: Suporte nativo à infraestrutura serverless da Vercel através de `api/mcp.ts` e `vercel.json`.
- **Model Context Protocol (MCP)**: Versão `2024-11-05`, implementando `initialize`, `ping`, `tools/list` e `tools/call`.
- **API Oficial Shopee Afiliados**: Chamadas GraphQL autenticadas (`generateShortLink`, `productOfferV2`).

---

## 🛠️ Ferramentas MCP Implementadas

O servidor MCP expõe 3 ferramentas documentadas com schemas de entrada e saída tipados:

### 1. `buscar_ofertas_shopee`
- **Objetivo**: Pesquisar ofertas e produtos com preços, avaliações, loja e links de afiliado.
- **Parâmetros**:
  - `query` (string, obrigatório): termo de busca (ex: `"fone bluetooth"`).
  - `category` (string, opcional): filtro de categoria.
  - `min_price` (number, opcional): preço mínimo em BRL.
  - `max_price` (number, opcional): preço máximo em BRL.
  - `sort_by` (string, opcional): `"relevance" | "sales" | "price_asc" | "price_desc" | "rating"`.
  - `limit` (integer, opcional): 1 a 50 (padrão: 10).
- **Retorno**: Texto estruturado e payload JSON com imagens, preços reais, porcentagem de desconto, link de afiliado e o aviso obrigatório de transparência comercial.

### 2. `detalhes_produto_shopee`
- **Objetivo**: Obter detalhes confirmados de um produto específico.
- **Parâmetros**:
  - `item_id` (string, opcional): ID numérico do produto.
  - `product_url` (string, opcional): URL oficial do produto.

### 3. `converter_link_afiliado`
- **Objetivo**: Converter qualquer link de produto ou loja da Shopee em link curto rastreável de afiliado com proteção anti-SSRF.
- **Parâmetros**:
  - `product_url` (string, obrigatório): link oficial da Shopee (`shopee.com.br` ou `shp.ee`).
  - `sub_ids` (array de strings, opcional): até 5 identificadores de campanha para métricas no `utm_content`.

---

## 🔒 Segurança e Mitigação de Riscos

1. **Proteção Rigorosa contra SSRF (`server/shopee/security.ts`)**:
   - Bloqueio completo de IPs de loopback (`127.0.0.1`, `localhost`), IPs de redes privadas (`10.*`, `192.168.*`, `172.16-31.*`) e endpoints de metadados em nuvem (`169.254.169.254`).
   - Apenas URLs com protocolo `https://` e domínios oficiais autorizados (`shopee.com.br`, `shp.ee`, `shope.ee`) são processadas.
2. **Armazenamento Seguro de Segredos**:
   - As credenciais `SHOPEE_APP_ID` e `SHOPEE_APP_SECRET` nunca são expostas ao cliente, em arquivos estáticos, em respostas do MCP ou em logs.
3. **Logs Técnicos Sanitizados**:
   - Qualquer cabeçalho de autenticação, chave ou token é mascarado com `[REDACTED]` antes de ser registrado no buffer de eventos em memória.
4. **Proteção da Área Administrativa**:
   - Validação da chave `ADMIN_SECRET_KEY` utilizando comparação com hash SHA256 em tempo constante (`crypto.timingSafeEqual`) para mitigar timing attacks.
5. **Rate Limiting**:
   - Proteção de limites de requisições por IP na API e no endpoint MCP.
6. **Transparência Legal Obrigatória**:
   - Todo link de afiliado gerado inclui o aviso obrigatório:
     > *"Este é um link de afiliado. Podemos receber comissão por compras elegíveis, sem custo adicional para você."*

---

## 💻 Instalação e Execução Local no Windows

### Pré-requisitos
- Node.js versão 18 ou superior instalado.
- Terminal (PowerShell ou Prompt de Comando do Windows).

### Passo a Passo

1. **Clone o repositório ou acesse a pasta do projeto**:
   ```powershell
   cd busca-busca
   ```

2. **Instale as dependências**:
   ```powershell
   npm install
   ```

3. **Crie seu arquivo de variáveis locais**:
   Copie o arquivo `.env.example` para `.env`:
   ```powershell
   copy .env.example .env
   ```
   Abra o arquivo `.env` e configure suas credenciais:
   ```env
   SHOPEE_APP_ID="seu_app_id_da_shopee"
   SHOPEE_APP_SECRET="seu_app_secret_da_shopee"
   ADMIN_SECRET_KEY="sua_senha_administrativa_forte"
   PORT="3000"
   ```

4. **Execute a suíte de testes automatizados**:
   ```powershell
   npm run test
   ```
   O resultado exibirá os testes de assinatura HMAC-SHA256, segurança SSRF, protocolo MCP e validações.

5. **Inicie o servidor de desenvolvimento**:
   ```powershell
   npm run dev
   ```
   Acesse a interface no navegador: **`http://localhost:3000`**.
   O endpoint MCP estará disponível em: **`http://localhost:3000/mcp`**.

---

## ☁️ Configuração de Variáveis de Ambiente na Vercel

Ao publicar o projeto na Vercel:

1. Acesse o painel da **[Vercel](https://vercel.com/)** e selecione o projeto **Busca Busca**.
2. Navegue até: **Project Settings → Environment Variables**.
3. Adicione as seguintes variáveis:
   - `SHOPEE_APP_ID`: Seu identificador de aplicativo obtido no portal de afiliados Shopee.
   - `SHOPEE_APP_SECRET`: Sua chave secreta de aplicativo.
   - `ADMIN_SECRET_KEY`: Frase secreta longa para autenticação no painel administrativo (`/admin`).
4. **Importante**: No Vercel, alterações em variáveis de ambiente exigem um novo deploy (**Redeploy**) para que as funções serverless carreguem as novas variáveis no `process.env`.

---

## 🚀 Instruções de Deployment na Vercel

### Opção 1: Via Vercel CLI
```bash
# Instale a CLI se ainda não possuir
npm i -g vercel

# Realize o deploy
vercel --prod
```

### Opção 2: Via Git (GitHub / GitLab)
1. Faça push do código para seu repositório.
2. Na Vercel, clique em **Add New → Project** e importe o repositório.
3. Deixe o Framework Preset como **Vite** ou **Other**.
4. Defina o comando de build como `npm run build`.
5. Preencha as Variáveis de Ambiente (`SHOPEE_APP_ID`, `SHOPEE_APP_SECRET`, `ADMIN_SECRET_KEY`).
6. Clique em **Deploy**.

---

## 🤖 Conectando ao App do ChatGPT (OpenAI Apps SDK)

O **Busca Busca** foi estruturado conforme os padrões do [OpenAI Apps SDK](https://developers.openai.com/apps-sdk/):

1. **URL do Servidor MCP**:
   Após o deploy na Vercel, seu endpoint MCP remoto será:
   ```
   https://seu-dominio.vercel.app/mcp
   ```

2. **Configuração de Ferramentas no ChatGPT**:
   Ao criar ou conectar um GPT/App personalizado:
   - Defina o transporte como **HTTP POST (JSON-RPC 2.0)**.
   - Aponte para a URL `https://seu-dominio.vercel.app/mcp`.
   - O ChatGPT chamará o método `tools/list` para descobrir `buscar_ofertas_shopee`, `detalhes_produto_shopee` e `converter_link_afiliado`.

3. **Renderização de Cartões Visuais (Widgets)**:
   - As respostas de `buscar_ofertas_shopee` contêm o nó `_meta.chatgpt_widget` estruturado para permitir que o cliente do ChatGPT renderize o carrossel de ofertas com imagem, preço formatado em Reais, selo de desconto e botão de clique direto para a oferta.

---

## 🛡️ Painel Administrativo & Diagnósticos Protegidos

Acesse a aba **Painel Admin** na interface ou envie requisições para `/api/admin/*`:
- Exige o cabeçalho `x-admin-key: <sua_ADMIN_SECRET_KEY>`.
- **Status do Servidor**: exibe uptime, memória e verificação de variáveis (apenas se estão presentes, sem revelar valores).
- **Teste de Autenticação Shopee**: dispara requisição real à API da Shopee e afere latência e aceitação de credenciais.
- **Teste de Geração de Link**: testa a mutação `generateShortLink`.
- **Logs Sanitizados**: feed dos últimos 100 eventos de segurança com segredos removidos.

---

## ⚠️ Limitações Conhecidas da API Shopee

1. **Aprovação de Conta**: A API Oficial de Afiliados da Shopee requer aprovação prévia no portal de afiliados. Credenciais de contas não autorizadas receberão erro de permissão da Shopee.
2. **Assinatura e Timestamp**: A Shopee valida a janela de timestamp (em segundos). Servidores com relógio desincronizado podem ter chamadas rejeitadas.
3. **Limite de Sub-IDs**: A mutação `generateShortLink` aceita no máximo 5 tags de sub-rastreamento (`subIds`). O backend limita automaticamente esse array.
4. **Catálogo de Fallback**: Caso as credenciais da Shopee ainda não tenham sido configuradas no ambiente Vercel pelo usuário, o sistema opera de forma transparente com dados de catálogo de demonstração para testes, informando explicitamente o status da fonte.

---

*Desenvolvido com foco em conformidade, segurança e arquitetura serverless de alta performance.*
