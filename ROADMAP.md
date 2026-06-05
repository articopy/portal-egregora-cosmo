🗺️ Roadmap de Implementação: Portal Egrégora CMS
[Fase 1: Fundação] ➔ [Fase 2: Motor Asaas] ➔ [Fase 3: Monitor YT] ➔ [Fase 4: Portal & UI]
   (Banco & Docker)     (Webhooks & Trava)      (Cron & Assiduidade)     (Painel Místico)
🌌 Fase 1: Fundação Espacial & Modelagem de Dados
Objetivo: Criar o ambiente de desenvolvimento isolado, a arquitetura do banco de dados e os serviços de manipulação de documentos para o onboarding.

Tarefa 1.1: Inicialização do Repositório e Dockerização

Configurar o ambiente no Antigravity com Docker (docker-compose.yml) rodando PostgreSQL e a API base em Python (FastAPI).

Tarefa 1.2: Migração do Esquema de Dados (ORM)

Estruturar as tabelas e relacionamentos utilizando SQLAlchemy: Condomino, EntregaVideo e FechamentoFinanceiro com as regras de ENUM de status definidas.

Tarefa 1.3: Motor de Automação de Minutas (Contrato V2)

Instalar a biblioteca python-docx no backend. Criar um serviço que receba os dados de entrada do formulário, abra o arquivo CONTRATO_COSMO_ALMA_TV_V2.docx e preencha dinamicamente as lacunas do CONDÔMINO.

💳 Fase 2: Integração Financeira & A Trava Cósmica (Asaas)
Objetivo: Integrar o fluxo de cobrança recorrente automatizada e o listener de Webhooks para segurança jurídica e de caixa.

Tarefa 2.1: Client HTTP SDK para API do Asaas

Desenvolver o arquivo services/asaas.py contendo as chamadas autenticadas para criar cliente (/v3/customers) e registrar a assinatura mensal de R$ 100,00 (/v3/subscriptions) em formato PIX/Boleto recorrente.

Tarefa 2.2: Endpoint de Escuta de Webhooks (/api/webhooks/asaas)

Criar a rota de recepção de eventos do Asaas no backend. Configurar o parser para os eventos estruturados PAYMENT_RECEIVED e PAYMENT_OVERDUE.

Tarefa 2.3: Implementação do Gatilho de Suspensão (Cláusula 11ª)

Adicionar lógica no endpoint do webhook: Se um evento PAYMENT_OVERDUE for recebido, verificar se a data de vencimento da fatura original ultrapassou 10 dias corridos. Caso positivo, alterar automaticamente o status no banco para SUSPENSO_INADIMPLENCIA.

📺 Fase 3: Monitor de Assiduidade Cósmica & Split (YouTube)
Objetivo: Rastrear a consistência algorítmica dos parceiros via API do YouTube e realizar a partilha 70/30 de forma automatizada.

Tarefa 3.1: Integração com YouTube Reporting & Analytics API

Configurar o client OAuth/API Key da Google Cloud Platform no backend para consultar métricas de postagem por canal (youtube_channel_id).

Tarefa 3.2: Cron Job Semanal de Auditoria de Uploads (Cláusula 10ª)

Desenvolver uma rotina automatizada (usando Celery ou APScheduler) que rode todo domingo às 23:59. O robô deve contar quantos vídeos foram postados na semana. Se a contagem for zero, insere um registro de quebra de ritmo e aciona o status BLOQUEADO_ASSIDUIDADE.

Tarefa 3.3: Calculadora de Divisão de Receitas (Regra 70/30)

Desenvolver o motor lógico de fechamento mensal. O sistema puxa a receita total do AdSense, calcula e subtrai 30% compulsórios da administração (softwares, impostos, Notas Fiscais) e divide o saldo líquido de 70% igualmente apenas entre os condôminos cujo status esteja ATIVO_ADIMPLENTE.

🎨 Fase 4: Portal UI & Experiência Mística (Front-end)
Objetivo: Desenvolver o dashboard visual em Dark Mode inspirado nas logomarcas da Cosmo Alma TV.

Tarefa 4.1: Estilização do Design System Místico

Configurar a folha de estilos global utilizando Tailwind CSS ou styled-components no React/Next.js: background #111622 (Deep Space), superfícies #1A1D29 (Nebula Purple) e destaques e botões ativos em #E2B042 (Ouro Místico).

Tarefa 4.2: Painel de Controle dos Gestores (Visão Adm)

Construir a tela de monitoramento de Alexandre, Carlos e Marcos. Exibição de gráficos de receita do canal, histórico de investimentos em tráfego pago e a lista de condôminos com seus status de adimplência coloridos dinamicamente (Dourado/Verde para Ativos, Vermelho para Suspensos).

Tarefa 4.3: Painel de Transparência do Criador (Visão Condômino)

Construir a área logada do parceiro, mostrando o código PIX de cobrança do condomínio caso esteja aberto, seu termômetro de assiduidade semanal e o extrato auditável e transparente dos seus ganhos e repasses do AdSense.