#!/bin/sh
echo "==> Iniciando Sul Placas API..."
echo "==> Criando tabelas no banco..."
DATABASE_URL="${DIRECT_URL:-$DATABASE_URL}" npx prisma db push --accept-data-loss --skip-generate
echo "==> Rodando seed..."
npx prisma db seed || echo "Seed ja executado, continuando..."
echo "==> Iniciando servidor..."
exec node dist/main
