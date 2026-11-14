-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SituacaoServico" AS ENUM ('ABERTO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "CondicaoPagamento" AS ENUM ('A_VISTA', 'PARCELADO');

-- CreateEnum
CREATE TYPE "TipoItem" AS ENUM ('MATERIAL', 'SERVICO_TERCEIRIZADO', 'OUTRA_DESPESA');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('PIX', 'DINHEIRO', 'TRANSFERENCIA', 'CARTAO_DEBITO', 'CARTAO_CREDITO', 'OUTRO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "valorHora" DECIMAL(12,2) NOT NULL,
    "valorDeslocamento" DECIMAL(12,2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "fusoHorario" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "segredoTotpCriptografado" TEXT,
    "autenticacaoDoisFatoresAtivadaEm" TIMESTAMPTZ(3),
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "nomeCliente" TEXT NOT NULL,
    "documento" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "endereco" TEXT,
    "observacoes" TEXT,
    "arquivadoEm" TIMESTAMPTZ(3),
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdemServico" (
    "id" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "clienteId" UUID NOT NULL,
    "nomeServico" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "situacao" "SituacaoServico" NOT NULL DEFAULT 'ABERTO',
    "condicaoPagamento" "CondicaoPagamento" NOT NULL DEFAULT 'A_VISTA',
    "desconto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "acrescimo" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "comecoServico" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terminoServico" TIMESTAMPTZ(3),
    "cancelamentoServico" TIMESTAMPTZ(3),
    "vencimentoPagamento" DATE,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "OrdemServico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroServico" (
    "id" UUID NOT NULL,
    "ordemDeServicoId" UUID NOT NULL,
    "dataServico" DATE NOT NULL,
    "nomeServico" TEXT NOT NULL,
    "descricaoServico" TEXT NOT NULL,
    "minutosTrabalhados" INTEGER NOT NULL DEFAULT 0,
    "valorHora" DECIMAL(12,2) NOT NULL,
    "numeroDeslocamentos" INTEGER NOT NULL DEFAULT 0,
    "valorDeslocamento" DECIMAL(12,2) NOT NULL,
    "custoDeslocamento" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "desconto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "acrescimo" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RegistroServico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialServico" (
    "id" UUID NOT NULL,
    "registroServicoId" UUID NOT NULL,
    "tipo" "TipoItem" NOT NULL,
    "nomeMaterial" TEXT NOT NULL,
    "descricaoMaterial" TEXT NOT NULL,
    "quantidadeMaterial" DECIMAL(12,3) NOT NULL DEFAULT 1,
    "valorGastoUnidade" DECIMAL(12,2) NOT NULL,
    "valorCobradoUnidade" DECIMAL(12,2) NOT NULL,
    "fornecedor" TEXT,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MaterialServico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParcelaPrevista" (
    "id" UUID NOT NULL,
    "ordemDeServicoId" UUID NOT NULL,
    "numeroParcela" INTEGER NOT NULL,
    "dataVencimento" DATE NOT NULL,
    "valorPrevisto" DECIMAL(12,2) NOT NULL,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ParcelaPrevista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagamentoRecebido" (
    "id" UUID NOT NULL,
    "ordemDeServicoId" UUID NOT NULL,
    "montanteRecebido" DECIMAL(12,2) NOT NULL,
    "pagoEm" TIMESTAMPTZ(3) NOT NULL,
    "formaPagamento" "FormaPagamento" NOT NULL,
    "observacoes" TEXT,
    "dataAnulacaoLancamentoIncorreto" TIMESTAMPTZ(3),
    "motivoAnulacaoLancamentoIncorreto" TEXT,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PagamentoRecebido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistribuicaoPagamento" (
    "id" UUID NOT NULL,
    "ordemDeServicoId" UUID NOT NULL,
    "pagamentoId" UUID NOT NULL,
    "parcelaId" UUID NOT NULL,
    "montante" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "DistribuicaoPagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessaoAcesso" (
    "id" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "nomeAparelho" TEXT,
    "segundoFatorVerificadoEm" TIMESTAMPTZ(3),
    "expiraEm" TIMESTAMPTZ(3) NOT NULL,
    "revogadaEm" TIMESTAMPTZ(3),
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessaoAcesso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodigoRecuperacao" (
    "id" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "codigoHash" TEXT NOT NULL,
    "usadoEm" TIMESTAMPTZ(3),
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodigoRecuperacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContaPagar" (
    "id" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "ordemServicoId" UUID,
    "descricao" TEXT NOT NULL,
    "categoria" TEXT,
    "valor" DECIMAL(12,2) NOT NULL,
    "vencimento" DATE NOT NULL,
    "pagoEm" TIMESTAMPTZ(3),
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ContaPagar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agendamento" (
    "id" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "clienteId" UUID,
    "ordemServicoId" UUID,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "inicio" TIMESTAMPTZ(3) NOT NULL,
    "fim" TIMESTAMPTZ(3),
    "concluidoEm" TIMESTAMPTZ(3),
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Agendamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Cliente_usuarioId_nomeCliente_idx" ON "Cliente"("usuarioId", "nomeCliente");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_id_usuarioId_key" ON "Cliente"("id", "usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_usuarioId_documento_key" ON "Cliente"("usuarioId", "documento");

-- CreateIndex
CREATE INDEX "OrdemServico_usuarioId_situacao_comecoServico_idx" ON "OrdemServico"("usuarioId", "situacao", "comecoServico");

-- CreateIndex
CREATE INDEX "OrdemServico_clienteId_usuarioId_idx" ON "OrdemServico"("clienteId", "usuarioId");

-- CreateIndex
CREATE INDEX "RegistroServico_ordemDeServicoId_dataServico_idx" ON "RegistroServico"("ordemDeServicoId", "dataServico");

-- CreateIndex
CREATE INDEX "MaterialServico_registroServicoId_idx" ON "MaterialServico"("registroServicoId");

-- CreateIndex
CREATE INDEX "ParcelaPrevista_dataVencimento_idx" ON "ParcelaPrevista"("dataVencimento");

-- CreateIndex
CREATE UNIQUE INDEX "ParcelaPrevista_id_ordemDeServicoId_key" ON "ParcelaPrevista"("id", "ordemDeServicoId");

-- CreateIndex
CREATE UNIQUE INDEX "ParcelaPrevista_ordemDeServicoId_numeroParcela_key" ON "ParcelaPrevista"("ordemDeServicoId", "numeroParcela");

-- CreateIndex
CREATE INDEX "PagamentoRecebido_ordemDeServicoId_pagoEm_idx" ON "PagamentoRecebido"("ordemDeServicoId", "pagoEm");

-- CreateIndex
CREATE UNIQUE INDEX "PagamentoRecebido_id_ordemDeServicoId_key" ON "PagamentoRecebido"("id", "ordemDeServicoId");

-- CreateIndex
CREATE INDEX "DistribuicaoPagamento_parcelaId_ordemDeServicoId_idx" ON "DistribuicaoPagamento"("parcelaId", "ordemDeServicoId");

-- CreateIndex
CREATE INDEX "DistribuicaoPagamento_ordemDeServicoId_idx" ON "DistribuicaoPagamento"("ordemDeServicoId");

-- CreateIndex
CREATE UNIQUE INDEX "DistribuicaoPagamento_pagamentoId_parcelaId_key" ON "DistribuicaoPagamento"("pagamentoId", "parcelaId");

-- CreateIndex
CREATE UNIQUE INDEX "SessaoAcesso_tokenHash_key" ON "SessaoAcesso"("tokenHash");

-- CreateIndex
CREATE INDEX "SessaoAcesso_usuarioId_expiraEm_idx" ON "SessaoAcesso"("usuarioId", "expiraEm");

-- CreateIndex
CREATE UNIQUE INDEX "CodigoRecuperacao_codigoHash_key" ON "CodigoRecuperacao"("codigoHash");

-- CreateIndex
CREATE INDEX "CodigoRecuperacao_usuarioId_idx" ON "CodigoRecuperacao"("usuarioId");

-- CreateIndex
CREATE INDEX "ContaPagar_usuarioId_pagoEm_vencimento_idx" ON "ContaPagar"("usuarioId", "pagoEm", "vencimento");

-- CreateIndex
CREATE INDEX "Agendamento_usuarioId_concluidoEm_inicio_idx" ON "Agendamento"("usuarioId", "concluidoEm", "inicio");

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdemServico" ADD CONSTRAINT "OrdemServico_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdemServico" ADD CONSTRAINT "OrdemServico_clienteId_usuarioId_fkey" FOREIGN KEY ("clienteId", "usuarioId") REFERENCES "Cliente"("id", "usuarioId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroServico" ADD CONSTRAINT "RegistroServico_ordemDeServicoId_fkey" FOREIGN KEY ("ordemDeServicoId") REFERENCES "OrdemServico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialServico" ADD CONSTRAINT "MaterialServico_registroServicoId_fkey" FOREIGN KEY ("registroServicoId") REFERENCES "RegistroServico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcelaPrevista" ADD CONSTRAINT "ParcelaPrevista_ordemDeServicoId_fkey" FOREIGN KEY ("ordemDeServicoId") REFERENCES "OrdemServico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagamentoRecebido" ADD CONSTRAINT "PagamentoRecebido_ordemDeServicoId_fkey" FOREIGN KEY ("ordemDeServicoId") REFERENCES "OrdemServico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistribuicaoPagamento" ADD CONSTRAINT "DistribuicaoPagamento_ordemDeServicoId_fkey" FOREIGN KEY ("ordemDeServicoId") REFERENCES "OrdemServico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistribuicaoPagamento" ADD CONSTRAINT "DistribuicaoPagamento_pagamentoId_ordemDeServicoId_fkey" FOREIGN KEY ("pagamentoId", "ordemDeServicoId") REFERENCES "PagamentoRecebido"("id", "ordemDeServicoId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistribuicaoPagamento" ADD CONSTRAINT "DistribuicaoPagamento_parcelaId_ordemDeServicoId_fkey" FOREIGN KEY ("parcelaId", "ordemDeServicoId") REFERENCES "ParcelaPrevista"("id", "ordemDeServicoId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessaoAcesso" ADD CONSTRAINT "SessaoAcesso_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodigoRecuperacao" ADD CONSTRAINT "CodigoRecuperacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaPagar" ADD CONSTRAINT "ContaPagar_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaPagar" ADD CONSTRAINT "ContaPagar_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "OrdemServico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "OrdemServico"("id") ON DELETE SET NULL ON UPDATE CASCADE;
