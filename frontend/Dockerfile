# --- Etapa 1: Builder do React/Vite ---
FROM node:22-alpine AS builder

WORKDIR /app

# Dependências
COPY package*.json ./
RUN npm ci

# Restante do código
COPY . .

# Aceitando variáveis de ambiente no build-time se necessário
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_API_URL=$VITE_API_URL

# Gera o diretório /dist
RUN npm run build

# --- Etapa 2: Servidor Proxy / Estáticos Nginx ---
FROM nginx:alpine

# Copiar a Nginx config customizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar os arquivos React buildados
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# Nginx corre em foreground natural
CMD ["nginx", "-g", "daemon off;"]
