-- RiskMap - script de criação do banco de dados
-- PostgreSQL com extensão PostGIS
-- Fonte: Documento de Especificação, seções 18.1 (modelo lógico) e 18.2 (dicionário de dados)

CREATE EXTENSION IF NOT EXISTS postgis;

-- Usuário e engajamento (RNE-002, RNE-006, RNF-003)
CREATE TABLE usuario (
  id_usuario             BIGSERIAL PRIMARY KEY,
  nome                   VARCHAR(100) NOT NULL,
  email                  VARCHAR(150) NOT NULL UNIQUE,
  senha_hash             VARCHAR(255) NOT NULL,
  data_cadastro          TIMESTAMP NOT NULL DEFAULT NOW(),
  pontuacao_engajamento  INTEGER NOT NULL DEFAULT 0 CHECK (pontuacao_engajamento >= 0),
  nivel                  VARCHAR(10) NOT NULL DEFAULT 'BRONZE'
                         CHECK (nivel IN ('BRONZE', 'PRATA', 'OURO')),
  data_ultima_atividade  TIMESTAMP,
  data_consentimento     TIMESTAMP NOT NULL
);

-- Regiões em células hexagonais (RNF-004)
CREATE TABLE regiao (
  id_regiao  BIGSERIAL PRIMARY KEY,
  nome       VARCHAR(120) NOT NULL,
  celula_h3  VARCHAR(16) NOT NULL UNIQUE,
  geometria  GEOMETRY(POLYGON, 4326) NOT NULL,
  descricao  TEXT
);

CREATE INDEX idx_regiao_geometria ON regiao USING GIST (geometria);

-- Índice de risco por dia da semana e faixa horária (RNE-001, RNE-005)
CREATE TABLE indice_risco (
  id_indice        BIGSERIAL PRIMARY KEY,
  id_regiao        BIGINT NOT NULL REFERENCES regiao (id_regiao),
  dia_semana       SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  faixa_horaria    VARCHAR(10) NOT NULL
                   CHECK (faixa_horaria IN ('MADRUGADA', 'MANHA', 'TARDE', 'NOITE')),
  valor_indice     NUMERIC(6,3) NOT NULL CHECK (valor_indice >= 0),
  fluxo_estimado   INTEGER CHECK (fluxo_estimado > 0),
  nivel_confianca  VARCHAR(5) CHECK (nivel_confianca IN ('BAIXO', 'MEDIO', 'ALTO')),
  data_calculo     TIMESTAMP NOT NULL,
  UNIQUE (id_regiao, dia_semana, faixa_horaria)
);

-- Tipos de ocorrência e peso de gravidade (RNE-007)
CREATE TABLE tipo_ocorrencia (
  id_tipo         SMALLSERIAL PRIMARY KEY,
  nome            VARCHAR(50) NOT NULL UNIQUE,
  peso_gravidade  SMALLINT NOT NULL CHECK (peso_gravidade BETWEEN 1 AND 5)
);

