-- =====================================================================
-- RiskMap - Script de criação do banco de dados
-- Projeto Integrador - 3º período - versão 3.3.0 (Fase 03)
-- SGBD: PostgreSQL 15+ com extensão PostGIS
-- Fonte: dicionário de dados da seção 18.2 do Documento de Especificação
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- ---------------------------------------------------------------------
-- Usuário e rotas
-- ---------------------------------------------------------------------
CREATE TABLE usuario (
    id_usuario             BIGSERIAL    PRIMARY KEY,
    nome                   VARCHAR(100) NOT NULL,
    email                  VARCHAR(150) NOT NULL UNIQUE,
    senha_hash             VARCHAR(255) NOT NULL,
    data_cadastro          TIMESTAMP    NOT NULL DEFAULT NOW(),
    pontuacao_engajamento  INTEGER      NOT NULL DEFAULT 0
                           CHECK (pontuacao_engajamento >= 0),
    nivel                  VARCHAR(10)  NOT NULL DEFAULT 'BRONZE'
                           CHECK (nivel IN ('BRONZE', 'PRATA', 'OURO')),
    data_ultima_atividade  TIMESTAMP,
    data_consentimento     TIMESTAMP    NOT NULL
);

-- ---------------------------------------------------------------------
-- Regiões e risco
-- ---------------------------------------------------------------------
CREATE TABLE regiao (
    id_regiao  BIGSERIAL     PRIMARY KEY,
    nome       VARCHAR(120)  NOT NULL,
    celula_h3  VARCHAR(16)   NOT NULL UNIQUE,
    geometria  GEOMETRY(POLYGON, 4326) NOT NULL,
    descricao  TEXT
);

CREATE INDEX idx_regiao_geometria ON regiao USING GIST (geometria);

CREATE TABLE indice_risco (
    id_indice        BIGSERIAL    PRIMARY KEY,
    id_regiao        BIGINT       NOT NULL REFERENCES regiao (id_regiao),
    dia_semana       SMALLINT     NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
    faixa_horaria    VARCHAR(10)  NOT NULL
                     CHECK (faixa_horaria IN ('MADRUGADA', 'MANHA', 'TARDE', 'NOITE')),
    valor_indice     NUMERIC(6,3) NOT NULL CHECK (valor_indice >= 0),
    fluxo_estimado   INTEGER      CHECK (fluxo_estimado > 0),
    nivel_confianca  VARCHAR(5)   CHECK (nivel_confianca IN ('BAIXO', 'MEDIO', 'ALTO')),
    data_calculo     TIMESTAMP    NOT NULL,
    UNIQUE (id_regiao, dia_semana, faixa_horaria)
);

-- ---------------------------------------------------------------------
-- Ocorrências e validação
-- ---------------------------------------------------------------------
CREATE TABLE tipo_ocorrencia (
    id_tipo         SMALLSERIAL PRIMARY KEY,
    nome            VARCHAR(50) NOT NULL UNIQUE,
    peso_gravidade  SMALLINT    NOT NULL CHECK (peso_gravidade BETWEEN 1 AND 5)
);

CREATE TABLE ocorrencia (
    id_ocorrencia     BIGSERIAL    PRIMARY KEY,
    id_regiao         BIGINT       NOT NULL REFERENCES regiao (id_regiao),
    id_tipo           SMALLINT     NOT NULL REFERENCES tipo_ocorrencia (id_tipo),
    id_usuario        BIGINT       REFERENCES usuario (id_usuario),  -- nunca exposto (RNE-004)
    fonte             VARCHAR(12)  NOT NULL
                      CHECK (fonte IN ('OFICIAL', 'PARCEIRO', 'COMUNIDADE')),
    latitude          NUMERIC(9,6) NOT NULL,
    longitude         NUMERIC(9,6) NOT NULL,
    data_hora         TIMESTAMP    NOT NULL,
    status_validacao  VARCHAR(14)  NOT NULL DEFAULT 'PENDENTE'
                      CHECK (status_validacao IN
                            ('PENDENTE', 'VALIDADO', 'REJEITADO', 'EM_MODERACAO')),
    data_registro     TIMESTAMP    NOT NULL DEFAULT NOW(),
    -- report da comunidade sempre tem autor; dado oficial ou de parceiro não tem
    CHECK ((fonte = 'COMUNIDADE') = (id_usuario IS NOT NULL))
);

CREATE INDEX idx_ocorrencia_regiao_data ON ocorrencia (id_regiao, data_hora);

