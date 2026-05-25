# ISTQB Arena 🎯

**Plataforma oficial de simulações e treinamento focado nas certificações do ISTQB.**

O ISTQB Arena é um ambiente completo de estudos (Full-stack) que permite aos analistas de QA realizarem simulados oficiais do ISTQB com limite de tempo, grading automático e mentoria baseada em Inteligência Artificial (usando a DeepSeek API).

## 🚀 Tecnologias Utilizadas

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide React
- **Backend:** Node.js, Express, TypeScript
- **Banco de Dados:** MongoDB (Mongoose) para persistência de Usuários e Tentativas de Prova
- **Autenticação:** Google SSO (Single Sign-On) nativo usando `@react-oauth/google` e `google-auth-library`
- **Inteligência Artificial:** Integração via API DeepSeek para relatórios e mentoria técnica pós-exame

## 🛠️ Como rodar localmente

### Pré-requisitos
- Node.js (v18+)
- Uma conta gratuita no MongoDB Atlas (ou MongoDB local rodando)
- Um projeto no Google Cloud Console com as credenciais OAuth configuradas
- Chave de API da DeepSeek

### Instalação

1. Clone o repositório e instale as dependências:
```bash
npm install
```

2. Crie ou configure o arquivo `.env` na raiz do projeto com as seguintes variáveis:
```env
DEEPSEEK_API_KEY="sua_chave_da_deepseek"
MONGO_URI="sua_connection_string_do_mongodb_atlas"
GOOGLE_CLIENT_ID="seu_client_id_do_google"
VITE_GOOGLE_CLIENT_ID="seu_client_id_do_google"
```

3. Inicie o servidor de desenvolvimento (que roda backend e frontend simultaneamente via Vite Middleware):
```bash
npm run dev
```

4. Acesse a aplicação no seu navegador: `http://localhost:3000`

## ☁️ Deploy no Render.com

Este repositório está pronto para ser publicado gratuitamente na plataforma Render.
Já incluímos o arquivo `render.yaml` como *Infrastructure as Code (IaC)* para automatizar o deploy.

1. Faça login no Render.
2. Crie um novo projeto escolhendo **Blueprint**.
3. Selecione o seu repositório. O Render lerá o `render.yaml` e configurará o Web Service Node.js automaticamente.
4. Adicione as Variáveis de Ambiente requeridas no painel do Render (`DEEPSEEK_API_KEY`, `MONGO_URI`, `GOOGLE_CLIENT_ID`, `VITE_GOOGLE_CLIENT_ID`).

## 📁 Estrutura de Dados
- Os **dados dinâmicos** (Usuários e Histórico de Provas) são salvos no MongoDB.
- Os **dados estáticos** (Questões e Certificações do Syllabus) ficam armazenados em `src/data/questions.json` para máxima velocidade e otimização de leitura.

---
*Desenvolvido seguindo as melhores práticas de Engenharia de Software.*
