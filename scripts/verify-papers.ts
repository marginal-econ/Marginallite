import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://tmuhpnorjydfijjotvoc.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function check() {
  const { data: mcqs, count: mcqCount, error: mcqError } = await supabase
    .from("mcq_pdf_papers")
    .select("*", { count: "exact" });
    
  console.log("=== MCQ PAPERS IN PRODUCTION ===");
  if (mcqError) {
    console.error("mcq error:", mcqError);
  }
  console.log("Total MCQ Papers in mcq_pdf_papers:", mcqCount, "length:", mcqs?.length);
  if (mcqs && mcqs.length > 0) {
    console.log("Columns on row 0:", Object.keys(mcqs[0]));
    console.log("All paper titles:", mcqs.map((p) => p.title));
  }
  if (mcqs && mcqs.length > 0) {
    const years = Array.from(new Set(mcqs.map((p) => p.year))).sort((a: any, b: any) => a - b);
    console.log("Years covered:", years.join(", "));
    console.log("Total papers listed:", mcqs.length);
  }

  for (const table of ["profiles", "definitions", "calibration_anchors", "classrooms", "essays", "essay_versions"]) {
    const { error } = await supabase.from(table).select("id").limit(1);
    console.log(`table ${table}:`, error ? error.message : "EXISTS");
  }

  const { count: chunkCount } = await supabase
    .from("document_chunks")
    .select("id", { count: "exact", head: true });
  console.log("Total Indexed Vector Chunks:", chunkCount);
}

check().catch(console.error);
