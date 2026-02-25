# ProjectDevController

Gerenciador de projetos e tarefas com API em .NET e frontend em React.

## Sobre o projeto
O **ProjectDevController** foi criado para organizar o ciclo de trabalho de equipes técnicas, com:

- Gestão de múltiplos projetos
- Cadastro e acompanhamento de tarefas com número incremental (`TaskNumber`)
- Status, responsável técnico e atribuição de tarefa
- Comentários e apontamento de horas
- Relatórios de horas por usuário com filtros por período
- Exibição de horas convertida automaticamente para formato real (base 60, ex.: `1h 30min`)
- Painel com gráfico de barras por usuário (eixos X/Y), filtro por período e exibição de todos os usuários (inclusive sem apontamentos)
- Controle de usuários por perfil (`Administrator`, `Developer`, `Tester`)
- Edição de usuários com regras de permissão:
  - Administrador edita todos e pode inativar usuários
  - Demais usuários editam apenas o próprio cadastro

## Stack
- Frontend: React + Vite + Tailwind CSS
- Backend: ASP.NET Core (.NET 10)
- Banco de dados: PostgreSQL

## Estrutura do repositório
- `ProjectDevController.Api`: API ASP.NET Core
- `Frontend`: aplicação web React
- `docker-compose.yml`: serviço PostgreSQL para desenvolvimento local

## Como executar localmente

### 1. Subir banco de dados
```bash
docker compose up -d
```

Padrão do banco:
- Host: `localhost`
- Porta: `5432`
- Database: `projectdevcontroller`
- User: `postgres`
- Password: `postgres`

### 2. Rodar backend
```bash
cd ProjectDevController.Api
dotnet restore
dotnet run
```

### 3. Rodar frontend
```bash
cd Frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`

## Funcionalidades principais
- Login com opção de manter conectado
- Fluxo de primeiro acesso para criar o administrador inicial
- Criação de tarefas em modal com descrição em Markdown (edição + preview)
- Registro de trabalho em modal (comentário + horas + atualização de status/atribuição em uma ação)
- Filtros de tarefas por projeto, status e atribuição
- Relatórios de horas por usuário
- Dashboard com gráfico de horas por usuário e filtro por período (padrão: últimos 30 dias)
- Exibição de horas em formato base 60 nas telas (dashboard, tarefas e relatórios)

## Licença
Este projeto é open source e está licenciado sob a **MIT License**.
Consulte o arquivo `LICENSE` para mais detalhes.

