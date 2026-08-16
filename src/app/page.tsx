"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";

// Types
interface Condomino {
  id: string;
  nome_comercial: string;
  razao_social: string;
  cnpj_cpf: string;
  email: string;
  telefone?: string;
  status_operacional: "AGUARDANDO_ASSINATURA" | "ATIVO_PENDENTE_PAGAMENTO" | "ATIVO_ADIMPLENTE" | "SUSPENSO_INADIMPLENCIA" | "BLOQUEADO_ASSIDUIDADE";
  youtube_channel_id: string;
  asaas_customer_id: string;
  zapsign_doc_id?: string;
  zapsign_sign_url?: string;
  chave_pix: string;
  data_onboarding: string;
  videos_entregues_esta_semana: number;
  receita_adsense_gerada: number;
}

interface LogEntry {
  id: string;
  timestamp: string;
  tipo: "SISTEMA" | "ASAAS" | "YOUTUBE" | "CONTRATO";
  mensagem: string;
}

const DEFAULT_CONDOMINOS: Condomino[] = [
  {
    id: "cond-1",
    nome_comercial: "Paradoxo Casa Ateliê",
    razao_social: "Paradoxo Producoes LTDA",
    cnpj_cpf: "12.345.678/0001-99",
    email: "contato@paradoxo.tv",
    status_operacional: "ATIVO_ADIMPLENTE",
    youtube_channel_id: "UC_paradoxo_123",
    asaas_customer_id: "cus_LhF93kSdjw2",
    chave_pix: "contato@paradoxo.tv",
    data_onboarding: "2026-05-10T14:30:00",
    videos_entregues_esta_semana: 2,
    receita_adsense_gerada: 1450.00
  },
  {
    id: "cond-2",
    nome_comercial: "Astrologia e Luz",
    razao_social: "Maria Silva Astrologia",
    cnpj_cpf: "123.456.789-00",
    email: "maria@astroluz.com.br",
    status_operacional: "ATIVO_PENDENTE_PAGAMENTO",
    youtube_channel_id: "UC_astroluz_456",
    asaas_customer_id: "cus_KjH39sld29",
    chave_pix: "maria@astroluz.com.br",
    data_onboarding: "2026-06-01T09:15:00",
    videos_entregues_esta_semana: 0,
    receita_adsense_gerada: 420.00
  },
  {
    id: "cond-3",
    nome_comercial: "Tarot do Amanhã",
    razao_social: "Tarot Amanha EIRELI",
    cnpj_cpf: "98.765.432/0001-11",
    email: "falecom@tarotamanha.com",
    status_operacional: "SUSPENSO_INADIMPLENCIA",
    youtube_channel_id: "UC_tarot_789",
    asaas_customer_id: "cus_JdS93kd932",
    chave_pix: "98765432000111",
    data_onboarding: "2026-04-15T11:00:00",
    videos_entregues_esta_semana: 1,
    receita_adsense_gerada: 850.00
  }
];

