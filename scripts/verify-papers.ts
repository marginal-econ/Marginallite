import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://tmuhpnorjydfijjotvoc.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtdWhwbm9yanlkZmlqam90dm9jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjIwOTQyNywiZXhwIjoyMTA3Nzg1NDI3fQ.WXBjD-Z797BZmO5D8i7NFHOm-1LhsRxuZm0wYSBitaw";
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

  const { data: docs, count: docCount } = await supabase
    .from("knowledge_documents")
    .select("id, title, doc_type, exam_series, chunk_count", { count: "exact" });

  console.log("\n=== KNOWLEDGE BASE DOCUMENTS IN PRODUCTION ===");
  console.log("Total Knowledge Documents:", docCount);
  if (docs && docs.length > 0) {
    const series = Array.from(new Set(docs.map((d) => d.exam_series).filter(Boolean))).sort();
    console.log("Exam Series represented:", series.length, "series:", series);
    const docTypes = docs.reduce((acc: any, d: any) => {
      acc[d.doc_type] = (acc[d.doc_type] || 0) + 1;
      return acc;
    }, {});
    console.log("By type:", docTypes);
  }

  const { count: chunkCount } = await supabase
    .from("document_chunks")
    .select("id", { count: "exact", head: true });
  console.log("Total Indexed Vector Chunks:", chunkCount);
}

check().catch(console.error);
