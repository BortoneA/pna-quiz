# PNA Quiz · Manual Operacional do Servidor Central

Esta é a plataforma completa de preparação para a Prova Nacional de Acesso (PNA), integrada aos Manuais APNA (4ª Edição). O sistema está estruturado como um monorepo local centralizado.

---

## 1. Arquitetura e Configurações de Rede

O sistema funciona no modelo **Single-user Local First**. O computador pessoal atua como o servidor central, hospedando a aplicação e os bancos de dados, permitindo o acesso via rede local sem necessidade de internet.

```
[Celular / Tablet] ◄─── Wi-Fi Local (IP Privado: 3000/3001) ───► [Computador Central (WSL)]
```

### Como Descobrir o IP Privado do Computador
No computador central (Windows), abra o terminal (PowerShell ou CMD) e digite:
```powershell
ipconfig
```
Procure pela sua interface de rede ativa (ex: *Adaptador Ethernet* ou *Adaptador Wi-Fi*) e localize o **Endereço IPv4** (ex: `192.168.1.50`).
- **Acesso no computador**: `http://localhost:3000`
- **Acesso em outros dispositivos (Rede Local)**: `http://192.168.1.50:3000`

*Nota: O frontend Next.js detecta o hostname de acesso dinamicamente, permitindo conexões automáticas com a API na porta 3001.*

---

## 2. Inicialização dos Serviços

### Passo 1: Iniciar os Bancos de Dados no WSL (PostgreSQL & Redis)
Abra o PowerShell no Windows e execute o comando abaixo para iniciar o PostgreSQL e o Redis dentro do WSL Ubuntu:
```powershell
wsl -d Ubuntu -u root -e sh -c "/etc/init.d/postgresql start && /etc/init.d/redis-server start"
```

Para validar a integridade dos serviços:
```powershell
wsl -d Ubuntu -u postgres -e pg_isready
wsl -d Ubuntu -u postgres -e redis-cli ping
```

### Passo 2: Instalar Dependências e Executar a Aplicação
Na raiz da pasta `pna-quiz`:

1. Instalar dependências:
   ```bash
   pnpm install
   ```

2. Executar o **Backend NestJS** (Porta 3001) em modo de desenvolvimento:
   ```bash
   pnpm dev:backend
   ```
   *A documentação Swagger estará disponível em `http://localhost:3001/api/docs`.*

3. Executar o **Frontend Next.js** (Porta 3000) em modo de desenvolvimento:
   ```bash
   pnpm dev:frontend
   ```

---

## 3. Dados Oficiais Carregados e Validados
- **Especialidades (Áreas Médicas)**: 16
- **Capítulos dos Manuais**: 120
- **Subáreas de Estudo**: 127
- **Questões Cadastradas**: 5.073
- **Alternativas Associadas**: 25.359

*Nota: Todos os erros de chave estrangeira e colisões UNIQUE de capítulos/subáreas do dump original `banco_questoes_pna_neon.sql` foram totalmente limpos e normalizados com sucesso antes da inserção.*

---

## 4. Motor de XP e Níveis (1 a 100)
Toda interação acadêmica gera ganho de XP de forma idempotente para evitar farming:
- **Questão correta**: +15 XP
- **Concluir um Quiz**: +25 XP
- **Simulado de 100 questões concluído**: +500 XP extra

### Curva de Níveis
Seguindo a fórmula pedagógica:
$$\text{XP necessário para alcançar o nível N} = 100 \times N^{1.45}$$

---

## 5. Estrutura do Monorepo
- `/backend`: NestJS com Prisma ORM conectando no PostgreSQL (127.0.0.1:5432) e Swagger.
- `/frontend`: Next.js com Tailwind CSS, Dexie.js (IndexedDB local) e Material Symbols.
- `/banco_questoes_pna_neon_corrigido.sql`: Dump SQL higienizado usado para popular o banco de dados inicial.
- `/fix_sql.js`: Script utilitário em Node para processamento de caracteres e restrições.
