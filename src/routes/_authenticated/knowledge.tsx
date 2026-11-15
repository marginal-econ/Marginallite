import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BookOpen,
  FileText,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { formatErrorMessage } from "@/lib/safe-validator";

import { PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { extractTextFromFile } from "@/lib/extract-text";
import { isPdfFile, ocrPdf } from "@/lib/pdf-ocr";
import { getMe } from "@/lib/account.functions";
import { cn } from "@/lib/utils";
import {
  deleteDocument,
  embedNextBatch,
  ingestDocument,
  listDocuments,
  searchKnowledge,
} from "@/lib/knowledge.functions";

const DOC_TYPES = [
  { value: "mark_scheme", label: "Mark Scheme" },
  { value: "syllabus", label: "Syllabus" },
  { value: "past_paper", label: "Past Paper" },
  { value: "examiner_report", label: "Examiner Report" },
  { value: "coursebook", label: "Coursebook" },
  { value: "notes", label: "Class Notes" },
  { value: "other", label: "Other" },
] as const;

export const Route = createFileRoute("/_authenticated/knowledge")({
  head: () => ({
    meta: [
      { title: "Knowledge Base — Marginalite IGCSE Economics" },
      {
        name: "description",
        content:
          "Instant search across official Cambridge IGCSE 0455 mark schemes, past papers, syllabus guides, and coursebooks.",
      },
    ],
  }),
  component: KnowledgePage,
});

export function KnowledgePage() {
  const queryClient = useQueryClient();
  const fetchMe = useServerFn(getMe);
  const me = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });

  const fetchDocs = useServerFn(listDocuments);
  const searchFn = useServerFn(searchKnowledge);
  const ingest = useServerFn(ingestDocument);
  const embedBatch = useServerFn(embedNextBatch);
  const removeDoc = useServerFn(deleteDocument);

  const docsQuery = useQuery({
    queryKey: ["knowledge-documents"],
    queryFn: () => fetchDocs(),
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Easy Add form state
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<string>("mark_scheme");
  const [newText, setNewText] = useState("");
  const [examSeries, setExamSeries] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ step: string; percent: number } | null>(null);

  // Search execution
  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      if (!query.trim() || query.trim().length < 2) return [];
      return searchFn({ data: { query: query.trim() } });
    },
  });

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchQuery.trim().length >= 2) {
      searchMutation.mutate(searchQuery);
    }
  };

  // Filtered documents for browse mode
  const allDocs = useMemo(() => docsQuery.data ?? [], [docsQuery.data]);
  const filteredDocs = useMemo(() => {
    return allDocs.filter((doc) => {
      const matchesType = selectedType === "all" || doc.doc_type === selectedType;
      const matchesQuery =
        !searchQuery.trim() ||
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.doc_type.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesQuery;
    });
  }, [allDocs, selectedType, searchQuery]);

  // File drop/upload parser
  const handleFileChange = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadProgress({ step: "Reading file...", percent: 25 });
      if (!newTitle) {
        setNewTitle(file.name.replace(/\.[^/.]+$/, ""));
      }

      let extracted = "";
      if (isPdfFile(file)) {
        setUploadProgress({ step: "Extracting text...", percent: 30 });
        const ocrOutcome = await ocrPdf(file, (label) => {
          setUploadProgress({ step: label, percent: 45 });
        });
        extracted = ocrOutcome.text;
      } else {
        extracted = await extractTextFromFile(file);
      }

      setNewText(extracted);
      setUploadProgress({ step: "File loaded successfully", percent: 100 });
      toast.success(`Extracted ${extracted.length.toLocaleString()} characters.`);
    } catch (err: any) {
      toast.error(formatErrorMessage(err, "Failed to parse document"));
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(null), 1500);
    }
  };

  // Easy Ingest Handler
  const handleIngest = async () => {
    if (!newTitle.trim()) {
      toast.error("Please enter a document title.");
      return;
    }
    if (!newText.trim()) {
      toast.error("Please provide document text or upload a file.");
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress({ step: "Chunking & staging document...", percent: 40 });

      const res = await ingest({
        data: {
          title: newTitle.trim(),
          docType: newType as any,
          examSeries: examSeries.trim() || undefined,
          text: newText,
        },
      });

      if (res.duplicateOf) {
        toast.info(`Document already indexed as "${res.duplicateOf}".`);
        setAddModalOpen(false);
        return;
      }

      setUploadProgress({ step: "Embedding vector chunks...", percent: 60 });
      let done = false;
      let iterations = 0;
      const totalChunks = res.chunkCount || 1;
      while (!done && iterations < 200) {
        const batchRes = await embedBatch({ data: { documentId: res.documentId } });
        done = batchRes.done;
        iterations += 1;
        const remaining = batchRes.remaining ?? 0;
        const pct = Math.min(99, Math.round(50 + ((totalChunks - remaining) / totalChunks) * 50));
        setUploadProgress({
          step: done
            ? "Indexing complete!"
            : `Embedding vector chunks (${totalChunks - remaining}/${totalChunks})...`,
          percent: pct,
        });
      }

      setUploadProgress({ step: "Ready!", percent: 100 });
      toast.success("Document indexed and embedded into Knowledge Base!");
      queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
      setAddModalOpen(false);
      setNewTitle("");
      setNewText("");
      setExamSeries("");
    } catch (err: any) {
      toast.error(formatErrorMessage(err, "Failed to ingest document"));
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const isStaff = Boolean(me.data?.role === "teacher" || me.data?.isStaff || me.data?.isAdmin);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Knowledge Base"
        description="Search across official Cambridge IGCSE 0455 mark schemes, past papers, syllabus guides, and verified examiner materials."
        action={
          isStaff ? (
            <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-xs">
                  <Plus className="size-3.5 mr-1.5" /> Easy Add Document
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle className="text-base font-bold">Easy Add Knowledge Document</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Upload a mark scheme, syllabus guide, or past paper to ground Cambridge evaluations in official criteria.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2 text-xs">
                  <div>
                    <Label className="text-xs font-semibold">Document Title *</Label>
                    <Input
                      placeholder="e.g. 0455/22 Oct/Nov 2024 Mark Scheme"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="mt-1 h-8.5 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold">Document Type</Label>
                      <Select value={newType} onValueChange={setNewType}>
                        <SelectTrigger className="mt-1 h-8.5 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DOC_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value} className="text-xs">
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold">Exam Series (Optional)</Label>
                      <Input
                        placeholder="e.g. 2024_w22"
                        value={examSeries}
                        onChange={(e) => setExamSeries(e.target.value)}
                        className="mt-1 h-8.5 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Upload File or Paste Text</Label>
                      <label className="text-[11px] font-semibold text-primary hover:underline cursor-pointer flex items-center gap-1">
                        <Upload className="size-3" /> Choose PDF / Text
                        <input
                          type="file"
                          accept=".pdf,.txt,.md"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFileChange(f);
                          }}
                        />
                      </label>
                    </div>
                    <Textarea
                      placeholder="Paste text directly, or click 'Choose PDF / Text' above to extract from file..."
                      value={newText}
                      onChange={(e) => setNewText(e.target.value)}
                      rows={6}
                      className="mt-1.5 text-xs font-mono"
                    />
                  </div>

                  {uploadProgress && (
                    <div className="space-y-1.5 rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-primary">{uploadProgress.step}</span>
                        <span className="font-bold tabular-nums">{uploadProgress.percent}%</span>
                      </div>
                      <Progress value={uploadProgress.percent} className="h-1.5" />
                    </div>
                  )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddModalOpen(false)}
                    disabled={isUploading}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleIngest}
                    disabled={isUploading || !newTitle.trim() || !newText.trim()}
                    className="text-xs font-semibold bg-primary text-primary-foreground"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="size-3.5 mr-1.5 animate-spin" /> Ingesting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-3.5 mr-1.5" /> Ingest &amp; Embed
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />

      <div className="space-y-5 px-4 py-6 sm:px-6 md:px-8 max-w-7xl mx-auto">
        {/* Sleek Search Header */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search Cambridge 0455 mark schemes, concepts, questions, or syllabus terms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9.5 pr-4 h-10 text-xs sm:text-sm bg-background"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[150px] h-10 text-xs bg-background">
                  <Filter className="size-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Types</SelectItem>
                  {DOC_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" size="sm" className="h-10 px-4 text-xs font-semibold shrink-0">
                {searchMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  "Search"
                )}
              </Button>
            </div>
          </form>

          {/* Quick RAG statistics */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <strong>{allDocs.length}</strong> Indexed Documents
              </span>
              <span>•</span>
              <span>2048-Dim Grounded Retrieval</span>
              <span>•</span>
              <span>Cambridge 0455 Economics</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => docsQuery.refetch()}
                className="h-6 text-[10.5px] px-2 text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className={cn("size-3 mr-1", docsQuery.isFetching && "animate-spin")} /> Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Semantic Search Results (when search is run) */}
        {searchMutation.data && searchMutation.data.length > 0 ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="size-4 text-primary" /> Semantic Citations ({searchMutation.data.length})
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => searchMutation.reset()}
                className="text-xs text-muted-foreground h-7"
              >
                Clear Search
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {searchMutation.data.map((res: any, idx: number) => (
                <div
                  key={idx}
                  className="rounded-xl border border-primary/20 bg-primary/[0.02] p-4 shadow-2xs space-y-2 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-xs text-foreground truncate">
                      {res.documentTitle || "Cambridge Document"}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                      {(res.similarity * 100).toFixed(0)}% Match
                    </Badge>
                  </div>
                  {res.heading && (
                    <p className="text-[11px] font-medium text-primary">{res.heading}</p>
                  )}
                  <p className="text-xs text-muted-foreground line-clamp-4 leading-relaxed font-sans">
                    {res.content}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Knowledge Documents Browse List */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">
              {searchQuery ? `Matching Documents (${filteredDocs.length})` : `All Knowledge Documents (${filteredDocs.length})`}
            </h3>
            {selectedType !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedType("all")}
                className="text-xs text-muted-foreground h-7"
              >
                Reset Filter
              </Button>
            )}
          </div>

          {docsQuery.isLoading ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              <Loader2 className="size-6 animate-spin mx-auto mb-2 text-primary" />
              Loading knowledge documents...
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center bg-card/40">
              <BookOpen className="mx-auto size-8 text-muted-foreground/50 mb-2" />
              <h4 className="font-semibold text-foreground text-sm">No documents found</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? "No mark schemes or documents match your search. Try another keyword or reset filters."
                  : "No documents have been indexed yet."}
              </p>
              {isStaff && (
                <Button
                  size="sm"
                  onClick={() => setAddModalOpen(true)}
                  className="mt-3 text-xs font-semibold"
                >
                  <Plus className="size-3.5 mr-1" /> Add First Document
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-2xl border border-border/80 bg-card/90 p-4 shadow-sm hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant="outline"
                        className="text-[10.5px] capitalize font-semibold border-primary/25 bg-primary/5 text-primary"
                      >
                        {doc.doc_type === "mark_scheme" ? "Mark Scheme" : doc.doc_type === "syllabus" ? "Syllabus" : "Past Paper"}
                      </Badge>
                      <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                        {doc.status === "ready" ? (
                          <>
                            <CheckCircle2 className="size-3.5 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Ready</span>
                          </>
                        ) : doc.status === "failed" ? (
                          <>
                            <AlertCircle className="size-3.5 text-destructive" />
                            <span className="text-destructive font-semibold">Failed</span>
                          </>
                        ) : (
                          <>
                            <Loader2 className="size-3.5 animate-spin text-amber-500" />
                            <span className="text-amber-600 dark:text-amber-400">Ingesting</span>
                          </>
                        )}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {doc.title}
                      </h4>
                      <p className="mt-1 text-xs text-muted-foreground font-mono">
                        Series: {doc.exam_series || "Official Guide"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium">
                      {doc.chunk_count || 0} {(doc.chunk_count === 1) ? "chunk" : "chunks"} indexed
                    </span>
                    {isStaff && (
                      <button
                        onClick={async () => {
                          if (confirm(`Remove "${doc.title}" from Knowledge Base?`)) {
                            try {
                              await removeDoc({ data: { id: doc.id, documentId: doc.id } });
                              toast.success("Document removed.");
                              queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
                            } catch (err: any) {
                              toast.error(formatErrorMessage(err, "Failed to delete"));
                            }
                          }
                        }}
                        className="text-muted-foreground hover:text-destructive p-1 rounded"
                        title="Delete document"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
