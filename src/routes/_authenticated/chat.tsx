import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Flame,
  HelpCircle,
  Lightbulb,
  Lock,
  MessageSquare,
  Mic,
  MicOff,
  PenLine,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
  Radio,
  X,
  RotateCcw,
  Headphones,
  FlaskConical,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getMe } from "@/lib/account.functions";
import {
  sendGroundedChatMessage,
  type GroundedChatReply,
} from "@/lib/chat.functions";
import { cn } from "@/lib/utils";

const searchSchema = z
  .object({
    q: z.string().optional().catch(undefined),
  })
  .passthrough()
  .catch({});

function cleanSpeechText(text: string): string {
  return text
    .replace(/\$\$[\s\S]*?\$\$/g, "")
    .replace(/\$[^$]*\$/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*`_~[\]()\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const Route = createFileRoute("/_authenticated/chat")({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Cambridge Grounded Chat Lab (Experimental) — Cambridge 0455" },
      {
        name: "description",
        content:
          "Experimental Cambridge 0455 syllabus dialogue engine and voiceover studio. Ask economics questions grounded strictly in official mark schemes.",
      },
    ],
  }),
  component: GroundedChatPage,
});

interface ChatMessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  voiceoverSummary?: string;
  sources?: GroundedChatReply["sources"];
  diagramGuidance?: string;
  autoDraftPrompt?: GroundedChatReply["autoDraftPrompt"];
  usedAi?: boolean;
  costEstimate?: string;
  timestamp: Date;
}

const TOPIC_STARTERS = [
  {
    topic: "Why are indirect taxes on cigarettes regressive?",
    category: "Microeconomics",
    chapter: "Chapter 3 · Market Failure & Intervention",
    paper: "Cambridge 0455/s23/ms_22",
  },
  {
    topic: "How does contractionary monetary policy curb demand-pull inflation?",
    category: "Macro Policy",
    chapter: "Chapter 5 · Macroeconomic Intervention",
    paper: "Cambridge 0455/w22/ms_23",
  },
  {
    topic: "Explain the Marshall-Lerner condition & the J-Curve time path.",
    category: "International Trade",
    chapter: "Chapter 4 · The Macroeconomy",
    paper: "Cambridge 0455/m23/ms_22",
  },
  {
    topic: "PPC movement along the curve vs outward economic growth shift.",
    category: "Basic Economic Ideas",
    chapter: "Chapter 1 · Resource Allocation",
    paper: "Cambridge 0455/s22/ms_21",
  },
];

const SUGGESTED_QUICK_CHIPS = [
  "Elasticity & tax incidence",
  "Tariffs vs import quotas",
  "Are monopolies allocatively inefficient?",
  "Current account deficit causes",
  "Fiscal multiplier & crowding out",
];

export function GroundedChatPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const getMeFn = useServerFn(getMe);

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => getMeFn(),
    staleTime: 30_000,
  });

  const isAdmin = Boolean(
    meQuery.data?.isAdmin ||
    meQuery.data?.role === "admin"
  );
  // Experimental Labs: Confidential to platform administrators only
  const isUnlocked = isAdmin;

  // Conversational state
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputMessage, setInputMessage] = useState(search.q || "");
  const [aiMode, setAiMode] = useState<boolean>(false); // false = Fast Local RAG, true = Deep AI (Gemini Flash)
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Audio Speech Synthesis (Text-to-Speech)
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  // Feature 1: Voice Command (Dictation in Input Bar)
  const [isDictating, setIsDictating] = useState(false);
  const dictationRecRef = useRef<any>(null);

  // Feature 2: AI Voiceover Studio (ChatGPT Conversational Voice Mode)
  const [voiceModeOpen, setVoiceModeOpen] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<
    "idle" | "listening" | "thinking" | "speaking" | "error"
  >("idle");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [lastVoiceReply, setLastVoiceReply] = useState<string>("");
  const [micErrorNote, setMicErrorNote] = useState<string | null>(null);
  const [voiceTextInput, setVoiceTextInput] = useState("");
  const [voiceoverMuted, setVoiceoverMuted] = useState(false);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef("");
  const isListeningRef = useRef(false);
  const silenceTimerRef = useRef<any>(null);

  // Auto-Draft Essay Studio State
  const [activeDraft, setActiveDraft] = useState<
    GroundedChatReply["autoDraftPrompt"] | null
  >(null);
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [copiedDraft, setCopiedDraft] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendFn = useServerFn(sendGroundedChatMessage);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  // Handle URL query prefill
  useEffect(() => {
    if (search.q && isUnlocked && messages.length === 0) {
      handleSend(search.q);
    }
  }, [search.q, isUnlocked]);

  // Clean up Web Speech on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      if (dictationRecRef.current) {
        try {
          dictationRecRef.current.abort();
        } catch {}
      }
    };
  }, []);

  // Textarea auto-resize
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  // Keyboard shortcut: Enter sends, Shift+Enter new line
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Text-to-Speech Read Aloud (Speaks concise examiner commentary, not raw citations)
  const handleToggleSpeak = (msgId: string, text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      toast.error("Text-to-speech is not supported on this device.");
      return;
    }

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Prefer concise spoken voiceover summary if available
    const msg = messages.find((m) => m.id === msgId);
    const spokenContent = msg?.voiceoverSummary || cleanSpeechText(text);

    if (!spokenContent) return;

    // Async timeout prevents Chrome from cancelling the queued utterance
    setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(spokenContent);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const enVoice = voices.find(
          (v) => v.lang.startsWith("en") && !v.name.toLowerCase().includes("whisper")
        );
        if (enVoice) utterance.voice = enVoice;

        utterance.onstart = () => setSpeakingMsgId(msgId);
        utterance.onend = () => setSpeakingMsgId(null);
        utterance.onerror = (e) => {
          console.warn("Speech synthesis event error:", e);
          setSpeakingMsgId(null);
        };

        setSpeakingMsgId(msgId);
        window.speechSynthesis.speak(utterance);

        // Keep-alive timer for Chromium
        const timer = setInterval(() => {
          if (!window.speechSynthesis.speaking) {
            clearInterval(timer);
          } else {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          }
        }, 5000);
      } catch (err) {
        console.warn("Could not speak utterance:", err);
        setSpeakingMsgId(null);
      }
    }, 60);
  };

  // Feature 1: Voice Command (Dictation in Input Bar - SILENT response, no auto-voice)
  const toggleVoiceDictation = () => {
    if (typeof window === "undefined") return;

    if (isDictating) {
      if (dictationRecRef.current) {
        try {
          dictationRecRef.current.stop();
        } catch {}
      }
      setIsDictating(false);
      return;
    }

    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      toast.error("Voice dictation is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = "en-US";
      rec.interimResults = true;
      rec.continuous = true;

      rec.onstart = () => {
        setIsDictating(true);
        toast.info("Voice Command active: Speak your economics question...");
      };

      rec.onresult = (event: any) => {
        let fullTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res && res[0]) {
            fullTranscript += res[0].transcript + " ";
          }
        }
        const text = fullTranscript.trim();
        setInputMessage(text);
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
        }
      };

      rec.onerror = (event: any) => {
        if (event.error !== "no-speech") {
          console.warn("Dictation error:", event.error);
        }
        setIsDictating(false);
      };

      rec.onend = () => {
        setIsDictating(false);
      };

      dictationRecRef.current = rec;
      rec.start();
    } catch (err: any) {
      console.warn("Could not start dictation:", err);
      setIsDictating(false);
    }
  };

  // Primary Message Sender
  const handleSend = async (overrideText?: string, isFromVoice = false) => {
    // If dictation was active, stop it
    if (isDictating && dictationRecRef.current) {
      try {
        dictationRecRef.current.stop();
      } catch {}
      setIsDictating(false);
    }

    const textToSend = (overrideText || inputMessage).trim();
    if (!textToSend || isSending) return;

    if (!isUnlocked) {
      toast.error("Cambridge Grounded AI Chat is unlocked for paid students and Admins.");
      return;
    }

    const userMsg: ChatMessageItem = {
      id: `user-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setIsSending(true);

    if (isFromVoice) {
      setVoiceStatus("thinking");
    }

    try {
      const history = messages
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await sendFn({
        data: {
          message: textToSend,
          aiMode,
          history,
        },
      });

      const assistantMsg: ChatMessageItem = {
        id: `asst-${Date.now()}`,
        role: "assistant",
        content: res.reply,
        voiceoverSummary: res.voiceoverSummary,
        sources: res.sources,
        diagramGuidance: res.diagramGuidance,
        autoDraftPrompt: res.autoDraftPrompt,
        usedAi: res.usedAi,
        costEstimate: res.costEstimate,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Feature 2: ONLY in AI Voiceover Studio does the examiner speak aloud
      if (isFromVoice || voiceModeOpen) {
        setLastVoiceReply(res.voiceoverSummary || res.reply);
        setVoiceStatus("speaking");
        isListeningRef.current = false;

        // Auto-trigger Essay Studio if voice essay draft was requested
        if (res.isEssayDraftRequest && res.autoDraftPrompt) {
          setActiveDraft(res.autoDraftPrompt);
          setDraftModalOpen(true);
          toast.success("Response drafted! Opened Cambridge 0455 Response Studio.");
        }

        // If user has muted voiceover in the studio, don't speak audio
        if (voiceoverMuted) {
          setVoiceStatus("listening");
          startVoiceRecognition();
          return;
        }

        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
          // ONLY speak the concise, natural 2-sentence voiceover commentary (NEVER raw markdown or citations)
          const spokenScript = res.voiceoverSummary || cleanSpeechText(res.reply);

          setTimeout(() => {
            const utterance = new SpeechSynthesisUtterance(spokenScript);
            utterance.rate = 1.05;
            utterance.pitch = 1.0;

            const voices = window.speechSynthesis.getVoices();
            const enVoice = voices.find(
              (v) => v.lang.startsWith("en") && !v.name.toLowerCase().includes("whisper")
            );
            if (enVoice) utterance.voice = enVoice;

            utterance.onend = () => {
              if (voiceModeOpen) {
                setVoiceStatus("listening");
                startVoiceRecognition();
              } else {
                setVoiceStatus("idle");
              }
            };

            utterance.onerror = (e) => {
              console.warn("Speech synthesis error in voice mode:", e);
              if (voiceModeOpen) {
                setVoiceStatus("listening");
                startVoiceRecognition();
              } else {
                setVoiceStatus("idle");
              }
            };

            window.speechSynthesis.speak(utterance);
          }, 60);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to retrieve grounded answer.");
      if (isFromVoice) {
        setVoiceStatus("idle");
      }
    } finally {
      setIsSending(false);
    }
  };

  // Start Web Speech Recognition Engine (Strictly synchronous to preserve user gesture activation)
  const startVoiceRecognition = () => {
    if (typeof window === "undefined") return;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      setMicErrorNote(
        "Speech recognition is not natively supported in this browser. Please use Google Chrome, Microsoft Edge, or Apple Safari, or type your query in the bar below."
      );
      setVoiceStatus("error");
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRec();
      recognition.lang = "en-US";
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.maxAlternatives = 1;

      transcriptRef.current = "";
      setLiveTranscript("");
      setMicErrorNote(null);
      setVoiceStatus("listening");
      isListeningRef.current = true;

      recognition.onstart = () => {
        setVoiceStatus("listening");
        setMicErrorNote(null);
        isListeningRef.current = true;
      };

      recognition.onresult = (event: any) => {
        let fullTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res && res[0]) {
            fullTranscript += res[0].transcript + " ";
          }
        }

        const trimmed = fullTranscript.trim();
        if (trimmed) {
          transcriptRef.current = trimmed;
          setLiveTranscript(trimmed);

          // 2.2-second pause detector to automatically submit query
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            if (transcriptRef.current.trim().length >= 3 && isListeningRef.current) {
              const textToSend = transcriptRef.current.trim();
              transcriptRef.current = "";
              setLiveTranscript("");
              isListeningRef.current = false;
              if (recognitionRef.current) {
                try {
                  recognitionRef.current.stop();
                } catch {}
              }
              handleSend(textToSend, true);
            }
          }, 2200);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "no-speech") {
          return;
        }
        if (event.error === "aborted") {
          return;
        }
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          isListeningRef.current = false;
          setVoiceStatus("error");

          if (typeof navigator !== "undefined" && (navigator as any).permissions?.query) {
            (navigator as any).permissions
              .query({ name: "microphone" as PermissionName })
              .then((p: any) => {
                if (p.state === "denied") {
                  setMicErrorNote(
                    "Microphone access is blocked in your browser. Click the site settings icon in your address bar, switch Microphone to 'Allow', and click 'Reload Page to Apply'."
                  );
                } else {
                  setMicErrorNote(
                    "Microphone permission is enabled in Chrome, but the browser speech service was interrupted. If you just toggled 'Allow', click 'Reload Page to Apply' below. Also verify Windows Settings → Privacy & Security → Microphone."
                  );
                }
              })
              .catch(() => {
                setMicErrorNote(
                  "Microphone permission was not confirmed. If you just updated permissions in your address bar, reload the page to apply."
                );
              });
          } else {
            setMicErrorNote(
              "Microphone permission required. If you just toggled permission in your address bar, please reload the page to apply."
            );
          }
          return;
        }

        setMicErrorNote(`Voice input note: ${event.error}. Click the orb to retry or use the question bar below.`);
      };

      recognition.onend = () => {
        if (isListeningRef.current && voiceStatus === "listening") {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognitionRef.current = recognition;
      // Start synchronously within user gesture!
      recognition.start();
    } catch (err: any) {
      console.warn("Could not initiate speech recognition:", err);
      setVoiceStatus("error");
      setMicErrorNote(err.message || "Could not start speech recognition.");
    }
  };

  // Central Orb Click Handler
  const handleOrbClick = () => {
    // 1. If examiner is currently speaking, tapping orb interrupts and listens immediately
    if (voiceStatus === "speaking") {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setVoiceStatus("listening");
      startVoiceRecognition();
      return;
    }

    // 2. If listening and user has spoken text, tapping orb sends it immediately!
    if (voiceStatus === "listening") {
      if (transcriptRef.current.trim().length >= 3) {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        const textToSend = transcriptRef.current.trim();
        transcriptRef.current = "";
        setLiveTranscript("");
        isListeningRef.current = false;
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch {}
        }
        handleSend(textToSend, true);
      } else {
        // Just pause
        isListeningRef.current = false;
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch {}
        }
        setVoiceStatus("idle");
      }
      return;
    }

    // 3. If idle or error, tap to speak
    if (voiceStatus === "idle" || voiceStatus === "error") {
      startVoiceRecognition();
    }
  };

  // Launch ChatGPT-Style Voice Mode
  const openVoiceMode = () => {
    setVoiceModeOpen(true);
    setLiveTranscript("");
    setMicErrorNote(null);
    setVoiceStatus("listening");
    startVoiceRecognition();
  };

  // Close Voice Mode
  const closeVoiceMode = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }
    setVoiceModeOpen(false);
    setVoiceStatus("idle");
    setLiveTranscript("");
    setMicErrorNote(null);
    setVoiceTextInput("");
  };

  // Copy helpers
  const handleCopy = (text: string, id: string) => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Open Cambridge Essay Studio
  const handleOpenDraftModal = (prompt?: GroundedChatReply["autoDraftPrompt"]) => {
    if (!prompt) return;
    setActiveDraft(prompt);
    setDraftModalOpen(true);
  };

  // Transfer Draft to /grade
  const handleTransferToGrader = () => {
    if (!activeDraft) return;
    try {
      sessionStorage.setItem("marginalite_prefill_draft", activeDraft.essayDraft);
      sessionStorage.setItem("marginalite_prefill_q", activeDraft.question);
    } catch {}
    setDraftModalOpen(false);
    toast.success("Draft transferred to Cambridge Response Grader!");
    navigate({
      to: "/grade",
      search: {
        q: activeDraft.question,
        marks: activeDraft.marks,
      },
    });
  };

  // Experimental Labs are strictly confidential to platform administrators
  if (!meQuery.isLoading && !isAdmin) {
    navigate({ to: "/dashboard", replace: true });
    return null;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4.25rem)] max-w-5xl mx-auto px-3 sm:px-6 py-2 overflow-hidden">
      {/* Top Header Bar — Claude Style */}
      <div className="flex items-center justify-between py-2 border-b border-border/50 shrink-0 gap-2">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xs">
            <BookOpen className="size-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-semibold tracking-tight text-foreground">
                Cambridge 0455 Co-Pilot
              </h1>
              <Badge className="bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-2 py-0">
                <FlaskConical className="size-2.5 mr-1" />
                Experimental Lab
              </Badge>
              {isAdmin ? (
                <Badge className="bg-primary/15 border-primary/30 text-primary text-[10px] font-bold px-2 py-0">
                  <ShieldCheck className="size-2.5 mr-1" />
                  Admin Pass
                </Badge>
              ) : (
                <Badge className="bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-0">
                  Grounded
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              Syllabus-locked knowledge, authentic mark scheme citations, & voice discussion
            </p>
          </div>
        </div>

        {/* Top Controls: Mode Switcher & Voice Mode CTA */}
        <div className="flex items-center gap-2">
          {/* Dual AI Mode Pill Switcher */}
          <div className="flex items-center rounded-xl bg-muted/60 p-0.5 border border-border/60 text-xs">
            <button
              type="button"
              onClick={() => setAiMode(false)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer",
                !aiMode
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Fast RAG operates purely from Cambridge database with instant local retrieval"
            >
              <Zap className="size-3 text-amber-500" />
              <span>Fast RAG (Instant)</span>
            </button>
            <button
              type="button"
              onClick={() => setAiMode(true)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer",
                aiMode
                  ? "bg-background text-primary shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Deep AI Examiner uses Gemini Flash with Cambridge prompt grounding"
            >
              <Sparkles className="size-3 text-primary" />
              <span>Deep Examiner</span>
            </button>
          </div>

          {/* AI Voiceover Studio Button */}
          <Button
            type="button"
            size="sm"
            onClick={openVoiceMode}
            className="h-8 gap-1.5 px-3 rounded-xl bg-gradient-to-r from-primary via-rose-500 to-violet-600 hover:opacity-95 text-white font-medium shadow-sm transition-all"
            title="Launch Interactive AI Voiceover Studio (ChatGPT Conversational Voice)"
          >
            <Radio className="size-3.5 animate-pulse text-white" />
            <span className="hidden sm:inline text-xs font-semibold">AI Voiceover Studio</span>
            <span className="sm:hidden text-xs font-semibold">Voiceover</span>
          </Button>

          {/* Clear conversation */}
          {messages.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={() => {
                setMessages([]);
                toast.info("Conversation cleared.");
              }}
              title="Start fresh conversation"
            >
              <RotateCcw className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Conversation Stream — Claude Style */}
      <div className="flex-1 overflow-y-auto py-2 space-y-4 px-1 sm:px-2 scrollbar-none [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        {/* Welcome Empty State (Claude Style) */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center my-auto py-3 sm:py-6 px-1 max-w-2xl mx-auto w-full text-center space-y-4">
            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold tracking-tight text-foreground">
                How can I help you explore Cambridge Economics today?
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                Ask any concept, diagram requirement, or response topic. Every answer is strictly grounded in the Cambridge 0455 specification.
              </p>
            </div>

            {/* Claude-style 2x2 Starter Grid */}
            <div className="grid gap-2.5 sm:grid-cols-2 text-left pt-1 w-full">
              {TOPIC_STARTERS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(item.topic)}
                  className="group flex flex-col justify-between p-3.5 rounded-2xl border border-border/70 bg-card/60 hover:bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer text-left space-y-1.5"
                >
                  <div className="space-y-0.5">
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-primary">
                      {item.category}
                    </span>
                    <p className="text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
                      "{item.topic}"
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                    <span className="truncate text-[11px]">{item.chapter}</span>
                    <span className="text-[10px] font-mono text-muted-foreground/80 shrink-0">
                      {item.paper}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Thread */}
        {messages.map((msg) => {
          const isUser = msg.role === "user";

          if (isUser) {
            return (
              <div key={msg.id} className="flex justify-end pl-8">
                <div className="max-w-xl rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm shadow-sm">
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  <span className="block text-[10px] opacity-75 mt-1 text-right">
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            );
          }

          // Assistant Message — Claude Style
          return (
            <div key={msg.id} className="flex items-start gap-3 sm:gap-4 pr-2 sm:pr-8">
              {/* Cambridge Avatar */}
              <div className="size-8 rounded-xl bg-card border border-border/80 flex items-center justify-center text-primary shadow-xs shrink-0 mt-0.5">
                <BookOpen className="size-4 text-primary" />
              </div>

              {/* Message Body */}
              <div className="flex-1 space-y-3 min-w-0">
                {/* Meta info badge row */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-xs">Cambridge Examiner</span>
                    <span className="text-[11px] text-muted-foreground">
                      {msg.costEstimate || "Instant Local RAG"}
                    </span>
                  </div>
                </div>

                {/* Formatted Content */}
                <div className="rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5 shadow-xs space-y-3">
                  <MarkdownContent text={msg.content} />

                  {/* Cambridge Sources Pill Tray */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="pt-3 border-t border-border/50 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="size-3 text-emerald-500" />
                        Verified Cambridge 0455 References
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.map((src, sIdx) => (
                          <span
                            key={sIdx}
                            className="inline-flex items-center gap-1 rounded-lg border border-border/70 bg-background/80 px-2 py-0.5 text-[11px] font-medium text-foreground/90 shadow-2xs"
                          >
                            <BookOpen className="size-2.5 text-primary" />
                            <span>{src.title}</span>
                            {src.paperCode && (
                              <span className="text-[10px] font-mono text-muted-foreground">
                                · {src.paperCode}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interactive Action Bar on Every Assistant Message */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/40 text-xs">
                    <div className="flex items-center gap-2">
                      {/* Read Aloud Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleSpeak(msg.id, msg.content)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                          speakingMsgId === msg.id
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold"
                            : "hover:bg-muted text-muted-foreground hover:text-foreground"
                        )}
                        title="Listen to Cambridge examiner explanation"
                      >
                        {speakingMsgId === msg.id ? (
                          <>
                            <VolumeX className="size-3.5 text-amber-500 animate-pulse" />
                            <span>Stop Audio</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="size-3.5" />
                            <span>Read Aloud</span>
                          </>
                        )}
                      </button>

                      {/* Copy Button */}
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.content, msg.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                        title="Copy text"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="size-3.5 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="size-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Auto-Draft Essay Button */}
                    {msg.autoDraftPrompt && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDraftModal(msg.autoDraftPrompt)}
                        className="h-7 text-xs gap-1.5 rounded-lg border-primary/30 text-primary hover:bg-primary/10 font-semibold"
                      >
                        <PenLine className="size-3 text-primary" />
                        <span>Auto-Draft Cambridge Response</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Spinner Indicator */}
        {isSending && (
          <div className="flex items-start gap-3 pl-1">
            <div className="size-8 rounded-xl bg-card border border-border/80 flex items-center justify-center text-primary shadow-xs shrink-0">
              <BookOpen className="size-4 text-primary animate-pulse" />
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/40 px-4 py-3 text-xs text-muted-foreground flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary animate-ping" />
              <span>Verifying Cambridge 0455 syllabus mark schemes & definitions...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Bottom Input Dock — Claude Style */}
      <div className="pt-2 pb-1 shrink-0">
        <div className="max-w-3xl sm:max-w-4xl mx-auto rounded-2xl sm:rounded-3xl border border-border/70 bg-card/85 backdrop-blur-xl shadow-lg p-2.5 sm:p-3 space-y-2">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={inputMessage}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={
              isDictating
                ? "🎙️ Listening... Speak your economics question now (Voice Command active)..."
                : "Ask anything Cambridge 0455 (e.g. why is PED inelastic in short run, tax incidence, tariffs vs quotas)..."
            }
            rows={1}
            className="w-full resize-none bg-transparent px-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none leading-relaxed max-h-36 scrollbar-none"
          />

          {/* Action Row */}
          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border/40">
            {/* Mode Switcher Toggle Pill */}
            <button
              type="button"
              onClick={() => setAiMode(!aiMode)}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-medium transition-all cursor-pointer border",
                !aiMode
                  ? "bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400 font-semibold"
                  : "bg-primary/10 border-primary/25 text-primary font-semibold"
              )}
              title="Click to toggle between Fast Local RAG and Gemini Deep AI"
            >
              {!aiMode ? (
                <>
                  <Zap className="size-3 text-amber-500" />
                  <span>Fast RAG (Instant)</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-3 text-primary" />
                  <span>Deep AI Examiner (Gemini)</span>
                </>
              )}
            </button>

            {/* Right Tools: Voice Command (Dictate) & Send */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                size="sm"
                variant={isDictating ? "destructive" : "outline"}
                onClick={toggleVoiceDictation}
                className={cn(
                  "h-8 rounded-xl px-2.5 gap-1.5 text-xs font-medium transition-all",
                  isDictating
                    ? "bg-rose-500 text-white animate-pulse border-rose-600 shadow-md hover:bg-rose-600"
                    : "text-muted-foreground border-border/70 hover:bg-muted hover:text-foreground"
                )}
                title={isDictating ? "Click to stop dictation" : "Voice Command: Dictate question into chat box"}
              >
                <Mic className={cn("size-3.5", isDictating && "animate-bounce text-white")} />
                <span className="hidden sm:inline">
                  {isDictating ? "Listening..." : "Voice Command"}
                </span>
              </Button>

              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!inputMessage.trim() || isSending}
                className={cn(
                  "size-8 rounded-xl flex items-center justify-center transition-all cursor-pointer",
                  inputMessage.trim() && !isSending
                    ? "bg-primary text-primary-foreground shadow-sm hover:opacity-90"
                    : "bg-muted text-muted-foreground/40 cursor-not-allowed"
                )}
                title="Send query"
              >
                <Send className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FULL AI VOICEOVER STUDIO (CONVERSATIONAL TALK-OVER & ESSAY DRAFTING) */}
      <Dialog open={voiceModeOpen} onOpenChange={setVoiceModeOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden border border-border/80 bg-gradient-to-b from-card via-card/95 to-background shadow-2xl rounded-3xl">
          <div className="relative p-6 sm:p-8 flex flex-col items-center justify-between min-h-[480px] text-center">
            {/* Top Bar inside Voiceover Studio Modal */}
            <div className="w-full flex items-center justify-between pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-bold tracking-wide uppercase text-foreground">
                  AI Voiceover Studio · Cambridge 0455
                </span>
                <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20 hidden sm:inline-flex">
                  Talk-Over Active
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const next = !voiceoverMuted;
                    setVoiceoverMuted(next);
                    if (next && typeof window !== "undefined" && window.speechSynthesis) {
                      window.speechSynthesis.cancel();
                      setVoiceStatus("listening");
                      startVoiceRecognition();
                    }
                    toast.info(next ? "Voiceover Muted" : "Voiceover Audio Enabled");
                  }}
                  className={cn(
                    "h-7 px-2 text-xs rounded-xl gap-1 border cursor-pointer",
                    voiceoverMuted
                      ? "text-muted-foreground border-border/60 hover:bg-muted"
                      : "text-emerald-600 border-emerald-500/30 bg-emerald-500/10 font-semibold"
                  )}
                  title="Toggle examiner spoken audio"
                >
                  {voiceoverMuted ? <VolumeX className="size-3" /> : <Volume2 className="size-3" />}
                  <span className="text-[11px]">{voiceoverMuted ? "Muted" : "Voiceover On"}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeVoiceMode}
                  className="size-7 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            {/* Center Piece: Interactive Living Orb Visualizer */}
            <div className="my-auto py-3 flex flex-col items-center space-y-4 w-full">
              <div className="relative flex items-center justify-center size-36 sm:size-44">
                {/* Outer Ambient Ripple Rings */}
                {voiceStatus === "listening" && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-emerald-500/15 animate-ping" />
                    <div className="absolute inset-2 rounded-full bg-teal-500/20 animate-pulse" />
                  </>
                )}

                {voiceStatus === "thinking" && (
                  <div className="absolute inset-0 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />
                )}

                {voiceStatus === "speaking" && (
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" />
                )}

                {/* Central Living Interactive Orb Button */}
                <button
                  type="button"
                  onClick={handleOrbClick}
                  className={cn(
                    "relative size-28 sm:size-32 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 cursor-pointer focus:outline-none focus:ring-4 focus:ring-primary/40 active:scale-95 select-none",
                    voiceStatus === "listening" &&
                      "bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-emerald-500/40 scale-105 hover:brightness-110",
                    voiceStatus === "thinking" &&
                      "bg-gradient-to-tr from-primary to-violet-500 shadow-primary/40 animate-pulse",
                    voiceStatus === "speaking" &&
                      "bg-gradient-to-tr from-primary to-amber-500 shadow-primary/40 scale-105 animate-pulse hover:brightness-110",
                    voiceStatus === "idle" &&
                      "bg-gradient-to-tr from-muted-foreground/30 to-muted shadow-inner hover:scale-105",
                    voiceStatus === "error" &&
                      "bg-gradient-to-tr from-red-500 to-rose-600 shadow-red-500/40 hover:scale-105"
                  )}
                  title={
                    voiceStatus === "listening"
                      ? "Listening... Tap to send or pause"
                      : voiceStatus === "speaking"
                        ? "Examiner speaking. Tap orb to interrupt"
                        : "Tap orb to speak"
                  }
                >
                  {voiceStatus === "listening" && <Mic className="size-10 text-white animate-bounce" />}
                  {voiceStatus === "thinking" && <Sparkles className="size-10 text-white animate-spin" />}
                  {voiceStatus === "speaking" && <Volume2 className="size-10 text-white animate-pulse" />}
                  {voiceStatus === "idle" && <Mic className="size-10 text-muted-foreground" />}
                  {voiceStatus === "error" && <MicOff className="size-10 text-white" />}
                </button>
              </div>

              {/* Status & Live Transcription */}
              <div className="space-y-2 max-w-sm px-4 w-full text-center">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  {voiceStatus === "listening" && "Listening... Speak your economics question or correction"}
                  {voiceStatus === "thinking" && "Consulting Cambridge 0455 syllabus..."}
                  {voiceStatus === "speaking" && "Cambridge Examiner Speaking... (tap orb to interrupt)"}
                  {voiceStatus === "idle" && "Tap the glowing orb to speak"}
                  {voiceStatus === "error" && "Microphone Access Note"}
                </span>

                {/* Live Transcript Bubble */}
                {liveTranscript && (
                  <div className="bg-muted/50 border border-primary/20 rounded-2xl p-3 text-left space-y-2">
                    <p className="text-xs sm:text-sm font-semibold text-foreground italic">
                      "{liveTranscript}"
                    </p>
                    <div className="flex items-center justify-between pt-1 border-t border-border/40">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Listening actively...
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          if (transcriptRef.current.trim()) {
                            const textToSend = transcriptRef.current.trim();
                            transcriptRef.current = "";
                            setLiveTranscript("");
                            if (recognitionRef.current) {
                              try {
                                recognitionRef.current.stop();
                              } catch {}
                            }
                            handleSend(textToSend, true);
                          }
                        }}
                        className="h-6 text-[11px] px-2.5 rounded-lg gap-1 font-bold"
                      >
                        <Send className="size-3" />
                        <span>Send Now</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Actionable Error Guidance */}
                {micErrorNote && (
                  <div className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/25 rounded-2xl p-3 text-left space-y-2 shadow-xs">
                    <p className="font-semibold leading-relaxed">{micErrorNote}</p>
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={startVoiceRecognition}
                        className="h-7 text-xs rounded-xl gap-1"
                      >
                        <Mic className="size-3" />
                        <span>Try Again</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => window.location.reload()}
                        className="h-7 text-xs rounded-xl gap-1 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                      >
                        <RefreshCw className="size-3" />
                        <span>Reload Page to Apply</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Direct Voice Query Input Fallback */}
              <div className="w-full max-w-sm px-4 pt-1 space-y-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (voiceTextInput.trim()) {
                      handleSend(voiceTextInput.trim(), true);
                      setVoiceTextInput("");
                    }
                  }}
                  className="flex items-center gap-1.5"
                >
                  <Input
                    value={voiceTextInput}
                    onChange={(e) => setVoiceTextInput(e.target.value)}
                    placeholder="Type voice query or correction..."
                    className="h-8 text-xs rounded-xl bg-card border-border/70"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!voiceTextInput.trim() || isSending}
                    className="h-8 text-xs px-2.5 rounded-xl shrink-0"
                  >
                    <Send className="size-3" />
                  </Button>
                </form>

                {/* Voice Calibration & Correction Prompts */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-0.5">
                  {[
                    "Calibrate: Paper 1 (MCQ)",
                    "Calibrate: Paper 2 (Structured)",
                    "Auto-Draft 8-Mark Response",
                    "Focus on Inelastic PED",
                  ].map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => handleSend(topic, true)}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer border border-border/40 truncate font-medium"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Controls inside Voice Mode */}
            <div className="w-full flex items-center justify-between pt-4 border-t border-border/40 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (lastVoiceReply) {
                    const prompt = messages[messages.length - 1]?.autoDraftPrompt;
                    if (prompt) {
                      setVoiceModeOpen(false);
                      handleOpenDraftModal(prompt);
                    } else {
                      toast.info("Ask an economics question first to draft an essay.");
                    }
                  } else {
                    toast.info("Ask an economics question first to draft an essay.");
                  }
                }}
                className="text-xs gap-1.5 rounded-xl border-primary/30 text-primary cursor-pointer"
              >
                <PenLine className="size-3.5" />
                <span>Auto-Draft Essay</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={voiceStatus === "listening" ? "destructive" : "default"}
                  onClick={() => {
                    if (voiceStatus === "listening") {
                      isListeningRef.current = false;
                      if (recognitionRef.current) {
                        try {
                          recognitionRef.current.stop();
                        } catch {}
                      }
                      setVoiceStatus("idle");
                    } else {
                      startVoiceRecognition();
                    }
                  }}
                  className="rounded-xl text-xs gap-1.5 cursor-pointer"
                >
                  <Mic className="size-3.5" />
                  <span>{voiceStatus === "listening" ? "Pause" : "Resume"}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeVoiceMode}
                  className="rounded-xl text-xs cursor-pointer"
                >
                  Exit Voice
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CAMBRIDGE ESSAY STUDIO MODAL */}
      <Dialog open={draftModalOpen} onOpenChange={setDraftModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden border border-border/80 shadow-2xl rounded-3xl">
          <DialogHeader className="p-5 border-b border-border/60 bg-muted/20 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <PenLine className="size-4" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold">
                    Cambridge 0455 Response Studio
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Structured 4-Part Response with official Assessment Objective (AO) allocation.
                  </DialogDescription>
                </div>
              </div>
              <Badge className="bg-primary/10 text-primary border-primary/30 text-xs font-bold">
                [{activeDraft?.marks ?? 8} Marks]
              </Badge>
            </div>
          </DialogHeader>

          {/* Assessment Objective Marks Breakdown */}
          <div className="grid grid-cols-3 gap-2 px-5 py-2.5 bg-muted/40 border-b border-border/50 text-center text-xs shrink-0">
            <div className="p-1.5 rounded-lg bg-card/60 border border-border/50">
              <span className="block font-bold text-foreground">AO1 Knowledge</span>
              <span className="text-[11px] text-muted-foreground">3 Marks · Definitions</span>
            </div>
            <div className="p-1.5 rounded-lg bg-card/60 border border-border/50">
              <span className="block font-bold text-foreground">AO2 Analysis</span>
              <span className="text-[11px] text-muted-foreground">5 Marks · Causal Chains</span>
            </div>
            <div className="p-1.5 rounded-lg bg-card/60 border border-border/50">
              <span className="block font-bold text-foreground">AO3 Evaluation</span>
              <span className="text-[11px] text-muted-foreground">4 Marks · Synthesis</span>
            </div>
          </div>

          {/* Essay Draft Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs sm:text-sm leading-relaxed">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs">
              <span className="font-bold text-foreground block mb-0.5">Examination Prompt:</span>
              <p className="text-foreground/90 font-medium italic">"{activeDraft?.question}"</p>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-4 shadow-inner space-y-3 font-serif">
              <MarkdownContent text={activeDraft?.essayDraft || ""} />
            </div>
          </div>

          {/* Studio Footer with 1-Click Transfer to Grader */}
          <div className="p-4 border-t border-border/60 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (activeDraft?.essayDraft) {
                    navigator.clipboard.writeText(activeDraft.essayDraft);
                    setCopiedDraft(true);
                    toast.success("Essay draft copied to clipboard!");
                    setTimeout(() => setCopiedDraft(false), 2000);
                  }
                }}
                className="w-full sm:w-auto text-xs gap-1.5 rounded-xl"
              >
                {copiedDraft ? (
                  <>
                    <Check className="size-3.5 text-emerald-500" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    <span>Copy Draft</span>
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (activeDraft?.essayDraft) {
                    handleToggleSpeak("essay-draft-preview", activeDraft.essayDraft);
                  }
                }}
                className="w-full sm:w-auto text-xs gap-1.5 rounded-xl"
              >
                <Volume2 className="size-3.5" />
                <span>Listen to Essay</span>
              </Button>
            </div>

            <Button
              size="sm"
              onClick={handleTransferToGrader}
              className="w-full sm:w-auto text-xs font-bold gap-1.5 rounded-xl shadow-md bg-primary text-primary-foreground hover:opacity-90"
            >
              <span>Transfer to Official Essay Grader (/grade)</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Clean Claude-Style Markdown Formatter
 */
