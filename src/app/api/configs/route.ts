import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getAuthenticatedUser, isUserAdmin } from "@/lib/auth";

const DEFAULT_CONFIGS = {
  whatsapp_link: "https://chat.whatsapp.com/C7nExemploGrupo",
  onboarding_video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  production_guidelines: "1. Frequência: Publique entre 1 a 3 vídeos por semana para manter o engajamento algorítmico.\n2. Qualidade: Vídeos em formato 16:9, resolução mínima 1080p, áudio limpo e sem ruídos.\n3. Identidade Visual: Utilize as vinhetas oficiais fornecidas na biblioteca do canal.",
  support_contact: "Contato direto: suporte@cosmoalmatv.com.br ou pelo Telegram @SuporteCosmo",
  youtube_channel_id: "UCEI3LDmVQceZpC0zagt398Q",
};

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("portal_configs")
      .select("key, value");

    if (error) {
      console.warn("[Configs API] Table portal_configs could not be queried, using fallback defaults.", error.message);
      return NextResponse.json(DEFAULT_CONFIGS);
    }

    if (!data || data.length === 0) {
      return NextResponse.json(DEFAULT_CONFIGS);
    }

    // Convert array [{key, value}] to object {key: value}
    const configs = data.reduce((acc: any, item: any) => {
      acc[item.key] = item.value;
      return acc;
    }, {});

    // Fill missing keys with defaults
    const finalConfigs = { ...DEFAULT_CONFIGS, ...configs };
    return NextResponse.json(finalConfigs);
  } catch (err: any) {
    console.error("[Configs API] GET crash:", err);
    return NextResponse.json(DEFAULT_CONFIGS);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ detail: "Acesso não autorizado. Sessão inválida ou expirada." }, { status: 401 });
    }

    const isAdmin = isUserAdmin(user);
    if (!isAdmin) {
      return NextResponse.json({ detail: "Acesso proibido. Apenas administradores podem atualizar as configurações." }, { status: 403 });
    }

    const body = await request.json();

    const keys = ["whatsapp_link", "onboarding_video_url", "production_guidelines", "support_contact", "youtube_channel_id"];
    
    for (const key of keys) {
      if (body[key] !== undefined) {
        const { error } = await supabase
          .from("portal_configs")
          .upsert({ key, value: body[key] }, { onConflict: "key" });

        if (error) {
          console.error(`[Configs API] Error updating key ${key}:`, error);
          return NextResponse.json({ 
            detail: `Erro ao salvar a chave '${key}' no banco de dados. Certifique-se de que executou os scripts da tabela 'portal_configs' no SQL Editor do Supabase. Detalhe: ${error.message}` 
          }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ success: true, message: "Configurações atualizadas com sucesso." });
  } catch (err: any) {
    console.error("[Configs API] POST crash:", err);
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
