# RiskMap

Aplicativo de segurança e economia para motoboys, entregadores e motoristas de aplicativo que passam o dia nas ruas, muitas vezes em regiões que não conhecem bem.

## Objetivo

**Problema.** A informação sobre áreas de risco de assalto, roubo de veículo e furto de carga existe, mas está espalhada em grupos de mensagens, na memória de cada profissional e no boca a boca. Ela chega tarde e não está disponível no momento em que o motorista decide por qual rota seguir. Sem o veículo de trabalho, o profissional perde a renda dos dias seguintes.

**Para quem.**

- **Usuários primários:** motoboys e entregadores (iFood, Rappi, 99Food), motoristas de aplicativo (Uber, 99, InDrive), motoristas de carga leve e transportadores autônomos, que passam de 8 a 12 horas por dia na rua.
- **Usuários secundários:** locadoras de veículos, seguradoras, associações de proteção veicular e oficinas, que hoje precificam e concedem cobertura sem dados reais de risco por região e horário.

O RiskMap reúne essas informações em um mapa de calor, sugere rotas mais seguras e recompensa quem contribui com a base de dados.

## Escopo

**O que o produto faz:**

- Mapa de calor de risco por região, calculado por dia da semana e faixa horária, com nível de confiança (RNE-001, RNE-005)
- Registro rápido de reports pela comunidade, com validação antifraude e moderação (RF-001, RF-008, RF-009)
- Rotas alternativas com o ganho de segurança explícito e envio para Waze ou Google Maps (RF-002)
- Alertas de proximidade com recomendações práticas (RF-003)
- Detalhes da região, filtros e histórico de rotas (RF-004, RF-007, RF-010)
- Pontuação de engajamento e resgate de benefícios na rede de parceiros (RF-005, RF-006)
- Cadastro, login e gestão de perfil com consentimento LGPD (RF-011, RF-012)

**O que fica de fora nesta fase (3º período):**

- Implementação do aplicativo: nesta fase o time entrega a modelagem de dados, o script do banco e o algoritmo de risco em validação
- Integração real com bases públicas de segurança e com sistemas de parceiros
- Telas de registro e confirmação de report e da área de benefícios no protótipo (previstas para a próxima iteração do design)
- Uso não profissional, como turistas e visitantes (registrado como expansão futura)

O backlog completo está nas [issues](https://github.com/madmax-py/RiskMap/issues), priorizado por MoSCoW.

## Time e papéis

| Integrante | Matrícula | Papel no Scrum | Responsabilidade no projeto |
|---|---|---|---|
| Eduardo Henrique de Sousa Silva | 2520231 | Product Owner | Requisitos e priorização do backlog |
| Pedro Gomes | 2520819 | Scrum Master | Liderança, organização do projeto e do documento |
| Pedro Henrique Silva | 2520616 | Developer | Design do sistema e protótipos |
| Kauã Ferreira Grande | 2520781 | Developer | Pesquisa com usuários e soluções existentes |

Orientadores: Eduardo Dias Pereira (principal) e William Pereira dos Santos Júnior (secundário).

Detalhes dos papéis, Definition of Ready, Definition of Done e regras do time em [docs/time-agil.md](docs/time-agil.md).

## Como executar

O RiskMap ainda não tem código executável. A implementação começa no próximo período. Por enquanto, o projeto pode ser acessado assim:

- **Protótipo navegável (Figma):** https://www.figma.com/design/qZxm8V84HM4ZehntOEzig1/Sem-t%C3%ADtulo?node-id=78-1221
- **Script do banco de dados:** [database/schema.sql](database/schema.sql), para PostgreSQL com PostGIS:

  ```bash
  createdb riskmap
  psql -d riskmap -f database/schema.sql
  ```

- **Backlog:** [issues do repositório](https://github.com/madmax-py/RiskMap/issues)
- **Quadro Kanban:** aba [Projects](https://github.com/madmax-py/RiskMap/projects) do repositório
- **Documentação do time:** [docs/time-agil.md](docs/time-agil.md)