CREATE TABLE validacao_report (
    id_validacao   BIGSERIAL PRIMARY KEY,
    id_ocorrencia  BIGINT    NOT NULL REFERENCES ocorrencia (id_ocorrencia) ON DELETE CASCADE,
    id_usuario     BIGINT    NOT NULL REFERENCES usuario (id_usuario),
    confirma       BOOLEAN   NOT NULL,          -- TRUE confirma, FALSE contesta
    data_hora      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (id_ocorrencia, id_usuario)
);

-- ---------------------------------------------------------------------
-- Uso: rotas e alertas
-- ---------------------------------------------------------------------
CREATE TABLE rota (
    id_rota                BIGSERIAL    PRIMARY KEY,
    id_usuario             BIGINT       NOT NULL REFERENCES usuario (id_usuario),
    origem_lat             NUMERIC(9,6) NOT NULL,
    origem_lon             NUMERIC(9,6) NOT NULL,
    destino_lat            NUMERIC(9,6) NOT NULL,
    destino_lon            NUMERIC(9,6) NOT NULL,
    distancia_km           NUMERIC(6,2) CHECK (distancia_km > 0),
    tempo_estimado_min     INTEGER      CHECK (tempo_estimado_min > 0),
    reducao_exposicao_pct  NUMERIC(5,2) CHECK (reducao_exposicao_pct BETWEEN 0 AND 100),
    data_hora              TIMESTAMP    NOT NULL DEFAULT NOW(),
    data_expiracao         TIMESTAMP    NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE TABLE rota_regiao (
    id_rota            BIGINT       NOT NULL REFERENCES rota (id_rota) ON DELETE CASCADE,
    id_regiao          BIGINT       NOT NULL REFERENCES regiao (id_regiao),
    ordem              SMALLINT     NOT NULL,
    indice_no_momento  NUMERIC(6,3),
    PRIMARY KEY (id_rota, id_regiao)
);

CREATE TABLE alerta (
    id_alerta   BIGSERIAL    PRIMARY KEY,
    id_usuario  BIGINT       NOT NULL REFERENCES usuario (id_usuario),
    id_regiao   BIGINT       REFERENCES regiao (id_regiao),
    id_rota     BIGINT       REFERENCES rota (id_rota) ON DELETE SET NULL,
    tipo        VARCHAR(20)  NOT NULL
                CHECK (tipo IN ('PROXIMIDADE', 'CONFIRMACAO', 'SISTEMA')),
    mensagem    VARCHAR(255) NOT NULL,
    data_hora   TIMESTAMP    NOT NULL DEFAULT NOW(),
    status      VARCHAR(10)  NOT NULL DEFAULT 'ENVIADO'
                CHECK (status IN ('ENVIADO', 'LIDO'))
);

-- ---------------------------------------------------------------------
-- Benefícios
-- ---------------------------------------------------------------------
CREATE TABLE parceiro (
    id_parceiro  BIGSERIAL    PRIMARY KEY,
    nome         VARCHAR(120) NOT NULL,
    categoria    VARCHAR(30)  NOT NULL
                 CHECK (categoria IN ('LOCADORA', 'SEGURADORA', 'OFICINA', 'OUTRO')),
    contato      VARCHAR(150)
);

CREATE TABLE oferta (
    id_oferta            BIGSERIAL    PRIMARY KEY,
    id_parceiro          BIGINT       NOT NULL REFERENCES parceiro (id_parceiro),
    descricao            VARCHAR(255) NOT NULL,
    percentual_desconto  NUMERIC(5,2) CHECK (percentual_desconto BETWEEN 0 AND 100),
    nivel_minimo         VARCHAR(10)  NOT NULL DEFAULT 'BRONZE'
                         CHECK (nivel_minimo IN ('BRONZE', 'PRATA', 'OURO')),
    validade             DATE         NOT NULL
);

CREATE TABLE resgate (
    id_resgate    BIGSERIAL   PRIMARY KEY,
    id_usuario    BIGINT      NOT NULL REFERENCES usuario (id_usuario),
    id_oferta     BIGINT      NOT NULL REFERENCES oferta (id_oferta),
    codigo_unico  VARCHAR(12) NOT NULL UNIQUE,
    data_resgate  TIMESTAMP   NOT NULL DEFAULT NOW(),
    status        VARCHAR(10) NOT NULL DEFAULT 'GERADO'
                  CHECK (status IN ('GERADO', 'UTILIZADO', 'EXPIRADO'))
);

-- ---------------------------------------------------------------------
-- Carga inicial: tipos de ocorrência e pesos (RNE-007)
-- ---------------------------------------------------------------------
INSERT INTO tipo_ocorrencia (nome, peso_gravidade) VALUES
    ('Roubo de veículo', 5),
    ('Roubo de carga', 4),
    ('Assalto a pessoa', 4),
    ('Furto de veículo', 3),
    ('Furto de carga ou pertences', 2),
    ('Atitude suspeita', 1);
