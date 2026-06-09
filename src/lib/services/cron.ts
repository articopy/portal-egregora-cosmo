import { supabase } from "../supabase";
import { fetchWeeklyUploadsCount } from "./youtube";

interface AuditResult {
  condomino: string;
  semana: string;
  qtd_entregue: number;
  old_status: string;
  new_status: string;
  status_valido: boolean;
}

export async function runWeeklyYoutubeAudit(mockOverrideUploads: Record<string, number> | null = null): Promise<any> {
  // Determine week code (e.g. 2026-W23)
  const today = new Date();
  
  // Calculate ISO week number
  const target = new Date(today.valueOf());
  const dayNr = (today.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  const year = today.getFullYear();
  const semanaCodigo = `${year}-W${String(weekNum).padStart(2, "0")}`;

  // Time 7 days ago in ISO format
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const publishedAfterStr = sevenDaysAgo.toISOString();

  // Get all condominos
  const { data: condominos, error: fetchError } = await supabase
    .from("condominos")
    .select("*");

  if (fetchError || !condominos) {
    throw new Error(`Failed to fetch condominos for audit: ${fetchError?.message}`);
  }

  const results: AuditResult[] = [];

  for (const c of condominos) {
    // Only audit active/blocked creators
    if (c.status !== "ATIVO_ADIMPLENTE" && c.status !== "BLOQUEADO_ASSIDUIDADE") {
      continue;
    }

    let uploadsCount = 2; // Default
    if (mockOverrideUploads && mockOverrideUploads[c.id] !== undefined) {
      uploadsCount = mockOverrideUploads[c.id];
    } else {
      const youtubeId = c.youtube_id || `mock_chan_${c.nome_comercial.toLowerCase()}`;
      uploadsCount = await fetchWeeklyUploadsCount(youtubeId, publishedAfterStr);
    }

    const isValid = uploadsCount >= 1;
    const oldStatus = c.status;
    let newStatus = oldStatus;

    if (!isValid) {
      newStatus = "BLOQUEADO_ASSIDUIDADE";
    } else {
      if (oldStatus === "BLOQUEADO_ASSIDUIDADE") {
        newStatus = "ATIVO_ADIMPLENTE";
      }
    }

    // Upsert the video delivery record
    const { data: existingEntry } = await supabase
      .from("entregas_video")
      .select("*")
      .eq("condomino_id", c.id)
      .eq("semana_codigo", semanaCodigo)
      .single();

    if (existingEntry) {
      await supabase
        .from("entregas_video")
        .update({
          qtd_entregue: uploadsCount,
          status_valido: isValid,
        })
        .eq("id", existingEntry.id);
    } else {
      await supabase
        .from("entregas_video")
        .insert({
          condomino_id: c.id,
          semana_codigo: semanaCodigo,
          qtd_entregue: uploadsCount,
          status_valido: isValid,
        });
    }

    // Update status if changed
    if (newStatus !== oldStatus) {
      await supabase
        .from("condominos")
        .update({ status: newStatus })
        .eq("id", c.id);
    }

    results.push({
      condomino: c.nome_comercial,
      semana: semanaCodigo,
      qtd_entregue: uploadsCount,
      old_status: oldStatus,
      new_status: newStatus,
      status_valido: isValid,
    });
  }

  return {
    status: "success",
    semana: semanaCodigo,
    audited_count: results.length,
    details: results,
  };
}
