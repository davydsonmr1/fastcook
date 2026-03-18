# Checklist de Configuração: Google OAuth no Supabase

Este guia destina-se a garantir que a integração do login com Google no ambiente Supabase da **FastCook** funciona corretamente, de acordo com as novas funcionalidades de LoginModal.

Siga estes passos exatos no seu projeto Supabase e Google Cloud Console:

## 1. Configurar o Google Cloud Console
1. Aceda ao [Google Cloud Console](https://console.cloud.google.com/).
2. Crie ou selecione o seu projeto `FastCook`.
3. Navegue até **APIs & Services > OAuth consent screen** e configure como "External" (ou Internal se tiver Google Workspace associado).
4. Preencha os detalhes (Nome da App: "FastCook", E-mail de suporte).
5. Navegue até **Credentials > Create Credentials > OAuth client ID**.
6. Tipo de aplicação: **Web application**.
7. Na secção **Authorized JavaScript origins**, introduza:
   - Funciona localmente: `http://localhost:5173`
   - Ambiente de produção: `https://o-seu-dominio-aqui.com` ou o seu domínio Vercel/Netlify.
8. Na secção **Authorized redirect URIs**, introduza o URL do seu projeto Supabase seguido do caminho de callback do Auth:
   - Formato: `https://<seu-id-de-projeto>.supabase.co/auth/v1/callback`
9. Clique em **Create** e guarde copiado o **Client ID** e o **Client Secret**.

## 2. Configurar o Supabase Dashboard
1. Aceda ao seu painel no [Supabase](https://supabase.com/dashboard).
2. Selecione o seu projeto `FastCook`.
3. Vá a **Authentication > Providers**.
4. Expanda e ative o **Google**.
5. Cole o **Client ID** gerado no passo anterior.
6. Cole o **Client Secret** (se necessário pelo painel, geralmente o Google exige-o do lado do backend, mas no caso implícito do PKCE do Supabase client-side, pode colocar aqui o seu Client Secret para troca server-to-server que o Supabase faz nativamente).
7. Guarde as alterações.

## 3. Configurar Roteamento URLs no Supabase
Isto é crítico para que a nova janela Modal não redirecione de forma falhada, deixando ecrãs brancos.
1. Ainda no Supabase, vá a **Authentication > URL Configuration**.
2. **Site URL:** Configure para o URL base exato da sua aplicação (ex: `http://localhost:5173` ou `https://fastcook.com`).
3. **Redirect URLs:** Adicione URLs extra autorizados se os seus URLs locais (ex: `http://localhost:3000` em vez de `5173`) ou URLs de *preview* de CI mudarem:
   - Adicione `http://localhost:5173/**`
   - Adicione `https://*.vercel.app/**` (se usar Vercel).

## 4. Testar a Integração
- Inicie a sua aplicação frontend localmente.
- Abra a nova página e prima sobre a aba "Perfil" ou "Identifique-se" no Header para revelar a modal Mobile-First.
- Sendo apresentado o botão central, clique em continuar com o Google. Se preencheu as APIs e URIs do passo 1 e do passo 3 devagar e como os strings exatos, autenticará com perfeição e será redirecionado para o seu perfil do utilizador.
