const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://jxasucdtmemjmotfrwzl.supabase.co";
const supabaseKey = "sb_publishable_LZRy15hzdTVZRvNoT8Lm2A_dWE7Ymf9";

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: condomino, error } = await supabase
    .from("condominos")
    .select("*")
    .eq("email", "emilene.andre22@gmail.com")
    .single();

  if (error) {
    console.error("Error fetching condomino:", error);
    return;
  }

  console.log("Deleting deliveries for Emmy...");
  const { error: deleteError } = await supabase
    .from("entregas_video")
    .delete()
    .eq("condomino_id", condomino.id);

  if (deleteError) {
    console.error("Error deleting deliveries:", deleteError);
    return;
  }

  console.log("Deleted successfully.");

  const { data: deliveries, error: delError } = await supabase
    .from("entregas_video")
    .select("*")
    .eq("condomino_id", condomino.id);

  if (delError) {
    console.error("Error fetching deliveries:", delError);
    return;
  }

  console.log("Deliveries for Emmy after delete:", deliveries);
}

check();
