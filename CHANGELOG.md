# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato baseia-se em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/), e este projeto adota o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [1.1.0] - 2026-05-25

### Adicionado
- **Seleção de idioma por bandeiras:** Substituído o seletor de idioma textual por bandeiras animadas (🇧🇷 Brasil para PT-BR e 🇬🇧 Reino Unido para EN) tanto na tela de login quanto no dashboard.
- **Favicon e título da aba:** Adicionado ícone personalizado do ISTQB Arena e título da aba alterado de "My Google AI Studio" para "ISTQB Arena".
- **Símbolo oficial do Google no botão SSO:** Substituído ícone genérico pelo SVG oficial colorido do Google no botão "Sign in with Google SSO".

### Modificado
- **Tela de login / criar conta refatorada para desktop:** Reestruturado o layout para ser 100% visível sem necessidade de rolagem em resoluções desktop (1366×768+). Principais ajustes:
  - Container externo: `min-h-screen` → `h-screen` com `flex flex-col` e padding vertical mínimo (`py-2 md:py-1`).
  - Container interno: padding de `p-6` → `p-4`; gap de `space-y-1` → `space-y-2`; adicionado `max-h-screen overflow-y-auto md:overflow-visible`.
  - Logo: margem inferior de `mb-4` → `mb-2`.
  - Formulário: espaçamento interno de `space-y-4` → `space-y-2`.
  - Inputs: altura de `py-2.5` → `py-2`.
  - Rótulos de campos: tamanho de `text-[10.5px]` → `text-[9px]`.
  - Botão Google SSO: padding de `py-2 px-4` → `py-1.5 px-3`.
- **Contas demo removidas:** Removida a seção de contas de demonstração (não utilizada).

### Corrigido
- Bandeira do Brasil estava invertida (de cabeça para baixo) — SVG corrigido para exibir corretamente o losango amarelo, círculo azul e detalhes da bandeira.
- Erro de sintaxe JSX em `AuthScreen.tsx` causado por HTML inserido inadvertidamente dentro do componente — removido bloco HTML e restaurado separador correto `<hr>/<span>`.

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
