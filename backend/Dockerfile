FROM node:20-alpine AS builder
RUN apk add --no-cache python3 py3-pip openssl
WORKDIR /app
COPY package.json ./
RUN npm install --legacy-peer-deps
RUN npm install -g @nestjs/cli
COPY . .
RUN pip3 install reportlab --break-system-packages
RUN npx prisma generate
RUN nest build
RUN test -f dist/main.js || (echo "ERROR: dist/main.js not found" && exit 1)

FROM node:20-alpine AS runner
RUN apk add --no-cache python3 py3-pip openssl
WORKDIR /app
COPY --from=builder /app/dist         ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma       ./prisma
COPY --from=builder /app/scripts      ./scripts
COPY start.sh ./start.sh
RUN pip3 install reportlab --break-system-packages
RUN chmod +x start.sh
EXPOSE 3001
CMD ["sh", "start.sh"]
