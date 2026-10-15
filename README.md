# PNA Quiz & Banco de Questões (4ª Edição)

Projeto de preparação para a **Prova Nacional de Acesso (PNA)**, integrando a estrutura dos Manuais APNA (4ª Edição), banco de dados de questões, scripts de sincronização/revisão e aplicação web full-stack (Next.js + NestJS).

---

## 📁 Estrutura do Repositório

- **`pna-quiz/`**: Monorepo da aplicação interativa.
  - `frontend/`: Aplicação web construída com Next.js, Tailwind CSS e Dexie.js (suporte offline-first / IndexedDB).
  - `backend/`: API REST construída com NestJS, Prisma ORM e documentação Swagger.
- **`scripts/`**: Utilitários para auditoria, correção ortográfica e sincronização do banco de dados (Firebase / Neon).
- **Dados & Dumps SQL / JSON**:
  - `banco_questoes_pna_neon_corrigido.sql`: Dump SQL normalizado pronto para importação no PostgreSQL.
  - `banco_questoes_pna_recategorizado_4a_edicao.json`: Base de dados das questões categorizadas conforme taxonomia oficial.
  - `taxonomia_oficial_apna_4a_edicao.json`: Árvore de áreas, capítulos e subáreas médicas.
- **`docker-compose.yml`**: Orquestração dos serviços auxiliares de desenvolvimento (PostgreSQL / Redis).

---

## 🚀 Como Executar o PNA Quiz

### Pré-requisitos
- Node.js (v18+) e `pnpm`
- PostgreSQL & Redis (localmente, via WSL ou via Docker Compose)

### 1. Iniciar Banco de Dados
Você pode iniciar via Docker Compose:
```bash
docker compose up -d
```
Ou no WSL (conforme instruções detalhadas em `pna-quiz/README.md`).

### 2. Configurar Variáveis de Ambiente
Copie o exemplo do backend:
```bash
cp pna-quiz/backend/.env.example pna-quiz/backend/.env
```

### 3. Instalar Dependências e Executar
Entre no diretório do aplicativo:
```bash
cd pna-quiz
pnpm install

# Backend (Porta 3001 - Swagger em /api/docs)
pnpm dev:backend

# Frontend (Porta 3000)
pnpm dev:frontend
```

---

## 📄 Manuais & Git LFS
Os manuais em PDF da 4ª Edição utilizam **Git LFS** devido ao tamanho elevado de cada volume. Para clonar o repositório com todos os PDFs, certifique-se de ter o Git LFS instalado:
```bash
git lfs install
git clone https://github.com/BortoneA/pna-quiz.git
```
