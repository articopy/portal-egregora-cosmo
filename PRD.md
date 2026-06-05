# `PRD.md` — Documento de Requisitos do Produto (Product Requirement Document)

## 1. Informações Gerais do Projeto

* **Nome do Produto:** Portal Egrégora Cosmo Alma TV (CMS - Condominium Management System)
* **Status do Documento:** Versão 1.0 (Pronto para Desenvolvimento)
* **Público-Alvo:** Gestores do Canal (Alexandre, Carlos, Marcos) e Criadores de Conteúdo Parceiros (Condôminos).
* **Objetivo Principal:** Automatizar o onboarding de parceiros, gerenciar os pagamentos da cota fixa via Asaas, aplicar travas contratuais de inadimplência/assiduidade e realizar o cálculo transparente do split de receitas 70/30 baseado em dados reais do YouTube.

---

## 2. Objetivos de Negócio & Metas (KPIs)

* **Inadimplência Zero:** Reduzir o trabalho manual de cobrança, utilizando o fluxo automatizado de régua do Asaas.
* **Consistência Algorítmica:** Monitorar via API se cada criador cumpre a meta mínima de 1 a 3 vídeos por semana, garantindo a tração e retenção exigidas pelo algoritmo do YouTube.
* **Transparência Operacional:** Prover um painel financeiro auditável para evitar desconfianças sobre retenções e splits.

---

## 3. Requisitos Funcionais (Épicos & Funcionalidades)

### Épico 1: Fluxo de Onboarding Cósmico

* **RF1.1 - Formulário de Inscrição:** O sistema deve expor uma interface pública para coleta de dados cadastrais (Razão Social, Nome Fantasia, CNPJ/CPF, Chave PIX, E-mail, Telefone e ID do canal do criador).
* **RF1.2 - Geração de Minuta Contratual:** A aplicação deve receber os dados do formulário e preencher o template dinâmico do **Contrato V2** (mantendo o condomínio fixado em R$ 100,00 e fidelidade de 6 meses).
* **RF1.3 - Integração com Assinatura Eletrônica:** O sistema deve disparar o documento para a API de assinatura digital e monitorar o status. O usuário fica em estado `AGUARDANDO_ASSINATURA`.

### Épico 2: Motor Financeiro (Integração Asaas)

* **RF2.1 - Criação de Assinatura Recorrente:** Ao receber o gatilho de contrato assinado, o sistema deve disparar um `POST` no Asaas gerando a cobrança mensal recorrente de R$ 100,00 via PIX/Boleto com vencimento programado para o dia 10.
* **RF2.2 - Escuta de Webhooks (A Trava Contratual):** O sistema deve processar os eventos do Asaas em tempo real.
* Se o status for `PAYMENT_RECEIVED`, o criador mantém-se como `ATIVO_ADIMPLENTE`.
* Se o status for `PAYMENT_OVERDUE` e atingir **10 dias corridos de atraso**, a aplicação altera o status do criador para `SUSPENSO_INADIMPLENCIA`.



### Épico 3: Monitor de Assiduidade (Integração YouTube API)

* **RF3.1 - Monitoramento de Uploads:** A plataforma deve se conectar à API do YouTube para auditar semanalmente a quantidade de vídeos publicados no canal/playlist associada ao ID do criador.
* **RF3.2 - Punição por Quebra de Ritmo:** Caso o robô identifique zero entregas na semana e nenhuma justificativa administrativa seja inserida no painel, o sistema emite um alerta. Em caso de reincidência, altera o status para `BLOQUEADO_ASSIDUIDADE`, travando o recebimento do split de repasse.

### Épico 4: Split de Receitas e Divisão 70/30

* **RF4.1 - Painel de Prestação de Contas:** O sistema deve consolidar a receita bruta do canal do criador vinda do YouTube Adsense e aplicar a fórmula exata:
* **30% Retidos (Gestão):** Exibidos como desconto para custos operacionais (tráfego pago, softwares de IA, impostos de notas fiscais).
* **70% Líquidos (Fundo de Partilha):** Dividido igualmente entre os condôminos válidos no mês.



---

## 4. Requisitos Não-Funcionais (Arquitetura e Segurança)

* **Interface Visual (Mística Corporativa):** A interface deve obedecer estritamente ao Guia de Design, utilizando Dark Mode nativo com tons de Roxo Profundo, Azul Cósmico e realces funcionais em **Ouro Místico** (para indicar status ativo ou botões de ação).
* **Segurança (LGPD):** Dados fiscais de CPF/CNPJ e chaves PIX devem ser armazenados com criptografia no banco de dados.
* **Disponibilidade:** O microsserviço de Webhook deve ter alta disponibilidade para não perder as notificações financeiras enviadas pelo Asaas.

---

## 5. Regras de Transição de Status do Usuário

O ciclo de vida operacional do condômino dentro do software será regido pela máquina de estados abaixo:

| Status Inicial | Evento Gatilho | Status Destino | Ação no Sistema |
| --- | --- | --- | --- |
| `NENHUM` | Preenchimento do Form | `AGUARDANDO_ASSINATURA` | Dispara e-mail com contrato gerado |
| `AGUARDANDO_ASSINATURA` | Webhook de Contrato Assinado | `ATIVO_PENDENTE_PAGAMENTO` | Cria assinatura de R$ 100 no Asaas |
| `ATIVO_PENDENTE_PAGAMENTO` | Webhook Asaas: Pago | `ATIVO_ADIMPLENTE` | Libera esteira de edição e postagem |
| `ATIVO_ADIMPLENTE` | Webhook Asaas: Atraso > 10 dias | `SUSPENSO_INADIMPLENCIA` | **Trava Contratual:** Congela repasses e novas postagens |
| `ATIVO_ADIMPLENTE` | Cron Job: Sem postagem semanal | `BLOQUEADO_ASSIDUIDADE` | Remove o parceiro do split de 70% do mês |

---
