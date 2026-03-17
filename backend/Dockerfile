# --- Etapa 1: Build (Multi-stage) ---
FROM node:22-alpine AS builder

# Diretório de trabalho da fase de build
WORKDIR /app

# Copia pacotes necessários
COPY package*.json ./

# Instala dependências exatas e limpas
RUN npm ci

# Copia todo o source
COPY . .

# Compila o TypeScript
RUN npm run build

# --- Etapa 2: Produção ---
FROM node:22-alpine AS runner

# Cria um utilizador e grupo não-root para segurança extra
RUN addgroup -S nodeapp && adduser -S nodeapp -G nodeapp

WORKDIR /app

# Copia dependências essenciais de produção e compilação
COPY package*.json ./
RUN npm ci --omit=dev

# Copia o folder dist da fase anterior
COPY --from=builder /app/dist ./dist

# Muda permissões das pastas
RUN chown -R nodeapp:nodeapp /app

# Altera a execução para o utilizador non-root
USER nodeapp

# Variável de ambiente forçando ambiente produção port 3000
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.1

EXPOSE 3000

# Executa o Fastify compilado
CMD ["npm", "start"]
