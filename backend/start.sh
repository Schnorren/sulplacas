#!/bin/sh
echo "==> Iniciando Sul Placas API..."
echo "==> Criando tabelas no banco..."
npx prisma db push --accept-data-loss --skip-generate
echo "==> Rodando seed..."
npx prisma db seed || echo "Seed ja executado, continuando..."
echo "==> Iniciando servidor..."
exec node dist/main
