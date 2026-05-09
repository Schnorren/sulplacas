#!/bin/sh
echo "==> Iniciando Sul Placas API..."
echo "==> Sincronizando banco de dados..."
npx prisma db push --accept-data-loss
echo "==> Rodando seed..."
npx prisma db seed || echo "Seed já executado ou falhou, continuando..."
echo "==> Iniciando servidor..."
exec node dist/main