function MarkdownContent({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let currentList: { type: "ul" | "ol"; items: string[] } | null = null;
  let currentQuote: string[] = [];

  const flushList = () => {
    if (currentList) {
      const isOl = currentList.type === "ol";
      elements.push(
        isOl ? (
          <ol key={`ol-${elements.length}`} className="space-y-1.5 pl-1 my-2">
            {currentList.items.map((it, i) => (
              <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-foreground/90">
                <span className="inline-flex size-4 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px] mt-0.5 shrink-0">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{renderInlineMarkdown(it)}</span>
              </li>
            ))}
          </ol>
        ) : (
          <ul key={`ul-${elements.length}`} className="space-y-1.5 pl-1 my-2">
            {currentList.items.map((it, i) => (
              <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-foreground/90">
                <span className="size-1.5 rounded-full bg-primary/70 mt-1.5 shrink-0" />
                <span className="leading-relaxed">{renderInlineMarkdown(it)}</span>
              </li>
            ))}
          </ul>
        )
      );
      currentList = null;
    }
  };

  const flushQuote = () => {
    if (currentQuote.length > 0) {
      elements.push(
        <div
          key={`quote-${elements.length}`}
          className="rounded-xl border-l-4 border-primary/80 bg-primary/5 px-4 py-3 my-2 text-xs sm:text-sm italic text-foreground shadow-2xs space-y-1"
        >
          {currentQuote.map((q, i) => (
            <p key={i} className="leading-relaxed">
              {renderInlineMarkdown(q)}
            </p>
          ))}
        </div>
      );
      currentQuote = [];
    }
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx]!;
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushList();
      flushQuote();
      continue;
    }

    // Horizontal Rule: --- or ***
    if (trimmed === "---" || trimmed === "***") {
      flushList();
      flushQuote();
      elements.push(<hr key={`hr-${idx}`} className="border-border/50 my-3" />);
      continue;
    }

    // Markdown Headings: #, ##, ###, ####
    if (/^#{1,4}\s+/.test(trimmed)) {
      flushList();
      flushQuote();
      const level = trimmed.match(/^(#{1,4})\s+/)?.[1]?.length || 3;
      const headingText = trimmed.replace(/^#{1,4}\s+/, "");
      elements.push(
        <h3
          key={`h-${idx}`}
          className={cn(
            "font-bold tracking-tight text-foreground flex items-center gap-2",
            level === 1 ? "text-base sm:text-lg pt-3" : "text-sm sm:text-base pt-2 text-primary"
          )}
        >
          <span className="size-1.5 rounded-full bg-primary shrink-0" />
          <span>{renderInlineMarkdown(headingText)}</span>
        </h3>
      );
      continue;
    }

    // Quotes / Cambridge Definitions: >
    if (trimmed.startsWith(">")) {
      flushList();
      currentQuote.push(trimmed.replace(/^>\s*/, ""));
      continue;
    }

    // Numbered List / Steps: 1. , 2. , 3.
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      flushQuote();
      if (!currentList || currentList.type !== "ol") {
        flushList();
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push(numMatch[2]!);
      continue;
    }

    // Bullet List: - , * , •
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)/);
    if (bulletMatch) {
      flushQuote();
      if (!currentList || currentList.type !== "ul") {
        flushList();
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push(bulletMatch[1]!);
      continue;
    }

    // Standard Prose Line / Paragraph
    flushList();
    flushQuote();
    elements.push(
      <p key={`p-${idx}`} className="text-xs sm:text-sm leading-relaxed text-foreground/90 my-1">
        {renderInlineMarkdown(trimmed)}
      </p>
    );
  }

  flushList();
  flushQuote();

  return <div className="space-y-1">{elements}</div>;
}

function renderInlineMarkdown(str: string) {
  const parts = str.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-primary font-medium"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
