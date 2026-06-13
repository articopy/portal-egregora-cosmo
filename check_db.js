const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://jxasucdtmemjmotfrwzl.supabase.co";
const supabaseKey = "sb_publishable_LZRy15hzdTVZRvNoT8Lm2A_dWE7Ymf9";

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from("condominos")
    .select("id, nome_completo, email, zapsign_doc_id, status");

  if (error) {
    console.error("Error fetching condominos:", error);
    return;
  }

  console.log("Condominos in database:");
  console.log(JSON.stringify(data, null, 2));
}

check();
