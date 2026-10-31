# Modelo de ameaças — M1 local

M1 aceita exclusivamente cenários fictícios, sem identidade real, autenticação, banco, IA ou corretoras. Nenhuma operação executa uma negociação; o endpoint é um calculador sem persistência.

## Fronteiras e controles
- Navegador não é confiável: saldos e posições são recalculados no servidor a partir dos eventos, com parsing estrutural, referências e moeda validados. Um valor de total enviado pelo cliente não é aceito como autoridade.
- Cenários validam propriedade entre usuário simulado, carteira e contas. Isso não é autenticação nem RLS e não autoriza dados reais.
- POST /api/simulation: JSON até 1 MB em leitura incremental, limites de quantidade de registros, validação de origem do navegador e resposta no-store. Sem request-body logging, segredos ou chamadas externas. Rate limiting e proteção pública contra abuso continuam pendentes; uso local apenas.
- localStorage e backups JSON são legíveis por quem acessa o perfil do navegador/arquivo. Não são armazenamento criptografado ou backup automático. Falha de gravação local é informada; o usuário deve exportar o cenário.
- Snapshot é editável; IDs únicos e validação impedem inconsistências acidentais, não falsificação. Uma trilha imutável depende de persistência autenticada posterior.
- Referências sempre simuladas com fonte, moeda, data UTC, indicação de defasagem e bloqueio de totais incompletos.
- Segredos futuros só no servidor; nunca NEXT_PUBLIC para credenciais. Nada de credenciais de corretoras.
- Futuro assistente: consentimento e fontes aprovadas, documentos tratados como dados contra injeção, sem ferramentas de negociação.
- Dependências fixadas e npm ci; CI definido. Dependency Review em repositório privado depende de disponibilidade/licença GitHub.

## Gates para uso real/produção
Auth, RLS com testes negativos, persistência segura, retenção, backups, reconciliação contábil ampliada, auditoria imutável, rate limiting e revisão de segurança. O atual modelo de custo médio e precisão deve ser revisto para novos instrumentos e regras fiscais. Nenhum deploy autorizado nesta etapa.
