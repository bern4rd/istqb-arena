# Regras do Agente: Versionamento e Documentação

Sempre que uma tarefa ou funcionalidade for marcada como "concluída", você deve executar o seguinte fluxo de trabalho obrigatório antes de finalizar a sessão.

## 1. Regra de Versionamento (SemVer)
- Verifique a versão atual no arquivo `package.json`.
- Incremente a versão seguindo o padrão **SemVer** (Patch para correções, Minor para novas funcionalidades).
- Atualize o arquivo `package.json` com a nova numeração.

## 2. Regra de Registro (CHANGELOG.md)
- Abra o arquivo `CHANGELOG.md` na raiz do projeto.
- Adicione uma nova entrada seguindo este formato:
  `## [Nova Versão] - YYYY-MM-DD`
  `- [Tipo]: Descrição detalhada da funcionalidade ou correção concluída.`
- Mantenha as entradas mais recentes no topo do arquivo.

## 3. Regra de Commits (Conventional Commits)
- O commit deve ser realizado seguindo rigorosamente o padrão: `<tipo>(<escopo>): <descrição curta>`
- **Tipos permitidos:**
  - `feat`: Uma nova funcionalidade.
  - `fix`: Correção de um bug.
  - `docs`: Mudanças na documentação.
  - `style`: Formatação, pontos e vírgulas, etc.
  - `refactor`: Mudança de código que não corrige bug nem adiciona funcionalidade.
  - `test`: Adição ou correção de testes.
- **Exemplo:** `feat(auth): adiciona fluxo de login com OAuth`

## 4. Ordem de Execução
1. Atualizar o `package.json`.
2. Registrar no `CHANGELOG.md`.
3. Executar `git add .`.
4. Executar `git commit -m "..."` seguindo o padrão acima.
5. Notificar o usuário que a tarefa foi versionada e registrada com sucesso.

---
*Nota: Se a mensagem do commit não estiver seguindo o padrão de Conventional Commits, você deve reescrevê-la antes de executar o comando git.*