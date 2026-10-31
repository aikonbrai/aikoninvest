> Registro histórico anterior à implementação. **Atualização: M1 funcional implementado localmente**, com 43 testes aprovados, build e checagens HTTP. Consulte [M1.md](M1.md) e [VALIDATION.md](VALIDATION.md) para o estado atual e limitações.

# Validação da prioridade estratégica — 29/10/2026

Resultado: NÃO ATENDIDA. Existe uma demonstração visual; M1 ainda não foi implementado.

## Evidências inspecionadas
- src/app/page.tsx: três posições agregadas constantes; nenhum ticker, quantidade, preço por ativo ou formulário de operação. A conversão usa uma taxa fixa fictícia de 5,25. Rentabilidade aparece sem valor por falta de histórico.
- src/lib/financial.ts: soma/subtração de valores na mesma moeda, conversão USD/BRL e percentual de alocação. Não existe ledger ou cálculo de posição derivado de operações.
- tests/financial.test.mjs: 11 testes de aritmética e rejeição de entradas. Não cobrem aportes, taxas, operações, câmbio por data, reconciliação ou risco de carteira.
- docs/ROADMAP.md: esses requisitos pertencem ao M1; feeds de mercado pertencem ao M3.

## Critérios de aceitação pendentes
| Requisito | Estado atual | Necessário para aceitar |
| --- | --- | --- |
| Ações brasileiras e ativos em dólar | Categorias fixas de demonstração | Ativos identificados, moeda, quantidade e posição derivada de operações |
| Aportes | Ausente | Registro datado, saldo de caixa e separação entre aportes e resultado |
| Taxas | Ausente | Taxas por operação na moeda original e impacto em caixa/custo |
| Câmbio | Conversão isolada | Taxa, origem e data por operação; avaliação com FX de referência separado |
| Riscos | Alocação e texto genérico | Exposição por ativo/moeda e alertas de concentração com limites declarados |
| Acompanhamento | Snapshot fixo | Histórico reproduzível, registro recuperável e avaliação por data |
| Auditoria | Testes de funções básicas | Reconciliação de caixa, posições, custos e resultado com cenários conhecidos |

## Próxima entrega proposta
Implementar M1 isoladamente como laboratório simulado: modelo de ativos/operações, motor determinístico de posições e caixa, entrada manual de eventos fictícios, fontes de preço/FX manuais explicitamente rotuladas, visão de custos e concentração e testes de reconciliação. Não é necessário conectar corretoras ou feeds ao vivo para aceitar uma carteira simulada.

## Limites da fundação
O scaffold web foi validado localmente, mas M0 completo ainda tem pendências de repositório privado, execução remota do CI e revisão visual. A aprovação dos testes de aritmética não comprova a conclusão do simulador.

## Atualização após implementação do M1
A avaliação acima descreve o estado anterior ao M1. Para a implementação autorizada em seguida, consulte M1.md e VALIDATION.md; o snapshot estático foi substituído por ledger funcional e formulários.
