#!/bin/sh
echo "==> Iniciando Sul Placas API..."
echo "==> Criando tabelas no banco..."
DATABASE_URL="postgresql://postgres:PXV086159a*@db.veenhenzpuykexkdyzwp.supabase.co:5432/postgres" \
  npx prisma db push --accept-data-loss --skip-generate
echo "==> Rodando seed..."
DATABASE_URL="postgresql://postgres:PXV086159a*@db.veenhenzpuykexkdyzwp.supabase.co:5432/postgres" \
  npx prisma db seed || echo "Seed ja executado, continuando..."
echo "==> Iniciando servidor..."
exec node dist/main
