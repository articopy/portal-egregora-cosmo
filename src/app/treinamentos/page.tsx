'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import styles from './treinamentos.module.css';

// Types
export interface TreinamentoModulo {
  id: string;
  titulo: string;
  descricao: string;
  icone: string;
  ordem: number;
  obrigatorio: boolean;
  ativo: boolean;
  created_at?: string;
}

export interface MaterialAnexo {
  nome: string;
  url: string;
  tipo: 'pdf' | 'link' | 'drive' | 'canva' | 'outro';
}

export interface TreinamentoAula {
  id: string;
  modulo_id: string;
  titulo: string;
  descricao: string;
  video_provider: 'youtube' | 'vimeo';
  video_url: string;
  thumbnail_url?: string;
  duracao_minutos: number;
  ordem: number;
  materiais_anexos: MaterialAnexo[];
  created_at?: string;
}

export interface TreinamentoProgresso {
  id?: string;
  condomino_id: string;
  aula_id: string;
  concluido: boolean;
  concluido_em?: string;
}

export interface TreinamentoComentario {
  id: string;
  aula_id: string;
  autor_id?: string;
  autor_nome: string;
  autor_role: 'admin' | 'creator';
  comentario: string;
  resposta_de_id?: string;
  created_at: string;
}

// Initial Mock / Seed Data
const DEFAULT_MODULOS: TreinamentoModulo[] = [
  {
    id: 'mod-1',
    titulo: 'Normas & Diretrizes da Egrégora',
    descricao: 'Regulamento oficial, diretrizes de conduta, frequência semanal obrigatória e termos de conformidade da Cosmo Alma TV.',
    icone: '📜',
    ordem: 1,
    obrigatorio: true,
    ativo: true,
  },
  {
    id: 'mod-2',
    titulo: 'Padrão de Gravação & Qualidade Técnica',
    descricao: 'Recomendações técnicas para captação de áudio cristalino, iluminação correta e enquadramento em alta resolução.',
    icone: '🎙️',
    ordem: 2,
    obrigatorio: true,
    ativo: true,
  },
  {
    id: 'mod-3',
    titulo: 'SEO, Títulos de Alta Conversão & Retenção',
    descricao: 'Estratégias de algoritmo do YouTube: ganchos nos primeiros 30 segundos, thumbnails atrativas e palavras-chave cósmicas.',
    icone: '🚀',
    ordem: 3,
    obrigatorio: false,
    ativo: true,
  },
  {
    id: 'mod-4',
    titulo: 'Biblioteca de Assets, Vinhetas & Kit Oficial',
    descricao: 'Instruções de aplicação das vinhetas oficiais em 4K, trilhas sonoras autorizadas e templates de capas editáveis no Canva.',
    icone: '📦',
    ordem: 4,
    obrigatorio: false,
    ativo: true,
  }
];

