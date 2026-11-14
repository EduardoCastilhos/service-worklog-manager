ALTER TABLE "MaterialServico"
ADD COLUMN "jaPago" BOOLEAN,
ADD COLUMN "vencimentoPagamento" DATE;

ALTER TABLE "MaterialServico"
ALTER COLUMN "jaPago" SET DEFAULT false;

ALTER TABLE "ContaPagar"
ADD COLUMN "materialServicoId" UUID;

CREATE UNIQUE INDEX "ContaPagar_materialServicoId_key" ON "ContaPagar"("materialServicoId");

ALTER TABLE "ContaPagar"
ADD CONSTRAINT "ContaPagar_materialServicoId_fkey"
FOREIGN KEY ("materialServicoId") REFERENCES "MaterialServico"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
