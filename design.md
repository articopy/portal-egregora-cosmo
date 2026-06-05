Este é um passo fundamental. As logomarcas fornecidas para a **Cosmo Alma TV** não são apenas gráficos; elas encerram a identidade cósmica, mística e esotérica do projeto. O System Design Document (SDD) agora deve beber diretamente dessa fonte visual para que a interface de software não seja apenas funcional, mas uma extensão da própria alma do canal.

As logomarcas nos dão diretrizes claras:

* **A Egrégora Visual:** Nebulosas Místicas, Astrologia Geométrica, Geometria Sagrada.
* **Paleta Mística:** Roxo Nebulosa Profundo, Azul Cósmico, Ouro Místico texturizado/metálico (para destaques e status ativos).
* **Tipografia:** "COSMO ALMA" em Sans-Serif limpa e "TV" em uma fonte decorativa mística texturizada.

Aqui está o arquivo `DESIGN.md` inteiramente revisado e inspirado pelas logomarcas:

---

# `DESIGN.md` — Documento de Design de Projeto e Arquitetura Mística Cosmo Alma TV

## 1. Visão Geral do Sistema (A Egrégora Operacional)

O Sistema de Gestão da **Cosmo Alma TV** é um Portal de Egrégora Operacional, uma plataforma SaaS voltada para a gestão de um "Condomínio Audiovisual Místico". A aplicação centraliza o ciclo de vida do condômino criador parceiro, desde o Portal de Onboarding, geração automática e assinatura de Contratos Cósmicos (V2), controle financeiro integrado ao Asaas e monitoramento automatizado de metas de postagens de vídeos (integração YouTube Analytics).

---

## 2. Identidade Visual & UI/UX (Design System Inspiração Mística)

### Paleta de Cores Mística Cósmica

Inspirada diretamente nas logomarcas e nos fundos de nebulosa:

* **Background Primário (Deep Space):** `#111622` (O azul-escuro profundo do cosmos). Utilizado como fundo de toda a aplicação.
* **Superfícies/Cards (Myst Mist Nebula):** `#1A1D29` (Um roxo místico escuro profundo, ligeiramente mais claro que o fundo principal, para contêineres de conteúdo).
* **Texto Primário (Stellar White):** `#FFFFFF` (O branco das estrelas, para textos funcionais e legíveis).
* **Cor de Destaque Primária (Ouro Místico):** `#E2B042` ou `#D69E2E` (Um dourado místico texturizado/metálico, inspirado no ouro místico das logos. Utilizar para botões principais, status ativos e medalhas de destaque).
* **Status de Sucesso/Adimplência:** `#38A169` (Verde Esmeralda Místico).
* **Status de Perigo/Inadimplência/Suspenso:** `#E53E3E` (Vermelho Rubi Místico).

### Tipografia

Inspirada na dicotomia sans-serif limpa e mística decorativa das logos:

* **Títulos Primários:** `Josefin Sans` ou `Poiret One` (Sans-serif limpa e moderna, emulando "COSMO ALMA" na logo. Usar Ouro Místico para os títulos principais).
* **Corpo do Texto:** `Inter`, `Arial` ou `Josefin Sans` (Manter sans-serif limpa para legibilidade funcional).
* **Títulos de Seção Mística (Opcional):** `Auras` ou `Cormorant Garamond` (Fonte decorativa para lembrar o "TV" na logo, se a plataforma de interface permitir sem quebrar a legibilidade funcional. Evitar para textos de controle).

---

## 3. Arquitetura Funcional (Módulos da Egrégora)

```
       [ WEB PORTAL / DASHBOARD MÍSTICO ]
         (React / Flutter / HTML)
                    │
                    ▼
       [ CAMADA DE EVENTOS / CONTROLADORES ]
             (Antigravity / FastAPI)
       ┌────────────┼────────────┐
       ▼            ▼            ▼
[Portal Onboarding] [Módulo Asaas] [Esteira YouTube]
[Contratos Docx] [Assinaturas] [Analytics API]

```

### Módulo A: O Portal do Criador & Contratos Cósmicos

