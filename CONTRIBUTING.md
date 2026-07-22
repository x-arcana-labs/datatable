# Contribuindo

1. Use Node.js 18.18 ou superior.
2. Instale com `npm ci`.
3. Crie uma branch pequena e focada.
4. Adicione testes ao núcleo e ao adaptador afetado.
5. Execute `npm run check` antes de abrir o pull request.

Mudanças na API pública precisam atualizar README, site e changelog. Não acople regras de dados aos adaptadores: estado e comportamento compartilhável pertencem a `src/core`.

