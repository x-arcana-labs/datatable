# Segurança

Reporte vulnerabilidades de forma privada pelo recurso **Security advisories** do GitHub. Não abra uma issue pública com detalhes exploráveis.

Strings retornadas por renderizadores são interpretadas como HTML por compatibilidade. Aplicações consumidoras devem sanitizar qualquer conteúdo não confiável antes de retorná-lo por `valueGetter`, `headerContentGetter` ou actions.