export default function EgrégoraCMS() {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
  const [activeTab, setActiveTab] = useState<"onboarding" | "admin" | "creator" | "financeiro">("onboarding");
  const [mounted, setMounted] = useState(false);

  // Financeiro module states
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [filtroMes, setFiltroMes] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  });
  const [financeiroLoading, setFinanceiroLoading] = useState(false);
  const [novaTransacaoTipo, setNovaTransacaoTipo] = useState<"ENTRADA" | "SAIDA">("SAIDA");
  const [novaTransacaoDescricao, setNovaTransacaoDescricao] = useState("");
  const [novaTransacaoValor, setNovaTransacaoValor] = useState("");
  const [novaTransacaoCategoria, setNovaTransacaoCategoria] = useState("Tráfego Pago");
  const [novaTransacaoStatus, setNovaTransacaoStatus] = useState<"PAGO" | "PENDENTE">("PAGO");
  const [novaTransacaoData, setNovaTransacaoData] = useState(() => new Date().toISOString().split("T")[0]);
  const [novaTransacaoLoading, setNovaTransacaoLoading] = useState(false);
  const [paginaAtualTransacoes, setPaginaAtualTransacoes] = useState(1);

  // Categorias states
  const [categorias, setCategorias] = useState<any[]>([]);
  const [isCategoriasModalOpen, setIsCategoriasModalOpen] = useState(false);
  const [novaCategoriaNome, setNovaCategoriaNome] = useState("");
  const [novaCategoriaTipo, setNovaCategoriaTipo] = useState<"ENTRADA" | "SAIDA">("SAIDA");
  const [categoriasLoading, setCategoriasLoading] = useState(false);


  const [condominos, setCondominos] = useState<Condomino[]>([]);
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const hasLoggedAccess = React.useRef<string | null>(null);

  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<"admin" | "creator" | null>(null);
  const [associatedCreator, setAssociatedCreator] = useState<Condomino | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fechamentos state
  const [fechamentos, setFechamentos] = useState<any[]>([]);
  const [closingMonth, setClosingMonth] = useState<string>("2026-06");
  const [closingAdsense, setClosingAdsense] = useState<string>("5000");

  // YouTube Stats State
  const [youtubeStats, setYoutubeStats] = useState<{
    subscriberCount: number;
    viewCount: number;
    videoCount: number;
    title: string;
    thumbnail: string;
    isMock: boolean;
    apiError?: string;
  } | null>(null);

  // Creator Performance Data State
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [loadingPerformance, setLoadingPerformance] = useState<boolean>(false);
  const [creatorSubTab, setCreatorSubTab] = useState<"gerais" | "cosmica" | "onboarding">("gerais");

  const [pixQrCode, setPixQrCode] = useState<any>(null);
  const [loadingPixQr, setLoadingPixQr] = useState<boolean>(false);

  const fetchPixQrCode = async (creatorId: string) => {
    if (!creatorId) return;
    setLoadingPixQr(true);
    setPixQrCode(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/condominos/${creatorId}/pix-qr`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setPixQrCode(data);
      } else {
        console.error("Erro ao carregar Pix QR Code");
      }
    } catch (err) {
      console.error("Erro ao obter Pix QR Code:", err);
    } finally {
      setLoadingPixQr(false);
    }
  };

  const fetchPerformanceData = async (creatorId: string) => {
    if (!creatorId) return;
    setLoadingPerformance(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/condominos/${creatorId}/performance`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setPerformanceData(data);
      } else {
        console.error("Erro ao carregar dados de performance");
      }
    } catch (err) {
      console.error("Erro ao obter dados de performance:", err);
    } finally {
      setLoadingPerformance(false);
    }
  };

  useEffect(() => {
    if (selectedCreatorId) {
      fetchPerformanceData(selectedCreatorId);
      const current = condominos.find(c => c.id === selectedCreatorId);
      if (current && (current.status_operacional === "ATIVO_PENDENTE_PAGAMENTO" || current.status_operacional === "SUSPENSO_INADIMPLENCIA")) {
        fetchPixQrCode(selectedCreatorId);
      }
    }
  }, [selectedCreatorId, condominos]);

  const fetchYoutubeStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/admin/youtube-stats`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setYoutubeStats(data);
      } else {
        console.warn("API returned error status, using simulated fallback on client.");
        let errMsg = `Código HTTP ${res.status}`;
        try {
          const errData = await res.json();
          errMsg = errData.error || errData.message || errMsg;
        } catch (_) {}
        
        setYoutubeStats({
          subscriberCount: 850,
          viewCount: 45000,
          videoCount: 45,
          title: "Cosmo Alma TV (Erro Fallback)",
          thumbnail: "",
          isMock: true,
          apiError: errMsg
        });
      }
    } catch (err: any) {
      console.error("Erro ao carregar estatísticas do YouTube, usando fallback:", err);
      setYoutubeStats({
        subscriberCount: 850,
        viewCount: 45000,
        videoCount: 45,
        title: "Cosmo Alma TV (Erro Fallback)",
        thumbnail: "",
        isMock: true,
        apiError: err.message || "Erro de rede"
      });
    }
  };

  // Onboarding Form State
  const [formData, setFormData] = useState({
    nome_completo: "",
    nome_comercial: "",
    razao_social: "",
    cnpj_cpf: "",
    email: "",
    telefone: "",
    youtube_channel_id: "",
    chave_pix: "",
    currentCreatedId: "",
    zapsign_sign_url: "",
    zapsign_doc_id: "",
    genero: "Não declarado",
    estado_civil: "solteiro",
    cep: "",
    endereco: "",
    numero: "",
    complemento: "",
    cidade: "",
    uf: "",
    pais: "Brasil"
  });
  const [docType, setDocType] = useState<"CPF" | "CNPJ">("CPF");
  const [signingContract, setSigningContract] = useState<boolean>(false);
  const [generatedContractText, setGeneratedContractText] = useState<string>("");
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<{ email?: string; cnpj_cpf?: string; telefone?: string }>({});
  
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const turnstileContainerRef = React.useRef<HTMLDivElement>(null);
  const turnstileWidgetId = React.useRef<string | null>(null);

  useEffect(() => {
    if (isOnboardingCompleted || signingContract) {
      turnstileWidgetId.current = null;
      setTurnstileToken(null);
      return;
    }

    let active = true;

    const renderTurnstile = () => {
      if (!active) return;
      const container = turnstileContainerRef.current;
      if (!container) return;

      if (typeof window !== "undefined" && (window as any).turnstile) {
        try {
          container.innerHTML = "";
          const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAADsKeZPzqYxHSqGd";
          
          turnstileWidgetId.current = (window as any).turnstile.render(container, {
            sitekey: siteKey,
            callback: (token: string) => {
              setTurnstileToken(token);
            },
            "expired-callback": () => {
              setTurnstileToken(null);
            },
            "error-callback": (err: any) => {
              console.error("Turnstile error:", err);
              setTurnstileToken(null);
            },
          });
        } catch (err) {
          console.error("Error rendering Turnstile:", err);
        }
      } else {
        setTimeout(renderTurnstile, 500);
      }
    };

    const timer = setTimeout(renderTurnstile, 100);

    return () => {
      active = false;
      clearTimeout(timer);
      if (turnstileWidgetId.current && typeof window !== "undefined" && (window as any).turnstile) {
        try {
          (window as any).turnstile.remove(turnstileWidgetId.current);
        } catch (e) {
          // ignore
        }
      }
    };
  }, [isOnboardingCompleted, signingContract]);

  const [portalConfigs, setPortalConfigs] = useState({
    whatsapp_link: "https://chat.whatsapp.com/C7nExemploGrupo",
    onboarding_video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    production_guidelines: "1. Frequência: Publique entre 1 a 3 vídeos por semana para manter o engajamento algorítmico.\n2. Qualidade: Vídeos em formato 16:9, resolução mínima 1080p, áudio limpo e sem ruídos.\n3. Identidade Visual: Utilize as vinhetas oficiais fornecidas na biblioteca do canal.",
    support_contact: "Contato direto: suporte@cosmoalmatv.com.br ou pelo Telegram @SuporteCosmo",
    youtube_channel_id: "UCEI3LDmVQceZpC0zagt398Q"
  });
  const [editConfigs, setEditConfigs] = useState({
    whatsapp_link: "",
    onboarding_video_url: "",
    production_guidelines: "",
    support_contact: "",
    youtube_channel_id: ""
  });
  const [isSavingConfigs, setIsSavingConfigs] = useState(false);

  useEffect(() => {
    setEditConfigs(portalConfigs);
  }, [portalConfigs]);

  const fetchConfigs = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/configs`);
      if (res.ok) {
        const data = await res.json();
        setPortalConfigs(data);
      }
    } catch (err) {
      console.error("Error fetching configs:", err);
    }
  };

  const handleSaveConfigs = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfigs(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";

      const res = await fetch(`${API_BASE_URL}/api/configs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(editConfigs)
      });

      if (!res.ok) {
        const errData = await res.json();
        alert(`Erro ao salvar configurações: ${errData.detail || "Erro desconhecido"}`);
        return;
      }

      alert("Configurações do portal atualizadas com sucesso!");
      await fetchConfigs();
    } catch (err: any) {
      console.error(err);
      alert(`Falha ao conectar com a API: ${err.message}`);
    } finally {
      setIsSavingConfigs(false);
    }
  };

  // API Test States
  const [testZapSignResult, setTestZapSignResult] = useState<any>(null);
  const [testAsaasResult, setTestAsaasResult] = useState<any>(null);
  const [testYoutubeResult, setTestYoutubeResult] = useState<any>(null);
  const [testYoutubeChannelId, setTestYoutubeChannelId] = useState<string>("UCF0p5j1QEYT4jM-8Ttg86tA");
  const [isTestingZapSign, setIsTestingZapSign] = useState<boolean>(false);
  const [isTestingAsaas, setIsTestingAsaas] = useState<boolean>(false);
  const [isTestingYoutube, setIsTestingYoutube] = useState<boolean>(false);

  const runTestZapSign = async () => {
    setIsTestingZapSign(true);
    setTestZapSignResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";
      const res = await fetch(`${API_BASE_URL}/api/admin/test/assinafy`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      setTestZapSignResult(data);
      if (data.success) {
        addLog("CONTRATO", `Teste Assinafy executado com sucesso (${data.mode}). ID: ${data.doc_id}`);
      } else {
        addLog("CONTRATO", `Erro no teste Assinafy: ${data.error}`);
      }
    } catch (err: any) {
      setTestZapSignResult({ success: false, error: err.message });
      addLog("CONTRATO", `Falha de conexão no teste Assinafy: ${err.message}`);
    } finally {
      setIsTestingZapSign(false);
    }
  };

  const runTestAsaas = async () => {
    setIsTestingAsaas(true);
    setTestAsaasResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";
      const res = await fetch(`${API_BASE_URL}/api/admin/test/asaas`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      setTestAsaasResult(data);
      if (data.success) {
        addLog("ASAAS", `Teste Asaas executado com sucesso (${data.mode}). Cust: ${data.customer_id}`);
      } else {
        addLog("ASAAS", `Erro no teste Asaas: ${data.error}`);
      }
    } catch (err: any) {
      setTestAsaasResult({ success: false, error: err.message });
      addLog("ASAAS", `Falha de conexão no teste Asaas: ${err.message}`);
    } finally {
      setIsTestingAsaas(false);
    }
  };

  const runTestYoutube = async () => {
    setIsTestingYoutube(true);
    setTestYoutubeResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";
      const res = await fetch(`${API_BASE_URL}/api/admin/test/youtube`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ youtubeChannelId: testYoutubeChannelId })
      });
      const data = await res.json();
      setTestYoutubeResult(data);
      if (data.success) {
        addLog("YOUTUBE", `Teste YouTube executado com sucesso (${data.mode}). Encontrados: ${data.uploads_count}`);
      } else {
        addLog("YOUTUBE", `Erro no teste YouTube: ${data.error}`);
      }
    } catch (err: any) {
      setTestYoutubeResult({ success: false, error: err.message });
      addLog("YOUTUBE", `Falha de conexão no teste YouTube: ${err.message}`);
    } finally {
      setIsTestingYoutube(false);
    }
  };

  // Initialize data from API
  const fetchCondominos = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      } else {
        setCondominos([]);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/condominos`, { headers });
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((c: any) => ({
          id: c.id,
          nome_comercial: c.nome_comercial,
          razao_social: c.razao_social,
          cnpj_cpf: c.cnpj_cpf,
          email: c.email,
          status_operacional: c.status,
          youtube_channel_id: c.youtube_id || "",
          asaas_customer_id: c.asaas_id || "",
          zapsign_doc_id: c.zapsign_doc_id || "",
          zapsign_sign_url: c.zapsign_sign_url || "",
          chave_pix: c.chave_pix || "",
          data_onboarding: c.data_onboarding,
          videos_entregues_esta_semana: typeof c.videos_entregues_esta_semana === "number" ? c.videos_entregues_esta_semana : (c.status === "ATIVO_ADIMPLENTE" ? 2 : 0),
          receita_adsense_gerada: 0
        }));
        setCondominos(mapped);
        if (mapped.length > 0 && !selectedCreatorId) {
          setSelectedCreatorId(mapped[0].id);
        }
      } else if (res.status === 401 || res.status === 403) {
        setCondominos([]);
      }
    } catch (err) {
      console.error("Erro ao carregar condôminos da API:", err);
    }
  };

  const fetchFechamentos = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setFechamentos([]);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/api/admin/fechamentos`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setFechamentos(data);
      }
    } catch (err) {
      console.error("Erro ao carregar fechamentos da API:", err);
    }
  };

  const fetchTransacoes = async (mes?: string) => {
    try {
      setFinanceiroLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setTransacoes([]);
        return;
      }
      const targetMes = mes !== undefined ? mes : filtroMes;
      const url = `${API_BASE_URL}/api/admin/financeiro${targetMes ? `?mes=${targetMes}` : ""}`;
      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setTransacoes(data);
        setPaginaAtualTransacoes(1);
      }
    } catch (err) {
      console.error("Erro ao carregar transações:", err);
    } finally {
      setFinanceiroLoading(false);
    }
  };

  const handleLaunchTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaTransacaoDescricao.trim() || !novaTransacaoValor) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    try {
      setNovaTransacaoLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/admin/financeiro`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          tipo: novaTransacaoTipo,
          descricao: novaTransacaoDescricao,
          valor: parseFloat(novaTransacaoValor),
          categoria: novaTransacaoCategoria,
          status: novaTransacaoStatus,
          data_transacao: novaTransacaoData
        })
      });

      if (res.ok) {
        setNovaTransacaoDescricao("");
        setNovaTransacaoValor("");
        alert("Transação lançada com sucesso!");
        await fetchTransacoes();
      } else {
        const errData = await res.json();
        alert(`Erro ao lançar transação: ${errData.detail || "Erro desconhecido"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar ao servidor para lançar transação.");
    } finally {
      setNovaTransacaoLoading(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta transação?")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/admin/financeiro/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.ok) {
        alert("Transação excluída com sucesso!");
        await fetchTransacoes();
      } else {
        alert("Erro ao excluir transação.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTransactionStatus = async (id: string, currentStatus: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const newStatus = currentStatus === "PAGO" ? "PENDENTE_APROVACAO" : "PAGO";
      const res = await fetch(`${API_BASE_URL}/api/admin/financeiro/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        await fetchTransacoes(filtroMes);
      } else {
        alert("Erro ao alterar status da transação.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAprovarTransaction = async (id: string, categoria?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const bodyData: any = { status: "PAGO" };
      if (categoria) bodyData.categoria = categoria;

      const res = await fetch(`${API_BASE_URL}/api/admin/financeiro/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(bodyData)
      });

      if (res.ok) {
        await fetchTransacoes(filtroMes);
      } else {
        alert("Erro ao aprovar transação.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejeitarTransaction = async (id: string) => {
    if (!confirm("Deseja realmente rejeitar esta movimentação? ela não será contabilizada no caixa.")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/admin/financeiro/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: "REJEITADO" })
      });

      if (res.ok) {
        await fetchTransacoes(filtroMes);
      } else {
        alert("Erro ao rejeitar transação.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTransactionCategory = async (id: string, newCategory: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/admin/financeiro/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ categoria: newCategory })
      });

      if (res.ok) {
        await fetchTransacoes(filtroMes);
      } else {
        alert("Erro ao alterar categoria da transação.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [syncingAsaas, setSyncingAsaas] = useState(false);

  const handleSincronizarAsaas = async () => {
    try {
      setSyncingAsaas(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/admin/financeiro/sincronizar-asaas`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message || "Extrato Asaas sincronizado!");
        await fetchTransacoes(filtroMes);
      } else {
        alert(data.message || data.detail || "Erro ao sincronizar extrato Asaas.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com a API de sincronização.");
    } finally {
      setSyncingAsaas(false);
    }
  };

  const fetchCategorias = async () => {
    try {
      setCategoriasLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/admin/financeiro/categorias`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCategorias(data);
      }
    } catch (err) {
      console.error("Erro ao carregar categorias:", err);
    } finally {
      setCategoriasLoading(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaCategoriaNome.trim()) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/admin/financeiro/categorias`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          nome: novaCategoriaNome,
          tipo: novaCategoriaTipo
        })
      });

      if (res.ok) {
        setNovaCategoriaNome("");
        alert("Categoria criada com sucesso!");
        await fetchCategorias();
      } else {
        const errData = await res.json();
        alert(`Erro: ${errData.detail || "Erro ao criar categoria"}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta categoria?")) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/admin/financeiro/categorias/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.ok) {
        alert("Categoria excluída!");
        await fetchCategorias();
      } else {
        alert("Erro ao excluir categoria.");
      }
    } catch (err) {
      console.error(err);
    }
  };



  const determineUserRoleAndCreator = async (user: User) => {
    console.log("[Egrégora Debug] determineUserRoleAndCreator chamado com usuário:", user.email, "metadata:", user.user_metadata);
    const adminEmails = [
      "admin@portal.cosmoalmatv.com.br",
      "alexandre.p@portal.cosmoalmatv.com.br",
      "marcos.caram@portal.cosmoalmatv.com.br",
      "carlos.falcon@portal.cosmoalmatv.com.br"
    ];
    const isAdmin = adminEmails.includes(user.email || "") || 
                    user.user_metadata?.role === "admin";
    
    console.log("[Egrégora Debug] isAdmin:", isAdmin, "hasLoggedAccess.current:", hasLoggedAccess.current);

    if (isAdmin) {
      setUserRole("admin");
      
      let initialTab: "onboarding" | "admin" | "creator" = "admin";
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get("tab");
        if (tab === "admin" || tab === "creator" || tab === "onboarding") {
          initialTab = tab as any;
        }
      }
      setActiveTab(initialTab);
      
      const adminId = user.email || "admin";
      if (hasLoggedAccess.current !== adminId) {
        console.log("[Egrégora Debug] Chamando addLog para admin:", adminId);
        hasLoggedAccess.current = adminId;
        addLog("SISTEMA", `Acesso detectado - Administrador: ${user.email} | Data/Hora: ${new Date().toLocaleString('pt-BR')}`);
      } else {
        console.log("[Egrégora Debug] Acesso já registrado anteriormente para admin:", adminId);
      }
    } else {
      setUserRole("creator");
      setActiveTab("creator");
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const headers: HeadersInit = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        console.log("[Egrégora Debug] Buscando condôminos da API...");
        const res = await fetch(`${API_BASE_URL}/api/condominos`, { headers });
        if (res.ok) {
          const data = await res.json();
          console.log("[Egrégora Debug] Total condôminos retornados:", data.length);
          const match = data.find((c: any) => c.email.toLowerCase() === user.email?.toLowerCase());
          if (match) {
            console.log("[Egrégora Debug] Condômino correspondente encontrado:", match.nome_comercial);
            setSelectedCreatorId(match.id);
            setAssociatedCreator({
              id: match.id,
              nome_comercial: match.nome_comercial,
              razao_social: match.razao_social,
              cnpj_cpf: match.cnpj_cpf,
              email: match.email,
              status_operacional: match.status,
              youtube_channel_id: match.youtube_id || "",
              asaas_customer_id: match.asaas_id || "",
              zapsign_doc_id: match.zapsign_doc_id || "",
              zapsign_sign_url: match.zapsign_sign_url || "",
              chave_pix: match.chave_pix || "",
              data_onboarding: match.data_onboarding,
              videos_entregues_esta_semana: typeof match.videos_entregues_esta_semana === "number" ? match.videos_entregues_esta_semana : (match.status === "ATIVO_ADIMPLENTE" ? 2 : 0),
              receita_adsense_gerada: 0
            });

            if (hasLoggedAccess.current !== match.email) {
              console.log("[Egrégora Debug] Chamando addLog para criador:", match.email);
              hasLoggedAccess.current = match.email;
              addLog("SISTEMA", `Acesso detectado - Criador: ${match.nome_comercial} (${match.email}) | Data/Hora: ${new Date().toLocaleString('pt-BR')}`);
            } else {
              console.log("[Egrégora Debug] Acesso já registrado anteriormente para criador:", match.email);
            }
          } else {
            console.log("[Egrégora Debug] Nenhum condômino correspondente para o e-mail:", user.email);
          }
        } else {
          console.log("[Egrégora Debug] Falha ao buscar condôminos da API:", res.status);
        }
      } catch (err) {
        console.error("Erro ao carregar criador associado:", err);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setUserRole(null);
    setAssociatedCreator(null);
    setActiveTab("onboarding");
    hasLoggedAccess.current = null;
    if (typeof window !== "undefined") {
      sessionStorage.clear();
    }
  };

  useEffect(() => {
    setMounted(true);
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUser(session.user);
        await determineUserRoleAndCreator(session.user);
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setAssociatedCreator(null);
        setActiveTab("onboarding");
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        await determineUserRoleAndCreator(session.user);
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setAssociatedCreator(null);
        setActiveTab("onboarding");
      }
    });

    fetchCondominos();
    fetchFechamentos();
    fetchTransacoes();
    fetchCategorias();
    fetchConfigs();
    fetchYoutubeStats();
    fetchSystemLogs();


    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const saveState = (updatedCondominos: Condomino[], updatedLogs: LogEntry[]) => {
    setCondominos(updatedCondominos);
    setLogs(updatedLogs);
    localStorage.setItem("egregora_logs", JSON.stringify(updatedLogs));
  };

  const fetchSystemLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("system_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Erro ao carregar logs do banco:", error);
        return;
      }

      if (data) {
        const formattedLogs: LogEntry[] = data.map((log: any) => ({
          id: log.id,
          timestamp: new Date(log.timestamp).toLocaleTimeString("pt-BR"),
          tipo: log.tipo as LogEntry["tipo"],
          mensagem: log.mensagem
        }));
        setLogs(formattedLogs);
      }
    } catch (err) {
      console.error("Erro no fetchSystemLogs:", err);
    }
  };

  const addLog = async (tipo: LogEntry["tipo"], mensagem: string, _currentCondominos?: any) => {
    console.log("[Egrégora Debug] addLog chamado. Tipo:", tipo, "Mensagem:", mensagem);
    const newLog: LogEntry = {
      id: "log-" + Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      tipo,
      mensagem
    };
    
    setLogs(prev => {
      const isDuplicate = prev.length > 0 && prev[0].mensagem === mensagem;
      if (isDuplicate) return prev;
      return [newLog, ...prev].slice(0, 50);
    });

    try {
      const { error } = await supabase
        .from("system_logs")
        .insert({ tipo, mensagem });
      if (error) {
        console.error("Erro ao inserir log no banco:", error);
      } else {
        await fetchSystemLogs();
      }
    } catch (err) {
      console.error("Erro ao salvar log no banco:", err);
    }
  };

  const handleSavePlaylistId = async (id: string, playlistId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";

      const res = await fetch(`${API_BASE_URL}/api/condominos/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ youtube_id: playlistId })
      });

      if (!res.ok) {
        const errData = await res.json();
        alert(`Erro ao salvar Playlist ID: ${errData.detail || "Erro desconhecido"}`);
        return;
      }

      addLog("SISTEMA", `ID da Playlist de YouTube atualizada com sucesso para o condômino.`);
      await fetchCondominos();
    } catch (err: any) {
      console.error(err);
      alert(`Erro de conexão ao salvar Playlist ID: ${err.message}`);
    }
  };

  // State Machine Trigger - Asaas Webhooks
  const triggerAsaasWebhook = async (condominoId: string, eventType: "PAYMENT_RECEIVED" | "PAYMENT_OVERDUE") => {
    const target = condominos.find(c => c.id === condominoId);
    if (!target) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/webhooks/asaas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: eventType,
          payment: {
            customer: target.asaas_customer_id
          }
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        alert(`Erro ao simular webhook: ${errData.detail || "Erro desconhecido"}`);
        return;
      }

      const logMsg = eventType === "PAYMENT_RECEIVED"
        ? `Asaas Webhook: Recebido pagamento cota de R$ 100,00 para ${target.nome_comercial}. Status: ATIVO_ADIMPLENTE.`
        : `Asaas Webhook: Fatura atrasada há mais de 10 dias para ${target.nome_comercial}. Status: SUSPENSO_INADIMPLENCIA (Cláusula 11ª).`;

      addLog("ASAAS", logMsg);
      await fetchCondominos();
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com o webhook do backend.");
    }
  };

  const handleDeleteCondomino = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir o condômino "${name}"?`)) return;

    if (id.startsWith("cond-")) {
      setCondominos(prev => prev.filter(c => c.id !== id));
      addLog("SISTEMA", `Condômino fictício ${name} removido da visualização local.`);
      if (selectedCreatorId === id) {
        setSelectedCreatorId("");
      }
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";

      const res = await fetch(`${API_BASE_URL}/api/condominos/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errData = await res.json();
        alert(`Erro ao excluir: ${errData.detail || "Erro desconhecido"}`);
        return;
      }

      addLog("SISTEMA", `Condômino ${name} excluído do banco de dados.`);
      await fetchCondominos();
      
      if (selectedCreatorId === id) {
        setSelectedCreatorId("");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar ao backend para excluir o registro.");
    }
  };

  // State Machine Trigger - YouTube audit
  const triggerYoutubeAudit = () => {
    const updated = condominos.map(c => {
      if (c.status_operacional === "ATIVO_ADIMPLENTE") {
        if (c.videos_entregues_esta_semana < 1) {
          return { ...c, status_operacional: "BLOQUEADO_ASSIDUIDADE" as const };
        }
      }
      return c;
    });

    // Check who failed
    const failures = condominos.filter(c => c.status_operacional === "ATIVO_ADIMPLENTE" && c.videos_entregues_esta_semana < 1);
    const failureNames = failures.map(f => f.nome_comercial).join(", ");

    const msg = failures.length > 0
      ? `YouTube Cron: Auditoria concluída. Quebra de ritmo detectada nos canais: [${failureNames}]. Status alterado para BLOQUEADO_ASSIDUIDADE.`
      : `YouTube Cron: Auditoria concluída. Todos os condôminos adimplentes cumpriram a meta de uploads.`;

    addLog("YOUTUBE", msg, updated);
  };

  const formatCnpjCpf = (value: string, type: "CPF" | "CNPJ") => {
    const digits = value.replace(/\D/g, "");
    if (type === "CPF") {
      let formatted = digits.slice(0, 11);
      if (formatted.length > 9) {
        formatted = `${formatted.slice(0, 3)}.${formatted.slice(3, 6)}.${formatted.slice(6, 9)}-${formatted.slice(9)}`;
      } else if (formatted.length > 6) {
        formatted = `${formatted.slice(0, 3)}.${formatted.slice(3, 6)}.${formatted.slice(6)}`;
      } else if (formatted.length > 3) {
        formatted = `${formatted.slice(0, 3)}.${formatted.slice(3)}`;
      }
      return formatted;
    } else {
      let formatted = digits.slice(0, 14);
      if (formatted.length > 12) {
        formatted = `${formatted.slice(0, 2)}.${formatted.slice(2, 5)}.${formatted.slice(5, 8)}/${formatted.slice(8, 12)}-${formatted.slice(12)}`;
      } else if (formatted.length > 8) {
        formatted = `${formatted.slice(0, 2)}.${formatted.slice(2, 5)}.${formatted.slice(5, 8)}/${formatted.slice(8)}`;
      } else if (formatted.length > 5) {
        formatted = `${formatted.slice(0, 2)}.${formatted.slice(2, 5)}.${formatted.slice(5)}`;
      } else if (formatted.length > 2) {
        formatted = `${formatted.slice(0, 2)}.${formatted.slice(2)}`;
      }
      return formatted;
    }
  };

  const formatCEP = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length > 5) {
      return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    }
    return digits;
  };

  const formatTelefone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length > 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    } else if (digits.length > 6) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    } else if (digits.length > 2) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    return digits;
  };

  const handleCEPLookup = async (cepValue: string) => {
    const digits = cepValue.replace(/\D/g, "");
    if (digits.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        if (response.ok) {
          const cepData = await response.json();
          if (!cepData.erro) {
            setFormData(prev => ({
              ...prev,
              endereco: cepData.logradouro ? `${cepData.logradouro}${cepData.bairro ? ', ' + cepData.bairro : ''}` : prev.endereco,
              cidade: cepData.localidade || prev.cidade,
              uf: cepData.uf || prev.uf
            }));
          }
        }
      } catch (err) {
        console.error("Erro ao buscar CEP:", err);
      }
    }
  };

  // Digital Signature simulator
  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: { email?: string; cnpj_cpf?: string; telefone?: string } = {};

    // Validate email format
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Formato de e-mail inválido (ex: exemplo@dominio.com).";
    }

    // Validate telefone
    const cleanPhone = (formData.telefone || "").replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      errors.telefone = "Número de Celular/WhatsApp inválido. Deve conter DDD + número.";
    }

    // Validate CPF / CNPJ
    const cleanDoc = (formData.cnpj_cpf || "").replace(/\D/g, "");
    if (cleanDoc.length === 11) {
      if (!isValidCpf(cleanDoc)) {
        errors.cnpj_cpf = "O CPF informado é inválido matematicamente. Verifique os dígitos.";
      }
    } else if (cleanDoc.length === 14) {
      if (!isValidCnpj(cleanDoc)) {
        errors.cnpj_cpf = "O CNPJ informado é inválido matematicamente. Verifique os dígitos.";
      }
    } else {
      errors.cnpj_cpf = "O documento deve ser um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      alert("Por favor, corrija os erros de validação destacados no formulário antes de continuar.");
      return;
    }

    if (!turnstileToken) {
      alert("Por favor, resolva a validação do Captcha antes de enviar.");
      return;
    }

    setFormErrors({});

    try {
      const res = await fetch(`${API_BASE_URL}/api/condominos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome_completo: formData.nome_completo || formData.nome_comercial,
          nome_comercial: formData.nome_comercial,
          razao_social: formData.razao_social || null,
          cnpj_cpf: formData.cnpj_cpf,
          email: formData.email,
          telefone: formData.telefone,
          youtube_id: formData.youtube_channel_id,
          chave_pix: formData.chave_pix,
          genero: formData.genero,
          estado_civil: formData.estado_civil,
          cep: formData.cep,
          endereco: `${formData.endereco}${formData.numero ? ', n° ' + formData.numero : ''}${formData.complemento ? ' - ' + formData.complemento : ''}`,
          cidade: formData.cidade,
          uf: formData.uf,
          pais: formData.pais,
          turnstileToken
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        alert(`Erro no onboarding: ${errData.detail || "Erro desconhecido"}`);
        return;
      }

      const created = await res.json();

      const contractText = `
CONTRATO DE PARTICIPAÇÃO NA COSMO ALMA TV
FORMATO DE CONDOMÍNIO AUDIOVISUAL — VERSÃO REVISADA V3
------------------------------------------------------------------
CONDOMÍNIO: COSMO ALMA TV
CONDÔMINO: ${created.razao_social || created.nome_completo}
NOME COMERCIAL: ${created.nome_comercial}
CPF/CNPJ: ${created.cnpj_cpf}
E-MAIL: ${created.email}
CHAVE PIX: ${created.chave_pix}
PLAYLIST ID/YOUTUBE ID: ${created.youtube_id || "Não definido"}

CLÁUSULA 2ª - ESTRUTURA DE RECEITAS E RETENÇÃO ADMINISTRATIVA
- Retenção Compulsória de 30% para a Administração (Taxa de Gestão e Operação).
- Fundo de Partilha Mútua de 70% dividido em partes iguais entre condôminos ativos e assíduos.
- Taxas condominiais de R$ 100,00, infoprodutos e agenciamento constituem receitas exclusivas da administração.

CLÁUSULA 9ª - A TAXA DE CONDOMÍNIO FIXA
O CONDÔMINO compromete-se ao repasse mensal de cota fixa de R$ 100,00 (cem reais) com vencimento impreterivelmente até o dia 10 de cada mês.

CLÁUSULA 10ª - A ASSIDUIDADE DE CONTEÚDO
O CONDÔMINO compromete-se a cumprir o cronograma enviando de 1 (um) a 3 (três) vídeos por semana. O direito ao rateio do Fundo de Partilha (70%) fica condicionado a este envio.

CLÁUSULA 11ª - GATILHO DE SUSPENSÃO POR INADIMPLÊNCIA
O atraso superior a 10 (dez) dias corridos na taxa de condomínio implicará na suspensão imediata dos serviços de edição, bloqueio de postagens e retenção de quaisquer repasses.

CLÁUSULA 12ª - PROPRIEDADE INTELECTUAL E BLINDAGEM DO ACERVO
Todo conteúdo audiovisual publicado no canal da Cosmo Alma TV deverá permanecer no acervo ativo do projeto pelo prazo mínimo e ininterrupto de 2 (dois) anos, persistindo inclusive após término ou rescisão.

CLÁUSULA 13ª - CARÊNCIA E FIDELIDADE
O contrato tem vigência de 6 (seis) meses, com carência e fidelidade obrigatória de 6 (seis) meses para o pagamento da taxa condominial.

ASSINADO ELETRONICAMENTE POR AMBAS AS PARTES.
IP: 189.120.45.191 - Timestamp: ${new Date().toLocaleString()}
      `;

      setGeneratedContractText(contractText);
      setFormData(prev => ({ 
        ...prev, 
        currentCreatedId: created.id,
        zapsign_sign_url: created.zapsign_sign_url || "",
        zapsign_doc_id: created.zapsign_doc_id || ""
      }));
      setSigningContract(true);
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar à API do backend.");
    }
  };

  const confirmSignature = async () => {
    const createdId = formData.currentCreatedId;
    if (!createdId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/condominos/${createdId}/assinar`, {
        method: "POST"
      });

      if (!res.ok) {
        const errData = await res.json();
        alert(`Erro ao assinar contrato: ${errData.detail || "Erro desconhecido"}`);
        return;
      }

      const signed = await res.json();

      const updatedLogs = [
        {
          id: "log-" + Date.now(),
          timestamp: new Date().toLocaleTimeString(),
          tipo: "CONTRATO" as const,
          mensagem: `Contrato V3 assinado digitalmente por ${signed.nome_comercial}. Minuta DOCX gerada.`
        },
        {
          id: "log-asaas-" + Date.now(),
          timestamp: new Date().toLocaleTimeString(),
          tipo: "ASAAS" as const,
          mensagem: `Assinatura de R$ 100,00 gerada no Asaas para ${signed.nome_comercial} (ID: ${signed.asaas_id}).`
        },
        ...logs
      ];
      setLogs(updatedLogs);
      localStorage.setItem("egregora_logs", JSON.stringify(updatedLogs));

      await fetchCondominos();
      setSigningContract(false);
      setIsOnboardingCompleted(true);
      setSelectedCreatorId(signed.id);
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar ao backend para assinar o contrato.");
    }
  };

  const resetDB = async () => {
    if (confirm("Deseja realmente reiniciar o banco de dados simulado?")) {
      localStorage.removeItem("egregora_condominos");
      localStorage.removeItem("egregora_logs");
      try {
        await supabase.from("system_logs").delete().neq("tipo", "INEXISTENTE");
        setCondominos(DEFAULT_CONDOMINOS);
        addLog("SISTEMA", "Banco de dados restaurado aos padrões do PRD.");
        alert("Banco restaurado!");
      } catch (err) {
        console.error("Erro ao resetar logs:", err);
      }
    }
  };

  const handleRunClosing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";
      const res = await fetch(`${API_BASE_URL}/api/admin/fechamento`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          mes_referencia: closingMonth,
          receita_bruta_adsense: parseFloat(closingAdsense)
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        alert(`Erro no fechamento: ${errData.detail || "Erro desconhecido"}`);
        return;
      }

      const result = await res.json();
      const newLogMsg = `Fechamento ${result.mes_referencia}: Bruto R$ ${result.receita_bruta_adsense.toFixed(2)}, Retido 30% R$ ${result.retencao_adm_30.toFixed(2)}, Fundo 70% R$ ${result.fundo_partilha_70.toFixed(2)}. Cota/Condômino: R$ ${result.valor_por_condomino.toFixed(2)} (${result.qtd_condominos_ativos} elegíveis).`;
      
      const newLog = {
        id: "log-closing-" + Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        tipo: "SISTEMA" as const,
        mensagem: newLogMsg
      };

      setLogs(prev => [newLog, ...prev]);
      localStorage.setItem("egregora_logs", JSON.stringify([newLog, ...logs]));

      await fetchFechamentos();
      await fetchCondominos();
    } catch (err) {
      console.error(err);
      alert("Erro ao executar fechamento financeiro.");
    }
  };

  // Financial Split calculation (70/30) based on the latest closed month or manual simulation state
  const latestFechamento = fechamentos.length > 0 ? fechamentos[0] : null;
  
  // Real adsense should start at 0 if no fechamento is done yet
  const totalAdsense = latestFechamento ? latestFechamento.receita_bruta_adsense : 0;
  const retencao30 = latestFechamento ? latestFechamento.retencao_adm_30 : totalAdsense * 0.30;
  const fundoPartilha70 = latestFechamento ? latestFechamento.fundo_partilha_70 : totalAdsense * 0.70;

  // Active / Paid condôminos who are allowed to participate in the split
  const splitEligibleCondominos = condominos.filter(c => c.status_operacional === "ATIVO_ADIMPLENTE");
  const countEligible = latestFechamento ? latestFechamento.qtd_condominos_ativos : splitEligibleCondominos.length;
  const valuePerEligible = latestFechamento ? latestFechamento.valor_por_condomino : (countEligible > 0 ? fundoPartilha70 / countEligible : 0);

  // Dynamic Chart points from real fechamentos data
  const chartFechamentos = [...fechamentos].reverse().slice(-6);
  const maxAdsenseVal = Math.max(...fechamentos.map(f => f.receita_bruta_adsense), 1000);
  
  const getChartPoints = () => {
    if (chartFechamentos.length === 0) {
      return {
        pathD: "M 20 130 L 380 130",
        fillD: "M 20 130 L 380 130 L 380 150 L 20 150 Z",
        points: []
      };
    }
    if (chartFechamentos.length === 1) {
      const y = 130 - (chartFechamentos[0].receita_bruta_adsense / maxAdsenseVal) * 100;
      return {
        pathD: `M 20 ${y} L 380 ${y}`,
        fillD: `M 20 ${y} L 380 ${y} L 380 150 L 20 150 Z`,
        points: [
          { x: 20, y, val: chartFechamentos[0].receita_bruta_adsense },
          { x: 380, y, val: chartFechamentos[0].receita_bruta_adsense }
        ]
      };
    }
    const pts = chartFechamentos.map((f, i) => {
      const x = 20 + i * (360 / (chartFechamentos.length - 1));
      const y = 130 - (f.receita_bruta_adsense / maxAdsenseVal) * 100;
      return { x, y, val: f.receita_bruta_adsense, label: f.mes_referencia };
    });
    
    let pathD = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      pathD += ` L ${pts[i].x} ${pts[i].y}`;
    }
    const fillD = `${pathD} L ${pts[pts.length - 1].x} 150 L ${pts[0].x} 150 Z`;
    return { pathD, fillD, points: pts };
  };

  const chartData = getChartPoints();

  return (
    <div className={`min-h-screen bg-[#111622] nebula-gradient flex font-sans ${currentUser ? 'flex-col md:flex-row' : 'flex-col'}`}>
      {/* Conditionally render: sidebar for logged-in, or top header for guest */}
      {!currentUser ? (
        <header className="border-b border-[#E2B042]/20 py-4 px-6 md:px-12 flex flex-col md:flex-row justify-between items-center bg-[#1A1D29]/75 backdrop-blur-md sticky top-0 z-50 w-full">
          <div className="flex items-center gap-3 mb-4 md:mb-0">
            <img
              src="/logo.png"
              alt="Cosmo Alma TV Logo"
              className="h-10 w-10 object-contain rounded-full border border-[#E2B042]/30 p-0.5 bg-[#111622] mystic-glow"
            />
            <div>
              <h1 className="text-xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-[#E2B042] to-purple-400 font-[family-name:var(--font-josefin-sans)]">
                COSMO ALMA TV
              </h1>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#E2B042]">Portal Egrégora CMS</p>
            </div>
          </div>
          <nav className="flex gap-2 items-center">
            {mounted && (
              <>
                <button
                  onClick={() => { setActiveTab("onboarding"); setIsOnboardingCompleted(false); }}
                  className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wider transition-all duration-300 cursor-pointer ${
                    activeTab === "onboarding"
                      ? "bg-[#E2B042] text-black shadow-[0_0_15px_rgba(226,176,66,0.4)]"
                      : "bg-[#1A1D29] text-gray-300 hover:text-white border border-[#E2B042]/20"
                  }`}
                >
                  🌌 ONBOARDING PÚBLICO
                </button>
                <button
                  onClick={() => router.push("/login")}
                  className="px-4 py-2 rounded-full text-xs font-semibold tracking-wider bg-[#1A1D29] text-[#E2B042] hover:text-white border border-[#E2B042]/40 hover:bg-[#E2B042]/10 transition-all cursor-pointer font-bold"
                >
                  🔑 ENTRAR
                </button>
              </>
            )}
          </nav>
        </header>
      ) : (
        <>
          {/* Mobile Top Bar */}
          <header className="md:hidden border-b border-[#E2B042]/20 py-3 px-4 flex justify-between items-center bg-[#1A1D29]/90 sticky top-0 z-50 w-full shrink-0">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Logo" className="h-8 w-8 object-contain rounded-full border border-[#E2B042]/30 p-0.5 bg-[#111622]" />
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
                  src="/logo.png"
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
                {userRole === "admin" && (
                  <button
                    onClick={() => { setActiveTab("onboarding"); setIsOnboardingCompleted(false); setIsMobileMenuOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                      activeTab === "onboarding"
                        ? "bg-[#E2B042] text-black shadow-[0_0_15px_rgba(226,176,66,0.3)]"
                        : "text-gray-300 hover:bg-[#111622] hover:text-white border border-transparent hover:border-[#E2B042]/10"
                    }`}
                  >
                    <span>🌌</span> ONBOARDING PÚBLICO
                  </button>
                )}

                {/* Admin tab */}
                {userRole === "admin" && (
                  <button
                    onClick={() => { setActiveTab("admin"); setIsMobileMenuOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                      activeTab === "admin"
                        ? "bg-[#E2B042] text-black shadow-[0_0_15px_rgba(226,176,66,0.3)]"
                        : "text-gray-300 hover:bg-[#111622] hover:text-white border border-transparent hover:border-[#E2B042]/10"
                    }`}
                  >
                    <span>📊</span> PAINEL GESTÃO (ADMIN)
                  </button>
                )}
                {/* Financeiro tab */}
                {userRole === "admin" && (
                  <button
                    onClick={() => { setActiveTab("financeiro"); setIsMobileMenuOpen(false); fetchTransacoes(); }}
                    className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                      activeTab === "financeiro"
                        ? "bg-[#E2B042] text-black shadow-[0_0_15px_rgba(226,176,66,0.3)]"
                        : "text-gray-300 hover:bg-[#111622] hover:text-white border border-transparent hover:border-[#E2B042]/10"
                    }`}
                  >
                    <span>💰</span> CONTROLE FINANCEIRO
                  </button>
                )}


                {/* Creator tab */}
                {(userRole === "admin" || userRole === "creator") && (
                  <button
                    onClick={() => {
                      setActiveTab("creator");
                      setIsMobileMenuOpen(false);
                      if (userRole === "creator" && associatedCreator) {
                        setSelectedCreatorId(associatedCreator.id);
                      } else if (!selectedCreatorId && condominos.length > 0) {
                        setSelectedCreatorId(condominos[0].id);
                      }
                    }}
                    className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                      activeTab === "creator"
                        ? "bg-[#E2B042] text-black shadow-[0_0_15px_rgba(226,176,66,0.3)]"
                        : "text-gray-300 hover:bg-[#111622] hover:text-white border border-transparent hover:border-[#E2B042]/10"
                    }`}
                  >
                    <span>🧘</span> ÁREA DO CRIADOR
                  </button>
                )}

                {/* Otimizador tab */}
                {userRole === "admin" && (
                  <button
                    onClick={() => { router.push('/otimizador-youtube'); setIsMobileMenuOpen(false); }}
                    className="w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer text-gray-300 hover:bg-[#111622] hover:text-white border border-transparent hover:border-purple-500/20"
                  >
                    <span>✂️</span> OTIMIZADOR YOUTUBE
                  </button>
                )}
              </nav>
            </div>

            {/* User Info / Log out at bottom */}
            <div className="p-4 border-t border-gray-800 bg-[#111622]/40">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] text-gray-400 font-mono truncate" title={currentUser.email}>
                  👤 {currentUser.email}
                </span>
                <span className="text-[9px] text-[#E2B042] font-semibold uppercase tracking-wider">
                  Função: {userRole === "admin" ? "Administrador" : "Criador"}
                </span>
                <button
                  onClick={handleLogout}
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
        </>
      )}

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col ${currentUser ? 'md:h-screen md:overflow-y-auto' : ''}`}>
        <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full">
        
        {/* Tab 1: Onboarding Form */}
        {mounted && (activeTab === "onboarding" || !currentUser) && (
          <div className="max-w-2xl mx-auto bg-[#1A1D29] border border-[#E2B042]/20 p-8 rounded-2xl mystic-glow relative overflow-hidden">
            <div className="absolute top-0 right-0 h-40 w-40 bg-purple-500/10 rounded-full blur-3xl"></div>
            
            {isOnboardingCompleted ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">✨</div>
                <h3 className="text-2xl font-semibold text-[#E2B042] mb-2 font-[family-name:var(--font-josefin-sans)]">Bem-vindo à Egrégora!</h3>
                 <p className="text-sm text-gray-300 mb-4">
                  Seu cadastro foi recebido com sucesso e o contrato V3 foi assinado digitalmente.
                  Uma assinatura de cota fixa mensal de R$ 100,00 foi criada no Asaas.
                </p>
                
                <div className="bg-[#111622] border border-purple-500/30 p-5 rounded-xl mb-6 text-left space-y-3">
                  <h4 className="text-[#E2B042] text-xs font-bold uppercase tracking-wider">Próximo Passo para Acessar seu Painel:</h4>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Para acessar seu painel de controle e acompanhar seu faturamento, você precisará efetuar login no sistema usando o e-mail cadastrado (<strong>{formData.email}</strong>).
                  </p>
                  <div className="pt-1 flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={async () => {
                        const condominoEmail = formData.email;
                        if (!condominoEmail) {
                          alert("E-mail não informado.");
                          return;
                        }
                        try {
                          const { error } = await supabase.auth.signInWithOtp({
                            email: condominoEmail,
                            options: {
                              emailRedirectTo: `${window.location.origin}/`,
                            },
                          });
                          if (error) throw error;
                          alert(`Link de acesso mágico enviado para ${condominoEmail}! Verifique sua caixa de entrada.`);
                        } catch (err: any) {
                          alert(`Erro ao enviar link de acesso: ${err.message}`);
                        }
                      }}
                      className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      📧 Receber Link de Acesso por E-mail
                    </button>
                    <a
                      href="/login"
                      className="px-4 py-2.5 border border-gray-700 hover:bg-[#1A1D29] text-gray-300 rounded-lg text-xs font-bold text-center transition-all flex items-center justify-center"
                    >
                      Ir para Login
                    </a>
                  </div>
                </div>

                <div className="mb-6">
                  <a
                    href={`${API_BASE_URL}/api/condominos/${selectedCreatorId}/contrato`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 border border-[#E2B042]/40 rounded-lg text-xs font-semibold text-[#E2B042] hover:bg-[#E2B042]/10 transition-all cursor-pointer"
                  >
                    📥 Baixar Contrato DOCX Assinado
                  </a>
                </div>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => {
                      if (!currentUser) {
                        alert("Por favor, faça login com o link de acesso enviado para seu e-mail para visualizar seu painel.");
                        router.push("/login");
                      } else {
                        setActiveTab("creator");
                      }
                    }}
                    className="px-6 py-2.5 bg-[#E2B042] hover:bg-[#D69E2E] text-black font-semibold rounded-lg text-sm transition-all cursor-pointer"
                  >
                    Acessar Painel do Criador
                  </button>
                  <button
                    onClick={() => setIsOnboardingCompleted(false)}
                    className="px-6 py-2.5 border border-gray-600 rounded-lg text-sm hover:bg-[#111622] transition-all cursor-pointer"
                  >
                    Nova Inscrição
                  </button>
                </div>
              </div>
            ) : signingContract ? (
              <div>
                <h3 className="text-lg font-semibold text-[#E2B042] mb-4">Assinatura do Contrato V3 no Assinafy</h3>
                <p className="text-xs text-gray-300 mb-4">
                  O contrato oficial da Cosmo Alma TV foi compilado com seus dados e gerado no **Assinafy**. 
                  Clique no botão abaixo para abrir a tela de assinatura e assinar digitalmente.
                </p>
                <div className="mb-6 text-center">
                  <a
                    href={formData.zapsign_sign_url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#E2B042] hover:bg-[#D69E2E] text-black font-bold rounded-lg text-xs tracking-wider uppercase shadow-[0_0_15px_rgba(226,176,66,0.3)] transition-all cursor-pointer"
                  >
                    🖊️ Abrir Contrato no Assinafy
                  </a>
                </div>
                <div className="border-t border-gray-800 pt-4 mt-4 flex justify-between items-center">
                  <span className="text-[10px] text-gray-500 font-mono">
                    ID Assinafy: {formData.zapsign_doc_id || "Carregando..."}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSigningContract(false)}
                      className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white"
                    >
                      Corrigir Cadastro
                    </button>
                    <button
                      onClick={confirmSignature}
                      className="px-4 py-2 border border-purple-500/40 hover:bg-purple-950/20 text-purple-300 font-bold rounded-lg text-xs tracking-wider uppercase transition-all"
                    >
                      Simular Webhook de Assinatura Concluída
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleOnboardingSubmit} className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-[#E2B042] to-purple-400 font-[family-name:var(--font-josefin-sans)]">
                    Inscrição e Onboarding Cósmico
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">Preencha seus dados para geração e assinatura do Contrato V3</p>
                </div>

                <div className="bg-[#1A1D29]/60 border border-purple-900/30 p-5 rounded-xl text-xs text-gray-300 leading-relaxed mb-6">
                  <h3 className="text-[#E2B042] font-semibold text-sm mb-2 flex items-center gap-1.5">
                    ✨ Bem-vindo ao portal da Egrégora Cosmo Alma TV!
                  </h3>
                  <p className="mb-3">
                    Estamos felizes em ter você como parceiro do nosso condomínio audiovisual. O processo de onboarding é simples, rápido e composto por 3 etapas principais:
                  </p>
                  <ul className="space-y-2 list-none pl-0">
                    <li className="flex items-start gap-2">
                      <span className="text-[#E2B042] font-bold">1. Cadastro:</span>
                      <span>Preencha o formulário abaixo com as informações do seu canal e dados para faturamento.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#E2B042] font-bold">2. Assinatura:</span>
                      <span>Assine o contrato de parceria digitalmente pelo **Assinafy** (o link será gerado imediatamente após o cadastro).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#E2B042] font-bold">3. Ativação:</span>
                      <span>Realize o primeiro pagamento da cota de condomínio via Pix ou boleto no painel do Asaas para liberar seu acesso à comunidade e repasses de AdSense.</span>
                    </li>
                  </ul>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Nome do Responsável</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Many Xavier"
                      value={formData.nome_completo}
                      onChange={e => setFormData({ ...formData, nome_completo: e.target.value })}
                      className="w-full bg-[#111622] border border-gray-800 rounded-lg p-2.5 text-sm focus:border-[#E2B042] focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Gênero</label>
                    <select
                      value={formData.genero}
                      onChange={e => setFormData({ ...formData, genero: e.target.value })}
                      className="w-full bg-[#111622] border border-gray-800 rounded-lg p-2.5 text-sm focus:border-[#E2B042] focus:outline-none text-white transition-colors"
                    >
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                      <option value="Não declarado">Não declarado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Estado Civil</label>
                    <select
                      value={formData.estado_civil}
                      onChange={e => setFormData({ ...formData, estado_civil: e.target.value })}
                      className="w-full bg-[#111622] border border-gray-800 rounded-lg p-2.5 text-sm focus:border-[#E2B042] focus:outline-none text-white transition-colors"
                    >
                      <option value="solteiro">Solteiro(a)</option>
                      <option value="casado">Casado(a)</option>
                      <option value="divorciado">Divorciado(a)</option>
                      <option value="viuvo">Viúvo(a)</option>
                      <option value="separado">Separado(a) Judicialmente</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Nome Fantasia / Canal</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Tarot Cósmico"
                      value={formData.nome_comercial}
                      onChange={e => setFormData({ ...formData, nome_comercial: e.target.value })}
                      className="w-full bg-[#111622] border border-gray-800 rounded-lg p-2.5 text-sm focus:border-[#E2B042] focus:outline-none transition-colors"
                    />
                    <p className="text-[9px] text-[#E2B042]/85 mt-1 font-medium leading-relaxed">
                      ⚠️ Atenção: Este nome será utilizado exatamente como o título da sua Playlist oficial dentro do canal principal da Cosmo Alma TV.
                    </p>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Razão Social (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ex: Tarot e Midia LTDA"
                      value={formData.razao_social}
                      onChange={e => setFormData({ ...formData, razao_social: e.target.value })}
                      className="w-full bg-[#111622] border border-gray-800 rounded-lg p-2.5 text-sm focus:border-[#E2B042] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] uppercase tracking-wider text-gray-400">CPF / CNPJ</label>
                      <div className="flex gap-2 text-[9px]">
                        <button
                          type="button"
                          onClick={() => { setDocType("CPF"); setFormData({ ...formData, cnpj_cpf: "" }); }}
                          className={`px-1.5 py-0.5 rounded cursor-pointer ${docType === "CPF" ? "bg-[#E2B042] text-black" : "bg-gray-800 text-gray-400"}`}
                        >
                          CPF
                        </button>
                        <button
                          type="button"
                          onClick={() => { setDocType("CNPJ"); setFormData({ ...formData, cnpj_cpf: "" }); }}
                          className={`px-1.5 py-0.5 rounded cursor-pointer ${docType === "CNPJ" ? "bg-[#E2B042] text-black" : "bg-gray-800 text-gray-400"}`}
                        >
                          CNPJ
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder={docType === "CPF" ? "000.000.000-00" : "00.000.000/0001-00"}
                      value={formData.cnpj_cpf}
                      onChange={e => {
                        setFormData({ ...formData, cnpj_cpf: formatCnpjCpf(e.target.value, docType) });
                        if (formErrors.cnpj_cpf) {
                          setFormErrors(prev => ({ ...prev, cnpj_cpf: undefined }));
                        }
                      }}
                      className={`w-full bg-[#111622] border rounded-lg p-2.5 text-sm focus:outline-none transition-colors ${
                        formErrors.cnpj_cpf ? "border-red-500 focus:border-red-500 text-red-200" : "border-gray-800 focus:border-[#E2B042]"
                      }`}
                    />
                    {formErrors.cnpj_cpf && (
                      <p className="text-red-500 text-[10px] mt-1 font-semibold">{formErrors.cnpj_cpf}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">E-mail de Contato</label>
                    <input
                      type="email"
                      required
                      placeholder="seuemail@exemplo.com"
                      value={formData.email}
                      onChange={e => {
                        setFormData({ ...formData, email: e.target.value });
                        if (formErrors.email) {
                          setFormErrors(prev => ({ ...prev, email: undefined }));
                        }
                      }}
                      className={`w-full bg-[#111622] border rounded-lg p-2.5 text-sm focus:outline-none transition-colors ${
                        formErrors.email ? "border-red-500 focus:border-red-500 text-red-200" : "border-gray-800 focus:border-[#E2B042]"
                      }`}
                    />
                    {formErrors.email && (
                      <p className="text-red-500 text-[10px] mt-1 font-semibold">{formErrors.email}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">WhatsApp / Celular</label>
                    <input
                      type="tel"
                      required
                      placeholder="(00) 00000-0000"
                      value={formData.telefone}
                      onChange={e => {
                        setFormData({ ...formData, telefone: formatTelefone(e.target.value) });
                        if (formErrors.telefone) {
                          setFormErrors(prev => ({ ...prev, telefone: undefined }));
                        }
                      }}
                      className={`w-full bg-[#111622] border rounded-lg p-2.5 text-sm focus:outline-none transition-colors ${
                        formErrors.telefone ? "border-red-500 focus:border-red-500 text-red-200" : "border-gray-800 focus:border-[#E2B042]"
                      }`}
                    />
                    {formErrors.telefone && (
                      <p className="text-red-500 text-[10px] mt-1 font-semibold">{formErrors.telefone}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">CEP</label>
                    <input
                      type="text"
                      required
                      placeholder="00000-000"
                      value={formData.cep}
                      onChange={e => {
                        const formatted = formatCEP(e.target.value);
                        setFormData({ ...formData, cep: formatted });
                        handleCEPLookup(e.target.value);
                      }}
                      className="w-full bg-[#111622] border border-gray-800 rounded-lg p-2.5 text-sm focus:border-[#E2B042] focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Logradouro / Bairro</label>
                    <input
                      type="text"
                      required
                      placeholder="Rua, Avenida, Bairro..."
                      value={formData.endereco}
                      onChange={e => setFormData({ ...formData, endereco: e.target.value })}
                      className="w-full bg-[#111622] border border-gray-800 rounded-lg p-2.5 text-sm focus:border-[#E2B042] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Número</label>
                    <input
                      type="text"
                      required
                      placeholder="N°"
                      value={formData.numero}
                      onChange={e => setFormData({ ...formData, numero: e.target.value })}
                      className="w-full bg-[#111622] border border-gray-800 rounded-lg p-2.5 text-sm focus:border-[#E2B042] focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Complemento (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Apto, Bloco, Casa..."
                      value={formData.complemento}
                      onChange={e => setFormData({ ...formData, complemento: e.target.value })}
                      className="w-full bg-[#111622] border border-gray-800 rounded-lg p-2.5 text-sm focus:border-[#E2B042] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Cidade</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Rio de Janeiro"
                      value={formData.cidade}
                      onChange={e => setFormData({ ...formData, cidade: e.target.value })}
                      className="w-full bg-[#111622] border border-gray-800 rounded-lg p-2.5 text-sm focus:border-[#E2B042] focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Estado (UF)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: RJ"
                      value={formData.uf}
                      onChange={e => setFormData({ ...formData, uf: e.target.value })}
                      className="w-full bg-[#111622] border border-gray-800 rounded-lg p-2.5 text-sm focus:border-[#E2B042] focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">País</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Brasil"
                      value={formData.pais}
                      onChange={e => setFormData({ ...formData, pais: e.target.value })}
                      className="w-full bg-[#111622] border border-gray-800 rounded-lg p-2.5 text-sm focus:border-[#E2B042] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Chave PIX de Recebimento</label>
                  <input
                    type="text"
                    required
                    placeholder="Chave Pix (E-mail, CNPJ, Celular)"
                    value={formData.chave_pix}
                    onChange={e => setFormData({ ...formData, chave_pix: e.target.value })}
                    className="w-full bg-[#111622] border border-gray-800 rounded-lg p-2.5 text-sm focus:border-[#E2B042] focus:outline-none transition-colors"
                  />
                </div>

                {/* Cloudflare Turnstile Widget */}
                <div className="flex justify-center py-2">
                  <div ref={turnstileContainerRef}></div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full py-3 bg-[#E2B042] hover:bg-[#D69E2E] text-black font-bold rounded-lg text-sm tracking-wider uppercase transition-all shadow-[0_4px_12px_rgba(226,176,66,0.2)]"
                  >
                    Gerar Minuta de Contrato V3
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Tab 2: Admin Dashboard */}
        {mounted && activeTab === "admin" && currentUser && userRole === "admin" && (
          <div className="space-y-8">
            
            {/* Top Cards - Financial Audit */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-[#1A1D29] border border-gray-800 p-6 rounded-xl mystic-glow">
                <span className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1">Receita Bruta Adsense (YouTube)</span>
                <span className="text-3xl font-bold font-[family-name:var(--font-josefin-sans)] text-white">
                  R$ {totalAdsense.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-gray-500 block mt-1">Soma de todos os canais</span>
              </div>
              <div className="bg-[#1A1D29] border border-gray-800 p-6 rounded-xl mystic-glow">
                <span className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1">Reserva ADM (30%)</span>
                <span className="text-3xl font-bold font-[family-name:var(--font-josefin-sans)] text-[#E2B042]">
                  R$ {retencao30.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-gray-500 block mt-1">Desconto custos operacionais / Notas Fiscais</span>
              </div>
              <div className="bg-[#1A1D29] border border-gray-800 p-6 rounded-xl mystic-glow">
                <span className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1">Fundo Partilha Condôminos (70%)</span>
                <span className="text-3xl font-bold font-[family-name:var(--font-josefin-sans)] text-purple-400">
                  R$ {fundoPartilha70.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-gray-500 block mt-1">Líquido distribuído</span>
              </div>
              <div className="bg-[#1A1D29] border border-gray-800 p-6 rounded-xl mystic-glow">
                <span className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1">Cota por Condômino Ativo</span>
                <span className="text-3xl font-bold font-[family-name:var(--font-josefin-sans)] text-[#38A169]">
                  R$ {valuePerEligible.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-gray-500 block mt-1">Dividido por {countEligible} ativos adimplentes</span>
              </div>
            </div>

            {/* YouTube Channel Stats & Monetization Countdown */}
            <div className="bg-[#1A1D29] border border-gray-800 p-6 rounded-xl mystic-glow space-y-4">
              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-[#E2B042] font-[family-name:var(--font-josefin-sans)]">
                    Métricas em Tempo Real do Canal (Cosmo Alma TV)
                  </h3>
                  <p className="text-[10px] text-gray-500">
                    Sincronizado via YouTube API v3 • ID: {portalConfigs.youtube_channel_id}
                  </p>
                  {youtubeStats?.apiError && (
                    <span className="inline-block mt-1 text-[10px] text-red-400 bg-red-950/30 border border-red-500/30 px-2 py-1 rounded-md max-w-md">
                      ⚠️ Erro de API: {youtubeStats.apiError}. (Usando fallback de simulação)
                    </span>
                  )}
                </div>
                <button
                  onClick={fetchYoutubeStats}
                  className="px-3 py-1.5 border border-purple-500/30 hover:bg-purple-950/20 text-purple-300 text-[10px] font-bold rounded-lg uppercase transition-all cursor-pointer"
                >
                  🔄 Atualizar Dados
                </button>
              </div>

              {youtubeStats ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Stats counters */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#111622] p-3 rounded-lg border border-gray-850">
                        <span className="text-[9px] uppercase tracking-wider text-gray-400 block mb-0.5">Inscritos</span>
                        <span className="text-xl font-bold text-white font-mono">
                          {youtubeStats.subscriberCount.toLocaleString()}
                        </span>
                      </div>
                      <div className="bg-[#111622] p-3 rounded-lg border border-gray-850">
                        <span className="text-[9px] uppercase tracking-wider text-gray-400 block mb-0.5">Visualizações</span>
                        <span className="text-xl font-bold text-white font-mono">
                          {youtubeStats.viewCount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="bg-[#111622] p-3 rounded-lg border border-gray-850">
                      <span className="text-[9px] uppercase tracking-wider text-gray-400 block mb-0.5">Vídeos Postados</span>
                      <span className="text-xl font-bold text-white font-mono">
                        {youtubeStats.videoCount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Countdown Progress Card */}
                  <div className="md:col-span-2 bg-[#111622] p-4 rounded-lg border border-purple-500/20 space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center border-b border-gray-800/60 pb-2 mb-3">
                        <span className="text-[11px] uppercase font-bold text-[#E2B042]">Jornada de Monetização (YPP)</span>
                        <span className="text-[10px] bg-purple-950/40 text-purple-300 border border-purple-800/40 px-2 py-0.5 rounded font-mono">
                          Requisitos Google Atualizados
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Tier 1: Apoio de Fãs (Acesso Antecipado) */}
                        <div className="bg-[#161B29] p-3 rounded-lg border border-gray-850 space-y-2.5">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-gray-200 uppercase">1. Apoio de Fãs</span>
                            <span className="text-[9px] font-mono text-[#E2B042]">
                              {Math.min(100, Math.round(((youtubeStats.subscriberCount >= 500 ? 1 : youtubeStats.subscriberCount / 500) * 0.5 + (youtubeStats.videoCount >= 3 ? 1 : youtubeStats.videoCount / 3) * 0.5) * 100))}%
                            </span>
                          </div>
                          
                          <div className="space-y-2 text-[11px]">
                            {/* Subs requirement */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] text-gray-400">
                                <span>Inscritos: {youtubeStats.subscriberCount}/500</span>
                                <span>{youtubeStats.subscriberCount >= 500 ? "✅" : "⚠️"}</span>
                              </div>
                              <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-purple-500 h-1.5 rounded-full transition-all"
                                  style={{ width: `${Math.min(100, (youtubeStats.subscriberCount / 500) * 100)}%` }}
                                ></div>
                              </div>
                            </div>

                            {/* Videos requirement */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] text-gray-400">
                                <span>Vídeos públicos (90 dias): {youtubeStats.videoCount}/3</span>
                                <span>{youtubeStats.videoCount >= 3 ? "✅" : "⚠️"}</span>
                              </div>
                              <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-purple-500 h-1.5 rounded-full transition-all"
                                  style={{ width: `${Math.min(100, (youtubeStats.videoCount / 3) * 100)}%` }}
                                ></div>
                              </div>
                            </div>

                            {/* Engagement requirement */}
                            <div className="text-[10px] text-gray-400 border-t border-gray-800 pt-1.5 space-y-1">
                              <span className="block font-semibold text-gray-300">Engajamento (Um dos dois):</span>
                              <p className="flex items-center gap-1 text-[9px]">
                                <span>⚠️</span>
                                <span>3.000 horas públicas (12 meses)</span>
                              </p>
                              <p className="flex items-center gap-1 text-[9px]">
                                <span>⚠️</span>
                                <span>3M de views no Shorts (90 dias)</span>
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Tier 2: Receita de Anúncios (Parceria Completa) */}
                        <div className="bg-[#161B29] p-3 rounded-lg border border-gray-850 space-y-2.5">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-gray-200 uppercase">2. Receitas de Anúncios</span>
                            <span className="text-[9px] font-mono text-[#E2B042]">
                              {Math.min(100, Math.round((youtubeStats.subscriberCount / 1000) * 100))}%
                            </span>
                          </div>
                          
                          <div className="space-y-2 text-[11px]">
                            {/* Subs requirement */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] text-gray-400">
                                <span>Inscritos: {youtubeStats.subscriberCount}/1.000</span>
                                <span>{youtubeStats.subscriberCount >= 1000 ? "✅" : "⚠️"}</span>
                              </div>
                              <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-purple-500 to-[#E2B042] h-1.5 rounded-full transition-all"
                                  style={{ width: `${Math.min(100, (youtubeStats.subscriberCount / 1000) * 100)}%` }}
                                ></div>
                              </div>
                            </div>

                            {/* Engagement requirement */}
                            <div className="text-[10px] text-gray-400 border-t border-gray-800 pt-1.5 space-y-1 mt-6">
                              <span className="block font-semibold text-gray-300">Engajamento (Um dos dois):</span>
                              <p className="flex items-center gap-1 text-[9px]">
                                <span>⚠️</span>
                                <span>4.000 horas públicas (12 meses)</span>
                              </p>
                              <p className="flex items-center gap-1 text-[9px]">
                                <span>⚠️</span>
                                <span>10M de views no Shorts (90 dias)</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-[9px] text-gray-500 italic pt-2 border-t border-gray-800 flex justify-between">
                      <span>* Nota: O canal no momento não está monetizado, logo o AdSense bruto acumulado é R$ 0,00.</span>
                      <span>Horas/Shorts devem ser acompanhados no YouTube Studio.</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-gray-400 font-mono">
                  Carregando estatísticas do canal do YouTube...
                </div>
              )}
            </div>

            {/* SVG Charts Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Chart 1: AdSense Revenue */}
              <div className="bg-[#1A1D29] border border-gray-800 p-6 rounded-xl mystic-glow space-y-3 relative overflow-hidden">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-[#E2B042] font-[family-name:var(--font-josefin-sans)]">
                    Histórico Faturamento AdSense
                  </h4>
                  <span className="text-[10px] text-gray-500 font-mono">Últimos 6 meses</span>
                </div>
                
                <div className="h-44 w-full flex items-center justify-center relative pt-4">
                  {/* Background Grid lines */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 150">
                    <line x1="0" y1="20" x2="400" y2="20" stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
                    <line x1="0" y1="60" x2="400" y2="60" stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
                    <line x1="0" y1="100" x2="400" y2="100" stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
                  </svg>

                  {fechamentos.length > 0 && fechamentos.some(f => f.receita_bruta_adsense > 0) ? (
                    <svg className="w-full h-full relative z-10" viewBox="0 0 400 150">
                      {/* Graph Line */}
                      <path
                        d={chartData.pathD}
                        fill="none"
                        stroke="#E2B042"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      {/* Glow effect under the line */}
                      <path
                        d={chartData.fillD}
                        fill="url(#adsenseGlow)"
                        opacity="0.1"
                      />
                      {/* Dots at data points */}
                      {chartData.points.map((pt: any, idx: number) => (
                        <circle key={idx} cx={pt.x} cy={pt.y} r="4" fill="#E2B042" />
                      ))}
                      {/* Define Gradient */}
                      <defs>
                        <linearGradient id="adsenseGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#E2B042" />
                          <stop offset="100%" stopColor="transparent" />
                        </linearGradient>
                      </defs>
                    </svg>
                  ) : (
                    <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-2 p-4 bg-[#111622]/85 border border-purple-500/10 rounded-lg backdrop-blur-sm mx-auto max-w-[280px] shadow-[0_0_20px_rgba(123,31,162,0.1)]">
                      <div className="w-8 h-8 rounded-full bg-purple-950/50 border border-[#E2B042]/30 flex items-center justify-center text-[#E2B042] animate-pulse">
                        🔒
                      </div>
                      <div>
                        <h5 className="text-[11px] font-bold text-gray-200 uppercase">Aguardando Monetização</h5>
                        <p className="text-[9px] text-gray-400 mt-1 leading-relaxed">
                          O gráfico de receitas será desbloqueado quando o canal for aprovado no YPP e registrar o primeiro faturamento.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between text-[9px] text-gray-500 font-mono">
                  {fechamentos.length > 0 && fechamentos.some(f => f.receita_bruta_adsense > 0) ? (
                    chartData.points.map((pt: any, idx: number) => (
                      <span key={idx}>{pt.label} (R$ {pt.val.toLocaleString()})</span>
                    ))
                  ) : (
                    <span className="w-full text-center text-[10px] text-gray-500/80">
                      Nenhum fechamento faturado registrado ainda (Canal não monetizado)
                    </span>
                  )}
                </div>
              </div>

              {/* Chart 2: Paid Traffic */}
              <div className="bg-[#1A1D29] border border-gray-800 p-6 rounded-xl mystic-glow space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-purple-400 font-[family-name:var(--font-josefin-sans)]">
                    Investimento em Tráfego Pago
                  </h4>
                  <span className="text-[10px] text-gray-500 font-mono">Conversão / Ads</span>
                </div>
                <div className="h-44 w-full flex items-end pt-4">
                  <svg className="w-full h-full" viewBox="0 0 400 150">
                    {/* Grid lines */}
                    <line x1="0" y1="20" x2="400" y2="20" stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
                    <line x1="0" y1="60" x2="400" y2="60" stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
                    <line x1="0" y1="100" x2="400" y2="100" stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
                    {/* Bar charts representing traffic */}
                    <rect x="25" y="110" width="20" height="40" rx="3" fill="#7B1FA2" opacity="0.8" />
                    <rect x="90" y="90" width="20" height="60" rx="3" fill="#7B1FA2" opacity="0.8" />
                    <rect x="155" y="70" width="20" height="80" rx="3" fill="#7B1FA2" opacity="0.8" />
                    <rect x="220" y="55" width="20" height="95" rx="3" fill="#7B1FA2" opacity="0.8" />
                    <rect x="285" y="40" width="20" height="110" rx="3" fill="#7B1FA2" opacity="0.8" />
                    <rect x="350" y="20" width="20" height="130" rx="3" fill="#E2B042" />
                  </svg>
                </div>
                <div className="flex justify-between text-[9px] text-gray-500 font-mono">
                  <span>Jan (R$ 500)</span>
                  <span>Fev</span>
                  <span>Mar</span>
                  <span>Abr</span>
                  <span>Mai</span>
                  <span>Jun (R$ 2.2k)</span>
                </div>
              </div>
            </div>

            {/* List & Controls Split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Creator List */}
              <div className="bg-[#1A1D29] border border-gray-800 p-6 rounded-xl lg:col-span-2 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold tracking-wider font-[family-name:var(--font-josefin-sans)]">
                    Condôminos Registrados
                  </h3>
                  <button
                    onClick={resetDB}
                    className="text-[10px] uppercase tracking-wider text-red-400 hover:text-red-300 font-semibold"
                  >
                    Reiniciar Banco
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400 uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Nome Canal / Comercial</th>
                        <th className="pb-3 font-semibold">Status Operacional</th>
                        <th className="pb-3 font-semibold text-center">Vídeos/Semana</th>
                        <th className="pb-3 font-semibold text-right">AdSense Bruto</th>
                        <th className="pb-3 font-semibold text-center">Ações Simulação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {condominos.map(c => {
                        const statusColors = {
                          AGUARDANDO_ASSINATURA: "border-gray-500 text-gray-400 bg-gray-900/40",
                          ATIVO_PENDENTE_PAGAMENTO: "border-yellow-600 text-yellow-400 bg-yellow-950/20",
                          ATIVO_ADIMPLENTE: "border-[#38A169] text-[#38A169] bg-green-950/20",
                          SUSPENSO_INADIMPLENCIA: "border-[#E53E3E] text-[#E53E3E] bg-red-950/20",
                          BLOQUEADO_ASSIDUIDADE: "border-orange-500 text-orange-400 bg-orange-950/20"
                        };

                        return (
                          <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3.5">
                              <span className="font-semibold text-white block">{c.nome_comercial}</span>
                              <span className="text-[10px] text-gray-500">{c.email}</span>
                            </td>
                            <td className="py-3.5">
                              <span className={`px-2 py-0.5 border rounded text-[9px] font-bold uppercase ${statusColors[c.status_operacional]}`}>
                                {c.status_operacional.replace("_", " ")}
                              </span>
                            </td>
                            <td className="py-3.5 text-center font-mono">
                              <span className={c.videos_entregues_esta_semana >= 1 ? "text-green-400" : "text-red-400"}>
                                {c.videos_entregues_esta_semana} / 3
                              </span>
                            </td>
                            <td className="py-3.5 text-right font-semibold font-mono text-gray-300">
                              R$ {c.receita_adsense_gerada.toFixed(2)}
                            </td>
                            <td className="py-3.5 text-center">
                              <div className="flex gap-1 justify-center">
                                <button
                                  onClick={() => triggerAsaasWebhook(c.id, "PAYMENT_RECEIVED")}
                                  title="Simular pagamento Asaas"
                                  className="px-1.5 py-1 bg-green-900/60 text-green-300 rounded hover:bg-green-800/80 text-[10px]"
                                >
                                  💲 Pago
                                </button>
                                <button
                                   onClick={() => triggerAsaasWebhook(c.id, "PAYMENT_OVERDUE")}
                                   title="Simular atraso > 10 dias"
                                   className="px-1.5 py-1 bg-red-900/60 text-red-300 rounded hover:bg-red-800/80 text-[10px]"
                                 >
                                   ⚠️ Atraso
                                 </button>
                                 <button
                                   onClick={() => {
                                     const pId = prompt(`Insira o ID da Playlist do YouTube para "${c.nome_comercial}":`, c.youtube_channel_id || "");
                                     if (pId !== null) handleSavePlaylistId(c.id, pId);
                                   }}
                                   title="Associar Playlist do YouTube"
                                   className="px-1.5 py-1 bg-purple-900/60 text-purple-300 rounded hover:bg-purple-800/80 text-[10px]"
                                 >
                                   ✏️ Playlist
                                 </button>
                                 <button
                                   onClick={() => handleDeleteCondomino(c.id, c.nome_comercial)}
                                   title="Deletar condomínio de teste"
                                   className="px-1.5 py-1 bg-red-950/40 text-red-400 border border-red-900/50 rounded hover:bg-red-900/40 text-[10px]"
                                 >
                                   🗑️ Excluir
                                 </button>
                               </div>
                             </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Simulation Hub & System Logs */}
              <div className="space-y-6">
                
                {/* System Triggers */}
                <div className="bg-[#1A1D29] border border-gray-800 p-6 rounded-xl space-y-4">
                  <h3 className="text-sm font-semibold tracking-wider uppercase text-[#E2B042] font-[family-name:var(--font-josefin-sans)]">
                    Centro de Simulações Cron
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] text-gray-400 mb-2">
                        Audita uploads semanais de todos os parceiros na API do YouTube (Regra Domingo 23:59).
                      </p>
                      <button
                        onClick={triggerYoutubeAudit}
                        className="w-full py-2 bg-purple-900/50 hover:bg-purple-800/60 border border-purple-500/30 text-purple-200 text-xs font-semibold rounded-lg transition-all"
                      >
                        🚀 Disparar Job Auditoria YouTube
                      </button>
                    </div>

                    <div className="border-t border-gray-800 my-4 pt-3">
                      <p className="text-[10px] text-gray-400 mb-2">
                        Ajuste rápido de posts semanais dos criadores para testar a trava de assiduidade:
                      </p>
                      <div className="flex gap-2">
                        {condominos.map(c => (
                          <button
                            key={c.id}
                            onClick={() => {
                              const updated = condominos.map(item => {
                                if (item.id === c.id) {
                                  return { ...item, videos_entregues_esta_semana: item.videos_entregues_esta_semana === 0 ? 2 : 0 };
                                }
                                return item;
                              });
                              saveState(updated, logs);
                              addLog("SISTEMA", `Quantidade de vídeos de ${c.nome_comercial} alterada para ${c.videos_entregues_esta_semana === 0 ? 2 : 0}.`, updated);
                            }}
                            className="flex-1 py-1 px-2 bg-gray-800 hover:bg-gray-700 rounded text-[9px] truncate"
                          >
                            {c.nome_comercial}: {c.videos_entregues_esta_semana === 0 ? "✨ 2 vídeos" : "❌ 0 vídeos"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hub de Homologação de APIs */}
                <div className="bg-[#1A1D29] border border-gray-800 p-6 rounded-xl space-y-4">
                  <h3 className="text-sm font-semibold tracking-wider uppercase text-[#E2B042] font-[family-name:var(--font-josefin-sans)]">
                    Homologação de APIs (Live Tests)
                  </h3>
                  <div className="space-y-4">
                    {/* Assinafy Test */}
                    <div className="space-y-2 pb-3 border-b border-gray-800/60">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-gray-200">API Assinafy</span>
                        {testZapSignResult && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${testZapSignResult.success ? 'bg-green-950 text-green-400 border border-green-800' : 'bg-red-950 text-red-400 border border-red-800'}`}>
                            {testZapSignResult.success ? 'Sucesso' : 'Erro'}
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-gray-400">Gera minuta do contrato e cria documento para assinatura.</p>
                      <button
                        onClick={runTestZapSign}
                        disabled={isTestingZapSign}
                        className="w-full py-1.5 bg-[#111622] hover:bg-gray-800 border border-gray-700 hover:border-gray-600 disabled:opacity-50 text-white text-[11px] font-semibold rounded transition-all cursor-pointer"
                      >
                        {isTestingZapSign ? "Executando..." : "Testar Integração Assinafy"}
                      </button>
                      {testZapSignResult && (
                        <div className="bg-[#111622] p-2 rounded text-[9px] font-mono text-gray-300 break-all space-y-1">
                          <div><strong>Modo:</strong> {testZapSignResult.mode}</div>
                          {testZapSignResult.success ? (
                            <>
                              <div><strong>Doc ID:</strong> {testZapSignResult.doc_id}</div>
                              <div><strong>URL:</strong> <a href={testZapSignResult.sign_url} target="_blank" rel="noreferrer" className="text-[#E2B042] hover:underline">{testZapSignResult.sign_url}</a></div>
                            </>
                          ) : (
                            <div className="text-red-400"><strong>Erro:</strong> {testZapSignResult.error}</div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Asaas Test */}
                    <div className="space-y-2 pb-3 border-b border-gray-800/60">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-gray-200">API Asaas (Sandbox)</span>
                        {testAsaasResult && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${testAsaasResult.success ? 'bg-green-950 text-green-400 border border-green-800' : 'bg-red-950 text-red-400 border border-red-800'}`}>
                            {testAsaasResult.success ? 'Sucesso' : 'Erro'}
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-gray-400">Cadastra cliente e cria assinatura de cota de R$ 100,00 no Sandbox.</p>
                      <button
                        onClick={runTestAsaas}
                        disabled={isTestingAsaas}
                        className="w-full py-1.5 bg-[#111622] hover:bg-gray-800 border border-gray-700 hover:border-gray-600 disabled:opacity-50 text-white text-[11px] font-semibold rounded transition-all cursor-pointer"
                      >
                        {isTestingAsaas ? "Executando..." : "Testar Integração Asaas"}
                      </button>
                      {testAsaasResult && (
                        <div className="bg-[#111622] p-2 rounded text-[9px] font-mono text-gray-300 break-all space-y-1">
                          <div><strong>Modo:</strong> {testAsaasResult.mode}</div>
                          {testAsaasResult.success ? (
                            <>
                              <div><strong>Cliente ID:</strong> {testAsaasResult.customer_id}</div>
                              <div><strong>Assinatura ID:</strong> {testAsaasResult.subscription_id}</div>
                            </>
                          ) : (
                            <div className="text-red-400"><strong>Erro:</strong> {testAsaasResult.error}</div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* YouTube Test */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-gray-200">API YouTube (Google Cloud)</span>
                        {testYoutubeResult && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${testYoutubeResult.success ? 'bg-green-950 text-green-400 border border-green-800' : 'bg-red-950 text-red-400 border border-red-800'}`}>
                            {testYoutubeResult.success ? 'Sucesso' : 'Erro'}
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-gray-400">Pesquisa vídeos enviados nos últimos 7 dias por ID do Canal.</p>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={testYoutubeChannelId}
                          onChange={e => setTestYoutubeChannelId(e.target.value)}
                          placeholder="Channel ID do YouTube"
                          className="flex-1 bg-[#111622] border border-gray-800 rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-[#E2B042]"
                        />
                        <button
                          onClick={runTestYoutube}
                          disabled={isTestingYoutube}
                          className="px-3 py-1 bg-[#111622] hover:bg-gray-800 border border-gray-700 hover:border-gray-600 disabled:opacity-50 text-white text-[10px] font-semibold rounded transition-all cursor-pointer"
                        >
                          {isTestingYoutube ? "Consultando..." : "Testar"}
                        </button>
                      </div>
                      {testYoutubeResult && (
                        <div className="bg-[#111622] p-2 rounded text-[9px] font-mono text-gray-300 break-all space-y-1">
                          <div><strong>Modo:</strong> {testYoutubeResult.mode}</div>
                          {testYoutubeResult.success ? (
                            <>
                              <div><strong>Playlist ID:</strong> {testYoutubeResult.channel_id}</div>
                              <div><strong>Vídeos na Semana:</strong> <span className={testYoutubeResult.uploads_count >= 1 ? "text-green-400 font-bold" : "text-red-400 font-bold"}>{testYoutubeResult.uploads_count}</span></div>
                            </>
                          ) : (
                            <div className="text-red-400"><strong>Erro:</strong> {testYoutubeResult.error}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fechamento Mensal Trigger */}
                <div className="bg-[#1A1D29] border border-gray-800 p-6 rounded-xl space-y-4">
                  <h3 className="text-sm font-semibold tracking-wider uppercase text-[#E2B042] font-[family-name:var(--font-josefin-sans)]">
                    Fechamento Financeiro (70/30)
                  </h3>
                  <form onSubmit={handleRunClosing} className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] uppercase text-gray-400">Mês Referência</label>
                        <input
                          type="text"
                          required
                          value={closingMonth}
                          onChange={e => setClosingMonth(e.target.value)}
                          placeholder="AAAA-MM"
                          className="w-full bg-[#111622] border border-gray-800 rounded p-1.5 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase text-gray-400">Receita AdSense</label>
                        <input
                          type="number"
                          required
                          value={closingAdsense}
                          onChange={e => setClosingAdsense(e.target.value)}
                          placeholder="R$"
                          className="w-full bg-[#111622] border border-gray-800 rounded p-1.5 text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 bg-[#E2B042] hover:bg-[#D69E2E] text-black text-xs font-bold rounded-lg transition-all"
                    >
                      💰 Executar Fechamento Financeiro
                    </button>
                  </form>

                  {fechamentos.length > 0 && (
                    <div className="border-t border-gray-800 pt-3">
                      <h4 className="text-[10px] uppercase text-gray-400 mb-2 font-semibold">Histórico de Fechamentos</h4>
                      <div className="max-h-24 overflow-y-auto space-y-1.5 text-[9px] font-mono text-gray-300">
                        {fechamentos.map(f => (
                          <div key={f.id} className="bg-[#111622] p-1.5 rounded border border-gray-800 flex justify-between">
                            <span>{f.mes_referencia}: Bruto R$ {f.receita_bruta_adsense}</span>
                            <span className="text-[#38A169]">Cota R$ {f.valor_por_condomino.toFixed(2)} ({f.qtd_condominos_ativos} at.)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Event Logs */}
                <div className="bg-[#1A1D29] border border-gray-800 p-6 rounded-xl space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                    <h3 className="text-sm font-semibold tracking-wider uppercase text-gray-400">
                      Logs da Egrégora
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-gray-600 font-mono">v3.2.1-debug</span>
                      <button
                        type="button"
                        onClick={() => addLog("SISTEMA", `Log de teste manual acionado | User: ${currentUser?.email}`)}
                        className="text-[8px] uppercase tracking-wider bg-purple-900/50 hover:bg-purple-800 text-purple-300 px-2 py-0.5 rounded border border-purple-800 transition-colors cursor-pointer"
                      >
                        Testar Log
                      </button>
                    </div>
                  </div>
                  <div className="h-44 overflow-y-auto space-y-2 text-[10px] font-mono pr-2">
                    {logs.map(log => {
                      const logColors = {
                        SISTEMA: "text-blue-400",
                        ASAAS: "text-yellow-400",
                        YOUTUBE: "text-red-400",
                        CONTRATO: "text-green-400"
                      };

                      return (
                        <div key={log.id} className="border-b border-gray-800/50 pb-1.5">
                          <span className="text-gray-500 mr-1.5">[{log.timestamp}]</span>
                          <span className={`font-semibold mr-1.5 uppercase ${logColors[log.tipo]}`}>{log.tipo}:</span>
                          <span className="text-gray-300">{log.mensagem}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>

            {/* Configurações Globais do Portal (Admin settings) */}
            <div className="bg-[#1A1D29] border border-gray-800 p-6 rounded-xl mystic-glow mt-8">
              <h3 className="text-base font-bold text-[#E2B042] uppercase tracking-wider font-[family-name:var(--font-josefin-sans)] mb-4">
                ⚙️ Configurações Globais do Onboarding (Criadores)
              </h3>
              <form onSubmit={handleSaveConfigs} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                      Link de Convite do WhatsApp
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://chat.whatsapp.com/..."
                      value={editConfigs.whatsapp_link}
                      onChange={e => setEditConfigs({ ...editConfigs, whatsapp_link: e.target.value })}
                      className="w-full bg-[#111622] border border-gray-800 rounded-lg p-2.5 text-xs focus:border-[#E2B042] focus:outline-none text-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                      Link do Vídeo do YouTube (Boas-Vindas)
                    </label>
                    <input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={editConfigs.onboarding_video_url}
                      onChange={e => setEditConfigs({ ...editConfigs, onboarding_video_url: e.target.value })}
                      className="w-full bg-[#111622] border border-gray-800 rounded-lg p-2.5 text-xs focus:border-[#E2B042] focus:outline-none text-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                      ID do Canal Cosmo Alma TV (YouTube)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: UC..."
                      value={editConfigs.youtube_channel_id}
                      onChange={e => setEditConfigs({ ...editConfigs, youtube_channel_id: e.target.value })}
                      className="w-full bg-[#111622] border border-gray-800 rounded-lg p-2.5 text-xs focus:border-[#E2B042] focus:outline-none text-white transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                      Diretrizes e Rotina de Produção
                    </label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Explicite as diretrizes de produção de vídeo (uma por linha)..."
                      value={editConfigs.production_guidelines}
                      onChange={e => setEditConfigs({ ...editConfigs, production_guidelines: e.target.value })}
                      className="w-full bg-[#111622] border border-gray-800 rounded-lg p-2.5 text-xs focus:border-[#E2B042] focus:outline-none text-white transition-colors font-mono leading-relaxed"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                      Informações de Contato / Suporte
                    </label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Indique os contatos de suporte de forma clara..."
                      value={editConfigs.support_contact}
                      onChange={e => setEditConfigs({ ...editConfigs, support_contact: e.target.value })}
                      className="w-full bg-[#111622] border border-gray-800 rounded-lg p-2.5 text-xs focus:border-[#E2B042] focus:outline-none text-white transition-colors font-mono leading-relaxed"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSavingConfigs}
                    className="px-6 py-2.5 bg-[#E2B042] hover:bg-[#D69E2E] disabled:bg-gray-800 text-black font-bold rounded-lg text-xs tracking-wider uppercase transition-all shadow-[0_4px_12px_rgba(226,176,66,0.15)] cursor-pointer"
                  >
                    {isSavingConfigs ? "Salvando..." : "💾 Salvar Configurações Globais"}
                  </button>
                </div>
              </form>
            </div>

          </div>
        )}

        {/* Tab 4: Financeiro Dashboard */}
        {mounted && activeTab === "financeiro" && currentUser && userRole === "admin" && (() => {
          const transacoesPagas = transacoes.filter((t) => t.status === "PAGO");
          const transacoesPendentes = transacoes.filter((t) => t.status === "PENDENTE_APROVACAO");

          const ITENS_POR_PAGINA = 8;
          const totalPaginasTransacoes = Math.ceil(transacoes.length / ITENS_POR_PAGINA) || 1;
          const transacoesExibidas = transacoes.slice(
            (paginaAtualTransacoes - 1) * ITENS_POR_PAGINA,
            paginaAtualTransacoes * ITENS_POR_PAGINA
          );

          const totalEntradas = transacoesPagas.reduce((acc, t) => t.tipo === "ENTRADA" ? acc + t.valor : acc, 0);
          const totalSaidas = transacoesPagas.reduce((acc, t) => t.tipo === "SAIDA" ? acc + t.valor : acc, 0);
          const saldoLiquido = totalEntradas - totalSaidas;

          return (
            <div className="space-y-8 animate-fadeIn">
              
              {/* Filter & Month Selector */}
              <div className="flex flex-col sm:flex-row justify-between items-center bg-[#1A1D29] border border-gray-800 p-4 rounded-xl gap-4">
                <div>
                  <h2 className="text-md font-semibold text-[#E2B042] uppercase tracking-wider font-[family-name:var(--font-josefin-sans)]">
                    Controle de Caixa e Finanças
                  </h2>
                  <p className="text-[10px] text-gray-500">Gestão integrada de entradas, saídas e reservas operacionais</p>
                </div>
                 <div className="flex items-center gap-2 print:hidden">
                  <button
                    type="button"
                    disabled={syncingAsaas}
                    onClick={handleSincronizarAsaas}
                    className="px-3 py-1.5 bg-blue-950/40 hover:bg-blue-900/50 disabled:bg-gray-800 text-blue-300 border border-blue-800/40 text-xs font-bold rounded-lg uppercase tracking-wide transition-all cursor-pointer mr-1 flex items-center gap-1.5"
                  >
                    {syncingAsaas ? (
                      <>
                        <span className="animate-spin text-xs">🌀</span> Sincronizando...
                      </>
                    ) : (
                      <>🔄 Sincronizar Extrato Asaas</>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-purple-950/40 hover:bg-purple-900/40 text-purple-300 border border-purple-800/40 text-xs font-bold rounded-lg uppercase tracking-wide transition-all cursor-pointer mr-2"
                  >
                    📄 Exportar PDF
                  </button>
                  <label className="text-xs text-gray-400 uppercase tracking-wide font-medium">Mês de Referência:</label>
                  <input
                    type="month"
                    value={filtroMes}
                    onChange={(e) => {
                      setFiltroMes(e.target.value);
                      fetchTransacoes(e.target.value);
                    }}
                    className="bg-[#111622] border border-gray-800 text-white rounded-lg p-2 text-xs focus:border-[#E2B042] focus:outline-none"
                  />
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#1A1D29] border border-gray-800 p-6 rounded-xl mystic-glow relative overflow-hidden">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1">Total de Entradas</span>
                  <span className="text-3xl font-bold font-[family-name:var(--font-josefin-sans)] text-[#38A169]">
                    R$ {totalEntradas.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-gray-500 block mt-1">Cotas recebidas + retornos de Adsense</span>
                  <div className="absolute right-4 bottom-4 text-2xl opacity-20">📈</div>
                </div>

                <div className="bg-[#1A1D29] border border-gray-800 p-6 rounded-xl mystic-glow relative overflow-hidden">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1">Total de Saídas</span>
                  <span className="text-3xl font-bold font-[family-name:var(--font-josefin-sans)] text-[#E53E3E]">
                    R$ {totalSaidas.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-gray-500 block mt-1">Tráfego pago, softwares e custos operacionais</span>
                  <div className="absolute right-4 bottom-4 text-2xl opacity-20">📉</div>
                </div>

                <div className="bg-[#1A1D29] border border-gray-800 p-6 rounded-xl mystic-glow relative overflow-hidden border-l-4 border-l-[#E2B042]">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1">Saldo Líquido</span>
                  <span className={`text-3xl font-bold font-[family-name:var(--font-josefin-sans)] ${saldoLiquido >= 0 ? 'text-[#E2B042]' : 'text-red-400'}`}>
                    R$ {saldoLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-gray-500 block mt-1">Disponível no caixa de gestão</span>
                  <div className="absolute right-4 bottom-4 text-2xl opacity-20">⚖️</div>
                </div>
              </div>

              {/* Movimentações Pendentes de Aprovação (Asaas / Caixa) */}
              {transacoesPendentes.length > 0 && (
                <div className="bg-[#1A1D29] border border-amber-800/40 p-6 rounded-xl space-y-4 bg-gradient-to-r from-[#1A1D29] via-[#241F1A] to-[#1A1D29]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                      </span>
                      <h3 className="text-sm font-semibold tracking-wider uppercase text-amber-400 font-[family-name:var(--font-josefin-sans)]">
                        Movimentações Asaas Pendentes de Aprovação ({transacoesPendentes.length})
                      </h3>
                    </div>
                    <span className="text-[10px] text-amber-300/80 bg-amber-950/40 border border-amber-800/40 px-2.5 py-1 rounded-full font-medium">
                      Ação Manual Requerida
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-gray-800 text-gray-400 font-bold">
                          <th className="pb-2 font-semibold">Origem</th>
                          <th className="pb-2 font-semibold">Data</th>
                          <th className="pb-2 font-semibold">Descrição</th>
                          <th className="pb-2 font-semibold">Categoria</th>
                          <th className="pb-2 font-semibold text-right">Valor</th>
                          <th className="pb-2 font-semibold text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/50">
                        {transacoesPendentes.map((t) => (
                          <tr key={t.id} className="hover:bg-[#111622]/50 transition-colors">
                            <td className="py-3 font-mono text-[10px]">
                              <span className="px-2 py-0.5 rounded bg-blue-950/40 text-blue-300 border border-blue-800/40 font-bold uppercase">
                                {t.origem || "ASAAS"}
                              </span>
                            </td>
                            <td className="py-3 font-mono text-[10px] text-gray-400">
                              {new Date(t.data_transacao).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                            </td>
                            <td className="py-3 font-medium text-white max-w-[220px] truncate" title={t.descricao}>
                              {t.descricao}
                            </td>
                            <td className="py-3">
                              <select
                                value={t.categoria}
                                onChange={(e) => handleUpdateTransactionCategory(t.id, e.target.value)}
                                className="text-[10px] bg-[#111622] text-purple-300 border border-purple-800/40 px-2 py-1 rounded font-medium focus:outline-none focus:border-purple-600 cursor-pointer max-w-[140px] truncate"
                              >
                                <option value="Cota Condominial">Cota Condominial</option>
                                <option value="Retenção 30% Adsense">Retenção 30% Adsense</option>
                                <option value="Tráfego Pago">Tráfego Pago</option>
                                <option value="Ferramentas IA">Ferramentas IA</option>
                                <option value="Impostos">Impostos</option>
                                <option value="Design/Edição">Design/Edição</option>
                                <option value="Outros">Outros</option>
                                {categorias.map((cat) => (
                                  !["Cota Condominial", "Retenção 30% Adsense", "Tráfego Pago", "Ferramentas IA", "Impostos", "Design/Edição", "Outros"].includes(cat.nome) && (
                                    <option key={cat.id} value={cat.nome}>{cat.nome}</option>
                                  )
                                ))}
                              </select>
                            </td>
                            <td className={`py-3 text-right font-bold font-mono ${t.tipo === "ENTRADA" ? "text-green-400" : "text-red-400"}`}>
                              {t.tipo === "ENTRADA" ? "+ " : "- "}R$ {t.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 text-center space-x-2">
                              <button
                                onClick={() => handleAprovarTransaction(t.id, t.categoria)}
                                className="px-2.5 py-1 bg-green-600 hover:bg-green-500 text-black text-[10px] font-bold rounded uppercase transition-colors cursor-pointer"
                              >
                                ✅ Aprovar
                              </button>
                              <button
                                onClick={() => handleRejeitarTransaction(t.id)}
                                className="px-2.5 py-1 bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800/40 text-[10px] font-bold rounded uppercase transition-colors cursor-pointer"
                              >
                                ❌ Rejeitar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Columns layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Form to Launch Transaction */}
                <div className="bg-[#1A1D29] border border-gray-800 p-6 rounded-xl space-y-4 h-fit">
                  <h3 className="text-sm font-semibold tracking-wider uppercase text-[#E2B042] font-[family-name:var(--font-josefin-sans)]">
                    Lançar Transação
                  </h3>
                  <form onSubmit={handleLaunchTransaction} className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase text-gray-400 mb-1">Tipo de Fluxo</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => { setNovaTransacaoTipo("ENTRADA"); setNovaTransacaoCategoria("Cota Condominial"); }}
                          className={`py-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                            novaTransacaoTipo === "ENTRADA"
                              ? "bg-green-950/40 text-green-400 border-green-800"
                              : "bg-[#111622] text-gray-400 border-gray-850 hover:bg-[#161B29]"
                          }`}
                        >
                          🟢 Entrada (Receita)
                        </button>
                        <button
                          type="button"
                          onClick={() => { setNovaTransacaoTipo("SAIDA"); setNovaTransacaoCategoria("Tráfego Pago"); }}
                          className={`py-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                            novaTransacaoTipo === "SAIDA"
                              ? "bg-red-950/40 text-red-400 border-red-800"
                              : "bg-[#111622] text-gray-400 border-gray-850 hover:bg-[#161B29]"
                          }`}
                        >
                          🔴 Saída (Despesa)
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase text-gray-400 mb-1">Descrição</label>
                      <input
                        type="text"
                        required
                        value={novaTransacaoDescricao}
                        onChange={(e) => setNovaTransacaoDescricao(e.target.value)}
                        placeholder="Ex: Assinatura ChatGPT, Anúncio Facebook Ads"
                        className="w-full bg-[#111622] border border-gray-800 rounded-lg p-2 text-xs text-white focus:border-[#E2B042] focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] uppercase text-gray-400 mb-1">Valor (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={novaTransacaoValor}
                          onChange={(e) => setNovaTransacaoValor(e.target.value)}
                          placeholder="0,00"
                          className="w-full bg-[#111622] border border-gray-800 rounded-lg p-2 text-xs text-white focus:border-[#E2B042] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase text-gray-400 mb-1">Data</label>
                        <input
                          type="date"
                          required
                          value={novaTransacaoData}
                          onChange={(e) => setNovaTransacaoData(e.target.value)}
                          className="w-full bg-[#111622] border border-gray-800 rounded-lg p-2 text-xs text-white focus:border-[#E2B042] focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-[10px] uppercase text-gray-400">Categoria</label>
                          <button
                            type="button"
                            onClick={() => { setIsCategoriasModalOpen(true); fetchCategorias(); }}
                            className="text-[9px] text-[#E2B042] hover:text-[#D69E2E] font-bold uppercase transition-colors cursor-pointer"
                          >
                            ⚙️ Gerenciar
                          </button>
                        </div>
                        <select
                          value={novaTransacaoCategoria}
                          onChange={(e) => setNovaTransacaoCategoria(e.target.value)}
                          className="w-full bg-[#111622] border border-gray-800 rounded-lg p-2 text-xs text-white focus:border-[#E2B042] focus:outline-none"
                        >
                          {categorias.length > 0 ? (
                            categorias
                              .filter((cat) => cat.tipo === novaTransacaoTipo)
                              .map((cat) => (
                                <option key={cat.id} value={cat.nome}>{cat.nome}</option>
                              ))
                          ) : (
                            novaTransacaoTipo === "SAIDA" ? (
                              <>
                                <option value="Tráfego Pago">Tráfego Pago</option>
                                <option value="Ferramentas IA">Ferramentas IA</option>
                                <option value="Impostos">Impostos</option>
                                <option value="Design/Edição">Design/Edição</option>
                                <option value="Outros">Outros</option>
                              </>
                            ) : (
                              <>
                                <option value="Cota Condominial">Cota Condominial</option>
                                <option value="Retenção 30% Adsense">Retenção 30% Adsense</option>
                                <option value="Outros">Outros</option>
                              </>
                            )
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase text-gray-400 mb-1">Status</label>
                        <select
                          value={novaTransacaoStatus}
                          onChange={(e) => setNovaTransacaoStatus(e.target.value as any)}
                          className="w-full bg-[#111622] border border-gray-800 rounded-lg p-2 text-xs text-white focus:border-[#E2B042] focus:outline-none"
                        >
                          <option value="PAGO">Pago / Liquidado</option>
                          <option value="PENDENTE">Pendente</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={novaTransacaoLoading}
                      className="w-full py-2.5 bg-[#E2B042] hover:bg-[#D69E2E] disabled:bg-gray-850 text-black text-xs font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer"
                    >
                      {novaTransacaoLoading ? "Processando..." : "🚀 Lançar no Caixa"}
                    </button>
                  </form>
                </div>

                {/* Transactions List */}
                <div className="lg:col-span-2 bg-[#1A1D29] border border-gray-800 p-6 rounded-xl space-y-4">
                  <h3 className="text-sm font-semibold tracking-wider uppercase text-gray-400">
                    Histórico de Lançamentos ({filtroMes})
                  </h3>

                  {financeiroLoading ? (
                    <div className="text-center py-10 text-gray-500 text-xs italic">
                      Buscando movimentações no cosmos...
                    </div>
                  ) : transacoes.length === 0 ? (
                    <div className="text-center py-10 bg-[#111622] rounded-xl border border-gray-850 text-gray-500 text-xs italic">
                      Nenhuma transação lançada para este mês de referência.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-gray-800 text-gray-400 font-bold">
                            <th className="pb-2 font-semibold">Data</th>
                            <th className="pb-2 font-semibold">Descrição</th>
                            <th className="pb-2 font-semibold">Categoria</th>
                            <th className="pb-2 font-semibold text-right">Valor</th>
                            <th className="pb-2 font-semibold text-center">Status</th>
                            <th className="pb-2 font-semibold text-center">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50">
                          {transacoesExibidas.map((t) => (
                            <tr key={t.id} className="hover:bg-[#111622]/30 transition-colors">
                              <td className="py-3 font-mono text-[10px] text-gray-400">
                                {new Date(t.data_transacao).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                              </td>
                              <td className="py-3 font-medium text-white max-w-[200px] truncate" title={t.descricao}>
                                {t.descricao}
                              </td>
                              <td className="py-3">
                                <select
                                  value={t.categoria}
                                  onChange={(e) => handleUpdateTransactionCategory(t.id, e.target.value)}
                                  className="text-[10px] bg-[#111622] text-purple-300 border border-purple-800/40 px-2 py-1 rounded font-medium focus:outline-none focus:border-purple-600 cursor-pointer max-w-[140px] truncate"
                                >
                                  <option value="Cota Condominial">Cota Condominial</option>
                                  <option value="Retenção 30% Adsense">Retenção 30% Adsense</option>
                                  <option value="Tráfego Pago">Tráfego Pago</option>
                                  <option value="Ferramentas IA">Ferramentas IA</option>
                                  <option value="Impostos">Impostos</option>
                                  <option value="Design/Edição">Design/Edição</option>
                                  <option value="Outros">Outros</option>
                                  {categorias.map((cat) => (
                                    !["Cota Condominial", "Retenção 30% Adsense", "Tráfego Pago", "Ferramentas IA", "Impostos", "Design/Edição", "Outros"].includes(cat.nome) && (
                                      <option key={cat.id} value={cat.nome}>{cat.nome}</option>
                                    )
                                  ))}
                                  {!["Cota Condominial", "Retenção 30% Adsense", "Tráfego Pago", "Ferramentas IA", "Impostos", "Design/Edição", "Outros", ...categorias.map(c => c.nome)].includes(t.categoria) && (
                                    <option value={t.categoria}>{t.categoria}</option>
                                  )}
                                </select>
                              </td>
                              <td className={`py-3 text-right font-bold font-mono ${t.tipo === "ENTRADA" ? "text-green-400" : "text-red-400"}`}>
                                {t.tipo === "ENTRADA" ? "+ " : "- "}R$ {t.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 text-center">
                                <button
                                  onClick={() => handleToggleTransactionStatus(t.id, t.status)}
                                  className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-colors cursor-pointer border ${
                                    t.status === "PAGO"
                                      ? "bg-green-950/40 text-green-400 border-green-800/40 hover:bg-green-900/40"
                                      : t.status === "REJEITADO"
                                      ? "bg-red-950/40 text-red-400 border-red-800/40 hover:bg-red-900/40"
                                      : "bg-amber-950/40 text-amber-400 border-amber-800/40 hover:bg-amber-900/40"
                                  }`}
                                >
                                  {t.status === "PAGO" ? "Pago" : t.status === "REJEITADO" ? "Rejeitado" : "Aguardando Aprovação"}
                                </button>
                              </td>
                              <td className="py-3 text-center">
                                <button
                                  onClick={() => handleDeleteTransaction(t.id)}
                                  className="text-[10px] bg-red-950/30 hover:bg-red-900/50 text-red-400 border border-red-800/30 hover:border-red-700/50 px-2 py-1 rounded transition-colors cursor-pointer"
                                >
                                  Excluir
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Controles de Paginação */}
                  {totalPaginasTransacoes > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-gray-800 text-xs text-gray-400 gap-3">
                      <span>
                        Mostrando {(paginaAtualTransacoes - 1) * ITENS_POR_PAGINA + 1} a {Math.min(paginaAtualTransacoes * ITENS_POR_PAGINA, transacoes.length)} de {transacoes.length} lançamentos
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={paginaAtualTransacoes <= 1}
                          onClick={() => setPaginaAtualTransacoes(prev => Math.max(prev - 1, 1))}
                          className="px-3 py-1 bg-[#111622] hover:bg-[#182030] disabled:opacity-40 text-gray-300 border border-gray-800 rounded font-medium transition-colors cursor-pointer"
                        >
                          ← Anterior
                        </button>
                        <span className="font-mono text-white px-2">
                          Página {paginaAtualTransacoes} de {totalPaginasTransacoes}
                        </span>
                        <button
                          type="button"
                          disabled={paginaAtualTransacoes >= totalPaginasTransacoes}
                          onClick={() => setPaginaAtualTransacoes(prev => Math.min(prev + 1, totalPaginasTransacoes))}
                          className="px-3 py-1 bg-[#111622] hover:bg-[#182030] disabled:opacity-40 text-gray-300 border border-gray-800 rounded font-medium transition-colors cursor-pointer"
                        >
                          Próximo →
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Modal de Gerenciamento de Categorias */}
              {isCategoriasModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
                  <div className="bg-[#1A1D29] border border-gray-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl relative">
                    <button
                      type="button"
                      onClick={() => setIsCategoriasModalOpen(false)}
                      className="absolute right-4 top-4 text-gray-400 hover:text-white text-md focus:outline-none cursor-pointer"
                    >
                      ✕
                    </button>
                    <h3 className="text-md font-semibold text-[#E2B042] uppercase tracking-wider font-[family-name:var(--font-josefin-sans)]">
                      Gerenciar Categorias
                    </h3>

                    {/* Form to create new category */}
                    <form onSubmit={handleCreateCategory} className="space-y-3 border-b border-gray-800 pb-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] uppercase text-gray-400 mb-1">Nova Categoria</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Marketing, IA Avançada"
                            value={novaCategoriaNome}
                            onChange={(e) => setNovaCategoriaNome(e.target.value)}
                            className="w-full bg-[#111622] border border-gray-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#E2B042]"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase text-gray-400 mb-1">Tipo de Categoria</label>
                          <select
                            value={novaCategoriaTipo}
                            onChange={(e) => setNovaCategoriaTipo(e.target.value as any)}
                            className="w-full bg-[#111622] border border-gray-800 rounded-lg p-2 text-xs text-white focus:outline-none"
                          >
                            <option value="SAIDA">🔴 Saída (Despesa)</option>
                            <option value="ENTRADA">🟢 Entrada (Receita)</option>
                          </select>
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="w-full py-1.5 bg-[#E2B042] hover:bg-[#D69E2E] text-black text-xs font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer"
                      >
                        ➕ Adicionar Categoria
                      </button>
                    </form>

                    {/* List categories with delete button */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] uppercase text-gray-400 font-semibold">Categorias Cadastradas</h4>
                      <div className="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-none">
                        {categoriasLoading ? (
                          <p className="text-[10px] text-gray-500 italic text-center py-4">Buscando categorias...</p>
                        ) : categorias.length === 0 ? (
                          <p className="text-[10px] text-gray-500 italic text-center py-4">Nenhuma categoria customizada cadastrada.</p>
                        ) : (
                          categorias.map((cat) => (
                            <div key={cat.id} className="flex justify-between items-center bg-[#111622] p-2 rounded border border-gray-850">
                              <div className="flex items-center gap-2">
                                <span className={cat.tipo === "ENTRADA" ? "text-green-400" : "text-red-400"}>
                                  {cat.tipo === "ENTRADA" ? "🟢" : "🔴"}
                                </span>
                                <span className="text-xs text-white font-medium">{cat.nome}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(cat.id)}
                                className="text-[9px] bg-red-950/20 hover:bg-red-900/40 text-red-400 border border-red-800/30 px-2 py-0.5 rounded transition-all cursor-pointer"
                              >
                                Excluir
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          );
        })()}

        {/* Tab 3: Creator Dashboard View */}
        {mounted && activeTab === "creator" && currentUser && (userRole === "admin" || userRole === "creator") && (
          <div className="space-y-8">
            
            {/* Select creator simulation context */}
            {userRole === "admin" ? (
              <div className="flex items-center gap-4 bg-[#1A1D29] p-4 rounded-xl border border-gray-800">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Visualizar como Criador:</label>
                <select
                  value={selectedCreatorId}
                  onChange={e => setSelectedCreatorId(e.target.value)}
                  className="bg-[#111622] border border-gray-800 text-white rounded-lg p-2 text-xs focus:border-[#E2B042] focus:outline-none"
                >
                  {condominos.map(c => (
                    <option key={c.id} value={c.id}>{c.nome_comercial}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-4 bg-[#1A1D29] p-4 rounded-xl border border-gray-800">
                <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Perfil do Criador:</span>
                <span className="text-xs text-white font-bold">{associatedCreator?.nome_comercial}</span>
              </div>
            )}

            {(() => {
              const current = condominos.find(c => c.id === selectedCreatorId);
              if (!current) return <p className="text-center text-gray-400 text-sm">Nenhum criador selecionado.</p>;

              const isEligible = current.status_operacional === "ATIVO_ADIMPLENTE";
              const isSuspended = current.status_operacional === "SUSPENSO_INADIMPLENCIA";
              const isBlockedAssiduidade = current.status_operacional === "BLOQUEADO_ASSIDUIDADE";

              return (
                <div className="flex flex-col lg:flex-row gap-8">
                  
                  {/* SEÇÕES - BARRA LATERAL (DESKTOP) E SUPERIOR (MOBILE) */}
                  <div className="w-full lg:w-64 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 border-b lg:border-b-0 lg:border-r border-gray-800 lg:pr-6 shrink-0 scrollbar-none">
                    <button
                      onClick={() => setCreatorSubTab("gerais")}
                      className={`flex-1 lg:flex-initial text-left px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-3 ${
                        creatorSubTab === "gerais"
                          ? "bg-[#E2B042] text-black shadow-[0_4px_12px_rgba(226,176,66,0.15)]"
                          : "bg-[#1A1D29] text-gray-400 hover:text-white border border-gray-800/60"
                      }`}
                    >
                      <span className="text-base">📊</span> Dados Gerais
                    </button>
                    <button
                      onClick={() => setCreatorSubTab("cosmica")}
                      className={`flex-1 lg:flex-initial text-left px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-3 ${
                        creatorSubTab === "cosmica"
                          ? "bg-[#E2B042] text-black shadow-[0_4px_12px_rgba(226,176,66,0.15)]"
                          : "bg-[#1A1D29] text-gray-400 hover:text-white border border-gray-800/60"
                      }`}
                    >
                      <span className="text-base">🌌</span> Evolução Cósmica
                    </button>
                    <button
                      onClick={() => setCreatorSubTab("onboarding")}
                      className={`flex-1 lg:flex-initial text-left px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-3 ${
                        creatorSubTab === "onboarding"
                          ? "bg-[#E2B042] text-black shadow-[0_4px_12px_rgba(226,176,66,0.15)]"
                          : "bg-[#1A1D29] text-gray-400 hover:text-white border border-gray-800/60"
                      }`}
                    >
                      <span className="text-base">🚀</span> Onboarding & Aulas
                    </button>
                  </div>

                  {/* ÁREA PRINCIPAL DA SEÇÃO ATIVA */}
                  <div className="flex-1 min-w-0">
                    
                    {creatorSubTab === "gerais" && (
                      <div className="space-y-6">
                        
                        {/* Status banner e Adimplência */}
                        <div className="bg-[#1A1D29] border border-gray-800 p-6 rounded-xl mystic-glow relative overflow-hidden">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-2xl font-bold font-[family-name:var(--font-josefin-sans)] text-[#E2B042]">
                                {current.nome_comercial}
                              </h3>
                              <p className="text-xs text-gray-400 font-mono mt-1 flex items-center gap-3">
                                <span>ID Playlist: {current.youtube_channel_id}</span>
                                <a
                                  href={`${API_BASE_URL}/api/condominos/${current.id}/contrato`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-[#E2B042] hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  📄 Contrato
                                </a>
                              </p>
                            </div>
                            <div>
                              <span className={`px-3 py-1 border rounded-full text-xs font-bold uppercase tracking-wider ${
                                isEligible
                                  ? "border-[#38A169] text-[#38A169] bg-green-950/20"
                                  : "border-red-500 text-red-500 bg-red-950/20"
                              }`}>
                                {current.status_operacional.replace("_", " ")}
                              </span>
                            </div>
                          </div>

                          {/* Status Warnings */}
                          {isSuspended && (
                            <div className="mt-6 p-4 bg-red-950/40 border border-red-500/30 rounded-lg text-xs text-red-200">
                              <strong>⚠️ Trava de Inadimplência Asaas Ativada (Cláusula 11ª):</strong> 
                              Sua assinatura de R$ 100,00 está atrasada há mais de 10 dias. Todos os repasses de AdSense e novas postagens estão congelados até a regularização do débito.
                            </div>
                          )}

                          {isBlockedAssiduidade && (
                            <div className="mt-6 p-4 bg-orange-950/40 border border-orange-500/30 rounded-lg text-xs text-orange-200">
                              <strong>⚠️ Trava de Inassiduidade YouTube Ativada (Cláusula 10ª):</strong>
                              Você não publicou vídeos na semana correspondente. Você foi suspenso do rateio do Fundo de Partilha (70%) do mês corrente. Retome as postagens para voltar a participar dos próximos fechamentos.
                            </div>
                          )}

                          {isEligible && (
                            <div className="mt-6 p-4 bg-green-950/40 border border-green-500/30 rounded-lg text-xs text-green-200">
                              <strong>✨ Egrégora Ativa e Alinhada:</strong>
                              Seu canal está em adimplência financeira e cumprindo a cota algorítmica de posts semanais. Você está elegível para o rateio do Fundo de Partilha.
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          
                          {/* Termômetro de Assiduidade Semanal */}
                          <div className="bg-[#1A1D29] border border-gray-800 p-6 rounded-xl space-y-4">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                              Termômetro de Assiduidade Semanal
                            </h4>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 bg-[#111622] h-3.5 rounded-full overflow-hidden border border-gray-800">
                                <div
                                  className="bg-gradient-to-r from-yellow-500 to-[#E2B042] h-full rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min((current.videos_entregues_esta_semana / 3) * 100, 100)}%` }}
                                ></div>
                              </div>
                              <span className="font-mono text-xs font-semibold text-white">
                                {current.videos_entregues_esta_semana}/3 vídeos
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-400 leading-relaxed">
                              Meta semanal exigida pelo algoritmo: <strong>mínimo de 1 vídeo</strong> e máximo de 3.
                            </p>
                            
                            <div className="bg-[#111622] p-3 rounded-lg border border-gray-800 text-[10px] space-y-1.5 font-mono">
                              <div className="flex justify-between">
                                <span>V1: {current.videos_entregues_esta_semana >= 1 ? "✅ Publicado" : "❌ Pendente"}</span>
                                <span className="text-gray-500">Semana Corrente</span>
                              </div>
                              <div className="flex justify-between">
                                <span>V2: {current.videos_entregues_esta_semana >= 2 ? "✅ Publicado" : "⚪ Opcional"}</span>
                                <span className="text-gray-500">Impulsionamento</span>
                              </div>
                              <div className="flex justify-between">
                                <span>V3: {current.videos_entregues_esta_semana >= 3 ? "✅ Publicado" : "⚪ Opcional"}</span>
                                <span className="text-gray-500">Grade Cheia</span>
                              </div>
                            </div>
                          </div>

                          {/* Cota Mensal Asaas */}
                          <div className="bg-[#1A1D29] border border-gray-800 p-6 rounded-xl space-y-4">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                              Cota Mensal Asaas
                            </h4>

                            <div className="bg-[#111622] p-4 rounded-lg border border-gray-800 text-center">
                              <span className="text-[10px] uppercase text-gray-500 block mb-1">Vencimento: Dia 10</span>
                              <span className="text-2xl font-bold font-mono text-[#E2B042]">R$ 100,00</span>
                              
                              {isEligible ? (
                                <div className="mt-3">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-green-950 text-green-400 border border-green-800">
                                    Adimplente (Pago)
                                  </span>
                                  <p className="text-[9px] text-gray-500 mt-2">Cota condominial regularizada.</p>
                                </div>
                              ) : (
                                <div className="mt-4 space-y-3">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-red-950 text-red-400 border border-red-800">
                                    Aguardando Pagamento
                                  </span>
                                  
                                  {loadingPixQr ? (
                                    <div className="flex flex-col items-center justify-center py-4">
                                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E2B042]"></div>
                                      <span className="text-[10px] text-gray-400 mt-2">Buscando QR Code...</span>
                                    </div>
                                  ) : pixQrCode?.success ? (
                                    <div className="space-y-3">
                                      <div className="bg-white p-2 rounded-lg inline-block my-2 shadow-[0_4px_12px_rgba(255,255,255,0.05)]">
                                        <img 
                                          src={`data:image/png;base64,${pixQrCode.encodedImage}`} 
                                          alt="Pix QR Code" 
                                          className="h-32 w-32 object-contain"
                                        />
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <button
                                          onClick={() => {
                                            navigator.clipboard.writeText(pixQrCode.payload);
                                            alert("Código Pix Copia e Cola copiado!");
                                          }}
                                          className="w-full py-1.5 px-3 bg-[#E2B042]/10 hover:bg-[#E2B042]/20 border border-[#E2B042]/30 text-[#E2B042] text-[10px] font-bold rounded transition-colors uppercase tracking-wider cursor-pointer"
                                        >
                                          📋 Copiar Copia e Cola
                                        </button>
                                        
                                        {pixQrCode.invoiceUrl && (
                                          <a
                                            href={pixQrCode.invoiceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block text-center w-full py-1.5 px-3 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] font-bold rounded transition-colors uppercase tracking-wider border border-gray-700"
                                          >
                                            📄 Ver Fatura no Asaas
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-center py-4 text-gray-500">
                                      <p className="text-[10px]">{pixQrCode?.detail || "Nenhum pagamento pendente encontrado."}</p>
                                      <p className="text-[8px] mt-1">Verifique seu e-mail ou o status da sua assinatura no Asaas.</p>
                                    </div>
                                  )}

                                  <p className="text-[9px] text-gray-400 pt-2 border-t border-gray-800/40">
                                    Chave PIX: <code className="text-[#E2B042]">{current.chave_pix || "Chave PIX não cadastrada"}</code>
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                        </div>

                        {/* Demonstrativo de Receitas e Divisão 70/30 */}
                        <div className="bg-[#1A1D29] border border-gray-800 p-6 rounded-xl space-y-6">
                          <h4 className="text-sm font-semibold uppercase tracking-wider text-[#E2B042] font-[family-name:var(--font-josefin-sans)]">
                            Demonstrativo de Receitas e Divisão 70/30
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-[#111622] p-4 rounded-lg border border-gray-800">
                              <span className="text-[10px] text-gray-400 block mb-1">AdSense Bruto do Seu Canal</span>
                              <span className="text-xl font-bold font-mono">
                                R$ {isEligible ? (totalAdsense / (countEligible || 1)).toFixed(2) : "0,00"}
                              </span>
                            </div>
                            <div className="bg-[#111622] p-4 rounded-lg border border-gray-800">
                              <span className="text-[10px] text-gray-400 block mb-1">Sua Cota do Fundo (70%)</span>
                              <span className="text-xl font-bold font-mono text-purple-400">
                                R$ {isEligible ? valuePerEligible.toFixed(2) : "0,00"}
                              </span>
                            </div>
                            <div className="bg-[#111622] p-4 rounded-lg border border-gray-800">
                              <span className="text-[10px] text-gray-400 block mb-1">Sua Taxa Condominial</span>
                              <span className="text-xl font-bold font-mono text-yellow-400">R$ 100,00</span>
                            </div>
                          </div>
     
                          <div className="border-t border-gray-800 pt-4 text-xs space-y-2 text-gray-400">
                            <div className="flex justify-between">
                              <span>Receita Bruta Total Gerada pelo Canal:</span>
                              <span className="font-mono text-white">R$ {isEligible ? (totalAdsense / (countEligible || 1)).toFixed(2) : "0,00"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Desconto Retenção Operacional Adm (30%):</span>
                              <span className="font-mono text-red-400">- R$ {isEligible ? ((totalAdsense / (countEligible || 1)) * 0.3).toFixed(2) : "0,00"}</span>
                            </div>
                            <div className="flex justify-between font-semibold text-white border-t border-gray-800/50 pt-2">
                              <span>Repasse Proporcional Estimado:</span>
                              <span className="font-mono text-green-400">
                                R$ {isEligible ? valuePerEligible.toFixed(2) : "0,00"}
                              </span>
                            </div>
                          </div>
                        </div>

                      </div>
                    )}

                    {creatorSubTab === "cosmica" && (
                      <div className="space-y-6">
                        {performanceData ? (
                          <div className="space-y-6">
                            
                            {/* Metas de Monetização */}
                            <div className="bg-[#1A1D29] border border-gray-800 p-6 rounded-xl space-y-4">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                Metas de Monetização (YouTube 2026)
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Inscritos */}
                                <div className="bg-[#111622] p-4 rounded-lg border border-gray-800">
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-400">Inscritos</span>
                                    <span className="font-mono text-white font-bold">{performanceData.inscritos.atual} / {performanceData.inscritos.meta}</span>
                                  </div>
                                  <div className="bg-[#1A1D29] h-2.5 rounded-full overflow-hidden border border-gray-800">
                                    <div
                                      className="bg-gradient-to-r from-purple-500 to-[#E2B042] h-full rounded-full transition-all duration-500"
                                      style={{ width: `${Math.min((performanceData.inscritos.atual / performanceData.inscritos.meta) * 100, 100)}%` }}
                                    ></div>
                                  </div>
                                </div>
                                {/* Horas */}
                                <div className="bg-[#111622] p-4 rounded-lg border border-gray-800">
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-400">Horas de Exibição</span>
                                    <span className="font-mono text-white font-bold">{performanceData.horas.atual}h / {performanceData.horas.meta}h</span>
                                  </div>
                                  <div className="bg-[#1A1D29] h-2.5 rounded-full overflow-hidden border border-gray-800">
                                    <div
                                      className="bg-gradient-to-r from-purple-500 to-[#E2B042] h-full rounded-full transition-all duration-500"
                                      style={{ width: `${Math.min((performanceData.horas.atual / performanceData.horas.meta) * 100, 100)}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Insights de Conteúdo */}
                            <div className="bg-[#1A1D29] border border-gray-800 p-6 rounded-xl space-y-6">
                              <h4 className="text-sm font-semibold uppercase tracking-wider text-[#E2B042] font-[family-name:var(--font-josefin-sans)]">
                                Evolução Cósmica (Insights do Algoritmo)
                              </h4>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {Object.keys(performanceData.pilares).length === 0 ? (
                                  <div className="col-span-1 md:col-span-2 text-center py-10 bg-[#111622] rounded-xl border border-gray-850 text-gray-400 text-xs italic">
                                    Não há vídeos disponíveis para feedback.
                                  </div>
                                ) : (
                                  Object.entries(performanceData.pilares).map(([key, pilar]: [string, any]) => (
                                    <div key={key} className="bg-[#111622] p-4 rounded-lg border border-gray-800 space-y-3 relative overflow-hidden flex flex-col justify-between">
                                      <div>
                                        <div className="flex justify-between items-center mb-2">
                                          <h5 className="text-xs uppercase text-white font-bold tracking-wider">{pilar.titulo}</h5>
                                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                            pilar.status === "OK" ? "bg-green-950/40 text-green-400 border border-green-800/40" : "bg-red-950/40 text-red-400 border border-red-800/40"
                                          }`}>
                                            {pilar.status}
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-gray-400 leading-relaxed mb-3">{pilar.problema}</p>
                                      </div>
                                      <div className="border-t border-gray-800/50 pt-2 space-y-1">
                                        <div className="text-[9px] text-[#E2B042] font-semibold uppercase tracking-wide">💡 Recomendação:</div>
                                        <p className="text-[11px] text-gray-300 leading-relaxed font-medium mb-2">{pilar.solucao}</p>
                                        <ul className="list-disc pl-4 text-[10px] text-gray-400 space-y-1">
                                          {pilar.acoes.map((acao: string, i: number) => (
                                            <li key={i}>{acao}</li>
                                          ))}
                                        </ul>
                                        {pilar.exemplo && (
                                          <div className="bg-[#1A1D29]/50 p-2 rounded text-[10px] text-gray-500 italic mt-2">
                                            <strong>Exemplo:</strong> {pilar.exemplo}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                          </div>
                        ) : (
                          <div className="bg-[#1A1D29] border border-gray-800 p-6 rounded-xl text-center text-gray-500 text-xs">
                            {loadingPerformance ? "Buscando relatórios cósmicos..." : "Nenhum insight disponível para esta playlist."}
                          </div>
                        )}
                      </div>
                    )}

                    {creatorSubTab === "onboarding" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Onboarding Instructions */}
                        <div className="bg-[#1A1D29] border border-gray-800 p-6 rounded-xl space-y-4 flex flex-col justify-between">
                          <div className="space-y-4">
                            <h4 className="text-sm font-semibold uppercase tracking-wider text-[#E2B042] font-[family-name:var(--font-josefin-sans)]">
                              🚀 Onboarding e Treinamento
                            </h4>
                            <div className="space-y-2">
                              <h5 className="text-xs uppercase text-gray-400 font-semibold">Diretrizes e Rotina de Produção</h5>
                              <div className="bg-[#111622] rounded-lg p-4 border border-gray-800 text-xs text-gray-300 space-y-2 max-h-[220px] overflow-y-auto leading-relaxed">
                                {portalConfigs.production_guidelines.split("\n").map((line, idx) => (
                                  <p key={idx}>{line}</p>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="bg-purple-950/20 border border-purple-500/20 rounded-lg p-4 text-xs text-purple-300 mt-4">
                            <h6 className="font-semibold mb-1">🛎️ Suporte Cosmo Alma TV:</h6>
                            <p className="text-[11px] text-gray-400 whitespace-pre-wrap">{portalConfigs.support_contact}</p>
                          </div>
                        </div>

                        {/* Onboarding Videos & Classes */}
                        <div className="bg-[#1A1D29] border border-gray-800 p-6 rounded-xl space-y-4">
                          <h4 className="text-sm font-semibold uppercase tracking-wider text-[#E2B042] font-[family-name:var(--font-josefin-sans)]">
                            📹 Vídeo de Instrução e Aulas
                          </h4>
                          {getYouTubeEmbedUrl(portalConfigs.onboarding_video_url) ? (
                            <div className="relative pb-[56.25%] h-0 rounded-lg overflow-hidden border border-gray-800 bg-black">
                              <iframe
                                className="absolute top-0 left-0 w-full h-full"
                                src={getYouTubeEmbedUrl(portalConfigs.onboarding_video_url) || ""}
                                title="Vídeo de Integração Cosmo Alma TV"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                              ></iframe>
                            </div>
                          ) : (
                            <div className="bg-[#111622] rounded-lg p-6 border border-gray-800 flex flex-col items-center justify-center text-center h-[180px]">
                              <span className="text-2xl mb-2">📹</span>
                              <p className="text-[11px] text-gray-500">Nenhum vídeo explicativo cadastrado no momento.</p>
                            </div>
                          )}
                          
                          <div className="pt-2">
                            <a
                              href={portalConfigs.whatsapp_link}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#E2B042] hover:bg-[#D69E2E] text-black font-bold rounded-lg text-xs tracking-wider uppercase transition-all shadow-[0_0_10px_rgba(226,176,66,0.15)] cursor-pointer"
                            >
                              💬 Acessar Whatsapp da Comunidade
                            </a>
                          </div>
                        </div>

                      </div>
                    )}

                  </div>

                </div>
              );
            })()}

          </div>
        )}

      </main>
      
      {/* Footer */}
      <footer className="border-t border-[#E2B042]/10 py-6 text-center text-[10px] text-gray-500 bg-[#1A1D29]/50 mt-auto">
        <p>© 2026 Cosmo Alma TV. Todos os direitos reservados à Egrégora de Criadores.</p>
        <p className="mt-1 text-gray-600">Desenvolvido em conformidade com o Contrato V3 e regulamentos do Asaas/YouTube.</p>
      </footer>
      </div>
    </div>
  );
}

function isValidCpf(cpf: string): boolean {
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(10))) return false;

  return true;
}

function isValidCnpj(cnpj: string): boolean {
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  let size = cnpj.length - 2;
  let numbers = cnpj.substring(0, size);
  const digits = cnpj.substring(size);
  let sum = 0;
  let pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  size = size + 1;
  numbers = cleanCnpjOrCpf(cnpj).substring(0, size); // helper to get digits only
  sum = 0;
  pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
}

function cleanCnpjOrCpf(val: string): string {
  return val.replace(/\D/g, "");
}

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }
  return null;
}

