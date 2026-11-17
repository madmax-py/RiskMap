# RiskMap — protótipo front-end

Protótipo navegável do RiskMap (Projeto Integrador), feito a partir das telas do Figma.
Só front-end: **todos os dados são mockados** e ficam salvos no `localStorage` do navegador.

## Rodar

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
npm run build        # gera /dist (site estático, sobe em qualquer hospedagem)
npm run build:single # gera /dist-single/index.html com tudo embutido (dá pra mandar como arquivo)
```

Login: qualquer e-mail válido + senha com 6+ caracteres (ou "Entrar com Google", que é simulado).

## Mapa real (Goiânia) x modo demonstração

O app tem dois modos e escolhe sozinho:

| | Modo real | Modo demonstração |
|---|---|---|
| Quando | `VITE_ORS_API_KEY` preenchida no `.env` | sem chave (ou `VITE_MAP_MODE=demo`) |
| Mapa | MapLibre GL + estilo Dark Matter da CARTO (sem chave) | cidade fictícia em SVG |
| Rotas | OpenRouteService, desviando das áreas com `avoid_polygons` | A* local na cidade fictícia |
| Busca | regiões + endereços reais (geocoding do ORS) | só regiões |
| Internet | precisa | não precisa |

Pra ligar o modo real:

1. Crie uma conta grátis em https://openrouteservice.org/dev/#/signup e gere uma chave.
2. Copie `.env.example` para `.env` e cole a chave em `VITE_ORS_API_KEY`.
3. Rode `npm run dev` de novo (o Vite só lê o `.env` na inicialização).

Como as preferências viram parâmetros do ORS (`src/geo/routing.ts`):

- **Mais segura:** evita áreas de alto risco e de atenção.
- **Equilibrada:** evita só alto risco.
- **Mais rápida:** não evita nada (as áreas só são sinalizadas).
- Uma área que contém a origem ou o destino nunca é evitada (senão não existe rota).
  Se o ORS não achar caminho desviando, o app mostra a rota direta com um aviso.

Limites importantes:

- **Os polígonos das regiões são aproximados** (`src/geo/realRegions.ts`), gerados em volta do
  centro de cada bairro. Redesenhem no https://geojson.io antes de apresentar como dado real.
- **A chave fica visível no navegador.** Pra protótipo tudo bem; em produção as chamadas ao ORS
  devem passar pelo backend de vocês.
- O plano grátis do ORS tem limite por minuto e por dia. Cada análise de rota faz até 2 chamadas
  (a rota escolhida + a "mais segura" pra comparar). As rotas ficam em cache enquanto a aba está aberta.
- A posição do usuário continua simulada (Praça Cívica). Pra GPS de verdade, troquem `userPos`
  em `src/geo/index.ts` por `navigator.geolocation`.

## Stack

Vite + React 18 + TypeScript · React Router (HashRouter) · Framer Motion (animações) ·
React Hook Form + Zod (validação) · lucide-react (ícones) · Poppins via @fontsource.
CSS puro com variáveis (tokens no topo de `src/styles/global.css`).

## Estrutura

```
src/
  App.tsx              rotas
  main.tsx             entrada + imports de CSS/fontes
  store/AppStore.tsx   estado global (usuário, preferências, histórico, ocorrências, alertas)
  data/mock.ts         regiões, estatísticas, categorias, alertas e histórico fake
  geo/
    config.ts          escolhe modo real ou demo (variáveis do .env)
    index.ts           geometria comum aos dois modos (áreas, distância, risco ao longo da rota)
    routing.ts         cálculo de rota (ORS ou A*), hook useRoute, busca de endereços
    realRegions.ts     polígonos aproximados dos bairros de Goiânia
  lib/
    city.ts            cidade fictícia + roteamento A* com peso de risco (modo demo)
    validation.ts      schemas Zod dos formulários
    format.ts          distância, tempo, datas
    motion.ts          variantes de animação reutilizáveis
  components/          MapView (escolhe RealMap ou CityMap), RealMap (MapLibre), CityMap (SVG),
                       Button, Field, Dialog, Toast, navs...
  pages/               uma tela por arquivo
  styles/              global, components, pages, map
```

## Telas

| Rota | Tela |
|---|---|
| `/login`, `/cadastro`, `/recuperar-senha` | Autenticação (com validação) |
| `/mapa` | Mapa com região atual, busca, regiões clicáveis |
| `/mapa?place=<id>` | Resultado da busca (painel da região + "Analisar rota") |
| `/regiao/:id` | Detalhes da região (ocorrências, horário de pico) |
| `/rota?de=&para=&pref=` | Análise de rota (origem/destino, preferência, níveis de risco, dicas) |
| `/navegacao` | Navegação simulada com instruções e aviso ao entrar em área de risco |
| `/rotas` | Histórico (recentes/favoritas) |
| `/alertas` | Alertas com filtro |
| `/perfil`, `/perfil/:secao` | Perfil e configurações |
| `/ocorrencia/nova`, `/ocorrencia/:id/enviada` | Registrar ocorrência e confirmação |

## O que é fake (e o que trocar quando tiver backend)

- **Mapa:** veja a seção "Mapa real x modo demonstração" acima.
- **Dados:** `data/mock.ts` → substituir por chamadas à API (ex.: React Query).
- **Login:** só simula. Trocar por autenticação real (JWT/OAuth) no `AppStore`.
- **GPS:** posição fixa no Setor Central.
- **Histórico de rotas:** distância/tempo de cada rota são salvos quando ela é feita (as rotas de exemplo têm números fixos).
- **Registro por voz:** usa a Web Speech API de verdade (Chrome/Edge/Safari) e casa palavras-chave
  com as categorias. No Firefox avisa que não é suportado.
- **Tema claro:** marcado como "em breve".
