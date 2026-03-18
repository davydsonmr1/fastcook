# Guia de Implantação Enterprise (AWS / DigitalOcean)

Este guia cobre a passagem do `docker-compose.yml` local para uma infraestrutura na Cloud (Alta Disponibilidade) com Reverse Proxy SSL (Let's Encrypt). O FastCook já está configurado para Multi-Stage Builds optimizadas em Alpine Linux (Zero-trust `nodeapp`).

## Pré-requisitos
- Uma Instância Virtual Linux (ex: Ubuntu 24.04 na AWS EC2 ou DigitalOcean Droplet).
- Docker e Docker-Compose instalados.
- Um Domínio apontado para o IP da Instância (ex: `app.flashcook.com`).

## 1. Preparação no Domínio e Servidor
Aceda via SSH à sua máquina servidora Linux e clone o repositório do FastCook:
```bash
git clone https://github.com/davydsonmr1/fastcook.git
cd fastcook
```

## 2. Injeção de Segredos
Nunca faça commit dos seus tokens para o Github. Crie o ficheiro de ambiente de produção no servidor e defina o IP local do Redis:
```bash
nano backend/.env
```
Inserir no `.env`:
```env
NODE_ENV=production
GROQ_API_KEY=gsk_sua_chave_real
SUPABASE_URL=https://abc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=ey_chave_de_servico_secreta

CORS_ORIGIN=https://app.fastcook.com
REDIS_URL=redis://redis:6379
```

Na build do Nginx (`frontend/.env.production` ou variáveis estáticas geradas via Docker build args), garanta que a PWA aponta para as APIs corretas do Reverse Proxy HTTPS.

## 3. Subir os Contentores Base
Arranque a rede `docker-compose` em Background Mode (`-d`) e verifique se Nginx, Fastify e Redis ficaram saudáveis (Healthy Status via Ping e Wget healthchecks).
```bash
docker-compose up -d --build
```
O Frontend estará exposto na porta estática :80 e o Backend não será acessível por fora a não ser através da proxy local.

## 4. Configurar Certificado SSL/HTTPS (Certbot)
O PWA e a Voice Web Speech API exigem contexto Seguro (HTTPS). Instale o Certbot na máquina Host (ou utilize um contentor Traefik/Nginx Proxy Manager alternativo):
```bash
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
```

Configure uma rule num servidor Nginx local da Máquina EC2 para despachar a porta `443` HTTPS para a porta exposta local do Frontend (`:80`).
```nginx
server {
    server_name app.fastcook.com;
    
    location / {
        proxy_pass http://localhost:5173; # O mapeamento porta do Docker-Compose UI
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://localhost:3000; # O Backend
        # Configs de suporte ao SSE (Server-Sent Events) // Groq Stream
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
        proxy_buffering off;
        proxy_cache off;
    }
}
```

Rode `sudo certbot --nginx -d app.fastcook.com` e a Cloud do FastCook estará online, segura e escalável, utilizando o *Redis* In-Memory para cache global sem congestionar o CPU.
