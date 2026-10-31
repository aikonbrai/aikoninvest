# Validação M0 — 29/10/2026

## Executado localmente
- npm run lint: aprovado, sem avisos após ajuste do PostCSS.
- npm run typecheck: aprovado.
- npm test: 11 testes aprovados (6 originais + 5 de limites, rejeições e arredondamento).
- npm run build: aprovado; rota / gerada estaticamente.
- Servidor de produção temporário na porta 3100: HTTP 200, idioma pt-BR, rótulo SIMULADO e total demonstrativo R$ 35.500,00 verificados. Servidor encerrado.
- Instalação final auditou 360 pacotes, zero vulnerabilidades reportadas naquele momento. Auditoria não equivale a revisão de segurança completa.

## Limitações e pendências
- Sem inspeção visual em navegador, screenshots ou testes de interação em dispositivo real. Layout usa breakpoints, mas QA visual permanece pendente.
- CI definido, ainda não executado remotamente; nenhum repositório GitHub criado. Confirmar disponibilidade de Dependency Review no repositório privado.
- Nenhum deploy, banco, migração, login, IA, feed de preços ou conta real conectado.
- npm sinalizou script de instalação pendente para unrs-resolver; não foi autorizado. Lint funcionou sem ele neste ambiente.
- O ambiente bloqueou subprocessos do runner Node; testes e build foram executados com aprovação fora do sandbox.

## Próxima aceitação (M1)
Ledger simulado com quantidade precisa, aportes, compras/vendas, taxas e câmbio por operação; testes de reconciliação e separação de aportes e resultado. O protótipo atual não é contabilidade de produção.

## Visual update inspired by dashboard reference — 2026-10-29
- CSS-only change: navy surfaces, subtle borders, rounded cards, violet navigation, green/violet/rose metric accents and pink primary action.
- Responsive layouts and reduced-motion preference retained; no dependency, schema, migration or financial logic change.
- Local HTTP 200 and compiled dark-theme CSS verified. Browser visual inspection remains pending because the Computer Use runtime is unavailable in this session.

## M1 — Carteira simulada funcional — 29/10/2026

### Executado
- npm run typecheck: aprovado.
- npm run lint: aprovado, sem avisos.
- npm test: **43 testes aprovados** (11 aritmética original/ampliada, 26 cenários de ledger, 6 cenários do handler HTTP).
- npm run build: aprovado, incluindo rota dinâmica /api/simulation e página inicial.
- HTTP real no servidor local localhost:3000: página 200 com formulário e patrimônio fictício esperado; endpoint 200 com patrimônio de R$ 26.030,80 e resultado nominal de R$ 1.030,80 sobre R$ 25.000,00 de aportes líquidos. Aporte adicional de R$ 100,00 elevou patrimônio e aportes em R$ 100,00 sem alterar resultado. Retirada sem saldo retornou 400. Data anterior não usou cotações futuras e bloqueou total incompleto.
- Snapshot JSON passa por ida e volta mantendo eventos e totais; campos desconhecidos são descartados. API rejeita corpo malformado, origem externa, formato incorreto e payload maior que 1 MB.
- Engine: reconciliação de movimentos de caixa, custo médio e custo histórico BRL, venda parcial/integral, quantidade fracionária, FX separado, taxas/tributos, dividendos, retirada, transferência, câmbio, split/grupamento, precisão, limites de concentração, cotações ausentes/defasadas e avaliação por data.

### Limites de verificação
- Sem automação de navegador ou revisão visual: interação via cliques, reload/localStorage e download/upload pelo navegador ainda precisam de QA manual. Os cálculos, handler, roundtrip JSON e servidor HTTP foram verificados; não são uma validação visual completa.
- O rascunho é local e editável. Não há persistência no servidor, sincronização, Auth, RLS, banco ou auditoria imutável. Nenhuma migração ou dependência nova foi necessária.
- Sem cotações ao vivo, cálculo fiscal, custódia de ativos entre contas ou execução de ordens. Referências e operações são exclusivamente fictícias.
- Repositório remoto, execução do CI no GitHub e publicação não realizados.

### Roteiro curto para QA manual
1. Abrir localhost:3000, conferir o exemplo e exportar backup JSON.
2. Iniciar cenário vazio; aportar BRL, comprar ativo BRL, informar taxa/tributo e verificar caixa/posição.
3. Converter parte do caixa em USD, comprar ativo USD e registrar preços/câmbio de avaliação.
4. Alterar limite de concentração, conferir alerta e testar data histórica sem referências.
5. Recarregar e abrir rascunho salvo; importar o backup e verificar recuperação. Testar localStorage indisponível, feedback de erro e alternativa de exportação.
6. Conferir a navegação, formulários e tabelas em desktop e tela estreita.

## M0 — Repositório local e CI — 30/10/2026

### Executado
- Repositório Git local inicializado, sem remoto, publicação, deploy ou conta conectada.
- O workflow [.github/workflows/ci.yml](../.github/workflows/ci.yml) foi validado localmente: `npm run lint`, `npm run typecheck`, `npm test` (43 testes) e `npm run build` foram aprovados.
- `npm audit --audit-level=high` terminou com código de saída zero: não há vulnerabilidades altas ou críticas reportadas.
- O repositório privado `aikonbrai/aikoninvest` foi conectado e a execução remota inicial do GitHub Actions foi aprovada: [run 41159469092](https://github.com/aikonbrai/aikoninvest/actions/runs/41159469092). O job `validate` concluiu todas as etapas previstas.

### Limites e pendências
- A auditoria ainda reporta 16 vulnerabilidades moderadas transitivas no conjunto de lint. Não foi aplicada correção automática, pois `npm audit fix` pode alterar a árvore de dependências e exige uma revisão separada.
- O job `dependency-review` foi ignorado corretamente no push, pois só executa para pull requests. A disponibilidade dele em uma pull request privada permanece a confirmar.
- O README documenta os passos manuais para criar o repositório privado, publicar o histórico e verificar os dois jobs. Nenhuma credencial, dado financeiro real, dependência, schema, migração ou configuração de deploy foi alterado.
