ALTER TABLE "Usuario"
ADD COLUMN "tarifasConfiguradas" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Usuario"
SET "tarifasConfiguradas" = true
WHERE "valorHora" <> 0 OR "valorDeslocamento" <> 0;
