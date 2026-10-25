---
tags: [ia-automacao, hevy, engenharia-reversa]
status: parcial — aguardando captura do app web
---
# Hevy web — engenharia reversa

## Estado
| Etapa | Situação |
|---|---|
| Captura de rede do app web | **Pendente.** Exige login manual; rodar `tools/hevy-re/capture.mjs` na máquina local |
| Mapa de telas, fluxos e modelo de dados | Pendente (depende da captura) |
| API oficial | Levantada abaixo, a partir de fontes secundárias |
| Delta web × API oficial | Parcial: só o lado da API oficial está preenchido |

## API oficial (`api.hevyapp.com`)
Fonte: resumos de terceiros (servidores MCP, integrações). **Não verifiquei contra `api.hevyapp.com/docs`**, que não resolveu a partir do container. Confirmar na documentação oficial.

- Autenticação: header `api-key`. A chave é gerada em Settings → Developer e exige Hevy Pro.
- Leitura (GET): `/v1/workouts`, `/v1/workouts/{id}`, `/v1/workouts/count`, `/v1/routines`, `/v1/routines/{id}`, `/v1/routine_folders`, `/v1/exercise_templates`, `/v1/exercise_templates/{id}`, `/v1/exercise_history/{id}`.
- Escrita: POST/PUT para workouts, routines, routine folders e exercise templates. Sem DELETE nem PATCH. Em PUT, séries e exercícios omitidos são apagados, então é preciso reenviar o objeto completo.
- Paginação: ~10 itens/página em workouts, routines e folders; ~100 em exercise templates.
- Unidades: peso em kg, duração em segundos.
- Versão declarada 0.0.1, com aviso de que a estrutura pode mudar.

## Hipóteses a validar com a captura (não confirmadas)
Itens que a API oficial, pelo que consta acima, **não expõe** e que o app web provavelmente consome:
- perfil e conta (dados do usuário, seguidores/seguindo, feed social);
- estatísticas e gráficos de evolução (volume, 1RM estimado, recordes pessoais, distribuição muscular);
- configurações (unidades, privacidade, notificações, assinatura);
- exclusão de treinos e rotinas;
- medidas corporais.

## Como completar
1. `cd tools/hevy-re` e seguir o `README.md` (captura com login manual, somente leitura).
2. Enviar o `hevy-schema.md` gerado por `analyze.mjs` (só esquema, sem valores).
3. Com isso preencho: telas e fluxos, endpoints internos (método, query, payload), modelo de dados e o delta definitivo contra a API oficial.