-- Ocorrências de todas as fontes (RNE-003, RNE-004, RNE-005)
CREATE TABLE ocorrencia (
  id_ocorrencia     BIGSERIAL PRIMARY KEY,
  id_regiao         BIGINT NOT NULL REFERENCES regiao (id_regiao),
  id_tipo           SMALLINT NOT NULL REFERENCES tipo_ocorrencia (id_tipo),
  id_usuario        BIGINT REFERENCES usuario (id_usuario),
  fonte             VARCHAR(12) NOT NULL
                    CHECK (fonte IN ('OFICIAL', 'PARCEIRO', 'COMUNIDADE')),
  latitude          NUMERIC(9,6) NOT NULL,
  longitude         NUMERIC(9,6) NOT NULL,
  data_hora         TIMESTAMP NOT NULL,
  status_validacao  VARCHAR(14) NOT NULL DEFAULT 'PENDENTE'
                    CHECK (status_validacao IN
                      ('PENDENTE', 'VALIDADO', 'REJEITADO', 'EM_MODERACAO')),
  data_registro     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ocorrencia_regiao_data ON ocorrencia (id_regiao, data_hora);

-- Confirmações e contestações dos reports (RNE-003, RF-008)
CREATE TABLE validacao_report (
  id_validacao   BIGSERIAL PRIMARY KEY,
  id_ocorrencia  BIGINT NOT NULL REFERENCES ocorrencia (id_ocorrencia),
  id_usuario     BIGINT NOT NULL REFERENCES usuario (id_usuario),
  confirma       BOOLEAN NOT NULL,
  data_hora      TIMESTAMP NOT NULL,
  UNIQUE (id_ocorrencia, id_usuario)
);

-- Rotas analisadas, excluídas após 30 dias (RF-002, RF-010, RNE-004)
CREATE TABLE rota (
  id_rota                BIGSERIAL PRIMARY KEY,
  id_usuario             BIGINT NOT NULL REFERENCES usuario (id_usuario),
  origem_lat             NUMERIC(9,6) NOT NULL,
  origem_lon             NUMERIC(9,6) NOT NULL,
  destino_lat            NUMERIC(9,6) NOT NULL,
  destino_lon            NUMERIC(9,6) NOT NULL,
  distancia_km           NUMERIC(6,2) CHECK (distancia_km > 0),
  tempo_estimado_min     INTEGER CHECK (tempo_estimado_min > 0),
  reducao_exposicao_pct  NUMERIC(5,2) CHECK (reducao_exposicao_pct BETWEEN 0 AND 100),
  data_hora              TIMESTAMP NOT NULL,
  data_expiracao         TIMESTAMP NOT NULL
);

-- Regiões atravessadas por cada rota (resolve o N:N entre ROTA e REGIAO)
CREATE TABLE rota_regiao (
  id_rota            BIGINT NOT NULL REFERENCES rota (id_rota) ON DELETE CASCADE,
  id_regiao          BIGINT NOT NULL REFERENCES regiao (id_regiao),
  ordem              SMALLINT NOT NULL,
  indice_no_momento  NUMERIC(6,3),
  PRIMARY KEY (id_rota, id_regiao)
);

-- Alertas enviados ao usuário (RF-003, RF-008)
CREATE TABLE alerta (
  id_alerta   BIGSERIAL PRIMARY KEY,
  id_usuario  BIGINT NOT NULL REFERENCES usuario (id_usuario),
  id_regiao   BIGINT REFERENCES regiao (id_regiao),
  id_rota     BIGINT REFERENCES rota (id_rota) ON DELETE SET NULL,
  tipo        VARCHAR(20) NOT NULL CHECK (tipo IN ('PROXIMIDADE', 'CONFIRMACAO', 'SISTEMA')),
  mensagem    VARCHAR(255) NOT NULL,
  data_hora   TIMESTAMP NOT NULL,
  status      VARCHAR(10) NOT NULL DEFAULT 'ENVIADO' CHECK (status IN ('ENVIADO', 'LIDO'))
);

-- Rede de benefícios (RF-005, RNE-002)
CREATE TABLE parceiro (
  id_parceiro  BIGSERIAL PRIMARY KEY,
  nome         VARCHAR(120) NOT NULL,
  categoria    VARCHAR(30) NOT NULL
               CHECK (categoria IN ('LOCADORA', 'SEGURADORA', 'OFICINA', 'OUTRO')),
  contato      VARCHAR(150)
);

CREATE TABLE oferta (
  id_oferta            BIGSERIAL PRIMARY KEY,
  id_parceiro          BIGINT NOT NULL REFERENCES parceiro (id_parceiro),
  descricao            VARCHAR(255) NOT NULL,
  percentual_desconto  NUMERIC(5,2) CHECK (percentual_desconto BETWEEN 0 AND 100),
  nivel_minimo         VARCHAR(10) NOT NULL CHECK (nivel_minimo IN ('BRONZE', 'PRATA', 'OURO')),
  validade             DATE NOT NULL
);

CREATE TABLE resgate (
  id_resgate    BIGSERIAL PRIMARY KEY,
  id_usuario    BIGINT NOT NULL REFERENCES usuario (id_usuario),
  id_oferta     BIGINT NOT NULL REFERENCES oferta (id_oferta),
  codigo_unico  VARCHAR(12) NOT NULL UNIQUE,
  data_resgate  TIMESTAMP NOT NULL,
  status        VARCHAR(10) NOT NULL DEFAULT 'GERADO'
                CHECK (status IN ('GERADO', 'UTILIZADO', 'EXPIRADO'))
);

-- Carga inicial dos tipos de ocorrência e pesos (RNE-007)
INSERT INTO tipo_ocorrencia (nome, peso_gravidade) VALUES
  ('Roubo de veículo', 5),
  ('Roubo de carga', 4),
  ('Assalto a pessoa', 4),
  ('Furto de veículo', 3),
  ('Furto de carga ou pertences', 2),
  ('Atitude suspeita', 1);
