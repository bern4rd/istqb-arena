# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato baseia-se em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/), e este projeto adota o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [1.0.0] - 2026-05-24

### Adicionado
- **Integração com MongoDB:** Persistência de dados dinâmica migrada para MongoDB via Mongoose. `users.json` e `attempts.json` substituídos por coleções em banco de dados para permitir hospedagem em sistemas efêmeros (como Render).
- **SSO do Google:** Implementação oficial do Single Sign-On utilizando OAuth2 com as bibliotecas `@react-oauth/google` no frontend e `google-auth-library` no backend, substituindo o antigo sistema de simulação de login.
- **Blueprint do Render:** Adicionado arquivo `render.yaml` (IaC) para deploy "1-Click" na plataforma Render.
- **Relatórios de Mentoria:** Feedback avançado sobre erros utilizando Inteligência Artificial (DeepSeek API).
- **Documentação:** Criação de um README.md completo cobrindo setup, variáveis de ambiente e stack de tecnologias.

### Modificado
- `package.json` atualizado para incluir metadados reais, versão `1.0.0`, e bibliotecas do backend para MongoDB e Google Auth.
- Refatoração do `server.ts` para migrar chamadas síncronas do file system para chamadas assíncronas do MongoDB.
- Atualização do componente `AuthScreen.tsx` removendo o formulário visual simulado e importando o componente nativo `<GoogleLogin>`.
