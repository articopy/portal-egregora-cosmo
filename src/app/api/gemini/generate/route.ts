import { NextResponse } from 'next/server';
import { getAuthenticatedUser, isUserAdmin } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

async function extractTextFromUrl(url: string): Promise<string> {
  if (!url) return '';
  try {
    const formattedUrl = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`;
    const response = await fetch(formattedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      next: { revalidate: 3600 } // Cache de 1 hora
    });

    if (!response.ok) {
      console.warn(`[URL Scraper] Falha ao acessar URL ${formattedUrl}: ${response.statusText}`);
      return '';
    }

    const html = await response.text();
    // Limpeza básica do HTML para extrair apenas conteúdo legível
    let text = html
      .replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, '')
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();

    return `--- Conteúdo de ${formattedUrl} ---\n${text.substring(0, 4000)}\n`;
  } catch (error) {
    console.error(`[URL Scraper] Erro ao extrair texto da URL ${url}:`, error);
    return '';
  }
}

export async function POST(request: Request) {
  // Valida autenticação e autorização contra o Supabase (somente admin)
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Acesso não autorizado. Sessão inválida ou expirada.' }, { status: 401 });
  }

  const isAdmin = isUserAdmin(user);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
  }

  // Obtém a chave de API do header customizado ou do arquivo .env.local
  const clientKey = request.headers.get('x-gemini-api-key');
  const geminiKey = clientKey || process.env.GEMINI_API_KEY;

  if (!geminiKey) {
    return NextResponse.json({ error: 'Chave de API do Gemini não fornecida.' }, { status: 400 });
  }

  console.log(`[Gemini API] Usando chave fornecida via: ${clientKey ? 'Client Header (localStorage)' : 'Server Env Variable'}. Início da chave: ${geminiKey.substring(0, 7)}...`);

  try {
    const { prompt, systemInstruction, referenceUrls = [], model = 'gemini-3.5-flash' } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt é obrigatório.' }, { status: 400 });
    }

    // Buscar e extrair texto das URLs de referência em paralelo
    let referenceTexts = '';
    if (referenceUrls && referenceUrls.length > 0) {
      const fetchPromises = referenceUrls.map((url: string) => extractTextFromUrl(url));
      const results = await Promise.all(fetchPromises);
      referenceTexts = results.filter(text => text !== '').join('\n');
    }

    // Combinar o prompt do usuário com os textos de referência
    let finalPrompt = prompt;
    if (referenceTexts) {
      finalPrompt = `[FONTES DE REFERÊNCIA E REGRAS DE SEO EXTRAS]\n${referenceTexts}\n\n[INSTRUÇÃO DE CRIAÇÃO]\n${prompt}`;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

    // Tentar carregar o "Cérebro SEO/GEO" (conhecimento permanente local)
    let brainText = '';
    try {
      const brainPath = path.join(process.cwd(), 'src/app/otimizador-youtube/cerebro_seo_geo.md');
      if (fs.existsSync(brainPath)) {
        brainText = fs.readFileSync(brainPath, 'utf-8');
      }
    } catch (err) {
      console.warn('[Gemini API] Cérebro SEO/GEO não pôde ser carregado:', err);
    }

    // Construir instrução de sistema focada em SEO & GEO de 2026
    const baseSystemInstruction = 
      "Você é o copiloto de criação e especialista sênior em SEO (Search Engine Optimization) e GEO (Generative Engine Optimization) de YouTube do canal Cosmo Alma TV (2026).\n" +
      "Seu objetivo é gerar títulos magnéticos, descrições perfeitas estruturadas por capítulos, tags estratégicas e sugestões precisas de B-Roll / Prompts para IA.\n\n" +
      (brainText ? `[CÉREBRO DE CONHECIMENTO DE REFERÊNCIA PERMANENTE]\n${brainText}\n\n` : "") +
      "DIRETRIZES DE SEO & GEO 2026:\n" +
      "1. Títulos Magnéticos: Devem misturar curiosidade espiritual/cósmica com termos de alto volume de buscas. Palavras-chave essenciais nos primeiros 50 caracteres. Máximo 70 caracteres.\n" +
      "2. Ancoragem de Descrição (GEO): Os primeiros 150 caracteres da descrição devem ser um resumo extremamente magnético do assunto, respondendo de forma direta a buscas de usuários para serem exibidos em buscas de IA (GEO).\n" +
      "3. Localização/GEO: Integrar conceitos universais com conexões e termos que gerem identificação imediata com o público regionalizado.\n" +
      "4. Tags: Divididas entre cauda corta (termos amplos) e cauda longa (perguntas comuns).\n" +
      "5. B-Roll e Prompts: Prompts descritivos ultra-visuais, ideais para ferramentas como Midjourney e Runway.\n\n" +
      "REGRA DE FORMATO CRÍTICA:\n" +
      "Gere APENAS o conteúdo que foi especificamente solicitado no prompt do usuário (em '[INSTRUÇÃO DE CRIAÇÃO]').\n" +
      "- Se o usuário pediu TÍTULOS, responda APENAS com os títulos.\n" +
      "- Se o usuário pediu DESCRIÇÃO, responda APENAS com a descrição.\n" +
      "- Se o usuário pediu TAGS, responda APENAS com a lista de tags.\n" +
      "- Se o usuário pediu B-ROLL, responda APENAS com as sugestões de B-roll.\n" +
      "Nunca misture as seções ou gere todas de uma vez, a menos que o prompt peça explicitamente por tudo.\n\n" +
      (systemInstruction ? `Instruções adicionais específicas:\n${systemInstruction}` : "");

    const requestPayload: any = {
      contents: [{
        parts: [{ text: finalPrompt }]
      }],
      systemInstruction: {
        parts: [{ text: baseSystemInstruction }]
      }
    };

    let response: any;
    let data: any;
    const maxRetries = 3;
    let delayMs = 1500;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestPayload)
        });

        data = await response.json();

        if (response.ok) {
          break;
        }

        // Se for um erro 503 (Servidor indisponível / Alta demanda) ou 429 (Limite temporário), tenta novamente
        if ((response.status === 503 || response.status === 429) && attempt < maxRetries) {
          console.warn(`[Gemini API] Tentativa ${attempt} falhou com status ${response.status}. Retentando em ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          delayMs *= 2; // Backoff exponencial
        } else {
          break;
        }
      } catch (err: any) {
        if (attempt === maxRetries) {
          throw err;
        }
        console.warn(`[Gemini API] Tentativa ${attempt} falhou com erro de rede: ${err.message}. Retentando em ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2;
      }
    }

    if (!response.ok) {
      console.error('[Gemini API] Erro retornado pela API do Gemini:', JSON.stringify(data, null, 2));
      return NextResponse.json({
        error: 'Erro ao gerar conteúdo no Gemini no servidor externo.',
        details: data
      }, { status: response.status });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const usageMetadata = data.usageMetadata || {
      promptTokenCount: 0,
      candidatesTokenCount: 0,
      totalTokenCount: 0
    };

    return NextResponse.json({
      text,
      usageMetadata
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'Erro de comunicação com a API do Gemini.',
      details: error.message
    }, { status: 500 });
  }
}

