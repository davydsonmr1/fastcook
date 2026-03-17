# Qualidade e Automação (CI/CD)

O FlashCook reflete práticas modernas de *DevSecOps* e Acessibilidade (a11y), garantindo a longevidade, segurança e usabilidade da aplicação.

## Integração Contínua (GitHub Actions)

O projeto usa o **GitHub Actions** (`.github/workflows/ci.yml`) para verificar e blindar a *branch* principal (`main`).
Em cada *Pull Request* e *Push*, ocorre:
1. Instalações limpas (`npm ci`);
2. Auditorias de Segurança NPM no backend e frontend (`npm audit --audit-level=high`);
3. Validação estrita de Linting pelo Prettier/Eslint no frontend (`npm run lint`);
4. Integração Unitária/End-to-End de regras cruciais de segurança via Jest no Backend (`npm test`).

## Automação de Segurança (Jest + Fastify Inject)

Para salvaguardar os lucros e a privacidade das modificações futuras no backend, utilizamos testes E2E (`tests/security.test.ts`) contornando a necessidade de levantar as portas usando método encripto `app.inject` do Fastify:
- **Zod Bypass:** Testa tentativas subversivas de enviar XML, HTML ou SQLi. Forçamos uma falha via Prompt Shield;
- **Rate Limit Abuse:** Submetemos `N > 5` requests simulados via loop e certificamos que a rota não gera Timeout ao browser (429), mas adapta suavemente a IA, rebatendo aos Headers base do tipo `text/event-stream`;
- **Confidencialidade Anônima:** Valida se *payloads* em utilizadores sem *Bearer Token* correm as respostas na íntegra mas falham intencionalmente na gravação de base de dados.

## Auditoria de Acessibilidade (a11y)

Uma vertente *Voice-first* implica forte sintonia com perfis que precisam de acessibilidade assistida por ecrã (como utilizadores cegos ou de destreza comprometida).
- Áreas reativas tipo "Máquina de Escrever" estão contidas dentro de `aria-live="polite" aria-atomic="true"`, informando os Leitores de Ecrã de pequenas mudanças dinâmicas na receita;
- `aria-labels` assertivas nos botões vitais (`aria-label="Parar de ouvir e enviar ingredientes"`);
- O botão primário altera ritmicamente via estado `aria-pressed={isListening}` de True / False.
