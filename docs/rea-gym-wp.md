# REA — Gym WP (Workout Tracker & Log)

Engenharia reversa **funcional** do app, feita a partir de fontes públicas:
site oficial, listagem da Google Play, termos/privacidade e changelogs.
Nenhum APK foi decompilado e o app não foi instrumentado. O que não vem de
fonte direta está marcado como **[inferido]**.

| Item | Valor |
| --- | --- |
| Empresa | Leal Apps LTDA, Belo Horizonte/MG (CNPJ 30.640.305/0001-29) |
| Contato | contact@gymwp.app · [@gymwpapp](https://www.instagram.com/gymwpapp) |
| Site | [gymwp.app](https://gymwp.app/en/) (pt, en, es, it, fr, de) |
| Conta/checkout web | start.gymwp.app (`/manage`, entrada por `?origem=site-cta`) |
| Plataformas | Android, iOS, Apple Watch |
| Package Android | `com.lealApps.pedro.gymWorkoutPlan` |
| Apps irmãos | alimentese.app, possocomer.app, worfit.app |
| Versão de referência | 10.18.4 (changelog APKMirror mais recente) |
| Modelo | Freemium: assinatura com trial, anúncios na versão gratuita |

Fontes:
[site](https://gymwp.app/en/) ·
[termos e privacidade](https://gymwp.app/termos-privacidade-en.html) ·
[Google Play](https://play.google.com/store/apps/details?id=com.lealApps.pedro.gymWorkoutPlan&hl=en_US) ·
[App Store](https://apps.apple.com/us/app/id1524374229) ·
[APKMirror](https://www.apkmirror.com/apk/leal-apps/gym-wp-workout-routines/)

---

## 1. Proposta de valor

Slogan do site: "Start improving with every workout". Foco em quem treina
musculação na academia, de iniciante a avançado, com uso rápido entre séries.

Três pilares destacados no site:

1. **Recuperação muscular:** estima a fadiga por grupo muscular e informa
   quando cada um está pronto de novo.
2. **Plano por objetivo:** ganho de massa, emagrecimento, força, definição;
   divisões ABC, ABCD e push/pull/legs adaptadas ao perfil (sexo, grupo
   prioritário).
3. **Progresso:** gráficos de carga, volume e séries; peso e medidas
   corporais; IMC e percentual de gordura.

---

## 2. Inventário funcional

| Módulo | Capacidade | Fonte |
| --- | --- | --- |
| Biblioteca | 500+ (lojas) ou 1.000+ (site) exercícios com demonstração | listagens, site |
| Planos | Gerados por perfil/objetivo; ABC, ABCD, PPL | site |
| Rotina própria | Criar rotina ou replicar a do personal | FAQ |
| Sessão | Timer de descanso, editar séries, trocar exercício durante o treino | FAQ |
| Sugestão de carga/reps | Baseada no perfil, durante o treino (premium) | FAQ |
| Aquecimento | Série de aquecimento automática | changelog 10.18.4 |
| Recuperação | Fadiga por músculo e tempo até recuperar (premium) | site |
| Estatísticas | Gráficos de carga, volume, séries | site, changelog 10.15.0 |
| Corpo | Peso, medidas, IMC, % de gordura | site |
| Exportação | Exportar estatísticas de treino | changelog 10.15.1 |
| Compartilhar | Treino concluído | changelog 10.5.2 |
| Offline | Funciona 100% sem internet | FAQ |
| Apple Watch | Treina pelo relógio, sincroniza com o iPhone | FAQ |
| Saúde | Apple Health e Google Fit (leitura/escrita) | FAQ |
| Backup | Histórico preservado ao trocar de aparelho | FAQ |
| Conta | E-mail, Google, Facebook, iCloud | termos |
| Exercícios custom | Tela de configurações de exercício | changelog 10.17.1 |
| Extras | Termos citam suplementos e registro de refeições | termos |

O badge "1" no ícone do launcher vem de notificação push; o app usa OneSignal
(ver seção 6).

---

## 3. Monetização

- **Gratuito:** treinos e exercícios selecionados, com anúncios (AdMob) e
  compras no app na Google Play.
- **Premium** desbloqueia: treino personalizado, fadiga e recuperação
  muscular, estatísticas, biblioteca completa, sugestão de carga e reps.
- **Cobrança:** semanal, mensal, trimestral, semestral ou anual; renovação
  automática; trial com cobrança só no fim; sem reembolso (termos 7.4).
- Cancelamento pela loja. Excluir a conta **não** cancela a assinatura.
- **[inferido]** O funil web (`start.gymwp.app`, parâmetro `origem`) indica
  venda de assinatura fora das lojas, com gestão em `/manage`.

Para o Cockpit: recuperação muscular, estatísticas e progressão são o que o
app tranca atrás do paywall. É o que vale replicar localmente.

---

## 4. Modelo de dados [inferido]

```
Exercise      id, nome, grupo_muscular[], equipamento, instruções, custom:bool
Routine/Plan  id, nome, divisão (ABC|ABCD|PPL|custom), itens[{exercise_id, séries, reps, descanso}]
Workout       id, data, início, fim, routine_id?, notas
SetLog        id, workout_id, exercise_id, ordem, reps, carga, unidade, descanso, aquecimento:bool
MuscleState   grupo_muscular, último_estímulo, volume_recente → fadiga/recuperação
BodyLog       data, peso, medidas{}, imc, %gordura
Profile       sexo, idade, objetivo, grupo_prioritário, unidade, tema
```

Regras prováveis:

- **Recuperação:** função do volume recente (séries × carga) por grupo, com
  decaimento no tempo.
- **Sugestão de carga/reps:** a partir do histórico do exercício e do perfil.
- **Base de exercícios:** os termos (11.2) dizem que parte do banco de
  exercícios é **conteúdo de usuário, sem revisão técnica**.

---

## 5. Arquitetura [inferido]

| Camada | Hipótese | Evidência |
| --- | --- | --- |
| Persistência | Local-first (SQLite/Room, Core Data) | "fully offline" |
| Backend | Conta + backup em nuvem | login social, "full backup" |
| Sync | Watch ↔ iPhone; Health/Google Fit | FAQ |
| Notificações | OneSignal | política de privacidade |
| Telemetria | Firebase Analytics + Crashlytics, Facebook SDK | política de privacidade |
| Anúncios | AdMob (free) | política de privacidade, Play |
| Site | Estático multilíngue; funil de checkout em subdomínio | links do site |

---

## 6. Privacidade e conformidade

Coleta declarada: IP, páginas visitadas, tempo de uso, sistema operacional;
e-mail, idade e sexo quando solicitados. Sem localização precisa. Terceiros:
Google Play Services, AdMob, Firebase Analytics, Crashlytics, Facebook,
OneSignal. Exclusão de dados no app ou por e-mail.

Pontos de atenção:

- **Inconsistência de idade:** termos exigem 18+; política de privacidade
  fala em menores de 13.
- **Conteúdo de usuário:** licença ampla, irrevogável e comercializável sobre
  o que o usuário publica (termos 6.2).
- Dados biométricos entram na definição de conteúdo; sem menção a LGPD
  específica no texto lido.
- Termos 5.2: dados podem ser apagados sem aviso; a responsabilidade pelo
  backup é do usuário. Isso contradiz o "backup completo" do FAQ.

---

## 7. Discrepâncias nas métricas

| Métrica | Site | Google Play | Observação |
| --- | --- | --- | --- |
| Downloads | 5 milhões | 10M+ | Play sozinha já passa do site |
| Nota | 4,7 (App Store + Play) | 4,5 | média entre lojas |
| Avaliações | 180 mil | 141 mil | site soma as duas lojas |
| Exercícios | 1.000+ | 500+ (texto das lojas) | texto de loja pode estar defasado |
| Melhoraram resultado | 97,8% | n/a | sem metodologia; trate como marketing |

---

## 8. Pontos fortes e lacunas

Fortes: offline real, Watch, integração com Health, recuperação muscular,
importação da rotina do personal, backup, cadência alta de releases.

Lacunas a verificar:

- Formato da exportação (CSV/JSON ou só relatório).
- Quanto do app fica atrás do paywall e preços reais por região.
- Qualidade da sugestão de carga: regra fixa ou modelo.
- Vídeos, reviews e comunidade: **nenhum canal de YouTube oficial ou vídeo
  de terceiros localizado**; o site só linka o Instagram. A API do YouTube
  via Composio retornou cota diária esgotada e o Reddit não retornou posts.

---

## 9. Aplicação ao Obsidian Cockpit

1. **Treino como nota:** `type: workout` em `Treinos/`, frontmatter
   (`date`, `routine`) e séries em tabela. Regra de escopo do Team Manager:
   `type:` correto **e** pasta configurada.
2. **Exercícios:** `type: exercise` em `Exercicios/` com `muscle`,
   `equipment`. Custom por padrão, sem dataset embarcado.
3. **Recuperação muscular:** derivada no índice (volume por grupo nos últimos
   N dias), nunca gravada na nota. É o recurso premium do Gym WP.
4. **Progressão:** carga, volume e séries por exercício a partir do índice.
5. **Corpo:** `type: body` com peso e medidas; IMC e % gordura calculados.
6. **Exportação e backup:** resolvidos pelo próprio vault em markdown.

Fora de escopo inicial: Watch, timer em tempo real, plano por IA,
compartilhamento social, importação do Health.

---

## 10. Próximos passos para fechar a REA

- Instalar o app e percorrer onboarding, rotina, treino, histórico,
  exportação e paywall. Capturar telas e preços.
- Inspecionar o arquivo exportado para validar o schema da seção 4.
- Rodar a coleta de YouTube de novo quando a cota da API renovar.
- Se necessário, análise de tráfego (proxy) com o app instalado por você, em
  uso pessoal, para confirmar o que vai para a rede.
