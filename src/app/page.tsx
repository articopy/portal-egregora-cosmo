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
  const [activeTab, setActiveTab] = useState<"onboarding" | "admin" | "creator">("onboarding");
  const [mounted, setMounted] = useState(false);
  const [condominos, setCondominos] = useState<Condomino[]>([]);
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>("");
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<"admin" | "creator" | null>(null);
  const [associatedCreator, setAssociatedCreator] = useState<Condomino | null>(null);

  // Fechamentos state
  const [fechamentos, setFechamentos] = useState<any[]>([]);
  const [closingMonth, setClosingMonth] = useState<string>("2026-06");
  const [closingAdsense, setClosingAdsense] = useState<string>("5000");

  // Onboarding Form State
  const [formData, setFormData] = useState({
    nome_completo: "",
    nome_comercial: "",
    razao_social: "",
    cnpj_cpf: "",
    email: "",
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
  const [formErrors, setFormErrors] = useState<{ email?: string; cnpj_cpf?: string }>({});
  const [portalConfigs, setPortalConfigs] = useState({
    whatsapp_link: "https://chat.whatsapp.com/C7nExemploGrupo",
    onboarding_video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    production_guidelines: "1. Frequência: Publique entre 1 a 3 vídeos por semana para manter o engajamento algorítmico.\n2. Qualidade: Vídeos em formato 16:9, resolução mínima 1080p, áudio limpo e sem ruídos.\n3. Identidade Visual: Utilize as vinhetas oficiais fornecidas na biblioteca do canal.",
    support_contact: "Contato direto: suporte@cosmoalmatv.com.br ou pelo Telegram @SuporteCosmo"
  });
  const [editConfigs, setEditConfigs] = useState({
    whatsapp_link: "",
    onboarding_video_url: "",
    production_guidelines: "",
    support_contact: ""
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
          videos_entregues_esta_semana: c.status === "ATIVO_ADIMPLENTE" ? 2 : 0,
          receita_adsense_gerada: c.status === "ATIVO_ADIMPLENTE" ? 1450.00 : 0
        }));
        setCondominos(mapped);
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

  const determineUserRoleAndCreator = async (user: User) => {
    const adminEmails = [
      "admin@portal.cosmoalmatv.com.br",
      "alexandre.p@portal.cosmoalmatv.com.br",
      "marcos.caram@portal.cosmoalmatv.com.br",
      "carlos.falcon@portal.cosmoalmatv.com.br"
    ];
    const isAdmin = adminEmails.includes(user.email || "") || 
                    user.user_metadata?.role === "admin";
    
    if (isAdmin) {
      setUserRole("admin");
      setActiveTab("admin");
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

        const res = await fetch(`${API_BASE_URL}/api/condominos`, { headers });
        if (res.ok) {
          const data = await res.json();
          const match = data.find((c: any) => c.email.toLowerCase() === user.email?.toLowerCase());
          if (match) {
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
              videos_entregues_esta_semana: match.status === "ATIVO_ADIMPLENTE" ? 2 : 0,
              receita_adsense_gerada: match.status === "ATIVO_ADIMPLENTE" ? 1450.00 : 0
            });
          }
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
    fetchConfigs();

    const savedLogs = localStorage.getItem("egregora_logs");
    if (savedLogs) {
      setLogs(JSON.parse(savedLogs));
    } else {
      const initialLogs: LogEntry[] = [
        {
          id: "log-1",
          timestamp: new Date().toLocaleTimeString(),
          tipo: "SISTEMA",
          mensagem: "Sistema Egrégora inicializado com sucesso."
        }
      ];
      setLogs(initialLogs);
      localStorage.setItem("egregora_logs", JSON.stringify(initialLogs));
    }

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const saveState = (updatedCondominos: Condomino[], updatedLogs: LogEntry[]) => {
    setCondominos(updatedCondominos);
    setLogs(updatedLogs);
    localStorage.setItem("egregora_logs", JSON.stringify(updatedLogs));
  };

  const addLog = (tipo: LogEntry["tipo"], mensagem: string, currentCondominos = condominos) => {
    const newLog: LogEntry = {
      id: "log-" + Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      tipo,
      mensagem
    };
    const newLogs = [newLog, ...logs].slice(0, 50); // Keep last 50 logs
    setLogs(newLogs);
    localStorage.setItem("egregora_logs", JSON.stringify(newLogs));
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

    const errors: { email?: string; cnpj_cpf?: string } = {};

    // Validate email format
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Formato de e-mail inválido (ex: exemplo@dominio.com).";
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
          youtube_id: formData.youtube_channel_id,
          chave_pix: formData.chave_pix,
          genero: formData.genero,
          estado_civil: formData.estado_civil,
          cep: formData.cep,
          endereco: `${formData.endereco}${formData.numero ? ', n° ' + formData.numero : ''}${formData.complemento ? ' - ' + formData.complemento : ''}`,
          cidade: formData.cidade,
          uf: formData.uf,
          pais: formData.pais
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        alert(`Erro no onboarding: ${errData.detail || "Erro desconhecido"}`);
        return;
      }

      const created = await res.json();

      const contractText = `
CONTRATO DE PARCERIA E CONDOMÍNIO AUDIOVISUAL V2 - COSMO ALMA TV
------------------------------------------------------------------
CONTRATADA: COSMO ALMA TV LTDA
CONTRATANTE: ${created.razao_social}
NOME COMERCIAL: ${created.nome_comercial}
CPF/CNPJ: ${created.cnpj_cpf}
E-MAIL: ${created.email}
PIX: ${created.chave_pix}
CANAL ID: ${created.youtube_id}

CLÁUSULA 9ª - O CONDOMÍNIO AUDIOVISUAL
A contratante compromete-se ao repasse mensal de taxa de cota fixa operacional no valor de R$ 100,00 (cem reais) com vencimento recorrente todo dia 10.

CLÁUSULA 10ª - A ASSIDUIDADE DE CONTEÚDO
Para a correta tração algorítmica da grade, a contratante compromete-se a publicar entre 1 e 3 vídeos semanais no canal.

CLÁUSULA 11ª - PENALIDADE POR INADIMPLÊNCIA E INASSIDUIDADE
O atraso superior a 10 (dez) dias corridos na cota fixa resultará na imediata alteração de status para SUSPENSO_INADIMPLENCIA, travando repasses de AdSense. A inobservância da assiduidade sem justificativa resultará em BLOQUEADO_ASSIDUIDADE, excluindo o parceiro do rateio da partilha 70/30 no mês correspondente.

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
          mensagem: `Contrato V2 assinado digitalmente por ${signed.nome_comercial}. Minuta DOCX gerada.`
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

  const resetDB = () => {
    if (confirm("Deseja realmente reiniciar o banco de dados simulado?")) {
      localStorage.removeItem("egregora_condominos");
      localStorage.removeItem("egregora_logs");
      setCondominos(DEFAULT_CONDOMINOS);
      setLogs([
        {
          id: "log-init",
          timestamp: new Date().toLocaleTimeString(),
          tipo: "SISTEMA",
          mensagem: "Banco de dados restaurado aos padrões do PRD."
        }
      ]);
      alert("Banco restaurado!");
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
  const currentAdsenseInput = parseFloat(closingAdsense) || 0;

  const totalAdsense = latestFechamento ? latestFechamento.receita_bruta_adsense : currentAdsenseInput;
  const retencao30 = latestFechamento ? latestFechamento.retencao_adm_30 : totalAdsense * 0.30;
  const fundoPartilha70 = latestFechamento ? latestFechamento.fundo_partilha_70 : totalAdsense * 0.70;

  // Active / Paid condôminos who are allowed to participate in the split
  const splitEligibleCondominos = condominos.filter(c => c.status_operacional === "ATIVO_ADIMPLENTE");
  const countEligible = latestFechamento ? latestFechamento.qtd_condominos_ativos : splitEligibleCondominos.length;
  const valuePerEligible = latestFechamento ? latestFechamento.valor_por_condomino : (countEligible > 0 ? fundoPartilha70 / countEligible : 0);

  return (
    <div className="min-h-screen bg-[#111622] nebula-gradient flex flex-col font-sans">
      {/* Mystical Header */}
      <header className="border-b border-[#E2B042]/20 py-4 px-6 md:px-12 flex flex-col md:flex-row justify-between items-center bg-[#1A1D29]/75 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3 mb-4 md:mb-0">
          <div className="h-10 w-10 rounded-full border border-[#E2B042] flex items-center justify-center bg-[#111622] text-[#E2B042] font-semibold text-lg mystic-glow">
            Ω
          </div>
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
              {/* Public Tab */}
              {(!currentUser || userRole === "admin") && (
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
              )}

              {/* Admin Tab */}
              {currentUser && userRole === "admin" && (
                <button
                  onClick={() => setActiveTab("admin")}
                  className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wider transition-all duration-300 cursor-pointer ${
                    activeTab === "admin"
                      ? "bg-[#E2B042] text-black shadow-[0_0_15px_rgba(226,176,66,0.4)]"
                      : "bg-[#1A1D29] text-gray-300 hover:text-white border border-[#E2B042]/20"
                  }`}
                >
                  📊 PAINEL GESTÃO (ADMIN)
                </button>
              )}

              {/* Creator Tab */}
              {currentUser && (userRole === "admin" || userRole === "creator") && (
                <button
                  onClick={() => {
                    setActiveTab("creator");
                    if (userRole === "creator" && associatedCreator) {
                      setSelectedCreatorId(associatedCreator.id);
                    } else if (!selectedCreatorId && condominos.length > 0) {
                      setSelectedCreatorId(condominos[0].id);
                    }
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wider transition-all duration-300 cursor-pointer ${
                    activeTab === "creator"
                      ? "bg-[#E2B042] text-black shadow-[0_0_15px_rgba(226,176,66,0.4)]"
                      : "bg-[#1A1D29] text-gray-300 hover:text-white border border-[#E2B042]/20"
                  }`}
                >
                  🧘 ÁREA DO CRIADOR
                </button>
              )}

              {/* Login / Logout Button */}
              {!currentUser ? (
                <button
                  onClick={() => router.push("/login")}
                  className="px-4 py-2 rounded-full text-xs font-semibold tracking-wider bg-[#1A1D29] text-[#E2B042] hover:text-white border border-[#E2B042]/40 hover:bg-[#E2B042]/10 transition-all cursor-pointer font-bold"
                >
                  🔑 ENTRAR
                </button>
              ) : (
                <div className="flex items-center gap-3 ml-2 border-l border-gray-800 pl-3">
                  <span className="text-[10px] text-gray-400 font-mono hidden md:inline truncate max-w-[120px]" title={currentUser.email}>
                    {currentUser.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-950/40 text-red-400 hover:text-red-300 border border-red-900/50 hover:bg-red-900/30 transition-all cursor-pointer"
                  >
                    🚪 SAIR
                  </button>
                </div>
              )}
            </>
          )}
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full">
        
        {/* Tab 1: Onboarding Form */}
        {mounted && (activeTab === "onboarding" || !currentUser) && (
          <div className="max-w-2xl mx-auto bg-[#1A1D29] border border-[#E2B042]/20 p-8 rounded-2xl mystic-glow relative overflow-hidden">
            <div className="absolute top-0 right-0 h-40 w-40 bg-purple-500/10 rounded-full blur-3xl"></div>
            
            {isOnboardingCompleted ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">✨</div>
                <h3 className="text-2xl font-semibold text-[#E2B042] mb-2 font-[family-name:var(--font-josefin-sans)]">Bem-vindo à Egrégora!</h3>
                <p className="text-sm text-gray-300 mb-6">
                  Seu cadastro foi recebido com sucesso e o contrato V2 foi assinado digitalmente.
                  Uma assinatura de cota fixa mensal de R$ 100,00 foi criada no Asaas.
                </p>
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
                    onClick={() => setActiveTab("creator")}
                    className="px-6 py-2 bg-[#E2B042] hover:bg-[#D69E2E] text-black font-semibold rounded-lg text-sm transition-all"
                  >
                    Acessar Painel do Criador
                  </button>
                  <button
                    onClick={() => setIsOnboardingCompleted(false)}
                    className="px-6 py-2 border border-gray-600 rounded-lg text-sm hover:bg-[#111622] transition-all"
                  >
                    Nova Inscrição
                  </button>
                </div>
              </div>
            ) : signingContract ? (
              <div>
                <h3 className="text-lg font-semibold text-[#E2B042] mb-4">Assinatura do Contrato V2 no Assinafy</h3>
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
                  <p className="text-xs text-gray-400 mt-1">Preencha seus dados para geração e assinatura do Contrato V2</p>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">YouTube Channel ID (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ex: UC_exemplo123"
                      value={formData.youtube_channel_id}
                      onChange={e => setFormData({ ...formData, youtube_channel_id: e.target.value })}
                      className="w-full bg-[#111622] border border-gray-800 rounded-lg p-2.5 text-sm focus:border-[#E2B042] focus:outline-none transition-colors"
                    />
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
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full py-3 bg-[#E2B042] hover:bg-[#D69E2E] text-black font-bold rounded-lg text-sm tracking-wider uppercase transition-all shadow-[0_4px_12px_rgba(226,176,66,0.2)]"
                  >
                    Gerar Minuta de Contrato V2
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

            {/* SVG Charts Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Chart 1: AdSense Revenue */}
              <div className="bg-[#1A1D29] border border-gray-800 p-6 rounded-xl mystic-glow space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-[#E2B042] font-[family-name:var(--font-josefin-sans)]">
                    Histórico Faturamento AdSense
                  </h4>
                  <span className="text-[10px] text-gray-500 font-mono">Últimos 6 meses</span>
                </div>
                <div className="h-44 w-full flex items-end pt-4">
                  <svg className="w-full h-full" viewBox="0 0 400 150">
                    {/* Grid lines */}
                    <line x1="0" y1="20" x2="400" y2="20" stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
                    <line x1="0" y1="60" x2="400" y2="60" stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
                    <line x1="0" y1="100" x2="400" y2="100" stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
                    {/* Graph Line */}
                    <path
                      d="M 20 120 Q 80 100, 140 85 T 260 55 T 380 25"
                      fill="none"
                      stroke="#E2B042"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    {/* Glow effect under the line */}
                    <path
                      d="M 20 120 Q 80 100, 140 85 T 260 55 T 380 25 L 380 150 L 20 150 Z"
                      fill="url(#adsenseGlow)"
                      opacity="0.1"
                    />
                    {/* Dots at data points */}
                    <circle cx="20" cy="120" r="4" fill="#E2B042" />
                    <circle cx="100" cy="102" r="4" fill="#E2B042" />
                    <circle cx="180" cy="78" r="4" fill="#E2B042" />
                    <circle cx="260" cy="55" r="4" fill="#E2B042" />
                    <circle cx="340" cy="38" r="4" fill="#E2B042" />
                    <circle cx="380" cy="25" r="4" fill="#E2B042" />
                    {/* Define Gradient */}
                    <defs>
                      <linearGradient id="adsenseGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#E2B042" />
                        <stop offset="100%" stopColor="transparent" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div className="flex justify-between text-[9px] text-gray-500 font-mono">
                  <span>Jan (R$ 4.2k)</span>
                  <span>Fev</span>
                  <span>Mar</span>
                  <span>Abr</span>
                  <span>Mai</span>
                  <span>Jun (R$ 10.2k)</span>
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
                              <div><strong>Canal ID:</strong> {testYoutubeResult.channel_id}</div>
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
                  <h3 className="text-sm font-semibold tracking-wider uppercase text-gray-400">
                    Logs da Egrégora
                  </h3>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      Link do Vídeo do YouTube (Boas-Vindas/Treinamento)
                    </label>
                    <input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={editConfigs.onboarding_video_url}
                      onChange={e => setEditConfigs({ ...editConfigs, onboarding_video_url: e.target.value })}
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Left Column: Status card and financials */}
                  <div className="lg:col-span-2 space-y-6">
                    
                    {/* Status banner */}
                    <div className="bg-[#1A1D29] border border-gray-800 p-6 rounded-xl mystic-glow relative overflow-hidden">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-2xl font-bold font-[family-name:var(--font-josefin-sans)] text-[#E2B042]">
                            {current.nome_comercial}
                          </h3>
                          <p className="text-xs text-gray-400 font-mono mt-1 flex items-center gap-3">
                            <span>ID Canal: {current.youtube_channel_id}</span>
                            <a
                              href={`${API_BASE_URL}/api/condominos/${current.id}/contrato`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-[#E2B042] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              📄 Baixar Contrato DOCX
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

                    {/* Proportional Extrato */}
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
                          <span className="text-[9px] text-gray-500 block mt-1">
                            {isEligible ? "Status Adimplente habilitado" : "Bloqueado por inadimplência/assiduidade"}
                          </span>
                        </div>
                        <div className="bg-[#111622] p-4 rounded-lg border border-gray-800">
                          <span className="text-[10px] text-gray-400 block mb-1">Sua Taxa Condominial</span>
                          <span className="text-xl font-bold font-mono text-yellow-400">R$ 100,00</span>
                          <span className="text-[9px] text-gray-500 block mt-1">Dia 10 todo mês</span>
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

                    {/* Guia de Integração e Onboarding do Criador */}
                    <div className="bg-[#1A1D29] border border-gray-800 p-6 rounded-xl space-y-6">
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-[#E2B042] font-[family-name:var(--font-josefin-sans)]">
                        🚀 Manual de Onboarding e Treinamento do Criador
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Onboarding Video Embed */}
                        <div className="space-y-3">
                          <h5 className="text-xs uppercase text-gray-400 font-semibold">Vídeo de Instrução / Boas-Vindas</h5>
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
                          
                          {/* Comunidade Whatsapp Button */}
                          <div className="pt-2">
                            <a
                              href={portalConfigs.whatsapp_link}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#E2B042] hover:bg-[#D69E2E] text-black font-bold rounded-lg text-xs tracking-wider uppercase transition-all shadow-[0_0_10px_rgba(226,176,66,0.15)] cursor-pointer"
                            >
                              💬 Entrar na Comunidade Oficial do WhatsApp
                            </a>
                          </div>
                        </div>

                        {/* Onboarding Guidelines & Support */}
                        <div className="space-y-4 flex flex-col justify-between">
                          <div className="space-y-2">
                            <h5 className="text-xs uppercase text-gray-400 font-semibold">Diretrizes e Rotina de Produção</h5>
                            <div className="bg-[#111622] rounded-lg p-4 border border-gray-800 text-xs text-gray-300 space-y-2 max-h-[190px] overflow-y-auto leading-relaxed">
                              {portalConfigs.production_guidelines.split("\n").map((line, idx) => (
                                <p key={idx}>{line}</p>
                              ))}
                            </div>
                          </div>

                          <div className="bg-purple-950/20 border border-purple-500/20 rounded-lg p-4 text-xs text-purple-300">
                            <h6 className="font-semibold mb-1">🛎️ Suporte Cosmo Alma TV:</h6>
                            <p className="text-[11px] text-gray-400 whitespace-pre-wrap">{portalConfigs.support_contact}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Weekly Upload checklist & Payments */}
                  <div className="space-y-6">
                    
                    {/* Weekly Performance Termometer */}
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
                        Meta semanal exigida pelo algoritmo do YouTube: <strong>mínimo de 1 vídeo</strong> e máximo de 3.
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

                    {/* Asaas Payment simulator */}
                    <div className="bg-[#1A1D29] border border-gray-800 p-6 rounded-xl space-y-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Cota Mensal Asaas
                      </h4>

                      <div className="bg-[#111622] p-4 rounded-lg border border-gray-800 text-center">
                        <span className="text-[10px] uppercase text-gray-500 block mb-1">Vencimento: Dia 10</span>
                        <span className="text-2xl font-bold font-mono text-[#E2B042]">R$ 100,00</span>
                        
                        {isEligible ? (
                          <span className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-green-950 text-green-400 border border-green-800">
                            Adimplente (Pago)
                          </span>
                        ) : (
                          <div className="mt-4 space-y-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-red-950 text-red-400 border border-red-800">
                              Aguardando Pagamento
                            </span>
                            <div className="bg-white p-2 rounded-lg inline-block my-2">
                              {/* Simulated QR Code for Pix */}
                              <div className="h-24 w-24 bg-gray-300 flex items-center justify-center text-[10px] text-black font-mono">
                                [ PIX QR CODE ]
                              </div>
                            </div>
                            <p className="text-[9px] text-gray-400">
                              Chave PIX Cadastrada: <code className="text-[#E2B042]">{current.chave_pix}</code>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

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
        <p className="mt-1 text-gray-600">Desenvolvido em conformidade com o Contrato V2 e regulamentos do Asaas/YouTube.</p>
      </footer>
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

