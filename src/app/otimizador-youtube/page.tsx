'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import styles from './otimizador.module.css';

interface Project {
  id: string;
  name?: string;
  created_at?: string;
  updated_at?: string;
}

interface TokenStats {
  prompt: number;
  completion: number;
  total: number;
}

interface Outputs {
  titles: string;
  description: string;
  tags: string;
  broll: string;
  [key: string]: string;
}

export default function OtimizadorPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [sessionToken, setSessionToken] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Chaves de API
  const [descriptKey, setDescriptKey] = useState<string>('');
  const [geminiKey, setGeminiKey] = useState<string>('');
  const [serverHasDescriptKey, setServerHasDescriptKey] = useState<boolean>(false);
  const [serverHasGeminiKey, setServerHasGeminiKey] = useState<boolean>(false);
  const [showConfig, setShowConfig] = useState<boolean>(false);

  // Projetos & Transcrição
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [cleanedTranscript, setCleanedTranscript] = useState<string>('');
  const [referenceUrls, setReferenceUrls] = useState<string>('');
  
  // Loadings
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(false);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  
  // Configurações de Otimização & Geração
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.5-flash');
  const [stripSpeakers, setStripSpeakers] = useState<boolean>(false);
  const [stripTimecodes, setStripTimecodes] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('titles');

  // Outputs do Gemini (editáveis)
  const [outputs, setOutputs] = useState<Outputs>({
    titles: '',
    description: '',
    tags: '',
    broll: ''
  });

  // Métricas de Tokens (Sessão Atual)
  const [sessionTokens, setSessionTokens] = useState<TokenStats>({
    prompt: 0,
    completion: 0,
    total: 0
  });

  // Notificações
  const [toastMsg, setToastMsg] = useState<string>('');

  // 1. Validar autenticação de Administrador no carregamento e buscar chaves do servidor
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Redireciona para o login do portal caso não haja sessão
        router.push('/login');
        return;
      }
      
      const user = session.user;
      setCurrentUser(user);
      const token = session.access_token;
      setSessionToken(token);

      const adminEmails = [
        "admin@portal.cosmoalmatv.com.br",
        "alexandre.p@portal.cosmoalmatv.com.br",
        "marcos.caram@portal.cosmoalmatv.com.br",
        "carlos.falcon@portal.cosmoalmatv.com.br",
        "articopyagencia@gmail.com",
        "marcos.caram@gmail.com",
        "alexandre.tjk@gmail.com"
      ];
      const isUserAdmin = adminEmails.includes(user.email || "") || user.user_metadata?.role === "admin";
      
      if (!isUserAdmin) {
        setIsAdmin(false);
        showToast('Acesso negado. Apenas administradores podem acessar esta ferramenta.');
        setTimeout(() => router.push('/'), 2500);
      } else {
        setIsAdmin(true);
        // Buscar status das chaves configuradas no servidor
        try {
          const res = await fetch('/api/configs/keys-status', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (res.ok) {
            const keysStatus = await res.json();
            setServerHasDescriptKey(!!keysStatus.hasDescriptKey);
            setServerHasGeminiKey(!!keysStatus.hasGeminiKey);
          }
        } catch (err) {
          console.error('Erro ao verificar status das chaves no servidor:', err);
        }
      }
    }
    checkAuth();
  }, [router]);

  // 2. Carregar chaves locais após validação do Admin
  useEffect(() => {
    if (isAdmin === true && typeof window !== 'undefined') {
      const savedDescript = localStorage.getItem('cosmoalma_descript_key') || '';
      const savedGemini = localStorage.getItem('cosmoalma_gemini_key') || '';
      setDescriptKey(savedDescript);
      setGeminiKey(savedGemini);

      if (!savedDescript && !savedGemini && !serverHasDescriptKey && !serverHasGeminiKey) {
        setShowConfig(true);
      }
    }
  }, [isAdmin, serverHasDescriptKey, serverHasGeminiKey]);

  // 3. Buscar projetos automaticamente quando a chave do Descript estiver definida localmente ou no servidor
  useEffect(() => {
    if (isAdmin === true && (descriptKey || serverHasDescriptKey)) {
      fetchProjects();
    }
  }, [descriptKey, serverHasDescriptKey, isAdmin]);

  const handleSaveKeys = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('cosmoalma_descript_key', descriptKey);
    localStorage.setItem('cosmoalma_gemini_key', geminiKey);
    showToast('Configurações salvas com sucesso!');
    setShowConfig(false);
    fetchProjects();
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // Buscar Projetos do Descript
  const fetchProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const headers: HeadersInit = {
        'Authorization': `Bearer ${sessionToken}`
      };
      if (descriptKey) {
        headers['x-descript-api-key'] = descriptKey;
      }

      const res = await fetch('/api/descript/projects', { headers });
      const data = await res.json();
      if (res.ok) {
        const list = Array.isArray(data) ? data : (data.projects || data.data || []);
        setProjects(list);
      } else {
        showToast(`Erro ao carregar projetos: ${data.error || 'Verifique as credenciais.'}`);
      }
    } catch (err) {
      console.error(err);
      showToast('Erro de rede ao carregar projetos.');
    } finally {
      setIsLoadingProjects(false);
    }
  };

  // Buscar transcrição do projeto selecionado
  const handleSelectProject = async (project: Project) => {
    setActiveProject(project);
    setTranscript('');
    setCleanedTranscript('');
    setOutputs({ titles: '', description: '', tags: '', broll: '' });
    
    setIsLoadingTranscript(true);
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      };
      if (descriptKey) {
        headers['x-descript-api-key'] = descriptKey;
      }

      const res = await fetch('/api/descript/export-transcript', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          projectId: project.id,
          format: 'txt',
          includeSpeakerLabels: stripSpeakers ? 'none' : 'changes'
        })
      });
      
      if (res.ok) {
        const text = await res.text();
        setTranscript(text);
        processTranscript(text);
      } else {
        const errData = await res.json();
        showToast(`Erro ao obter transcrito: ${errData.error || 'Verifique o projeto.'}`);
      }
    } catch (err) {
      console.error(err);
      showToast('Erro de rede ao buscar transcrição.');
    } finally {
      setIsLoadingTranscript(false);
    }
  };

  // Processa o transcrito com base nos filtros
  const processTranscript = (rawText: string) => {
    let processed = rawText;
    if (stripTimecodes) {
      processed = processed.replace(/\[\d{2}:\d{2}(:\d{2})?\]\s*/g, '');
    }
    setCleanedTranscript(processed);
  };

  useEffect(() => {
    processTranscript(transcript);
  }, [stripSpeakers, stripTimecodes, transcript]);

  // Chamada de geração para o Gemini
  const generateContent = async (type: string) => {
    if (!geminiKey && !serverHasGeminiKey) {
      showToast('Por favor, configure sua chave de API do Gemini.');
      setShowConfig(true);
      return;
    }
    if (!cleanedTranscript) {
      showToast('Nenhuma transcrição disponível para enviar.');
      return;
    }

    setIsGenerating(true);
    
    let promptText = '';
    const systemInstruction = 'Você é o copiloto de criação do canal Cosmo alma TV no YouTube. O canal aborda temas profundos como espiritualidade, física quântica, poder da mente, autoconhecimento, cosmos e mistérios do universo. Sua linguagem é poética, instigante, científica e ao mesmo tempo acessível, gerando conexão emocional e curiosidade profunda.';

    switch (type) {
      case 'titles':
        promptText = `Baseado na transcrição abaixo do nosso próximo vídeo, gere 5 opções de títulos altamente atraentes para o YouTube.
Títulos devem ter forte apelo de SEO, misturar curiosidade com clareza, ter menos de 70 caracteres e usar gatilhos emocionais adequados ao público do canal.

Transcrição:
${cleanedTranscript}`;
        break;

      case 'description':
        promptText = `Baseado na transcrição abaixo, crie uma descrição otimizada para o YouTube contendo:
1. Uma introdução super magnética que prenda o leitor nos primeiros segundos (essencial para o algoritmo).
2. Um resumo estruturado em tópicos do que é abordado no vídeo.
3. Seção com sugestões de momentos-chave/capítulos baseados no fluxo do assunto (crie timestamps aproximados lógicos se não houver timecodes).
4. Chamadas para ação (curtir, se inscrever, compartilhar e comentar).

Transcrição:
${cleanedTranscript}`;
        break;

      case 'tags':
        promptText = `Gere uma lista de tags/palavras-chave separadas por vírgula para o YouTube com base nesta transcrição.
Inclua palavras-chave de cauda curta (termos amplos) e cauda longa (perguntas ou frases específicas que as pessoas buscam sobre espiritualidade e cosmos). Retorne APENAS a lista separada por vírgulas.

Transcrição:
${cleanedTranscript}`;
        break;

      case 'broll':
        promptText = `Analise a transcrição e identifique de 5 a 8 momentos cruciais onde o editor deve inserir cenas de B-roll, imagens conceituais ou trechos rápidos de vídeo gerados por Inteligência Artificial (ex: Midjourney, Runway) para reter a atenção do público.
Para cada recomendação, forneça:
1. O trecho da fala de referência.
2. A sugestão de elemento visual (B-roll).
3. O prompt detalhado pronto para uso em geradores de imagem/vídeo IA (ex: "Fotografia realista de um monge meditando sob uma árvore cósmica, partículas de luz flutuando, estilo cinematográfico, 8k").

Transcrição:
${cleanedTranscript}`;
        break;
    }

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      };
      if (geminiKey) {
        headers['x-gemini-api-key'] = geminiKey;
      }

      const urlsArray = referenceUrls
        .split('\n')
        .map(u => u.trim())
        .filter(u => u.length > 0);

      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: promptText,
          systemInstruction: systemInstruction,
          referenceUrls: urlsArray,
          model: selectedModel
        })
      });

      const data = await res.json();
      if (res.ok) {
        setOutputs(prev => ({
          ...prev,
          [type]: data.text
        }));
        
        const metadata = data.usageMetadata;
        setSessionTokens(prev => ({
          prompt: prev.prompt + (metadata.promptTokenCount || 0),
          completion: prev.completion + (metadata.candidatesTokenCount || 0),
          total: prev.total + (metadata.totalTokenCount || 0)
        }));

        setActiveTab(type);
        showToast('Conteúdo gerado! Sinta-se livre para ajustar o texto gerado na caixa abaixo.');
      } else {
        showToast(`Erro na geração: ${data.error || 'Tente novamente.'}`);
      }
    } catch (err) {
      console.error(err);
      showToast('Erro de rede ao chamar o Gemini.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditOutput = (val: string) => {
    setOutputs(prev => ({
      ...prev,
      [activeTab]: val
    }));
  };

  const estimateInputTokens = () => {
    if (!cleanedTranscript) return 0;
    return Math.round(cleanedTranscript.length / 3.8);
  };

  // Renderização condicional de carregamento de segurança
  if (isAdmin === null) {
    return (
      <div className={styles.appContainer} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className={styles.glassCard} style={{ padding: '3rem', textAlign: 'center' }}>
          <span className={styles.logoEmoji} style={{ display: 'block', marginBottom: '1rem' }}>🛡️</span>
          <h2>Verificando Acesso...</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Aguarde enquanto autenticamos sua sessão administrativa.</p>
        </div>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className={styles.appContainer} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className={styles.glassCard} style={{ padding: '3rem', textAlign: 'center', borderColor: '#ef4444' }}>
          <span className={styles.logoEmoji} style={{ display: 'block', marginBottom: '1rem' }}>⚠️</span>
          <h2>Acesso Negado</h2>
          <p style={{ color: '#fca5a5', marginTop: '0.5rem' }}>Você não tem permissão para acessar o Otimizador de YouTube.</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '1rem' }}>Redirecionando para o painel principal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111622] nebula-gradient flex flex-col md:flex-row font-sans text-gray-100">
      {/* Mobile Top Bar */}
      <header className="md:hidden border-b border-[#E2B042]/20 py-3 px-4 flex justify-between items-center bg-[#1A1D29]/90 sticky top-0 z-50 w-full shrink-0">
        <div className="flex items-center gap-2">
          <img src="/icon.png" alt="Logo" className="h-8 w-8 object-contain rounded-full border border-[#E2B042]/30 p-0.5 bg-[#111622]" />
          <div>
            <h1 className="text-sm font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-[#E2B042] to-purple-400 font-[family-name:var(--font-josefin-sans)]">
              COSMO ALMA TV
            </h1>
          </div>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-gray-300 hover:text-white p-1 focus:outline-none"
        >
          {isMobileMenuOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </header>

      {/* Sidebar Nav - Desktop (Persistent) & Mobile (Drawer) */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#1A1D29]/95 border-r border-[#E2B042]/20 flex flex-col justify-between transition-transform duration-300 md:translate-x-0 md:static md:h-screen shrink-0 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div>
          {/* Logo Branding */}
          <div className="flex items-center gap-3 py-6 px-6 border-b border-gray-800">
            <img
              src="/icon.png"
              alt="Cosmo Alma TV Logo"
              className="h-10 w-10 object-contain rounded-full border border-[#E2B042]/30 p-0.5 bg-[#111622] mystic-glow"
            />
            <div>
              <h1 className="text-md font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-[#E2B042] to-purple-400 font-[family-name:var(--font-josefin-sans)]">
                COSMO ALMA TV
              </h1>
              <p className="text-[9px] uppercase tracking-[0.2em] text-[#E2B042]">Portal Egrégora CMS</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 flex flex-col gap-2">
            {/* Onboarding tab */}
            <button
              onClick={() => router.push('/?tab=onboarding')}
              className="w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer text-gray-300 hover:bg-[#111622] hover:text-white border border-transparent hover:border-[#E2B042]/10"
            >
              <span>🌌</span> ONBOARDING PÚBLICO
            </button>

            {/* Admin tab */}
            <button
              onClick={() => router.push('/?tab=admin')}
              className="w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer text-gray-300 hover:bg-[#111622] hover:text-white border border-transparent hover:border-[#E2B042]/10"
            >
              <span>📊</span> PAINEL GESTÃO (ADMIN)
            </button>

            {/* Creator tab */}
            <button
              onClick={() => router.push('/?tab=creator')}
              className="w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer text-gray-300 hover:bg-[#111622] hover:text-white border border-transparent hover:border-[#E2B042]/10"
            >
              <span>🧘</span> ÁREA DO CRIADOR
            </button>

            {/* Otimizador tab (Active) */}
            <button
              className="w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer bg-[#E2B042] text-black shadow-[0_0_15px_rgba(226,176,66,0.3)]"
            >
              <span>✂️</span> OTIMIZADOR YOUTUBE
            </button>
          </nav>
        </div>

        {/* User Info / Log out at bottom */}
        <div className="p-4 border-t border-gray-800 bg-[#111622]/40">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-gray-400 font-mono truncate" title={currentUser?.email}>
              👤 {currentUser?.email || 'admin@portal.cosmoalmatv.com.br'}
            </span>
            <span className="text-[9px] text-[#E2B042] font-semibold uppercase tracking-wider">
              Função: Administrador
            </span>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push('/');
              }}
              className="mt-2 w-full text-center px-3 py-2 rounded-lg text-xs font-semibold bg-red-950/40 text-red-400 hover:text-red-300 border border-red-900/50 hover:bg-red-900/30 transition-all cursor-pointer flex items-center justify-center gap-1"
            >
              🚪 SAIR
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay to close mobile menu */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:h-screen md:overflow-y-auto p-4 md:p-8">
        <div className={styles.appContainer}>
          {/* Header Action buttons from Otimizador */}
          <div className="flex justify-between items-center border-b border-gray-800 pb-4 mb-6 flex-wrap gap-4">
            <h2 className="text-xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white to-[#E2B042]">
              ✂️ OTIMIZADOR DE VÍDEOS (YOUTUBE)
            </h2>
            <div className="flex items-center gap-2">
              <button 
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#1A1D29] text-gray-300 hover:text-white border border-gray-700 transition-all cursor-pointer"
                onClick={fetchProjects} 
                disabled={isLoadingProjects}
              >
                {isLoadingProjects ? 'Carregando...' : '🔄 Atualizar Projetos'}
              </button>
              <button 
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#1A1D29] text-gray-300 hover:text-white border border-gray-700 transition-all cursor-pointer"
                onClick={() => setShowConfig(!showConfig)}
              >
                ⚙️ APIs
              </button>
            </div>
          </div>

      {/* Configurações */}
      {showConfig && (
        <div className={styles.glassCard} style={{ marginBottom: '1.5rem', borderColor: 'var(--accent-purple)' }}>
          <h2 className={styles.detailTitle} style={{ marginBottom: '1rem' }}>🔑 Chaves de Integração (Sobrescrever Servidor)</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Nota: Se as chaves já estiverem configuradas no arquivo de produção (.env), você não precisa preencher este formulário.
          </p>
          <form onSubmit={handleSaveKeys}>
            <div className={styles.formGroup}>
              <label>Descript API Token</label>
              <input 
                type="password" 
                className={styles.formInput} 
                value={descriptKey} 
                onChange={(e) => setDescriptKey(e.target.value)}
                placeholder="Token gerado no Descript"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Gemini API Key</label>
              <input 
                type="password" 
                className={styles.formInput} 
                value={geminiKey} 
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="Sua chave de API do Gemini"
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
              <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>Salvar e Conectar</button>
              <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowConfig(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Métricas e Estatísticas */}
      <div className={styles.statsRibbon}>
        <div className={`${styles.glassCard} ${styles.statBox}`}>
          <span className={styles.statLabel}>Tokens Enviados (Prompt)</span>
          <span className={`${styles.statValue} ${styles.purple}`}>{sessionTokens.prompt.toLocaleString()}</span>
        </div>
        <div className={`${styles.glassCard} ${styles.statBox}`}>
          <span className={styles.statLabel}>Tokens Recebidos (Saída)</span>
          <span className={`${styles.statValue} ${styles.purple}`}>{sessionTokens.completion.toLocaleString()}</span>
        </div>
        <div className={`${styles.glassCard} ${styles.statBox}`}>
          <span className={styles.statLabel}>Total Gasto na Sessão</span>
          <span className={`${styles.statValue} ${styles.teal}`}>{sessionTokens.total.toLocaleString()}</span>
        </div>
        <div className={`${styles.glassCard} ${styles.statBox}`}>
          <span className={styles.statLabel}>Modelo Selecionado</span>
          <select 
            value={selectedModel} 
            onChange={(e) => setSelectedModel(e.target.value)}
            className={styles.formInput} 
            style={{ padding: '6px', fontSize: '0.85rem' }}
          >
            <option value="gemini-3.5-flash">Gemini 3.5 Flash (Rápido)</option>
            <option value="gemini-3.1-pro">Gemini 3.1 Pro (Avançado)</option>
          </select>
        </div>
      </div>

      {/* Main Grid */}
      <div className={styles.dashboardGrid}>
        
        {/* Sidebar Projetos */}
        <aside className={`${styles.projectSidebar} ${styles.glassCard}`}>
          <div className={styles.sidebarTitle}>
            <span>Projetos Descript</span>
            {isLoadingProjects && <span className={`${styles.statusTag} ${styles.loading}`}>Carregando...</span>}
          </div>
          
          {projects.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📁</span>
              <p>{isLoadingProjects ? 'Buscando projetos...' : 'Nenhum projeto encontrado ou chave Descript pendente.'}</p>
            </div>
          ) : (
            <div className={styles.projectList}>
              {projects.map((project) => (
                <button 
                  key={project.id}
                  onClick={() => handleSelectProject(project)}
                  className={`${styles.projectItem} ${activeProject?.id === project.id ? styles.active : ''}`}
                >
                  <div className={styles.projectName}>{project.name || 'Projeto sem nome'}</div>
                  <div className={styles.projectMeta}>ID: {project.id.substring(0, 8)}...</div>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Content Area */}
        <main className={styles.contentArea}>
          {!activeProject ? (
            <div className={`${styles.glassCard} ${styles.emptyState}`} style={{ height: '400px' }}>
              <span className={styles.emptyIcon}>🌌</span>
              <h2>Selecione um Projeto</h2>
              <p>Escolha um projeto na barra lateral para carregar a transcrição e começar a otimizar com o Gemini.</p>
            </div>
          ) : (
            <div className={styles.glassCard}>
              
              {/* Header do Projeto */}
              <div className={styles.detailHeader}>
                <div>
                  <h2 className={styles.detailTitle}>{activeProject.name}</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>ID: {activeProject.id}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {isLoadingTranscript && <span className={`${styles.statusTag} ${styles.loading}`}>Buscando Transcrição...</span>}
                  {isGenerating && <span className={`${styles.statusTag} ${styles.loading}`}>Processando...</span>}
                </div>
              </div>

              {/* Toggles Otimização */}
              <div className={styles.optimizationToggles} style={{ marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', alignSelf: 'center' }}>
                  Filtros de Transcrito (Economia de Tokens):
                </span>
                <label className={styles.switchLabel}>
                  <input 
                    type="checkbox" 
                    className={styles.switchInput} 
                    checked={stripTimecodes} 
                    onChange={(e) => setStripTimecodes(e.target.checked)}
                  />
                  Remover Timestamps
                </label>
                <label className={styles.switchLabel}>
                  <input 
                    type="checkbox" 
                    className={styles.switchInput} 
                    checked={stripSpeakers} 
                    onChange={(e) => {
                      setStripSpeakers(e.target.checked);
                      setTimeout(() => handleSelectProject(activeProject), 100);
                    }}
                  />
                  Ocultar Falantes
                </label>
                <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--accent-teal)', fontWeight: 600 }}>
                  Est. Entrada: ~{estimateInputTokens()} tokens
                </div>
              </div>

              {/* URLs de Referência */}
              <div className={styles.referenceUrlsContainer} style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  🔗 URLs de Referência / Fontes do NotebookLM (Uma por linha):
                </label>
                <textarea
                  className={styles.formInput}
                  style={{ height: '70px', padding: '10px', fontSize: '0.85rem', resize: 'vertical' }}
                  value={referenceUrls}
                  onChange={(e) => setReferenceUrls(e.target.value)}
                  placeholder="https://exemplo.com/artigo-seo&#10;https://exemplo.com/regras-algoritmo-2026"
                />
              </div>

              {/* Layout Editor/Saída */}
              <div className={styles.editorLayout}>
                
                {/* Lado Esquerdo: Transcrito */}
                <div className={styles.editorPane}>
                  <div className={styles.paneHeader}>
                    <span className={styles.paneTitle}>Transcrição Descript</span>
                    <button 
                      className={`${styles.btn} ${styles.btnSecondary}`} 
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      onClick={() => handleSelectProject(activeProject)}
                      disabled={isLoadingTranscript}
                    >
                      Recarregar
                    </button>
                  </div>
                  {isLoadingTranscript ? (
                    <div className={styles.paneContent} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className={`${styles.statusTag} ${styles.loading}`}>Carregando do Descript...</span>
                    </div>
                  ) : (
                    <div className={styles.paneContent}>{cleanedTranscript || 'Sem conteúdo.'}</div>
                  )}
                </div>

                {/* Lado Direito: Saída do Gemini */}
                <div className={styles.editorPane}>
                  <div className={styles.paneHeader} style={{ borderBottom: 'none' }}>
                    <div className={styles.tabs}>
                      <button 
                        className={`${styles.tabBtn} ${activeTab === 'titles' ? styles.active : ''}`}
                        onClick={() => setActiveTab('titles')}
                      >
                        Títulos
                      </button>
                      <button 
                        className={`${styles.tabBtn} ${activeTab === 'description' ? styles.active : ''}`}
                        onClick={() => setActiveTab('description')}
                      >
                        Descrição
                      </button>
                      <button 
                        className={`${styles.tabBtn} ${activeTab === 'tags' ? styles.active : ''}`}
                        onClick={() => setActiveTab('tags')}
                      >
                        Tags
                      </button>
                      <button 
                        className={`${styles.tabBtn} ${activeTab === 'broll' ? styles.active : ''}`}
                        onClick={() => setActiveTab('broll')}
                      >
                        Sugestões B-Roll (IA)
                      </button>
                    </div>
                  </div>
                  
                  {/* EDITÁVEL: Agora as saídas utilizam um <textarea> para ajuste direto */}
                  <div className={styles.paneContent} style={{ position: 'relative', padding: 0 }}>
                    {outputs[activeTab] !== undefined && outputs[activeTab] !== '' ? (
                      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(outputs[activeTab]);
                            showToast('Copiado para a área de transferência!');
                          }}
                          className={`${styles.btn} ${styles.btnSecondary}`}
                          style={{ position: 'absolute', top: '10px', right: '10px', padding: '4px 8px', fontSize: '0.75rem', zIndex: 10 }}
                        >
                          📋 Copiar
                        </button>
                        <textarea
                          className={styles.editableTextarea}
                          value={outputs[activeTab]}
                          onChange={(e) => handleEditOutput(e.target.value)}
                          placeholder="Ajuste o texto aqui..."
                        />
                      </div>
                    ) : (
                      <div className={styles.emptyState}>
                        <span className={styles.emptyIcon}>💡</span>
                        <p>Selecione uma ação abaixo para gerar usando o Gemini.</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Botões de Ação */}
              <div className={styles.actionsPanel}>
                <button 
                  className={`${styles.btn} ${styles.btnPrimary}`} 
                  onClick={() => generateContent('titles')}
                  disabled={isGenerating || isLoadingTranscript || !cleanedTranscript}
                >
                  ✨ Gerar Títulos
                </button>
                <button 
                  className={`${styles.btn} ${styles.btnPrimary}`} 
                  onClick={() => generateContent('description')}
                  disabled={isGenerating || isLoadingTranscript || !cleanedTranscript}
                >
                  📝 Gerar Descrição
                </button>
                <button 
                  className={`${styles.btn} ${styles.btnPrimary}`} 
                  onClick={() => generateContent('tags')}
                  disabled={isGenerating || isLoadingTranscript || !cleanedTranscript}
                >
                  🏷️ Gerar Tags YouTube
                </button>
                <button 
                  className={`${styles.btn} ${styles.btnSuccess}`} 
                  onClick={() => generateContent('broll')}
                  disabled={isGenerating || isLoadingTranscript || !cleanedTranscript}
                >
                  🎬 Sugerir B-Roll & Prompts IA
                </button>
              </div>

            </div>
          )}
        </main>
      </div>
      </div>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className={styles.toast}>
          {toastMsg}
        </div>
      )}
    </div>
  );
}
