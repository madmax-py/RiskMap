# Time ágil do RiskMap

Este documento registra como o time do RiskMap trabalha: papéis, regras de entrada e saída do trabalho, stakeholders, comunicação e limite de WIP. Ele vale para tudo o que entra no repositório a partir do Milestone 2 do Ciclo 02.

## Papéis do time

| Papel | Integrante | GitHub | O que faz no projeto |
|---|---|---|---|
| Product Owner | Kauã Ferreira Grande | kaua279ky-hash | Mantém o backlog nas issues, escreve as histórias de usuário e os critérios de aceitação a partir dos requisitos (RF, RNF e RNE) do Documento de Especificação, define a prioridade MoSCoW, leva o backlog para validação com o público-alvo e aceita ou recusa o que chega em DONE. |
| Scrum Master | Pedro Gomes | madmax-py | Conduz as reuniões do time, cuida do quadro e do respeito ao limite de WIP, remove impedimentos, garante que todo PR siga o template e mantém o Documento de Especificação organizado. Também atua como Developer. |
| Developer | Pedro Henrique Silva | Pedro8317 | Desenvolve e mantém os protótipos no Figma e as telas ligadas a cada requisito, e revisa PRs dos colegas. |
| Developer | Maria Eduarda | olvmah | Desenvolve os itens do backlog, como o script do banco de dados e a documentação técnica, e revisa PRs dos colegas. |

Todos os integrantes podem abrir issues e PRs. Só o PO muda a prioridade de uma issue.

## Definition of Ready

Uma issue só pode ir de TO-DO para DOING quando:

- [ ] Foi criada a partir de um dos templates do repositório (funcionalidade ou bug)
- [ ] Tem a história de usuário no formato "Como ..., quero ... para ..." (funcionalidade) ou os passos para reproduzir (bug)
- [ ] Tem pelo menos um critério de aceitação verificável, escrito como item de checklist
- [ ] Tem o label de prioridade MoSCoW (Must, Should ou Could)
- [ ] Cita os requisitos e regras relacionados (RF, RNF ou RNE) do Documento de Especificação
- [ ] Tem um responsável atribuído (assignee)
- [ ] O DOING tem vaga dentro do limite de WIP

## Definition of Done

Uma issue só vai para DONE quando o PR que a resolve cumpre todos os itens abaixo. Esta lista é a mesma do checklist do [template de pull request](../.github/pull_request_template.md):

- [ ] Todos os critérios de aceitação da issue foram atendidos
- [ ] O PR referencia a issue com `Closes #número`
- [ ] Os requisitos e regras afetados (RF, RNF, RNE) estão citados na issue ou no PR
- [ ] O Documento de Especificação foi atualizado, quando a mudança altera requisito, regra ou modelo de dados
- [ ] Pelo menos um integrante que não é o autor revisou e aprovou o PR
- [ ] O card da issue está no quadro e foi movido para DONE após o merge

## Matriz de stakeholders

Classificação por poder (capacidade de influenciar o projeto) e interesse (quanto o projeto afeta o stakeholder):

| | **Interesse alto** | **Interesse baixo** |
|---|---|---|
| **Poder alto** | **Gerenciar de perto**<br>Orientadores do PI (Eduardo Dias Pereira e William Pereira dos Santos Júnior); professores das disciplinas do período; locadoras, seguradoras e associações de proteção veicular parceiras | **Manter satisfeito**<br>Plataformas de entrega e transporte (iFood, Rappi, Uber, 99); secretarias estaduais de segurança pública (fontes de dados oficiais); ANPD e a legislação de proteção de dados (LGPD) |
| **Poder baixo** | **Manter informado**<br>Motoboys, entregadores e motoristas de aplicativo (usuários primários); oficinas e demais parceiros de benefícios; moderadores dos reports | **Monitorar**<br>Moradores e comerciantes das regiões mapeadas (risco de estigmatização territorial); visitantes e turistas (uso não profissional, fora do escopo) |

Estratégia por quadrante:

- **Gerenciar de perto:** os orientadores recebem cada entrega de fase e validam as mudanças de escopo. Os parceiros são consultados sobre os dados agregados que precisam (RNE-004) e sobre o modelo de benefícios (RNE-002).
- **Manter satisfeito:** respeitar os termos de uso das plataformas (uso de deep link, sem integração não autorizada), citar a origem dos dados oficiais e tratar a LGPD como requisito de primeira ordem (RNF-003). Não há contato frequente, mas cada decisão que os afeta é registrada no Documento de Especificação.
- **Manter informado:** a pesquisa com usuários (seções 11 e 12 do Documento de Especificação) continua a cada período, e os achados viram issues no backlog. Os usuários são ouvidos antes de priorizar funcionalidades novas.
- **Monitorar:** o índice de risco é calculado por faixa horária e normalizado pelo fluxo de motoristas, para não marcar bairros inteiros como perigosos. O uso não profissional fica registrado como Won't (issue #13).

## Plano de comunicação

| O que | Para quem | Canal | Frequência |
|---|---|---|---|
| Andamento de cada um (o que fez, o que vai fazer, impedimentos) | Time | Grupo do time no WhatsApp | Diária, por mensagem até as 21h |
| Planejamento e revisão da semana: o que entra em DOING e o que foi para DONE | Time | Reunião online (Google Meet) com o quadro aberto | Semanal |
| Discussão técnica de cada item | Time | Comentários na issue ou no PR do GitHub | Sempre que o item é atualizado |
| Pedido de revisão de PR | Integrante revisor | Revisor atribuído no PR do GitHub, com aviso no grupo | A cada PR aberto |
| Situação do projeto e mudanças de escopo | Orientadores do PI | Reunião de orientação e e-mail | A cada fase do PI |
| Entregas formais | Professores e orientadores | AVA | Conforme o calendário das disciplinas |
| Achados de pesquisa e validação de funcionalidades | Usuários primários (motoristas e entregadores) | Conversas presenciais e por mensagem | A cada período, antes de priorizar o backlog |

## Quadro e limite de WIP

O fluxo do time fica no quadro do GitHub Projects ligado a este repositório, com as colunas **TO-DO**, **DOING** e **DONE**. Toda issue do backlog está no quadro.

**Limite de WIP do DOING: 3 issues.**

Justificativa pelo tamanho do time: o time tem 4 integrantes. O Product Owner se dedica a refinar e priorizar o backlog e a aceitar as entregas, então quem puxa trabalho para o DOING são os outros 3 (o Scrum Master e os 2 Developers). Com o limite de 3, cada um tem no máximo uma issue em andamento por vez. Isso evita que alguém acumule tarefas paradas, deixa visível quem está bloqueado e obriga o time a terminar e revisar um item antes de começar outro. Se o DOING está cheio, quem ficou livre ajuda a revisar os PRs abertos em vez de puxar uma issue nova.

## Declaração de uso de IA

- **Ferramenta:** Claude Code (Anthropic).
- **Para quê:** gerar, a partir do Documento de Especificação do RiskMap escrito pelo time, os rascunhos do README, dos templates de issue e de PR, deste documento, das issues do backlog e do script `database/schema.sql`, que transcreve o dicionário de dados da seção 18.2.
- **O que o time revisou ou mudou:** o conteúdo de produto (problema, público, requisitos, regras e modelo de dados) vem do Documento de Especificação produzido pelo time. Os papéis no Scrum foram definidos pelo time, que substituiu a sugestão inicial da ferramenta. A matriz de stakeholders, o plano de comunicação e o limite de WIP foram propostos pela ferramenta e precisam ser revisados e ajustados pelo time antes da entrega.
