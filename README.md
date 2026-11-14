# service-worklog-manager

Aplicação de gestão para profissionais autônomos: clientes, ordens de serviço, etapas de trabalho, agenda, valores a receber e contas a pagar.

O servidor usa **Fastify + Prisma + PostgreSQL**. A interface usa **React + TypeScript**, compilada pelo **Vite**, com navegação via Inertia. O servidor entrega os dados de cada página; não há uma API REST separada para o frontend.

## Começar

Requisitos: Node.js **22+**, npm e PostgreSQL **16+**. O Docker Compose incluído é uma forma de iniciar o banco localmente.

```powershell
cd app
Copy-Item .env.example .env
docker compose up -d
npm install
npm run db:generate
npm run db:deploy
npm run dev
```

No computador que executa o projeto, abra **http://localhost:3333**. Em outro dispositivo, use **http://IP-DO-COMPUTADOR:3333** ou a URL do túnel/encaminhamento da porta 3333; `localhost` sempre se refere ao próprio dispositivo. O Fastify entrega a página e os arquivos da interface pela mesma porta. Em desenvolvimento, o Vite recompila o frontend ao salvar arquivos; atualize a página após a compilação. Se já houver PostgreSQL disponível, altere `DATABASE_URL` no `.env` e dispense o Docker.

O Compose expõe o PostgreSQL em `localhost:5433`. O usuário, a senha e o banco de exemplo estão em `app/docker-compose.yml` e correspondem a `app/.env.example`; troque esses valores em outros ambientes.

### Variáveis de ambiente

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | Conexão PostgreSQL usada pelo Prisma e pela aplicação. Obrigatória. |
| `PORT` | Porta HTTP do Fastify. Padrão: `3333`. |
| `NODE_ENV` | Em `production`, adiciona `Secure` ao cookie de sessão. |

### Comandos (dentro de `app/`)

| Comando | Efeito |
| --- | --- |
| `npm run dev` | Compila a interface e inicia Fastify e Vite em modo de observação. |
| `npm run build` | Gera os arquivos do frontend em `app/public/build/`. |
| `npm start` | Inicia o servidor usando o build existente. |
| `npm run typecheck` | Confere os tipos de servidor e cliente. |
| `npm test` | Executa testes das regras de cálculo. |
| `npm run test:integration` | Executa fluxos HTTP com banco disponível. |
| `npm run db:generate` | Gera o cliente Prisma em `src/generated/prisma/`. |
| `npm run db:migrate` | Cria/aplica migrações durante o desenvolvimento. |
| `npm run db:deploy` | Aplica migrações já versionadas. |
| `npm run format` / `npm run format:check` | Formata ou verifica o código com Prettier. |

Para executar o build localmente:

```powershell
cd app
npm run build
npm start
```

O diretório `app/public/build/`, o cliente Prisma gerado e o arquivo `.env` não entram no controle de versão.

Para publicar na Vercel, siga o [guia de deploy](DEPLOY_VERCEL.md).

## Funcionalidades

- Cadastro de conta sem tarifas, login e sessões por cookie HTTP only.
- Cadastro e edição dos dados de clientes; ordens de serviço com uma ou mais etapas.
- Tarifas cadastradas em Configurações ou no aviso exibido antes do primeiro serviço. Os formulários de novos registros são limpos após um salvamento bem-sucedido.
- Cálculo de mão de obra, deslocamentos e itens cobrados, com custos reais registrados à parte.
- Conclusão e reabertura de serviços, recebimentos parciais e saldo pendente.
- Contas a pagar, baixa de pagamento e agenda de atendimentos.
- Itens de serviço com marcação “Já pago”; itens com custo e sem a marcação geram uma conta a pagar vinculada.
- Painel de finanças com recortes anual, mensal e por cliente, além de faturamento, recebimentos, gastos, lucro estimado e saldo de caixa.
- Filtros de cliente, período e situação nas listas de serviços, contas e recebíveis.
- Painel com próximos agendamentos, contas e serviços recentes.

O esquema Prisma inclui entidades para parcelamento e autenticação em duas etapas, mas esses fluxos ainda não estão implementados na interface e nas rotas atuais.

## Onde alterar o código

| Caminho | Responsabilidade |
| --- | --- |
| `app/src/app.ts`, `server.ts` | Configuração do Fastify, registro de rotas e inicialização HTTP. |
| `app/src/routes/` | Entradas HTTP agrupadas por área funcional. |
| `app/src/http/` | Sessão, validação básica e resposta HTML/Inertia. |
| `app/src/domain.ts` | Validação de dinheiro e datas, cálculo de etapas e ordens. |
| `app/src/services/orders.ts` | Consulta, criação e serialização das ordens. |
| `app/prisma/schema.prisma` | Modelo de dados e relações. |
| `app/src/client/pages/` | Telas React. |
| `app/src/client/components/` | Layout e componentes compartilhados. |
| `app/src/client/style.css` | Estilos e regras responsivas. |
| `app/src/client/types.ts` | Contratos dos dados enviados às telas. |
