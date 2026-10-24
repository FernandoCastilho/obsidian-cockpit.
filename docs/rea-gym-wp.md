# REA — Gym WP (Workout Tracker & Log)

Engenharia reversa **funcional** do app, feita a partir de material público
(listagens de loja e changelogs). Nenhum APK foi decompilado e o app não foi
instrumentado: tudo marcado como **[inferido]** é hipótese a validar com uso
real do app.

- Desenvolvedor: Leal Apps
- Plataformas: Android e iOS
- Versão de referência: 10.17.1 (changelog mais recente encontrado)
- Modelo: gratuito com compras no app (iOS)

Fontes:
[App Store](https://apps.apple.com/us/app/id1524374229) ·
[APKMirror — releases](https://www.apkmirror.com/apk/leal-apps/gym-wp-workout-routines/) ·
[APKMirror — 10.15.0](https://www.apkmirror.com/apk/leal-apps/gym-wp-workout-routines/gym-wp-workout-tracker-log-10-15-0-release/) ·
[APKMirror — 10.5.2](https://www.apkmirror.com/apk/leal-apps/gym-wp-workout-routines/gym-wp-workout-routines-10-5-2-release)

---

## 1. Proposta de valor

Registrar treino na academia com o mínimo de toques e devolver progressão
visível. Três promessas centrais:

1. Gerar um plano personalizado e conduzir a sessão.
2. Registrar séries, repetições, carga e descanso.
3. Mostrar histórico e gráficos de evolução.

Diferenciais declarados nas versões recentes: otimização por IA e rastreio de
recuperação muscular, que sugere o próximo grupo a treinar.

---

## 2. Inventário funcional

| Módulo | Capacidade | Evidência |
| --- | --- | --- |
| Biblioteca | 500+ exercícios com instruções | listagem |
| Filtros | Por equipamento (barra, halter, máquina) e grupo muscular | listagem |
| Plano | Geração de plano personalizado | listagem |
| Sessão | Condução do treino, timer de descanso | listagem |
| Log | Séries, repetições, carga, descanso | listagem |
| Histórico | Lista de treinos + gráficos de progresso | listagem |
| Recuperação | Estado por músculo → sugestão do próximo treino | listagem (10.x) |
| Compartilhar | Compartilhar treino concluído | changelog 10.5.2 |
| Exportar | Exportação de estatísticas de treino | changelog 10.15.0 |
| Tema | Dark mode | changelog 10.1.0 |
| Exercícios | Tela de configurações de exercício (adicionar/editar dados) | changelog 10.17.1 |

Observação de UI (ícone do launcher): badge numérico "1" indica notificação
ativa — **[inferido]** lembrete de treino ou aviso de recuperação.

---

## 3. Modelo de dados [inferido]

Reconstruído do que o app expõe na interface e na exportação.

```
Exercise      id, nome, grupo_muscular[], equipamento, instruções, custom:bool
Routine/Plan  id, nome, itens[{exercise_id, séries_alvo, reps_alvo, descanso}]
Workout       id, data, início, fim, routine_id?, notas
SetLog        id, workout_id, exercise_id, ordem, reps, carga, unidade, descanso, tipo?
MuscleState   grupo_muscular, último_estímulo, volume_recente → fadiga/recuperação
Settings      unidade (kg/lb), tema, timer padrão, lembretes
```

Regras de negócio prováveis:

- **Recuperação:** função do volume recente (séries × carga) por grupo
  muscular decaindo no tempo; a sugestão do "próximo músculo" é o grupo mais
  recuperado ou há mais tempo sem estímulo.
- **Progressão:** gráfico por exercício = melhor série ou volume total por
  sessão ao longo do tempo (e1RM é comum no segmento, não confirmado).
- **Exercício custom:** a tela da 10.17.1 sugere que exercícios editáveis
  convivem com a biblioteca embarcada.

---

## 4. Arquitetura provável [inferido]

| Camada | Hipótese | Por quê |
| --- | --- | --- |
| Persistência | Local-first (SQLite/Room no Android, Core Data no iOS) | App de log offline por natureza; academia tem sinal ruim |
| Biblioteca | Dataset embarcado versionado, atualizado por release | "500+ exercícios" citado como número fixo |
| IA | Heurística/servidor para geração de plano; recuperação provavelmente local | Não há evidência de chamada de rede obrigatória |
| Monetização | Paywall em recursos avançados (plano por IA, exportação) | Compras no app na loja iOS |
| Notificações | Locais (lembrete de treino/descanso) | Badge no ícone |

---

## 5. Pontos fortes e lacunas

Fortes:

- Escopo enxuto: logar rápido é o fluxo principal.
- Recuperação muscular como diferencial acionável (diz *o que* treinar).
- Cadência alta de releases (10.x com mudanças incrementais).

Lacunas a verificar:

- Sincronização entre dispositivos e backup na nuvem.
- Exportação em formato aberto (CSV/JSON) versus apenas estatísticas.
- Integração com Health Connect / Apple Health.
- Qualidade real da "IA": regras fixas ou modelo.
- Alegações de marketing ("97,8% dos usuários melhoraram", "5 milhões de
  usuários") não verificadas de forma independente.

---

## 6. Aplicação ao Obsidian Cockpit

O que vale portar para um módulo de treino no vault:

1. **Notas como log:** `type: workout` em `Treinos/`, com frontmatter
   (`date`, `routine`) e séries em tabela ou dataview-friendly
   (`exercise`, `reps`, `load`). Mesma regra de escopo do Team Manager: `type:`
   correto **e** pasta configurada.
2. **Biblioteca de exercícios:** `type: exercise` em `Exercicios/`, com
   `muscle`, `equipment`. Elimina o dataset embarcado e permite exercícios
   custom por padrão.
3. **Recuperação muscular:** cálculo derivado no índice (volume por grupo nos
   últimos N dias), nunca gravado na nota.
4. **Progressão:** gráfico por exercício a partir das séries indexadas.
5. **Exportação:** já resolvida — os dados são markdown.

Fora de escopo inicial: timer de descanso em tempo real, geração de plano por
IA, compartilhamento social.

---

## 7. Próximos passos para fechar a REA

- Instalar o app e percorrer: onboarding, criar rotina, executar treino,
  histórico, exportação. Capturar telas.
- Inspecionar o arquivo exportado para confirmar o schema da seção 3.
- Verificar em Configurações os itens de sync/backup e o que fica atrás do
  paywall.
- Se necessário, análise de tráfego (proxy) para confirmar o que vai para
  rede. Só com o app instalado por você e para uso pessoal.
