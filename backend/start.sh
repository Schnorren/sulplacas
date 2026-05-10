#!/bin/sh
echo "==> Iniciando Sul Placas API..."
echo "==> Rodando seed..."
npx prisma db seed || echo "Seed falhou ou ja executado, continuando..."
echo "==> Iniciando servidor..."
exec node dist/main
