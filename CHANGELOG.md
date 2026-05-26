# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato baseia-se em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/), e este projeto adota o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [1.4.0] - 2026-05-26

### Adicionado
- **Rastreamento de Questões em Tempo Real**: Adicionado array `seenQuestions` ao modelo de Usuário (`User`) para persistir de forma instantânea em banco de dados os IDs de todas as questões geradas no modo treino. Com isso, mesmo que a sessão seja interrompida antes da submissão, o sistema sabe que as questões foram exibidas.
- **Seleção Inteligente Baseada em Histórico**: Novo mecanismo de pontuação e filtragem em `selectPracticeQuestions` que aplica penalidade dinâmica de repetição (`+5` para questões do último treino e `+2` para a sessão anterior), reduzindo a probabilidade de reexibição imediata das mesmas questões.
- **Embaralhamento Fisher-Yates (Knuth)**: Adicionado algoritmo robusto de randomização uniforme em `server.ts` para embaralhar os blocos e perguntas de forma matematicamente precisa e imparcial, sanando a ordenação enviesada de `Math.random()`.

### Modificado
- **Autenticação de Rota de Questões**: Rota `/api/questions/:certificationId` atualizada para utilizar o middleware `authenticateToken`, recuperando e registrando de forma assíncrona o histórico de visualizações do usuário.

## [1.3.1] - 2026-05-25

### Corrigido
- **Cálculo de Acurácia no Practice Mode**: Implementação de tratamento resiliente na rota `/api/test/submit` para limitar a avaliação de gabarito e o cálculo da pontuação final a apenas as 10 questões sorteadas e realizadas no modo treino (Fast Test). Adicionado mecanismo de fallback automático que deduz as questões a partir das chaves do objeto de respostas caso o front-end envie o payload sem a lista explícita de identificadores, prevenindo notas distorcidas calculadas incorretamente sobre a totalidade de questões da certificação (como 44 ou 70 questões).

## [1.3.0] - 2026-05-25

### Adicionado
- **Métricas de Gamificação no Dashboard:** Banner premium horizontal para o "Treino Diário" com contador de Streak diário 🔥 (sequência consecutiva de dias de estudo) e estatísticas de tempo.
- **Modal de Acesso Rápido ao Treino Diário:** Seletor visual rápido de certificação com suporte a inicialização instantânea em 1 clique a partir do Dashboard.
- **Time-to-Beat no Relatório final:** Card exclusivo no relatório de desempenho (`ReportViewer.tsx`) indicando conquistas de velocidade do usuário, comparando o tempo de conclusão com a sua média histórica e sinalizando novos recordes 🏆.
- **Saneamento Multilíngue Completo do Banco de Dados:** Processamento de saneamento automatizado que traduziu e estruturou **188 questões** legadas em inglês para o formato multilíngue completo `{ en, pt }` em todas as certificações, tornando a base de dados do ISTQB Arena 100% bilingue de forma consistente.

### Modificado
- **Refatoração do Practice Mode - Learn As You Go (`server.ts` & `TestArena.tsx`):** O modo treino (`training`) foi totalmente refatorado para operar como uma sessão rápida e concisa de **10 questões** (com amostragem balanceada de 2 difíceis e 8 fundamentais e cobrindo ao menos 3 tópicos únicos do syllabus) e um tempo limite encurtado de **11 minutos**, mantendo os feedbacks e explicações imediatas do syllabus.
- **Otimização do Relatório IA:** Prompt de IA do Mentor ajustado no modo treino para produzir um relatório de desempenho altamente focado, direto e conciso, limitado a 200-300 palavras.
- **Robustez de Amostragem:** Correção no algoritmo de seleção para adaptar-se dinamicamente quando a certificação não tiver questões de 2 pontos (como no CTFL), preenchendo as vagas com questões de 1 ponto e garantindo sempre o bloco fixo de 10 questões.

### Corrigido
- **Erros de Compilação do TypeScript:** Corrigidos problemas de tipagem com referência implícita do Vite no `main.tsx` e importação explícita de `React` em `ReportViewer.tsx`, zerando todos os erros de compilação da plataforma.

## [1.2.0] - 2026-05-25

### Adicionado
- **Questões CTFL expandidas para 70:** Migração de arquivo monolítico `questions.json` para arquivos individuais por certificação. CTFL passou de 4 para 70 questões (Q01–Q70).
- **Novas certificações:** Adicionados datasets completos para CT-AI (40), CT-GenAI (43), CTAL-AT (42) e CTAL-TAE (42), cada um em seu próprio arquivo `questions-{CERT}.json`.
- **Rota `/api/certifications`:** Endpoint que retorna a lista de certificações disponíveis dinamicamente a partir dos arquivos presentes em `src/data/`.

### Modificado
- **API do servidor (`server.ts`):** Substituída constante única `QUESTIONS_FILE` por mapa `CERT_FILES` e função `getCertFilePath()`, permitindo servir questões por certificação de forma isolada.

### Removido
- **Arquivo monolítico `questions.json` removido:** Dados agora distribuídos em arquivos separados por certificação.

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