1. **Formulário de Entrada:** O usuário preenche dados como Nome Comercial, Razão Social, CNPJ/CPF, Telefone, E-mail, link do Canal Inicial do YouTube e Chave PIX de recebimento.
2. **Motor de Compilação:** O sistema lê o template `CONTRATO_COSMO_ALMA_TV_V2.docx` e preenche dinamicamente os campos de qualificação.
3. **Disparo de Assinatura:** Envio do documento estruturado via API (ZapSign/Clicksign) para o e-mail do condômino.
4. **Ação Pós-Assinatura:** O webhook da plataforma de assinatura avisa o sistema, que altera o status do usuário de `AGUARDANDO_ASSINATURA` para `ATIVO_PENDENTE_PAGAMENTO`.

### Módulo B: Integração Financeira (A Trava Cósmica de Segurança)

* **Geração de Assinatura:** O sistema executa uma chamada de API criando o cliente no Asaas e vinculando uma assinatura mensal recorrente de **R$ 100,00** com vencimento padrão no dia 10.
* **Tratamento de Inadimplência:**
* O Asaas envia um Webhook do tipo `PAYMENT_OVERDUE` (vencido).
* A aplicação calcula o tempo corrente de inadimplência.
* **Gatilho de Suspensão (Cláusula 11ª):** No momento em que `dias_atraso > 10`, o status altera para `SUSPENSO_INADIMPLENCIA`.



### Módulo C: A Esteira de Conteúdo (YouTube Analytics)

* **Frequência (Cláusula 10ª):** Um job automático executa uma rotina semanal na API do YouTube para rastrear novos vídeos enviados pelo ID do canal do parceiro.
* **Regra de Bloqueio por Falha:** Caso o criador falte com a cota (mínimo 1 vídeo por semana), a aplicação atualiza o banco de dados. Caso passe de uma semana consecutiva sem justificativa, altera o status para `BLOQUEADO_ASSIDUIDADE`, suspendendo a participação do criador no cálculo de distribuição proporcional do AdSense.

---

## 4. Engenharia de Dados (Esquema do Banco de Dados Cósmico)

### Entidade: `Condomino`

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | UUID (PK) | Identificador único universal |
| `nome_comercial` | VARCHAR | Nome do projeto/Canal do criador |
| `cnpj_cpf` | VARCHAR | Registro fiscal (Unique) |
| `email` | VARCHAR | E-mail corporativo (Unique) |
| `status` | ENUM | `AGUARDANDO_ASSINATURA`, `ATIVO_ADIMPLENTE`, `SUSPENSO_INADIMPLENCIA`, `BLOQUEADO_ASSIDUIDADE` |
| `asaas_id` | VARCHAR | ID correspondente do cliente no Asaas |
| `youtube_id` | VARCHAR | ID do canal ou playlist de acompanhamento |

### Entidade: `EntregaVideo`

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | INT (PK) | ID auto-incremental |
| `condomino_id` | UUID (FK) | Relacionamento com tabela Condomino |
| `semana_codigo` | VARCHAR | String de controle temporal (Ex: `2026-W23`) |
| `qtd_entregue` | INT | Quantidade de vídeos publicados na semana |
| `status_valido` | BOOLEAN | Atende à meta (Entre 1 e 3 vídeos) |

---

## 5. Fluxos de Interface de Usuário (User Stories Visuais)

### Dashboard do Administrador (Gestores Cósmicos)

* Exibição dos Cards de Métrica Geral: Faturamento Bruto do AdSense no mês, Reserva Operacional retida de 30%, e Fundo Líquido Consolidado de 70%.
* Lista Dinâmica de Condôminos agrupados por Status de Cores (Dourado = Ativo; Vermelho = Suspenso por Pagamento ou Assiduidade).

### Portal do Criador Parceiro (Místico Painel)

* Área Limpa contendo:
* Status financeiro atual da Cota Condominial (Boleto/PIX do mês).
* Painel de Performance Semanal (Quantos vídeos ele enviou na semana corrente).
* Extrato Transparente de Repasses: Visualização exata do AdSense gerado pelo seu nicho, os 30% aplicados na manutenção e reinvestimento, e o valor líquido que lhe será transferido.

