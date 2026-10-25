# hevy-re

Captura de rede do app web do Hevy, com login manual e somente leitura por padrão.

1. `npm i playwright && npx playwright install chromium`
2. `node capture.mjs` — abre o Chromium visível; faça login à mão. Digite no terminal o rótulo da área que vai visitar (`perfil`, `historico`, `rotinas`, `exercicios`, `graficos`, `config`) e `sair` ao fim.
3. `node analyze.mjs hevy-capture.ndjson > hevy-schema.md` — gera só o esquema (caminhos, métodos, tipos), sem valores.
4. Compartilhe apenas `hevy-schema.md`. O `.ndjson` contém seus dados de treino e não deve sair da sua máquina.

Segurança: headers e campos com `pass|token|secret|authorization|cookie|api-key|csrf|session` são mascarados; corpos de login/token não são gravados; POST/PUT/PATCH/DELETE em `hevy.com`/`hevyapp.com` pedem confirmação `s` (padrão: bloquear), exceto rotas de autenticação.
