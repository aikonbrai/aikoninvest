# AIKON Invest Lab

Laboratório local de carteira **SIMULADA** BRL/USD. Next.js App Router, TypeScript e Tailwind, com cálculos determinísticos no servidor. Use somente dados fictícios. Sem corretoras, ordens, cotações ao vivo ou dados patrimoniais reais.

## Executar
Requer Node.js 24 e npm. Na pasta deste arquivo:

```sh
npm ci
npm run dev
```

Abra http://localhost:3000. Para validar:

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Os testes compilam o motor e o handler da API em dist e executam node:test. Nenhum segredo ou serviço externo necessário.

## Usar o M1
1. O primeiro acesso mostra um exemplo fictício com PETR4, BOVA11 e VOO. Esses preços não são de mercado.
2. Para montar suas hipóteses, use **Iniciar cenário vazio** e registre aportes na moeda de cada conta.
3. Registre compras, vendas, dividendos, taxas, retiradas, desdobramentos, transferências de caixa ou conversões BRL/USD. Quantidades aceitam até seis casas; valores monetários, duas.
4. Informe câmbio na data da operação (BRL por USD), custos e fonte da hipótese. Compra/venda exige conta e ativo na mesma moeda.
5. Registre preços e câmbio de avaliação em **Preços e câmbio** e escolha a data de avaliação. Sem referência válida até a data, o total fica indisponível; referência com mais de sete dias corridos gera aviso.
6. Consulte posições, caixa, custos, concentração e histórico. O resultado nominal é patrimônio menos aportes líquidos convertidos pelo câmbio de cada operação; não é rentabilidade percentual ou anualizada.
7. As alterações validadas salvam um rascunho no navegador. Após recarregar a página, clique **Abrir rascunho salvo**. Exporte JSON para backup ou para manter vários cenários. Importar substitui o rascunho após validação.

O botão **Ver exemplo original** não apaga seu rascunho; editar ou salvar o exemplo passa a substituir o rascunho. Exclusões no histórico são revalidadas e podem ser recusadas se invalidarem operações posteriores.

## Estado e limites
M1 funcional local, com ledger, avaliação histórica, custos, caixa, FX e alertas de concentração. Persistência exclusivamente em localStorage/backup JSON; sem login, banco, sincronização ou auditoria imutável. Não há ajuste automático de cotações após desdobramento. Transferência de custódia de ativos, CSV, regras fiscais e métricas de volatilidade/drawdown ficam para etapas futuras.

M0 ainda tem pendências externas de repositório privado e execução remota de CI; nenhum repositório remoto ou deploy foi criado. M2 prevê Supabase Auth/RLS e registros reais somente após os gates de segurança. Sem migrações nesta entrega.

Consulte docs/M1.md, docs/VALIDATION.md, docs/SECURITY.md e docs/DECISIONS.md. Leia AGENTS.md antes de ampliar o projeto.

## Repositório privado e CI (handoff M0)

O repositório Git local está inicializado, mas nenhum remoto, deploy ou conta foi conectado. Para publicar o histórico de forma privada e habilitar a automação já validada:

1. Crie um repositório vazio e **privado** no GitHub, sem README, `.gitignore` ou licença inicial.
2. Confirme se o plano/organização permite Dependency Review em pull requests privados. Sem esse recurso, o job `dependency-review` em [.github/workflows/ci.yml](.github/workflows/ci.yml) poderá não executar.
3. Configure a identidade Git local, revise os arquivos com `git status`, faça o primeiro commit e conecte apenas o remoto privado criado:

   ```sh
   git branch -M main
   git add .github .gitignore AGENTS.md README.md docs eslint.config.mjs next-env.d.ts package-lock.json package.json postcss.config.mjs src tests tsconfig.financial.json tsconfig.json
   git commit -m "chore: initialize AIKON Invest Lab"
   git remote add origin <URL_DO_REPOSITORIO_PRIVADO>
   git push -u origin main
   ```

4. No GitHub, abra uma pull request de teste e confirme os jobs `validate` e `dependency-review`. O primeiro executa `npm ci`, lint, typecheck, testes, build e `npm audit --audit-level=high`; o segundo depende do recurso de plataforma acima.

Não conecte credenciais de corretoras, dados patrimoniais reais, provedores de mercado ou serviços de deploy nesta etapa.
