# Documento de Requisitos (PRD)
## Funcionalidade: Módulo de Evolução Cósmica (Consultor de Performance Automatizado)
**Contexto:** Portal Egrégora — Módulo C (Esteira de Conteúdo)
**Ambiente de Execução:** Antigravity

---

## 1. Visão Geral do Projeto
Atualmente, o **Módulo C (Esteira de Conteúdo & Regra 70/30)** do Portal Egrégora audita de forma automatizada se os criadores parceiros cumprem as metas de assiduidade e gerencia os repasses financeiros via API do YouTube. 

Este incremento estende o escopo do Módulo C, transformando o portal em um **Consultor de Performance Automatizado**. O sistema passará a extrair métricas de retenção e engajamento das playlists de cada criador para gerar diagnósticos de roteiro, título e miniatura (thumbnails) de forma preditiva e mastigada.

---

## 2. Requisitos Técnicos & Arquitetura (Backend)

### 2.1. Integração e Coleta de Dados (YouTube Analytics API)
O robô de auditoria do Módulo C estenderá suas chamadas cronometradas para capturar as seguintes métricas por ID de vídeo contido na playlist do criador:
* `averageViewDuration` / `averageViewPercentage` (Retenção Média)
* `annotationClickThroughRate` / `cardClickThroughRate` (Métricas base para CTR de Vídeo)
* Retenção específica no marco temporal de **30 segundos** (Medição de evasão do Gancho Inicial).

### 2.2. O Motor de Regras (Mapeamento Heurístico)
O microsserviço desenvolvido em **Python (FastAPI)** rodará um motor de regras condicionais processando os dados consolidados do YouTube Analytics. 

#### Tabela de Gatilhos e Ações Automatizadas:

| Métrica Analisada | Condição Disparadora | Diagnóstico Gerado | Ação Sugerida ao Criador |
| :--- | :--- | :--- | :--- |
| **Taxa de Clique (CTR)** | $< 4\%$ | Baixo apelo visual ou desalinhamento com o público-alvo. | Revisar o título inserindo palavras-chave magnéticas nos primeiros 50 caracteres e readequar a miniatura seguindo a paleta mística do canal. |
| **Evasão nos Primeiros 30s** | Retenção $< 60\%$ no marco inicial | Falha de ancoragem/Gancho inicial fraco no roteiro. | Reduzir o tempo de vinhetas, eliminar introduções genéricas e aplicar a técnica de "Gancho Magnético" logo no primeiro segundo. |
| **Retenção Geral** | Queda abrupta no meio do vídeo | Quebra de ritmo ou perda de dinamismo no roteiro. | Inserir quebras de padrão visuais (B-rolls, zooms, GC) a cada 45 segundos e revisar a densidade do roteiro no bloco apontado. |

---

## 3. Requisitos de Interface e Experiência (UI/UX)

O painel deve ser integrado de forma nativa à tela de transparência do criador parceiro, respeitando estritamente o guia de estilos do Portal Egrégora:

* **Tema:** Dark Mode Obrigatório
* **Fundo (Deep Space):** `#111622` (Azul-escuro profundo do cosmos)
* **Contêineres (Nebula Mist):** `#1A1D29` (Roxo místico escuro)
* **Elementos de Destaque / Alertas Ativos:** `#E2B042` ou `#D69E2E` (Ouro Místico metálico)

### 3.1. Componente "Insights do Algoritmo"
Em substituição a gráficos complexos e frios de Analytics, a interface exibirá um card limpo estruturado em formato de **Checklist de Evolução Cósmica**:

1.  **Status de Saúde do Conteúdo:** Tag colorida indicando se a performance da playlist está em equilíbrio com a egrégora do canal (Ex: *Excelente, Ajuste Necessário, Atenção Crítica*).
2.  **Lista de Recomendações Práticas:** Caixas de texto dinâmicas geradas pelo motor de regras do backend com o passo a passo mastigado para alteração.

---

## 4. Plano de Implementação no Antigravity

1.  **Fase 1 (Banco de Dados):** Atualização dos schemas do banco (SQLAlchemy) para suportar tabelas de histórico de retenção por criador e logs de insights sugeridos.
2.  **Fase 2 (Integração):** Atualização dos escopos OAuth da API do YouTube para permitir leitura de dados do YouTube Analytics (revisão pontual do Módulo C).
3.  **Fase 3 (Lógica):** Desenvolvimento do módulo de análise estatística em Python e geração dos diagnósticos em formato JSON estruturado.
4.  **Fase 4 (Frontend):** Renderização dos novos cards místicos na área do condomínio no portal.