# Publicar o app na Vercel

1. **Prepare as contas:** crie uma conta em [vercel.com](https://vercel.com/) e conecte seu GitHub. O repositório `service-worklog-manager` já precisa estar no GitHub.

2. **Crie o banco:** por exemplo, crie uma conta na [Neon](https://console.neon.tech/), vá em **New Project → Create Project** e copie a URL de conexão exibida. Outros provedores de PostgreSQL também servem. A URL local com `localhost:5433` não funciona na Vercel.

3. **Crie as tabelas:** no PowerShell, na raiz do repositório, execute os comandos abaixo. Substitua o texto entre aspas pela URL do banco criado no passo 2. Não salve essa URL no Git.

   ```powershell
   cd app
   npm ci
   $env:DATABASE_URL = 'URL_DO_POSTGRESQL'
   npm run db:deploy
   Remove-Item Env:DATABASE_URL
   ```

4. **Importe o projeto:** no painel da Vercel, vá em **Add New → Project → Import Git Repository** e selecione `service-worklog-manager`. Em **Root Directory → Edit**, escolha `app`.

5. **Configure antes do deploy:** selecione **Fastify** como Framework Preset. Em **Environment Variables**, cadastre `DATABASE_URL` com a mesma URL do passo 3 para **Production**. O build já está definido em `app/vercel.json`; deixe **Output Directory** sem alteração. O projeto requer Node.js 22 ou superior.

6. **Publique e confira:** clique em **Deploy**, abra a URL fornecida pela Vercel e teste `/login`, criação de conta e um registro. Novos commits em `main` gerarão novos deploys. Quando adicionar migrações ao projeto, execute `npm run db:deploy` no banco de produção antes de usar a nova versão.