const DEFAULT_AULAS: TreinamentoAula[] = [
  {
    id: 'aula-1',
    modulo_id: 'mod-1',
    titulo: 'Manual de Boas-Vindas e o Contrato V2 da Egrégora',
    descricao: 'Entenda os princípios da divisão 70/30, a taxa condominial de R$ 100 via Asaas e as regras de pontualidade algorítmica.',
    video_provider: 'youtube',
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnail_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
    duracao_minutos: 12,
    ordem: 1,
    materiais_anexos: [
      { nome: 'Regulamento Interno Cosmo Alma TV (PDF)', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', tipo: 'pdf' },
      { nome: 'Guia Rápido de Onboarding & Contrato V2', url: 'https://docs.google.com', tipo: 'drive' }
    ]
  },
  {
    id: 'aula-2',
    modulo_id: 'mod-1',
    titulo: 'Frequência Algorítmica: A Meta de 1 a 3 Vídeos Semanais',
    descricao: 'Como a consistência de envios alimenta o robô do YouTube e previne bloqueios de assiduidade.',
    video_provider: 'youtube',
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnail_url: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&auto=format&fit=crop&q=80',
    duracao_minutos: 8,
    ordem: 2,
    materiais_anexos: [
      { nome: 'Calendário Editorial Recomendado', url: 'https://canva.com', tipo: 'canva' }
    ]
  },
  {
    id: 'aula-3',
    modulo_id: 'mod-2',
    titulo: 'Acústica e Captação de Microfone em Home Studio',
    descricao: 'Dicas práticas para eliminar eco, usar filtros anti-pop e equalizar sua voz com softwares gratuitos.',
    video_provider: 'vimeo',
    video_url: 'https://vimeo.com/76979871',
    thumbnail_url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&auto=format&fit=crop&q=80',
    duracao_minutos: 15,
    ordem: 1,
    materiais_anexos: [
      { nome: 'Checklist de Verificação de Áudio (PDF)', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', tipo: 'pdf' }
    ]
  },
  {
    id: 'aula-4',
    modulo_id: 'mod-3',
    titulo: 'Arquitetura do Título Cósmico & Thumbnails Magnéticas',
    descricao: 'Como despertar curiosidade e alinhar espiritualidade/autoconhecimento com alta taxa de cliques (CTR).',
    video_provider: 'youtube',
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnail_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    duracao_minutos: 20,
    ordem: 1,
    materiais_anexos: [
      { nome: 'Template de Capas em Alta Resolução (Canva)', url: 'https://canva.com', tipo: 'canva' }
    ]
  }
];

export default function TreinamentosPage() {
  const router = useRouter();

  // Navigation & User State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'admin' | 'creator'>('creator');
  const [currentCondominoId, setCurrentCondominoId] = useState<string>('');
  const [condominos, setCondominos] = useState<any[]>([]);

  // Main UI State: 'catalog' | 'player' | 'admin'
  const [viewMode, setViewMode] = useState<'catalog' | 'player' | 'admin'>('catalog');
  const [adminTab, setAdminTab] = useState<'content' | 'audit' | 'doubts'>('content');
  const [playerTab, setPlayerTab] = useState<'overview' | 'materials' | 'comments'>('overview');

  // Content Data
  const [modulos, setModulos] = useState<TreinamentoModulo[]>([]);
  const [aulas, setAulas] = useState<TreinamentoAula[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const [activeAula, setActiveAula] = useState<TreinamentoAula | null>(null);
  const [progressos, setProgressos] = useState<TreinamentoProgresso[]>([]);
  const [comentarios, setComentarios] = useState<TreinamentoComentario[]>([]);
  const [novoComentario, setNovoComentario] = useState<string>('');
  const [respostaComentarioId, setRespostaComentarioId] = useState<string | null>(null);
  const [respostaTexto, setRespostaTexto] = useState<string>('');

  // Modals for Admin CMS
  const [isModuloModalOpen, setIsModuloModalOpen] = useState(false);
  const [editingModulo, setEditingModulo] = useState<Partial<TreinamentoModulo> | null>(null);

  const [isAulaModalOpen, setIsAulaModalOpen] = useState(false);
  const [editingAula, setEditingAula] = useState<Partial<TreinamentoAula> | null>(null);
  const [anexoTab, setAnexoTab] = useState<'upload' | 'link'>('upload');
  const [novoAnexoNome, setNovoAnexoNome] = useState('');
  const [novoAnexoUrl, setNovoAnexoUrl] = useState('');
  const [novoAnexoTipo, setNovoAnexoTipo] = useState<'pdf' | 'link' | 'drive' | 'canva' | 'outro'>('pdf');
  const [isUploadingAnexo, setIsUploadingAnexo] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const [isFetchingVideoInfo, setIsFetchingVideoInfo] = useState(false);
  const [videoInfoFeedback, setVideoInfoFeedback] = useState<string | null>(null);
  const [notificandoModulo, setNotificandoModulo] = useState<TreinamentoModulo | null>(null);
  const [isSendingEmailNotification, setIsSendingEmailNotification] = useState(false);
  const [emailNotificationFeedback, setEmailNotificationFeedback] = useState<string | null>(null);
  const [notificandoCondominoId, setNotificandoCondominoId] = useState<string | null>(null);
  const [individualNotificationFeedback, setIndividualNotificationFeedback] = useState<string | null>(null);

  // Individual Creator Training Reminder Trigger
  async function handleNotifyIndividualCondomino(cond: any) {
    setNotificandoCondominoId(cond.id);
    setIndividualNotificationFeedback(null);
    try {
      const adminName = currentUser?.user_metadata?.nome || (currentUser?.email ? currentUser.email.split('@')[0] : 'Administração Cosmo Alma TV');
      const res = await fetch('/api/treinamentos/notificar-criadores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          condominoId: cond.id,
          adminName
        })
      });

      const data = await res.json();
      if (data && data.success) {
        setIndividualNotificationFeedback(`✓ ${data.message}`);
        setTimeout(() => setIndividualNotificationFeedback(null), 6000);
      } else {
        alert(data?.error || 'Erro ao disparar lembrete por e-mail.');
      }
    } catch (err: any) {
      alert('Erro de conexão ao enviar e-mail.');
    } finally {
      setNotificandoCondominoId(null);
    }
  }

  // Email Notification Trigger
  async function handleSendTrainingEmailNotification(modulo: TreinamentoModulo) {
    setIsSendingEmailNotification(true);
    setEmailNotificationFeedback(null);
    try {
      const moduloAulas = aulas.filter((a) => a.modulo_id === modulo.id);
      const res = await fetch('/api/treinamentos/notificar-criadores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduloId: modulo.id,
          moduloData: modulo,
          aulasData: moduloAulas
        })
      });

      const data = await res.json();
      if (data && data.success) {
        setEmailNotificationFeedback(`✓ ${data.message}`);
      } else {
        alert(data?.error || 'Erro ao disparar notificações por e-mail.');
      }
    } catch (err: any) {
      alert('Erro de conexão ao enviar e-mails.');
    } finally {
      setIsSendingEmailNotification(false);
    }
  }

  // Direct File Upload to Supabase Storage
  async function handleDirectFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAnexo(true);
    setUploadFeedback(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/treinamentos/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data && data.success) {
        const novoAnexo: MaterialAnexo = {
          nome: data.nome,
          url: data.url,
          tipo: data.tipo || 'pdf'
        };
        const currentList = editingAula?.materiais_anexos || [];
        setEditingAula({
          ...editingAula,
          materiais_anexos: [...currentList, novoAnexo]
        });
        setUploadFeedback(`✓ Arquivo "${data.nome}" enviado com sucesso!`);
      } else {
        alert(data?.error || 'Erro ao realizar upload do arquivo.');
      }
    } catch (err: any) {
      alert('Erro na conexão com o servidor de upload.');
    } finally {
      setIsUploadingAnexo(false);
      e.target.value = '';
    }
  }

  // Auto-fetch duration, title and thumbnail from YouTube & Vimeo
  async function handleAutoFetchVideoInfo(url: string, provider: 'youtube' | 'vimeo') {
    if (!url || url.trim().length < 5) return;
    setIsFetchingVideoInfo(true);
    setVideoInfoFeedback(null);
    try {
      const res = await fetch('/api/treinamentos/video-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), provider })
      });
      const data = await res.json();
      if (data && data.success) {
        setEditingAula((prev) => ({
          ...prev,
          video_provider: data.provider || provider,
          duracao_minutos: data.durationMinutes > 0 ? data.durationMinutes : (prev?.duracao_minutos || 1),
          titulo: prev?.titulo && prev.titulo.trim() !== '' ? prev.titulo : data.title || '',
          descricao: prev?.descricao && prev.descricao.trim() !== '' ? prev.descricao : data.description || '',
          thumbnail_url: prev?.thumbnail_url && prev.thumbnail_url.trim() !== '' ? prev.thumbnail_url : data.thumbnailUrl || ''
        }));
        if (data.durationMinutes > 0) {
          setVideoInfoFeedback(`⚡ Duração e dados detectados automaticamente: ${data.durationMinutes} min`);
        } else {
          setVideoInfoFeedback(`✓ Link validado com sucesso`);
        }
      }
    } catch (err) {
      console.warn('Erro ao auto-detectar vídeo:', err);
    } finally {
      setIsFetchingVideoInfo(false);
    }
  }

  // Load session & data from Supabase
  useEffect(() => {
    async function loadSessionAndData() {
      setIsLoadingContent(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let loggedEmail = '';
        let isAdminUser = false;
        let loggedUser: any = null;

        if (session && session.user) {
          loggedUser = session.user;
          setCurrentUser(session.user);
          loggedEmail = session.user.email?.trim().toLowerCase() || '';
          const ADMIN_EMAILS = [
            'admin@portal.cosmoalmatv.com.br',
            'alexandre.p@portal.cosmoalmatv.com.br',
            'marcos.caram@portal.cosmoalmatv.com.br',
            'carlos.falcon@portal.cosmoalmatv.com.br',
            'articopyagencia@gmail.com',
            'marcos.caram@gmail.com',
            'alexandre.tjk@gmail.com'
          ];
          isAdminUser = ADMIN_EMAILS.includes(loggedEmail) || session.user.user_metadata?.role === 'admin';
          setUserRole(isAdminUser ? 'admin' : 'creator');
        } else {
          setUserRole('creator');
        }

        // Fetch condominos
        const { data: condData } = await supabase.from('condominos').select('*');
        if (condData && condData.length > 0) {
          setCondominos(condData);
          if (loggedEmail) {
            const foundCond = condData.find((c: any) => c.email?.trim().toLowerCase() === loggedEmail);
            if (foundCond) {
              setCurrentCondominoId(foundCond.id);
            } else if (!isAdminUser) {
              const foundByName = condData.find((c: any) => 
                c.nome_comercial?.trim().toLowerCase() === loggedUser?.user_metadata?.nome?.trim().toLowerCase()
              );
              if (foundByName) {
                setCurrentCondominoId(foundByName.id);
              }
            }
          }
        }

        // Fetch DB data from Supabase directly
        const { data: modulosDB, error: modErr } = await supabase
          .from('treinamento_modulos')
          .select('*')
          .order('ordem', { ascending: true });

        if (!modErr && Array.isArray(modulosDB)) {
          setModulos(modulosDB);
        }

        const { data: aulasDB, error: aulErr } = await supabase
          .from('treinamento_aulas')
          .select('*')
          .order('ordem', { ascending: true });

        if (!aulErr && Array.isArray(aulasDB)) {
          setAulas(aulasDB);
        }

        const { data: progressoDB } = await supabase.from('treinamento_progresso').select('*');
        if (progressoDB && Array.isArray(progressoDB)) {
          setProgressos(progressoDB);
        }

        const { data: comentariosDB } = await supabase
          .from('treinamento_comentarios')
          .select('*')
          .order('created_at', { ascending: true });

        if (comentariosDB && Array.isArray(comentariosDB)) {
          setComentarios(comentariosDB);
        }
      } catch (err) {
        console.error('Erro ao carregar dados da Academia:', err);
      } finally {
        setIsLoadingContent(false);
      }
    }
    loadSessionAndData();
  }, []);

  // Helper: Video Embed Resolver (YouTube & Vimeo)
  function getEmbedUrl(provider: 'youtube' | 'vimeo', url: string): string {
    if (!url) return '';

    if (provider === 'youtube') {
      let videoId = '';
      if (url.includes('v=')) {
        videoId = url.split('v=')[1]?.split('&')[0] || '';
      } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
      } else if (url.includes('embed/')) {
        videoId = url.split('embed/')[1]?.split('?')[0] || '';
      } else if (url.includes('shorts/')) {
        videoId = url.split('shorts/')[1]?.split('?')[0] || '';
      } else {
        videoId = url.trim();
      }
      return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
    }

    if (provider === 'vimeo') {
      let vimeoId = '';
      let hash = '';
      const clean = url.replace('https://vimeo.com/', '').replace('http://vimeo.com/', '').replace('https://player.vimeo.com/video/', '');
      const parts = clean.split('?')[0].split('/');
      vimeoId = parts[0] || '';
      if (parts.length > 1) {
        hash = parts[1];
      }
      return `https://player.vimeo.com/video/${vimeoId}?${hash ? `h=${hash}&` : ''}autoplay=1&title=0&byline=0&portrait=0`;
    }

    return url;
  }

  // Helper: Format Image URL (handles Google Drive links automatically)
  function formatImageUrl(url: string): string {
    if (!url) return '';
    const trimmed = url.trim();
    if (trimmed.includes('drive.google.com')) {
      let fileId = '';
      if (trimmed.includes('/file/d/')) {
        fileId = trimmed.split('/file/d/')[1]?.split('/')[0] || '';
      } else if (trimmed.includes('id=')) {
        fileId = trimmed.split('id=')[1]?.split('&')[0] || '';
      }
      if (fileId) {
        return `https://lh3.googleusercontent.com/d/${fileId}`;
      }
    }
    return trimmed;
  }

  // Helper: Thumbnail URL
  function getThumbnailUrl(aula: TreinamentoAula): string {
    if (aula.thumbnail_url && aula.thumbnail_url.trim().length > 0) {
      return formatImageUrl(aula.thumbnail_url);
    }
    if (aula.video_provider === 'youtube') {
      let videoId = '';
      if (aula.video_url.includes('v=')) {
        videoId = aula.video_url.split('v=')[1]?.split('&')[0] || '';
      } else if (aula.video_url.includes('youtu.be/')) {
        videoId = aula.video_url.split('youtu.be/')[1]?.split('?')[0] || '';
      } else {
        videoId = aula.video_url.trim();
      }
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }
    }
    return 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80';
  }

  // Progress helpers
  const effectiveCondominoId = currentCondominoId || (currentUser?.email ? condominos.find((c) => c.email?.trim().toLowerCase() === currentUser.email.trim().toLowerCase())?.id : '');

  const myCompletedAulaIds = new Set(
    progressos
      .filter((p) => effectiveCondominoId && p.condomino_id === effectiveCondominoId && p.concluido)
      .map((p) => p.aula_id)
  );

  const totalAulasCount = aulas.length;
  const completedCount = myCompletedAulaIds.size;
  const progressPercent = totalAulasCount > 0 ? Math.round((completedCount / totalAulasCount) * 100) : 0;

  // Toggle Lesson Completion
  async function toggleAulaConcluida(aulaId: string) {
    const isCompleted = myCompletedAulaIds.has(aulaId);
    const condominoId = effectiveCondominoId;
    if (!condominoId) return;
    const now = new Date().toISOString();

    const newProgressList = progressos.filter((p) => !(p.condomino_id === condominoId && p.aula_id === aulaId));
    if (!isCompleted) {
      newProgressList.push({
        condomino_id: condominoId,
        aula_id: aulaId,
        concluido: true,
        concluido_em: now
      });
    }
    setProgressos(newProgressList);

    try {
      if (isCompleted) {
        await supabase
          .from('treinamento_progresso')
          .delete()
          .match({ condomino_id: condominoId, aula_id: aulaId });
      } else {
        await supabase
          .from('treinamento_progresso')
          .upsert({
            condomino_id: condominoId,
            aula_id: aulaId,
            concluido: true,
            concluido_em: now,
            updated_at: now
          }, { onConflict: 'condomino_id, aula_id' });
      }
    } catch (e) {
      console.warn('Progresso salvo localmente (Supabase sync pendente)');
    }
  }

  // Add Comment / Doubt
  async function handleSendComment() {
    if (!novoComentario.trim() || !activeAula) return;

    const userEmail = currentUser?.email?.trim().toLowerCase();
    let myCondomino = null;
    if (userEmail) {
      myCondomino = condominos.find((c) => c.email?.trim().toLowerCase() === userEmail);
    }
    if (!myCondomino && currentCondominoId) {
      myCondomino = condominos.find((c) => c.id === currentCondominoId);
    }

    const isAdmin = userRole === 'admin';
    const autorNome = isAdmin
      ? (currentUser?.user_metadata?.nome || (currentUser?.email ? currentUser.email.split('@')[0] : 'Administração Cosmo Alma TV'))
      : (myCondomino?.nome_comercial || currentUser?.user_metadata?.nome || (currentUser?.email ? currentUser.email.split('@')[0] : 'Criador'));

    const autorEmail = currentUser?.email || myCondomino?.email || '';
    const autorId = isAdmin ? currentUser?.id : (myCondomino?.id || currentUser?.id);
    const currentModulo = modulos.find((m) => m.id === activeAula.modulo_id);

    const commentPayload = {
      aula_id: activeAula.id,
      autor_id: autorId,
      autor_nome: autorNome,
      autor_email: autorEmail,
      autor_role: userRole,
      comentario: novoComentario.trim(),
      aula_titulo: activeAula.titulo,
      modulo_titulo: currentModulo?.titulo
    };

    setNovoComentario('');

    try {
      const res = await fetch('/api/treinamentos/comentarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commentPayload)
      });
      const data = await res.json();
      if (data && data.success && data.comment) {
        setComentarios((prev) => [...prev, data.comment]);
      } else {
        // Fallback local insert
        const { data: fallbackComm } = await supabase
          .from('treinamento_comentarios')
          .insert({
            aula_id: commentPayload.aula_id,
            autor_id: commentPayload.autor_id,
            autor_nome: commentPayload.autor_nome,
            autor_role: commentPayload.autor_role,
            comentario: commentPayload.comentario
          })
          .select()
          .single();
        if (fallbackComm) setComentarios((prev) => [...prev, fallbackComm]);
      }
    } catch (e) {
      console.error('Erro ao enviar comentário:', e);
    }
  }

  // Reply to Comment (Admin)
  async function handleReplyComment(parentCommentId: string) {
    if (!respostaTexto.trim() || !activeAula) return;

    const parentComment = comentarios.find((c) => c.id === parentCommentId);
    let parentCondomino = null;
    if (parentComment?.autor_id) {
      parentCondomino = condominos.find((c) => c.id === parentComment.autor_id);
    }
    if (!parentCondomino && parentComment?.autor_nome) {
      parentCondomino = condominos.find((c) => c.nome_comercial?.trim().toLowerCase() === parentComment.autor_nome.trim().toLowerCase());
    }
    if (!parentCondomino && (parentComment as any)?.autor_email) {
      parentCondomino = condominos.find((c) => c.email?.trim().toLowerCase() === (parentComment as any).autor_email.trim().toLowerCase());
    }

    const currentModulo = modulos.find((m) => m.id === activeAula.modulo_id);
    const adminName = currentUser?.user_metadata?.nome || (currentUser?.email ? currentUser.email.split('@')[0] : 'Administração Cosmo Alma TV');

    const replyPayload = {
      aula_id: activeAula.id,
      autor_id: currentUser?.id,
      autor_nome: `Equipe Gestão (${adminName})`,
      autor_role: 'admin',
      comentario: respostaTexto.trim(),
      resposta_de_id: parentCommentId,
      aula_titulo: activeAula.titulo,
      modulo_titulo: currentModulo?.titulo,
      duvida_original_texto: parentComment?.comentario,
      criador_original_email: parentCondomino?.email,
      criador_original_nome: parentCondomino?.nome_comercial || parentComment?.autor_nome || 'Criador'
    };

    setRespostaComentarioId(null);
    setRespostaTexto('');

    try {
      const res = await fetch('/api/treinamentos/comentarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(replyPayload)
      });
      const data = await res.json();
      if (data && data.success && data.comment) {
        setComentarios((prev) => [...prev, data.comment]);
      } else {
        // Fallback local insert
        const { data: fallbackReply } = await supabase
          .from('treinamento_comentarios')
          .insert({
            aula_id: replyPayload.aula_id,
            autor_id: replyPayload.autor_id,
            autor_nome: replyPayload.autor_nome,
            autor_role: replyPayload.autor_role,
            comentario: replyPayload.comentario,
            resposta_de_id: replyPayload.resposta_de_id
          })
          .select()
          .single();
        if (fallbackReply) setComentarios((prev) => [...prev, fallbackReply]);
      }
    } catch (e) {
      console.error('Erro ao responder dúvida:', e);
    }
  }

  // Admin Module Save
  async function handleSaveModulo(e: React.FormEvent) {
    e.preventDefault();
    if (!editingModulo?.titulo) return;

    try {
      if (editingModulo.id && !editingModulo.id.startsWith('mod-')) {
        // Edit existing in Supabase
        const { data, error } = await supabase
          .from('treinamento_modulos')
          .update({
            titulo: editingModulo.titulo,
            descricao: editingModulo.descricao || '',
            icone: editingModulo.icone || '🎬',
            ordem: Number(editingModulo.ordem) || 0,
            obrigatorio: Boolean(editingModulo.obrigatorio),
            ativo: true
          })
          .eq('id', editingModulo.id)
          .select()
          .single();

        if (error) {
          console.error("Erro ao atualizar módulo no Supabase:", error);
          alert("Erro ao salvar no banco de dados: " + error.message);
          return;
        }

        setModulos((prev) => prev.map((m) => (m.id === editingModulo.id ? data : m)));
      } else {
        // Create new in Supabase
        const { data, error } = await supabase
          .from('treinamento_modulos')
          .insert({
            titulo: editingModulo.titulo,
            descricao: editingModulo.descricao || '',
            icone: editingModulo.icone || '🎬',
            ordem: Number(editingModulo.ordem) || modulos.length + 1,
            obrigatorio: Boolean(editingModulo.obrigatorio),
            ativo: true
          })
          .select()
          .single();

        if (error) {
          console.error("Erro ao criar módulo no Supabase:", error);
          alert("Erro ao criar módulo no banco de dados: " + error.message);
          return;
        }

        setModulos((prev) => [...prev, data]);
      }
      setIsModuloModalOpen(false);
      setEditingModulo(null);
    } catch (err: any) {
      console.error("Erro geral no salvamento do módulo:", err);
      alert("Erro ao salvar: " + (err.message || 'Falha de conexão com o banco'));
    }
  }

  // Admin Module Delete
  async function handleDeleteModulo(id: string) {
    if (!confirm('Deseja realmente excluir esta Trilha/Módulo e todas as suas aulas?')) return;
    try {
      if (!id.startsWith('mod-')) {
        const { error } = await supabase.from('treinamento_modulos').delete().eq('id', id);
        if (error) {
          console.error("Erro ao excluir módulo no Supabase:", error);
          alert("Erro ao excluir do banco de dados: " + error.message);
          return;
        }
      }
      setModulos((prev) => prev.filter((m) => m.id !== id));
      setAulas((prev) => prev.filter((a) => a.modulo_id !== id));
    } catch (err: any) {
      console.error("Erro ao excluir módulo:", err);
      alert("Erro ao excluir: " + (err.message || 'Falha de conexão'));
    }
  }

  // Admin Aula Save
  async function handleSaveAula(e: React.FormEvent) {
    e.preventDefault();
    if (!editingAula?.titulo || !editingAula?.modulo_id || !editingAula?.video_url) {
      alert("Por favor, preencha o Título, o Módulo e o Link do Vídeo.");
      return;
    }

    try {
      if (editingAula.id && !editingAula.id.startsWith('aula-')) {
        // Edit existing in Supabase
        const { data, error } = await supabase
          .from('treinamento_aulas')
          .update({
            modulo_id: editingAula.modulo_id,
            titulo: editingAula.titulo,
            descricao: editingAula.descricao || '',
            video_provider: editingAula.video_provider || 'youtube',
            video_url: editingAula.video_url,
            thumbnail_url: editingAula.thumbnail_url || '',
            duracao_minutos: Number(editingAula.duracao_minutos) || 1,
            ordem: Number(editingAula.ordem) || 0,
            materiais_anexos: editingAula.materiais_anexos || []
          })
          .eq('id', editingAula.id)
          .select()
          .single();

        if (error) {
          console.error("Erro ao atualizar aula no Supabase:", error);
          alert("Erro ao salvar aula no banco de dados: " + error.message);
          return;
        }

        setAulas((prev) => prev.map((a) => (a.id === editingAula.id ? data : a)));
      } else {
        // Create new in Supabase
        const { data, error } = await supabase
          .from('treinamento_aulas')
          .insert({
            modulo_id: editingAula.modulo_id,
            titulo: editingAula.titulo,
            descricao: editingAula.descricao || '',
            video_provider: editingAula.video_provider || 'youtube',
            video_url: editingAula.video_url,
            thumbnail_url: editingAula.thumbnail_url || '',
            duracao_minutos: Number(editingAula.duracao_minutos) || 1,
            ordem: Number(editingAula.ordem) || aulas.length + 1,
            materiais_anexos: editingAula.materiais_anexos || []
          })
          .select()
          .single();

        if (error) {
          console.error("Erro ao criar aula no Supabase:", error);
          alert("Erro ao criar videoaula no banco de dados: " + error.message);
          return;
        }

        setAulas((prev) => [...prev, data]);
      }
      setIsAulaModalOpen(false);
      setEditingAula(null);
    } catch (err: any) {
      console.error("Erro geral no salvamento da aula:", err);
      alert("Erro ao salvar aula: " + (err.message || 'Falha de conexão com o banco'));
    }
  }

  // Admin Aula Delete
  async function handleDeleteAula(id: string) {
    if (!confirm('Deseja realmente excluir esta videoaula?')) return;
    try {
      if (!id.startsWith('aula-')) {
        const { error } = await supabase.from('treinamento_aulas').delete().eq('id', id);
        if (error) {
          console.error("Erro ao excluir aula no Supabase:", error);
          alert("Erro ao excluir do banco de dados: " + error.message);
          return;
        }
      }
      setAulas((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      console.error("Erro ao excluir aula:", err);
      alert("Erro ao excluir: " + (err.message || 'Falha de conexão'));
    }
  }

  // Add Attachment to Aula Form
  function handleAddAnexo() {
    if (!novoAnexoNome.trim() || !novoAnexoUrl.trim()) return;
    const anexo: MaterialAnexo = {
      nome: novoAnexoNome.trim(),
      url: novoAnexoUrl.trim(),
      tipo: novoAnexoTipo
    };
    const currentList = editingAula?.materiais_anexos || [];
    setEditingAula({
      ...editingAula,
      materiais_anexos: [...currentList, anexo]
    });
    setNovoAnexoNome('');
    setNovoAnexoUrl('');
    setNovoAnexoTipo('pdf');
  }

  function handleRemoveAnexo(index: number) {
    const currentList = editingAula?.materiais_anexos || [];
    setEditingAula({
      ...editingAula,
      materiais_anexos: currentList.filter((_, i) => i !== index)
    });
  }

  // Open Player
  function handleOpenLesson(aula: TreinamentoAula) {
    setActiveAula(aula);
    setViewMode('player');
    setPlayerTab('overview');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Featured Hero Lesson
  const featuredLesson = aulas.length > 0 ? aulas[0] : null;

  return (
    <div className={styles.container}>
      {/* Top Bar Navigation */}
      <header className={styles.topNav}>
        <div className={styles.brand} onClick={() => setViewMode('catalog')}>
          <img src="/logo.png" alt="Cosmo Alma TV" className={styles.brandLogo} />
          <div>
            <div className={styles.brandTitle}>COSMO ALMA TV</div>
            <div className={styles.brandBadge}>🎬 ACADEMIA DO CRIADOR</div>
          </div>
        </div>

        <div className={styles.navActions}>
          <button
            onClick={() => router.push('/')}
            className={`${styles.navBtn} ${styles.navBtnGhost}`}
          >
            ← Voltar ao Portal
          </button>

          {viewMode !== 'catalog' && (
            <button
              onClick={() => setViewMode('catalog')}
              className={`${styles.navBtn} ${styles.navBtnGhost}`}
            >
              🍿 Catálogo
            </button>
          )}

          {userRole === 'admin' && (
            <button
              onClick={() => setViewMode(viewMode === 'admin' ? 'catalog' : 'admin')}
              className={`${styles.navBtn} ${viewMode === 'admin' ? styles.navBtnGhost : styles.navBtnGold}`}
            >
              {viewMode === 'admin' ? '👁️ Ver como Aluno' : '⚙️ Gestão & Auditoria (Admin)'}
            </button>
          )}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 1. MODO CATÁLOGO (ESTILO NETFLIX) */}
      {/* ========================================================================= */}
      {viewMode === 'catalog' && (
        <main className={styles.mainContent}>
          {/* Empty Catalog State */}
          {modulos.length === 0 && !isLoadingContent && (
            <div style={{ textAlign: 'center', padding: '4rem 1.5rem', background: '#111520', borderRadius: '1rem', border: '1px dashed #2D3142', margin: '2rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎬</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.5rem' }}>Nenhum treinamento publicado ainda</h3>
              <p style={{ color: '#9ca3af', fontSize: '0.9rem', maxWidth: '500px', margin: '0 auto 1.5rem auto', lineHeight: '1.6' }}>
                As trilhas e videoaulas aparecerão aqui assim que forem cadastradas na área de Gestão de Conteúdo.
              </p>
              {userRole === 'admin' && (
                <button
                  onClick={() => setViewMode('admin')}
                  className={`${styles.navBtn} ${styles.navBtnGold}`}
                >
                  ⚙️ Criar Nova Trilha na Gestão
                </button>
              )}
            </div>
          )}

          {/* Netflix Hero Banner */}
          {featuredLesson && (
            <section
              className={styles.heroBanner}
              style={{ backgroundImage: `url(${getThumbnailUrl(featuredLesson)})` }}
            >
              <div className={styles.heroOverlay} />
              <div className={styles.heroContent}>
                <span className={styles.heroTag}>
                  ⭐ Destaque de Capacitação
                </span>
                <h1 className={styles.heroTitle}>{featuredLesson.titulo}</h1>
                <p className={styles.heroDesc}>{featuredLesson.descricao}</p>
                <div className={styles.heroActions}>
                  <button
                    onClick={() => handleOpenLesson(featuredLesson)}
                    className={`${styles.navBtn} ${styles.navBtnGold}`}
                    style={{ padding: '0.75rem 1.75rem', fontSize: '0.9rem' }}
                  >
                    ▶ Assistir Agora ({featuredLesson.duracao_minutos} min)
                  </button>
                  {myCompletedAulaIds.has(featuredLesson.id) && (
                    <span style={{ color: '#34d399', fontSize: '0.85rem', fontWeight: 'bold' }}>
                      ✓ Concluído por você
                    </span>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Progress & Compliance Bar */}
          <div className={styles.statsBar}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Sua Jornada de Capacitação
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#ffffff' }}>
                {completedCount} de {totalAulasCount} aulas concluídas ({progressPercent}%)
              </div>
            </div>

            <div className={styles.progressBarContainer}>
              <div className={styles.progressBarTrack}>
                <div className={styles.progressBarFill} style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            {progressPercent === 100 ? (
              <div style={{ color: '#E2B042', fontWeight: '700', fontSize: '0.85rem' }}>
                🏆 100% Capacitado & Conforme!
              </div>
            ) : (
              <div style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                {totalAulasCount - completedCount} restantes
              </div>
            )}
          </div>

          {/* Category Rows (Modules) */}
          <section className={styles.catalogSection}>
            {modulos
              .filter((m) => m.ativo)
              .sort((a, b) => a.ordem - b.ordem)
              .map((modulo) => {
                const moduleAulas = aulas
                  .filter((a) => a.modulo_id === modulo.id)
                  .sort((a, b) => a.ordem - b.ordem);

                if (moduleAulas.length === 0) return null;

                const moduloCompleted = moduleAulas.filter((a) => myCompletedAulaIds.has(a.id)).length;
                const isAllCompleted = moduloCompleted === moduleAulas.length;

                return (
                  <div key={modulo.id} className={styles.moduleRow}>
                    <div className={styles.moduleHeader}>
                      <div className={styles.moduleTitleGroup}>
                        <span className={styles.moduleIcon}>{modulo.icone}</span>
                        <h2 className={styles.moduleTitle}>{modulo.titulo}</h2>
                        {modulo.obrigatorio ? (
                          <span className={`${styles.moduleBadge} ${styles.badgeRequired}`}>
                            Obrigatório
                          </span>
                        ) : (
                          <span className={`${styles.moduleBadge} ${styles.badgeOptional}`}>
                            Recomendado
                          </span>
                        )}
                        {isAllCompleted && (
                          <span style={{ color: '#34d399', fontSize: '0.8rem', fontWeight: '700' }}>
                            ✓ Módulo Completo
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                        {moduloCompleted}/{moduleAulas.length} aulas assistidas
                      </span>
                    </div>

                    <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '-0.5rem' }}>
                      {modulo.descricao}
                    </p>

                    <div className={styles.cardsGrid}>
                      {moduleAulas.map((aula) => {
                        const isDone = myCompletedAulaIds.has(aula.id);
                        return (
                          <div
                            key={aula.id}
                            className={styles.lessonCard}
                            onClick={() => handleOpenLesson(aula)}
                          >
                            <div className={styles.cardThumbWrapper}>
                              <img
                                src={getThumbnailUrl(aula)}
                                alt={aula.titulo}
                                className={styles.cardThumb}
                              />
                              <span className={styles.cardProviderBadge}>
                                {aula.video_provider === 'vimeo' ? '🔵 Vimeo' : '🔴 YouTube'}
                              </span>
                              <span className={styles.cardDuration}>
                                {aula.duracao_minutos} min
                              </span>
                              {isDone && (
                                <span className={styles.cardCompletedBadge}>
                                  ✓ Assistido
                                </span>
                              )}
                            </div>

                            <div className={styles.cardBody}>
                              <h3 className={styles.cardTitle}>{aula.titulo}</h3>
                              <p className={styles.cardDesc}>{aula.descricao}</p>

                              <div className={styles.cardFooter}>
                                <span>Aula #{aula.ordem}</span>
                                {aula.materiais_anexos && aula.materiais_anexos.length > 0 && (
                                  <span className={styles.cardAttachmentsCount}>
                                    📎 {aula.materiais_anexos.length} anexo(s)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </section>
        </main>
      )}

      {/* ========================================================================= */}
      {/* 2. MODO PLAYER (MODO CINEMA & AULA) */}
      {/* ========================================================================= */}
      {viewMode === 'player' && activeAula && (
        <main className={styles.playerContainer}>
          <button className={styles.playerBackBtn} onClick={() => setViewMode('catalog')}>
            ← Voltar ao Catálogo
          </button>

          <div className={styles.cinemaGrid}>
            {/* Left Main Video & Content Column */}
            <div>
              <div className={styles.videoWrapper}>
                <iframe
                  src={getEmbedUrl(activeAula.video_provider, activeAula.video_url)}
                  title={activeAula.titulo}
                  className={styles.videoIframe}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>

              {/* Lesson Controls & Actions */}
              <div className={styles.playerInfoBar}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#E2B042', fontWeight: '700', textTransform: 'uppercase' }}>
                    {modulos.find((m) => m.id === activeAula.modulo_id)?.titulo} • Aula #{activeAula.ordem}
                  </div>
                  <h1 className={styles.playerTitle}>{activeAula.titulo}</h1>
                </div>

                <button
                  onClick={() => toggleAulaConcluida(activeAula.id)}
                  className={`${styles.completeBtn} ${
                    myCompletedAulaIds.has(activeAula.id)
                      ? styles.completeBtnActive
                      : styles.completeBtnPending
                  }`}
                >
                  {myCompletedAulaIds.has(activeAula.id) ? '✓ Aula Concluída' : 'Marcar como Concluída'}
                </button>
              </div>

              {/* Lesson Tabs (Overview / Downloads / Doubts) */}
              <div className={styles.playerTabsNav}>
                <button
                  className={`${styles.tabBtn} ${playerTab === 'overview' ? styles.tabBtnActive : ''}`}
                  onClick={() => setPlayerTab('overview')}
                >
                  📄 Visão Geral
                </button>
                <button
                  className={`${styles.tabBtn} ${playerTab === 'materials' ? styles.tabBtnActive : ''}`}
                  onClick={() => setPlayerTab('materials')}
                >
                  📎 Materiais & PDFs ({activeAula.materiais_anexos?.length || 0})
                </button>
                <button
                  className={`${styles.tabBtn} ${playerTab === 'comments' ? styles.tabBtnActive : ''}`}
                  onClick={() => setPlayerTab('comments')}
                >
                  💬 Dúvidas & Fórum ({comentarios.filter((c) => c.aula_id === activeAula.id).length})
                </button>
              </div>

              {/* Tab 1: Overview */}
              {playerTab === 'overview' && (
                <div className={styles.tabContent}>
                  <p style={{ color: '#d1d5db', lineHeight: '1.7', whiteSpace: 'pre-line' }}>
                    {activeAula.descricao || 'Sem descrição cadastrada para esta aula.'}
                  </p>
                </div>
              )}

              {/* Tab 2: Materials & Downloads */}
              {playerTab === 'materials' && (
                <div className={styles.tabContent}>
                  {activeAula.materiais_anexos && activeAula.materiais_anexos.length > 0 ? (
                    <div className={styles.materialsList}>
                      {activeAula.materiais_anexos.map((mat, idx) => (
                        <div key={idx} className={styles.materialItem}>
                          <div className={styles.materialInfo}>
                            <span className={styles.materialIcon}>
                              {mat.tipo === 'pdf' ? '📕' : mat.tipo === 'canva' ? '🎨' : mat.tipo === 'drive' ? '📁' : '🔗'}
                            </span>
                            <div>
                              <div className={styles.materialName}>{mat.nome}</div>
                              <div className={styles.materialUrl}>{mat.url}</div>
                            </div>
                          </div>
                          <a
                            href={mat.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${styles.navBtn} ${styles.navBtnGold}`}
                            style={{ textDecoration: 'none' }}
                          >
                            Abrir / Baixar ↗
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: '#9ca3af', fontStyle: 'italic', padding: '1rem 0' }}>
                      Nenhum material complementar anexado a esta aula.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Comments & Doubts */}
              {playerTab === 'comments' && (
                <div className={styles.tabContent}>
                  <div className={styles.commentsContainer}>
                    {/* Add Comment Input */}
                    <div className={styles.commentInputBox}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#ffffff' }}>
                        Deixe sua dúvida ou consideração para a Administração:
                      </div>
                      <textarea
                        className={styles.commentTextarea}
                        placeholder="Escreva sua pergunta aqui..."
                        value={novoComentario}
                        onChange={(e) => setNovoComentario(e.target.value)}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={handleSendComment}
                          className={`${styles.navBtn} ${styles.navBtnGold}`}
                        >
                          Enviar Comentário 🚀
                        </button>
                      </div>
                    </div>

                    {/* Comments Feed */}
                    {comentarios
                      .filter((c) => c.aula_id === activeAula.id && !c.resposta_de_id)
                      .map((com) => {
                        const replies = comentarios.filter((r) => r.resposta_de_id === com.id);
                        return (
                          <div key={com.id} className={styles.commentCard}>
                            <div className={styles.commentHeader}>
                              <div className={styles.commentAuthor}>
                                <span>{com.autor_nome}</span>
                                <span
                                  className={`${styles.commentRoleBadge} ${
                                    com.autor_role === 'admin' ? styles.roleAdmin : styles.roleCreator
                                  }`}
                                >
                                  {com.autor_role === 'admin' ? 'Gestor' : 'Criador'}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                                {new Date(com.created_at).toLocaleDateString('pt-BR')}
                              </span>
                            </div>

                            <p style={{ color: '#e5e7eb', fontSize: '0.9rem', margin: '0.4rem 0' }}>
                              {com.comentario}
                            </p>

                            {/* Replies Thread */}
                            {replies.map((rep) => (
                              <div
                                key={rep.id}
                                style={{
                                  marginLeft: '1.5rem',
                                  paddingLeft: '1rem',
                                  borderLeft: '2px solid #E2B042',
                                  marginTop: '0.5rem'
                                }}
                              >
                                <div className={styles.commentHeader}>
                                  <div className={styles.commentAuthor}>
                                    <span>{rep.autor_nome}</span>
                                    <span className={`${styles.commentRoleBadge} ${styles.roleAdmin}`}>
                                      Resposta Oficial
                                    </span>
                                  </div>
                                </div>
                                <p style={{ color: '#e5e7eb', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                                  {rep.comentario}
                                </p>
                              </div>
                            ))}

                            {/* Reply Action for Admin */}
                            {userRole === 'admin' && (
                              <div style={{ marginTop: '0.5rem' }}>
                                {respostaComentarioId === com.id ? (
                                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    <input
                                      type="text"
                                      className={styles.formInput}
                                      placeholder="Responder ao criador..."
                                      value={respostaTexto}
                                      onChange={(e) => setRespostaTexto(e.target.value)}
                                    />
                                    <button
                                      onClick={() => handleReplyComment(com.id)}
                                      className={`${styles.navBtn} ${styles.navBtnGold}`}
                                    >
                                      Responder
                                    </button>
                                    <button
                                      onClick={() => setRespostaComentarioId(null)}
                                      className={`${styles.navBtn} ${styles.navBtnGhost}`}
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setRespostaComentarioId(com.id);
                                      setRespostaTexto('');
                                    }}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: '#E2B042',
                                      fontSize: '0.75rem',
                                      cursor: 'pointer',
                                      fontWeight: '600'
                                    }}
                                  >
                                    ↩ Responder como Administração
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* Right Playlist Sidebar */}
            <aside className={styles.playlistSidebar}>
              <div className={styles.playlistHeader}>
                <div className={styles.playlistTitle}>
                  {modulos.find((m) => m.id === activeAula.modulo_id)?.titulo}
                </div>
                <div className={styles.playlistSub}>
                  {aulas.filter((a) => a.modulo_id === activeAula.modulo_id).length} aulas nesta trilha
                </div>
              </div>

              <div className={styles.playlistItemsList}>
                {aulas
                  .filter((a) => a.modulo_id === activeAula.modulo_id)
                  .sort((a, b) => a.ordem - b.ordem)
                  .map((aula) => {
                    const isSelected = aula.id === activeAula.id;
                    const isDone = myCompletedAulaIds.has(aula.id);
                    return (
                      <div
                        key={aula.id}
                        className={`${styles.playlistItem} ${isSelected ? styles.playlistItemActive : ''}`}
                        onClick={() => handleOpenLesson(aula)}
                      >
                        <img
                          src={getThumbnailUrl(aula)}
                          alt={aula.titulo}
                          className={styles.playlistItemThumb}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: '0.85rem',
                              fontWeight: isSelected ? '700' : '500',
                              color: isSelected ? '#E2B042' : '#ffffff',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {aula.ordem}. {aula.titulo}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '2px' }}>
                            {aula.duracao_minutos} min • {aula.video_provider.toUpperCase()}
                          </div>
                        </div>
                        {isDone && <span style={{ color: '#34d399', fontWeight: '700' }}>✓</span>}
                      </div>
                    );
                  })}
              </div>
            </aside>
          </div>
        </main>
      )}

      {/* ========================================================================= */}
      {/* 3. PAINEL DE GESTÃO & AUDITORIA (ADMIN CMS) */}
      {/* ========================================================================= */}
      {viewMode === 'admin' && (
        <main className={styles.adminContainer}>
          <div className={styles.adminHeader}>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ffffff' }}>
                Gestão da Academia Cosmo Alma TV
              </h1>
              <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
                Autonomia total para gerenciar trilhas, aulas do YouTube/Vimeo, anexos e auditar o consumo dos condôminos.
              </p>
            </div>

            <div className={styles.adminTabs}>
              <button
                className={`${styles.adminTabBtn} ${adminTab === 'content' ? styles.adminTabBtnActive : ''}`}
                onClick={() => setAdminTab('content')}
              >
                🎬 Gestão de Conteúdo
              </button>
              <button
                className={`${styles.adminTabBtn} ${adminTab === 'audit' ? styles.adminTabBtnActive : ''}`}
                onClick={() => setAdminTab('audit')}
              >
                📊 Auditoria de Consumo
              </button>
              <button
                className={`${styles.adminTabBtn} ${adminTab === 'doubts' ? styles.adminTabBtnActive : ''}`}
                onClick={() => setAdminTab('doubts')}
              >
                💬 Central de Dúvidas
              </button>
            </div>
          </div>

          {/* TAB 1: Content Manager (CRUD) */}
          {adminTab === 'content' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <button
                  onClick={() => {
                    setEditingModulo({ icone: '🎬', ordem: modulos.length + 1, obrigatorio: false });
                    setIsModuloModalOpen(true);
                  }}
                  className={`${styles.navBtn} ${styles.navBtnGhost}`}
                >
                  + Nova Trilha / Módulo
                </button>
                <button
                  onClick={() => {
                    setEditingAula({
                      modulo_id: modulos[0]?.id || '',
                      video_provider: 'youtube',
                      duracao_minutos: 10,
                      ordem: aulas.length + 1,
                      materiais_anexos: []
                    });
                    setIsAulaModalOpen(true);
                  }}
                  className={`${styles.navBtn} ${styles.navBtnGold}`}
                >
                  + Nova Videoaula
                </button>
              </div>

              {/* Modules & Lessons List */}
              {modulos.length === 0 && !isLoadingContent ? (
                <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: '#111520', borderRadius: '1rem', border: '1px dashed #2D3142' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎬</div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.4rem' }}>
                    Nenhuma Trilha ou Módulo cadastrado ainda
                  </h3>
                  <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                    Clique no botão acima para criar sua primeira trilha de treinamento oficial.
                  </p>
                  <button
                    onClick={() => {
                      setEditingModulo({ icone: '🎬', ordem: 1, obrigatorio: false });
                      setIsModuloModalOpen(true);
                    }}
                    className={`${styles.navBtn} ${styles.navBtnGold}`}
                  >
                    + Criar Primeira Trilha
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {modulos.map((modulo) => {
                  const modAulas = aulas.filter((a) => a.modulo_id === modulo.id);
                  return (
                    <div
                      key={modulo.id}
                      style={{
                        background: '#111520',
                        border: '1px solid rgba(226,176,66,0.2)',
                        borderRadius: '1rem',
                        padding: '1.5rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span style={{ fontSize: '1.5rem' }}>{modulo.icone}</span>
                          <div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#ffffff' }}>
                              {modulo.titulo}
                            </h3>
                            <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{modulo.descricao}</p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => {
                              setNotificandoModulo(modulo);
                              setEmailNotificationFeedback(null);
                            }}
                            className={`${styles.navBtn} ${styles.navBtnGold}`}
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                            title="Disparar aviso por e-mail para todos os criadores cadastrados"
                          >
                            📢 Notificar Criadores
                          </button>
                          <button
                            onClick={() => {
                              setEditingModulo(modulo);
                              setIsModuloModalOpen(true);
                            }}
                            className={`${styles.navBtn} ${styles.navBtnGhost}`}
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => handleDeleteModulo(modulo.id)}
                            className={`${styles.navBtn} ${styles.navBtnGhost}`}
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', color: '#f87171' }}
                          >
                            🗑️ Excluir
                          </button>
                        </div>
                      </div>

                      {/* Lessons Table */}
                      <div className={styles.auditTableWrapper}>
                        <table className={styles.auditTable}>
                          <thead>
                            <tr>
                              <th>Ordem</th>
                              <th>Título da Aula</th>
                              <th>Provedor</th>
                              <th>Duração</th>
                              <th>Anexos</th>
                              <th>Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {modAulas.map((aula) => (
                              <tr key={aula.id}>
                                <td>#{aula.ordem}</td>
                                <td style={{ fontWeight: '600' }}>{aula.titulo}</td>
                                <td>
                                  <span
                                    style={{
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontSize: '0.7rem',
                                      background: aula.video_provider === 'vimeo' ? 'rgba(59,130,246,0.2)' : 'rgba(239,68,68,0.2)',
                                      color: aula.video_provider === 'vimeo' ? '#60a5fa' : '#f87171'
                                    }}
                                  >
                                    {aula.video_provider.toUpperCase()}
                                  </span>
                                </td>
                                <td>{aula.duracao_minutos} min</td>
                                <td>{aula.materiais_anexos?.length || 0} arquivos</td>
                                <td>
                                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    <button
                                      onClick={() => {
                                        setEditingAula(aula);
                                        setIsAulaModalOpen(true);
                                      }}
                                      className={`${styles.navBtn} ${styles.navBtnGhost}`}
                                      style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem' }}
                                    >
                                      Editar
                                    </button>
                                    <button
                                      onClick={() => handleDeleteAula(aula.id)}
                                      className={`${styles.navBtn} ${styles.navBtnGhost}`}
                                      style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem', color: '#f87171' }}
                                    >
                                      Excluir
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {modAulas.length === 0 && (
                              <tr>
                                <td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af', fontStyle: 'italic' }}>
                                  Nenhuma aula cadastrada nesta trilha. Clique em "+ Nova Videoaula" para adicionar.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          )}

          {/* TAB 2: Consumption Audit (Matrix) */}
          {adminTab === 'audit' && (
            <div>
              <div style={{ marginBottom: '1.5rem', background: '#141824', padding: '1rem 1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ffffff' }}>
                  📊 Auditoria de Conformidade & Capacitação dos Condôminos
                </div>
                <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                  Acompanhe exatamente quais criadores já assistiram às normas e procedimentos e quem está com treinamentos pendentes. Você pode acionar notificações individuais a qualquer momento.
                </p>
                {individualNotificationFeedback && (
                  <div style={{ marginTop: '0.75rem', background: 'rgba(56, 161, 105, 0.2)', border: '1px solid #38A169', color: '#34d399', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    {individualNotificationFeedback}
                  </div>
                )}
              </div>

              <div className={styles.auditTableWrapper}>
                <table className={styles.auditTable}>
                  <thead>
                    <tr>
                      <th>Condômino / Canal</th>
                      <th>Status Contratual</th>
                      <th>Progresso Geral</th>
                      <th>Módulos Obrigatórios</th>
                      <th>Última Conclusão</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(condominos.length > 0 ? condominos : [
                      { id: 'cond-1', nome_comercial: 'Paradoxo Casa Ateliê', email: 'contato@paradoxo.tv', status: 'ATIVO_ADIMPLENTE' },
                      { id: 'cond-2', nome_comercial: 'Astrologia e Luz', email: 'maria@astroluz.com.br', status: 'ATIVO_PENDENTE_PAGAMENTO' },
                      { id: 'cond-3', nome_comercial: 'Tarot do Amanhã', email: 'falecom@tarotamanha.com', status: 'SUSPENSO_INADIMPLENCIA' }
                    ]).map((cond) => {
                      const userCompleted = progressos.filter((p) => p.condomino_id === cond.id && p.concluido);
                      const userPercent = aulas.length > 0 ? Math.round((userCompleted.length / aulas.length) * 100) : 0;
                      
                      const requiredAulas = aulas.filter((a) => {
                        const mod = modulos.find((m) => m.id === a.modulo_id);
                        return mod?.obrigatorio;
                      });
                      const requiredCompleted = userCompleted.filter((p) =>
                        requiredAulas.some((ra) => ra.id === p.aula_id)
                      );
                      const isRequiredDone = requiredAulas.length > 0 && requiredCompleted.length === requiredAulas.length;

                      return (
                        <tr key={cond.id}>
                          <td>
                            <div style={{ fontWeight: '700', color: '#ffffff' }}>{cond.nome_comercial}</div>
                            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{cond.email}</div>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: cond.status === 'ATIVO_ADIMPLENTE' ? '#34d399' : '#f87171' }}>
                              {cond.status || 'ATIVO'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ width: '100px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '9999px', overflow: 'hidden' }}>
                                <div style={{ width: `${userPercent}%`, height: '100%', background: '#E2B042' }} />
                              </div>
                              <span style={{ fontWeight: '700', fontSize: '0.8rem' }}>{userPercent}%</span>
                              <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>({userCompleted.length}/{aulas.length})</span>
                            </div>
                          </td>
                          <td>
                            {isRequiredDone ? (
                              <span style={{ color: '#34d399', fontWeight: '700', fontSize: '0.75rem' }}>
                                🟢 100% Conforme ({requiredCompleted.length}/{requiredAulas.length})
                              </span>
                            ) : (
                              <span style={{ color: '#f87171', fontWeight: '700', fontSize: '0.75rem' }}>
                                🔴 Pendente ({requiredCompleted.length}/{requiredAulas.length})
                              </span>
                            )}
                          </td>
                          <td style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                            {userCompleted.length > 0
                              ? new Date(userCompleted[userCompleted.length - 1].concluido_em || Date.now()).toLocaleString('pt-BR')
                              : 'Nunca assistiu'}
                          </td>
                          <td>
                            <button
                              onClick={() => handleNotifyIndividualCondomino(cond)}
                              disabled={notificandoCondominoId === cond.id}
                              className={`${styles.navBtn} ${styles.navBtnGhost}`}
                              style={{
                                padding: '0.25rem 0.6rem',
                                fontSize: '0.72rem',
                                border: '1px solid rgba(226, 176, 66, 0.4)',
                                color: '#E2B042',
                                cursor: notificandoCondominoId === cond.id ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {notificandoCondominoId === cond.id ? '⏳ Enviando...' : '✉️ Notificar Treinamento'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Doubts Central */}
          {adminTab === 'doubts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {comentarios.filter((c) => !c.resposta_de_id).map((com) => {
                const targetAula = aulas.find((a) => a.id === com.aula_id);
                const replies = comentarios.filter((r) => r.resposta_de_id === com.id);
                return (
                  <div key={com.id} className={styles.commentCard}>
                    <div style={{ fontSize: '0.75rem', color: '#E2B042', fontWeight: '700' }}>
                      Aula: {targetAula?.titulo || 'Videoaula'}
                    </div>
                    <div className={styles.commentHeader}>
                      <div className={styles.commentAuthor}>
                        <span>{com.autor_nome}</span>
                        <span className={`${styles.commentRoleBadge} ${styles.roleCreator}`}>Criador</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                        {new Date(com.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>

                    <p style={{ color: '#ffffff', fontSize: '0.9rem', margin: '0.5rem 0' }}>
                      {com.comentario}
                    </p>

                    {/* Replies */}
                    {replies.map((rep) => (
                      <div
                        key={rep.id}
                        style={{
                          marginLeft: '1.5rem',
                          paddingLeft: '1rem',
                          borderLeft: '2px solid #E2B042',
                          marginTop: '0.5rem'
                        }}
                      >
                        <div className={styles.commentAuthor}>
                          <span>{rep.autor_nome}</span>
                          <span className={`${styles.commentRoleBadge} ${styles.roleAdmin}`}>Sua Resposta</span>
                        </div>
                        <p style={{ color: '#e5e7eb', fontSize: '0.85rem' }}>{rep.comentario}</p>
                      </div>
                    ))}

                    {/* Reply form */}
                    {respostaComentarioId === com.id ? (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <input
                          type="text"
                          className={styles.formInput}
                          placeholder="Digite sua resposta para o condômino..."
                          value={respostaTexto}
                          onChange={(e) => setRespostaTexto(e.target.value)}
                        />
                        <button
                          onClick={() => {
                            setActiveAula(targetAula || aulas[0]);
                            handleReplyComment(com.id);
                          }}
                          className={`${styles.navBtn} ${styles.navBtnGold}`}
                        >
                          Enviar
                        </button>
                        <button
                          onClick={() => setRespostaComentarioId(null)}
                          className={`${styles.navBtn} ${styles.navBtnGhost}`}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setRespostaComentarioId(com.id);
                          setRespostaTexto('');
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#E2B042',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          fontWeight: '600',
                          textAlign: 'left',
                          marginTop: '0.4rem'
                        }}
                      >
                        ↩ Responder Dúvida
                      </button>
                    )}
                  </div>
                );
              })}
              {comentarios.length === 0 && (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: '3rem', fontStyle: 'italic' }}>
                  Nenhuma dúvida ou comentário registrado até o momento.
                </div>
              )}
            </div>
          )}
        </main>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CRIAR / EDITAR MÓDULO */}
      {/* ========================================================================= */}
      {isModuloModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editingModulo?.id ? 'Editar Trilha / Módulo' : 'Nova Trilha de Treinamento'}
              </h2>
              <button
                onClick={() => setIsModuloModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModulo}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Título do Módulo / Trilha</label>
                <input
                  type="text"
                  required
                  className={styles.formInput}
                  placeholder="Ex: Normas & Diretrizes da Egrégora"
                  value={editingModulo?.titulo || ''}
                  onChange={(e) => setEditingModulo({ ...editingModulo, titulo: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Descrição</label>
                <textarea
                  className={styles.formTextarea}
                  rows={3}
                  placeholder="Explique o objetivo deste conjunto de aulas..."
                  value={editingModulo?.descricao || ''}
                  onChange={(e) => setEditingModulo({ ...editingModulo, descricao: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Ícone / Emoji</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="Ex: 📜, 🎬, 🎙️, 🚀"
                    value={editingModulo?.icone || ''}
                    onChange={(e) => setEditingModulo({ ...editingModulo, icone: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Ordem de Exibição</label>
                  <input
                    type="number"
                    className={styles.formInput}
                    value={editingModulo?.ordem || 1}
                    onChange={(e) => setEditingModulo({ ...editingModulo, ordem: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className={styles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="chkObrigatorio"
                  checked={editingModulo?.obrigatorio || false}
                  onChange={(e) => setEditingModulo({ ...editingModulo, obrigatorio: e.target.checked })}
                />
                <label htmlFor="chkObrigatorio" className={styles.formLabel} style={{ cursor: 'pointer' }}>
                  Marcar como Treinamento Obrigatório para Condôminos
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModuloModalOpen(false)}
                  className={`${styles.navBtn} ${styles.navBtnGhost}`}
                >
                  Cancelar
                </button>
                <button type="submit" className={`${styles.navBtn} ${styles.navBtnGold}`}>
                  Salvar Trilha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CRIAR / EDITAR VIDEOAULA (YOUTUBE & VIMEO + ANEXOS) */}
      {/* ========================================================================= */}
      {isAulaModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editingAula?.id ? 'Editar Videoaula' : 'Cadastrar Nova Videoaula'}
              </h2>
              <button
                onClick={() => setIsAulaModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAula}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Trilha / Módulo Vinculado</label>
                <select
                  className={styles.formSelect}
                  value={editingAula?.modulo_id || ''}
                  onChange={(e) => setEditingAula({ ...editingAula, modulo_id: e.target.value })}
                  required
                >
                  {modulos.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.icone} {m.titulo}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Título da Aula</label>
                <input
                  type="text"
                  required
                  className={styles.formInput}
                  placeholder="Ex: Padrões de Áudio e Microfone para Vídeos Cósmicos"
                  value={editingAula?.titulo || ''}
                  onChange={(e) => setEditingAula({ ...editingAula, titulo: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Provedor de Vídeo</label>
                  <select
                    className={styles.formSelect}
                    value={editingAula?.video_provider || 'youtube'}
                    onChange={(e) => {
                      const newProv = e.target.value as 'youtube' | 'vimeo';
                      setEditingAula({ ...editingAula, video_provider: newProv });
                      if (editingAula?.video_url) {
                        handleAutoFetchVideoInfo(editingAula.video_url, newProv);
                      }
                    }}
                  >
                    <option value="youtube">🔴 YouTube (Unlisted/Privado)</option>
                    <option value="vimeo">🔵 Vimeo (Unlisted/Hash)</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className={styles.formLabel}>URL ou Link do Vídeo</label>
                    <button
                      type="button"
                      onClick={() => handleAutoFetchVideoInfo(editingAula?.video_url || '', editingAula?.video_provider || 'youtube')}
                      disabled={isFetchingVideoInfo || !editingAula?.video_url}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#E2B042',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      {isFetchingVideoInfo ? '⏳ Identificando...' : '⚡ Puxar Dados do Vídeo'}
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    className={styles.formInput}
                    placeholder={
                      editingAula?.video_provider === 'vimeo'
                        ? 'https://vimeo.com/123456789/abcdef'
                        : 'https://www.youtube.com/watch?v=...'
                    }
                    value={editingAula?.video_url || ''}
                    onChange={(e) => setEditingAula({ ...editingAula, video_url: e.target.value })}
                    onBlur={(e) => {
                      if (e.target.value.trim().length > 8) {
                        handleAutoFetchVideoInfo(e.target.value, editingAula?.video_provider || 'youtube');
                      }
                    }}
                  />
                  {videoInfoFeedback && (
                    <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: '600', marginTop: '3px' }}>
                      {videoInfoFeedback}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className={styles.formGroup}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className={styles.formLabel}>Duração (minutos)</label>
                    <span style={{ fontSize: '0.7rem', color: '#E2B042', fontWeight: '600' }}>⚡ Automático</span>
                  </div>
                  <input
                    type="number"
                    className={styles.formInput}
                    placeholder="Calculado automaticamente"
                    value={editingAula?.duracao_minutos || 0}
                    onChange={(e) => setEditingAula({ ...editingAula, duracao_minutos: Number(e.target.value) })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Ordem na Trilha</label>
                  <input
                    type="number"
                    className={styles.formInput}
                    value={editingAula?.ordem || 1}
                    onChange={(e) => setEditingAula({ ...editingAula, ordem: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>URL da Imagem de Capa / Thumbnail (Opcional)</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Deixe em branco para captura automática do YouTube"
                  value={editingAula?.thumbnail_url || ''}
                  onChange={(e) => setEditingAula({ ...editingAula, thumbnail_url: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Descrição Detalhada & Orientações</label>
                <textarea
                  className={styles.formTextarea}
                  rows={3}
                  placeholder="Orientações e tópicos abordados nesta aula..."
                  value={editingAula?.descricao || ''}
                  onChange={(e) => setEditingAula({ ...editingAula, descricao: e.target.value })}
                />
              </div>

              {/* Attachments Section */}
              <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <label className={styles.formLabel} style={{ marginBottom: 0 }}>
                    📎 Materiais Anexados ({editingAula?.materiais_anexos?.length || 0})
                  </label>
                  
                  {/* Mode Toggle */}
                  <div style={{ display: 'flex', gap: '0.3rem', background: '#0d1017', padding: '3px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <button
                      type="button"
                      onClick={() => setAnexoTab('upload')}
                      style={{
                        padding: '3px 8px',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        background: anexoTab === 'upload' ? '#E2B042' : 'transparent',
                        color: anexoTab === 'upload' ? '#0b0e14' : '#9ca3af'
                      }}
                    >
                      📁 Upload do Computador
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnexoTab('link')}
                      style={{
                        padding: '3px 8px',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        background: anexoTab === 'link' ? '#E2B042' : 'transparent',
                        color: anexoTab === 'link' ? '#0b0e14' : '#9ca3af'
                      }}
                    >
                      🔗 Link Externo (Drive/Canva)
                    </button>
                  </div>
                </div>

                {/* Existing Attachments List */}
                {editingAula?.materiais_anexos && editingAula.materiais_anexos.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.75rem' }}>
                    {editingAula.materiais_anexos.map((anexo, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#0d1017',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '0.4rem',
                          border: '1px solid rgba(255,255,255,0.05)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                          <span style={{ fontSize: '0.9rem' }}>
                            {anexo.tipo === 'pdf' ? '📕' : anexo.tipo === 'canva' ? '🎨' : anexo.tipo === 'drive' ? '📁' : '🔗'}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: '#e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {anexo.nome}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <a
                            href={anexo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#E2B042', fontSize: '0.75rem', textDecoration: 'none' }}
                          >
                            Abrir ↗
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRemoveAnexo(idx)}
                            style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.8rem' }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* OPTION 1: Direct File Upload */}
                {anexoTab === 'upload' && (
                  <div
                    style={{
                      background: '#0d1017',
                      border: '1px dashed rgba(226,176,66,0.3)',
                      borderRadius: '0.5rem',
                      padding: '1rem',
                      textAlign: 'center',
                      position: 'relative'
                    }}
                  >
                    <input
                      type="file"
                      id="anexoFileInput"
                      disabled={isUploadingAnexo}
                      accept=".pdf,.doc,.docx,.zip,.rar,.png,.jpg,.jpeg,.pptx,.txt"
                      onChange={handleDirectFileUpload}
                      style={{ display: 'none' }}
                    />
                    <label
                      htmlFor="anexoFileInput"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: isUploadingAnexo ? 'not-allowed' : 'pointer',
                        padding: '0.5rem 1rem',
                        background: 'rgba(226,176,66,0.15)',
                        border: '1px solid #E2B042',
                        borderRadius: '9999px',
                        color: '#E2B042',
                        fontSize: '0.8rem',
                        fontWeight: '700'
                      }}
                    >
                      {isUploadingAnexo ? '⏳ Enviando arquivo ao Supabase...' : '📁 Escolher PDF ou Arquivo do Computador'}
                    </label>
                    <p style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.4rem' }}>
                      Formatos aceitos: PDF, DOCX, ZIP, Imagens (até 100MB). O arquivo será salvo diretamente na nuvem da Egrégora.
                    </p>
                    {uploadFeedback && (
                      <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: '700', marginTop: '0.4rem' }}>
                        {uploadFeedback}
                      </div>
                    )}
                  </div>
                )}

                {/* OPTION 2: External Link Input */}
                {anexoTab === 'link' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 2fr auto', gap: '0.4rem' }}>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="Nome do Anexo (ex: Template Canva)"
                      value={novoAnexoNome}
                      onChange={(e) => setNovoAnexoNome(e.target.value)}
                    />
                    <select
                      className={styles.formSelect}
                      value={novoAnexoTipo}
                      onChange={(e) => setNovoAnexoTipo(e.target.value as any)}
                    >
                      <option value="drive">📁 Google Drive</option>
                      <option value="canva">🎨 Canva</option>
                      <option value="pdf">📕 Link PDF</option>
                      <option value="link">🔗 Outro Link</option>
                    </select>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="https://..."
                      value={novoAnexoUrl}
                      onChange={(e) => setNovoAnexoUrl(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={handleAddAnexo}
                      className={`${styles.navBtn} ${styles.navBtnGhost}`}
                      style={{ padding: '0.4rem 0.8rem' }}
                    >
                      + Adicionar
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAulaModalOpen(false)}
                  className={`${styles.navBtn} ${styles.navBtnGhost}`}
                >
                  Cancelar
                </button>
                <button type="submit" className={`${styles.navBtn} ${styles.navBtnGold}`}>
                  Salvar Videoaula
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* MODAL: DISPARAR NOTIFICAÇÃO POR E-MAIL PARA OS CRIADORES */}
      {/* ========================================================================= */}
      {notificandoModulo && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                📢 Notificar Criadores por E-mail
              </h2>
              <button
                onClick={() => {
                  setNotificandoModulo(null);
                  setEmailNotificationFeedback(null);
                }}
                style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div>
              <div style={{ background: '#111520', border: '1px solid #E2B042', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.75rem' }}>{notificandoModulo.icone}</span>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffffff', margin: 0 }}>
                      {notificandoModulo.titulo}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: '#E2B042', fontWeight: '600' }}>
                      {aulas.filter((a) => a.modulo_id === notificandoModulo.id).length} aulas inclusas nesta trilha
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: '0.85rem', color: '#d1d5db', lineHeight: '1.5', margin: '0.5rem 0 0 0' }}>
                  {notificandoModulo.descricao}
                </p>

                {notificandoModulo.obrigatorio && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <span style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.4)', padding: '2px 8px', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase' }}>
                      ⚠️ Módulo Obrigatório para Condôminos
                    </span>
                  </div>
                )}
              </div>

              <p style={{ fontSize: '0.85rem', color: '#e5e7eb', lineHeight: '1.6' }}>
                Ao confirmar, um e-mail com a identidade visual da <strong>Cosmo Alma TV</strong> será enviado para todos os criadores de conteúdo cadastrados no portal, informando sobre a nova trilha de capacitação e convidando-os a assistir e baixar os materiais.
              </p>

              {emailNotificationFeedback && (
                <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid #10B981', color: '#34D399', padding: '0.75rem 1rem', borderRadius: '0.5rem', fontSize: '0.85rem', fontWeight: '700', margin: '1rem 0' }}>
                  {emailNotificationFeedback}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  disabled={isSendingEmailNotification}
                  onClick={() => {
                    setNotificandoModulo(null);
                    setEmailNotificationFeedback(null);
                  }}
                  className={`${styles.navBtn} ${styles.navBtnGhost}`}
                >
                  Fechar
                </button>
                <button
                  type="button"
                  disabled={isSendingEmailNotification}
                  onClick={() => handleSendTrainingEmailNotification(notificandoModulo)}
                  className={`${styles.navBtn} ${styles.navBtnGold}`}
                  style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}
                >
                  {isSendingEmailNotification ? '⏳ Disparando E-mails...' : '🚀 Disparar E-mails para Todos os Criadores'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
