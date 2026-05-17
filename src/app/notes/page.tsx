"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import {
  BookOpen, Plus, Trash2, Save, X, Tag, BookMarked,
  ChevronDown, ChevronUp, Edit3, Search, FileText,
  CheckCircle2, Clock, Zap, FolderPlus, Pin,
  Eye, EyeOff, Download, Camera, Link2, Sparkles, Hash,
  ArrowLeft, Bold, Italic, List, Code, Minus, StickyNote,
  Lightbulb, AlertCircle, Move,
} from "lucide-react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { generateId } from "@/lib/utils";
import {
  getNotes, saveNote, deleteNote, createNote,
  getSavedQuestions, getNoteQuestions, saveNoteQuestion,
  addQuestionToNote, removeQuestionFromNote,
  getLogbook, clearLogbook, getLogbookStats,
  getFolders, saveFolder, deleteFolder, createFolder,
  getNoteSnapshots, saveNoteSnapshot, deleteNoteSnapshot,
} from "@/lib/storage";
import type {
  Note, NoteQuestion, SavedQuestion, LogbookEntry,
  QuestionDomain, QuestionDifficulty, Folder, NoteSnapshot,
} from "@/types";

// ─── MathJax ──────────────────────────────────────────────────────────────────
const mathJaxConfig = {
  loader: { load: ["input/tex", "output/chtml"] },
  tex: { inlineMath: [["$", "$"], ["\\(", "\\)"]] },
};

// ─── Constants ────────────────────────────────────────────────────────────────
const NOTE_COLORS = {
  default: { bg: "bg-slate-500/5",  border: "border-slate-500/20",  dot: "bg-slate-500",  label: "Default" },
  amber:   { bg: "bg-amber-500/8",  border: "border-amber-500/25",  dot: "bg-amber-500",  label: "Amber" },
  teal:    { bg: "bg-teal-500/8",   border: "border-teal-500/25",   dot: "bg-teal-500",   label: "Teal" },
  violet:  { bg: "bg-violet-500/8", border: "border-violet-500/25", dot: "bg-violet-500", label: "Violet" },
  rose:    { bg: "bg-rose-500/8",   border: "border-rose-500/25",   dot: "bg-rose-500",   label: "Rose" },
} as const;

const STATUS_CFG = {
  draft:    { label: "Draft",    icon: "📝", color: "text-slate-400",   bg: "bg-slate-500/10",   border: "border-slate-500/25" },
  review:   { label: "Review",   icon: "🔍", color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/25" },
  mastered: { label: "Mastered", icon: "✅", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25" },
} as const;

const TEMPLATES = [
  { name: "Concept Summary",      content: "# Concept: [Name]\n\n## What It Tests\n\n## Key Rules\n- \n- \n\n## Example\n\n## Memory Tip\n\n## Common Mistakes\n- " },
  { name: "Wrong Answer Analysis", content: "# Question Analysis\n\n## What the Question Asked\n\n## My Answer vs Correct\n- My answer: \n- Correct: \n\n## Why I Got It Wrong\n\n## How to Avoid This\n\n## Related Concept\n" },
  { name: "Skill Deep Dive",       content: "# Skill: [Name]\n\n## SAT Context\n\n## Strategy\n1. \n2. \n3. \n\n## Key Formulas / Rules\n\n## Practice Notes\n\n## Score Impact\n" },
  { name: "Study Session Log",     content: "# Session: [Date]\n\n## Topics Covered\n- \n\n## Questions Done: __/__  (__% accuracy)\n\n## Key Takeaways\n- \n\n## Struggled With\n- \n\n## Next Session Goal\n" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function readingTime(text: string): string {
  const mins = Math.ceil(wordCount(text) / 200);
  return mins <= 1 ? "< 1 min" : `${mins} min`;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function parseMarkdown(md: string, allNotes: Note[]): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (raw: string): string => {
    let s = esc(raw)
      .replace(/\[\[(.+?)\]\]/g, (_, name) => {
        const linked = allNotes.find(n => n.title.toLowerCase() === name.toLowerCase());
        return linked
          ? `<a class="wiki-link text-amber-400 underline decoration-dotted cursor-pointer hover:text-amber-300" data-note-id="${linked.id}">[[${name}]]</a>`
          : `<span class="text-slate-600 line-through text-xs">[[${name}]]</span>`;
      })
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em class="italic text-slate-200">$1</em>')
      .replace(/~~(.+?)~~/g, '<del class="line-through text-slate-500">$1</del>')
      .replace(/`(.+?)`/g, '<code class="bg-white/10 px-1.5 py-0.5 rounded text-amber-400 font-mono text-[11px]">$1</code>');
    return s;
  };

  const lines = md.split("\n");
  const out: string[] = [];
  let inCode = false, codeLines: string[] = [], inList = false, inNumList = false;

  const closeList = () => {
    if (inList)    { out.push("</ul>"); inList = false; }
    if (inNumList) { out.push("</ol>"); inNumList = false; }
  };

  for (const raw of lines) {
    if (raw.startsWith("```")) {
      if (inCode) {
        out.push(`<pre class="my-3 p-3 bg-slate-900/80 rounded-xl overflow-x-auto text-xs font-mono text-teal-300 border border-white/8 leading-relaxed"><code>${codeLines.join("\n")}</code></pre>`);
        codeLines = []; inCode = false;
      } else { closeList(); inCode = true; }
      continue;
    }
    if (inCode) { codeLines.push(esc(raw)); continue; }

    if (raw.startsWith("# "))        { closeList(); out.push(`<h1 class="text-xl font-bold text-white mt-6 mb-2 pb-1 border-b border-white/8">${inline(raw.slice(2))}</h1>`); }
    else if (raw.startsWith("## "))  { closeList(); out.push(`<h2 class="text-base font-bold text-white mt-5 mb-1.5">${inline(raw.slice(3))}</h2>`); }
    else if (raw.startsWith("### ")) { closeList(); out.push(`<h3 class="text-sm font-semibold text-slate-200 mt-4 mb-1">${inline(raw.slice(4))}</h3>`); }
    else if (raw.startsWith("- ") || raw.startsWith("* ")) {
      if (inNumList) { out.push("</ol>"); inNumList = false; }
      if (!inList) { out.push('<ul class="my-2 space-y-1 ml-2">'); inList = true; }
      out.push(`<li class="flex items-start gap-2 text-sm text-slate-300"><span class="text-amber-400 mt-[3px] text-xs flex-shrink-0">▸</span><span>${inline(raw.slice(2))}</span></li>`);
    } else if (/^\d+\.\s/.test(raw)) {
      if (inList) { out.push("</ul>"); inList = false; }
      if (!inNumList) { out.push('<ol class="my-2 space-y-1 ml-4 list-decimal">'); inNumList = true; }
      out.push(`<li class="text-sm text-slate-300">${inline(raw.replace(/^\d+\.\s/, ""))}</li>`);
    } else if (raw.trim() === "---" || raw.trim() === "***") {
      closeList(); out.push('<hr class="border-white/10 my-4">');
    } else if (raw.trim() === "") {
      closeList(); out.push('<div class="my-1.5"></div>');
    } else {
      closeList(); out.push(`<p class="text-sm text-slate-300 leading-relaxed">${inline(raw)}</p>`);
    }
  }
  closeList();
  return out.join("");
}

function exportMarkdown(note: Note) {
  const content = `# ${note.title}\n\nTags: ${note.tags.join(", ") || "none"}\nStatus: ${note.status || "draft"}\nUpdated: ${new Date(note.updatedAt).toLocaleDateString()}\n\n---\n\n${note.content}`;
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${note.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function NotesPage() {
  const [activeTab, setActiveTab] = useState<"notes" | "logbook">("notes");
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050B18] via-[#050F1E] to-[#050B18] pt-20">
      <div className="max-w-[1680px] mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <BookOpen className="w-5 h-5 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Notes & Logbook</h1>
          </div>
          <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/8 ml-auto">
            {(["notes", "logbook"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === tab ? "bg-[#F59E0B] text-[#050B18]" : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                {tab === "notes" ? "📝 My Notes" : "📋 Wrong Answers"}
              </button>
            ))}
          </div>
        </div>
        {activeTab === "notes" ? <NotesTab /> : <LogbookTab />}
      </div>
    </div>
  );
}

// ─── AI Summary types ─────────────────────────────────────────────────────────
interface AISummaryData {
  summary: string;
  keyPoints: string[];
  studyQuestions: string[];
  connections: string[];
  studyTip: string;
  weaknessHint: string;
}

// ─── Notes Tab ────────────────────────────────────────────────────────────────
function NotesTab() {
  const [notes, setNotes]                   = useState<Note[]>([]);
  const [folders, setFolders]               = useState<Folder[]>([]);
  const [savedQuestions, setSavedQuestions] = useState<SavedQuestion[]>([]);
  const [noteQuestions, setNoteQuestions]   = useState<NoteQuestion[]>([]);
  const [snapshots, setSnapshots]           = useState<NoteSnapshot[]>([]);
  const [activeNote, setActiveNote]         = useState<Note | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [activeTag, setActiveTag]           = useState<string | null>(null);
  const [showPinned, setShowPinned]         = useState(false);
  const [search, setSearch]                 = useState("");
  const [sortBy, setSortBy]                 = useState<"updated" | "created" | "title">("updated");
  const [editingTitle, setEditingTitle]     = useState(false);
  const [tagInput, setTagInput]             = useState("");
  const [expandedQs, setExpandedQs]         = useState<Set<string>>(new Set());
  const [showAddQ, setShowAddQ]             = useState(false);
  const [previewMode, setPreviewMode]       = useState(false);
  const [saved, setSaved]                   = useState(false);
  const [showTemplates, setShowTemplates]   = useState(false);
  const [showMoveFolder, setShowMoveFolder] = useState(false);
  const [showAISummary, setShowAISummary]   = useState(false);
  const [aiSummary, setAiSummary]           = useState<AISummaryData | null>(null);
  const [aiLoading, setAiLoading]           = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName]   = useState("");
  const [editFolderId, setEditFolderId]     = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [mobileView, setMobileView]         = useState<"list" | "editor">("list");
  const [flashcardMode, setFlashcardMode]   = useState(false);
  const [revealed, setRevealed]             = useState<Set<string>>(new Set());
  const previewRef  = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadData = useCallback(() => {
    setNotes(getNotes());
    setFolders(getFolders());
    setSavedQuestions(getSavedQuestions());
    setNoteQuestions(getNoteQuestions());
    setSnapshots(getNoteSnapshots());
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useHotkeys("ctrl+s,meta+s", (e) => { e.preventDefault(); handleSave(); }, { enableOnFormTags: true }, [activeNote]);
  useHotkeys("ctrl+n,meta+n", (e) => { e.preventDefault(); handleCreateNote(); }, []);
  useHotkeys("ctrl+p,meta+p", (e) => { e.preventDefault(); setPreviewMode(v => !v); }, []);
  useHotkeys("escape", () => { setShowTemplates(false); setShowMoveFolder(false); }, []);

  // Wiki link click handler in preview
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("[data-note-id]");
      if (target) {
        const id = target.getAttribute("data-note-id");
        const note = notes.find(n => n.id === id);
        if (note) { setActiveNote(note); setMobileView("editor"); }
      }
    };
    el.addEventListener("click", handler);
    return () => el.removeEventListener("click", handler);
  }, [notes]);

  const handleCreateNote = () => {
    const note = createNote({ title: `Note ${notes.length + 1}`, folderId: activeFolderId || undefined });
    setNotes(prev => [note, ...prev]);
    setActiveNote(note);
    setMobileView("editor");
    setEditingTitle(true);
    setPreviewMode(false);
  };

  const handleSave = useCallback(() => {
    if (!activeNote) return;
    const updated = { ...activeNote, updatedAt: new Date().toISOString() };
    saveNote(updated);
    setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [activeNote]);

  const handleDelete = (noteId: string) => {
    deleteNote(noteId);
    setNotes(prev => prev.filter(n => n.id !== noteId));
    if (activeNote?.id === noteId) { setActiveNote(null); setMobileView("list"); }
    toast.success("Note deleted");
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (!activeNote || e.key !== "Enter" || !tagInput.trim()) return;
    const tag = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (!activeNote.tags.includes(tag)) {
      setActiveNote(p => p ? { ...p, tags: [...p.tags, tag] } : p);
    }
    setTagInput("");
  };

  const handleAddQuestion = (sq: SavedQuestion) => {
    if (!activeNote) return;
    addQuestionToNote(activeNote.id, sq.questionId);
    saveNoteQuestion({ questionId: sq.questionId, stem: `Question ${sq.questionId}`, domain: sq.domain, difficulty: sq.difficulty, skill: sq.skill, correctAnswer: [], snapshotAt: new Date().toISOString() });
    setActiveNote(p => p ? { ...p, savedQuestionIds: p.savedQuestionIds.includes(sq.questionId) ? p.savedQuestionIds : [...p.savedQuestionIds, sq.questionId] } : p);
    setShowAddQ(false);
    loadData();
  };

  const handleRemoveQuestion = (qId: string) => {
    if (!activeNote) return;
    removeQuestionFromNote(activeNote.id, qId);
    setActiveNote(p => p ? { ...p, savedQuestionIds: p.savedQuestionIds.filter(id => id !== qId) } : p);
    loadData();
  };

  const handleSnapshot = (qId: string) => {
    if (!activeNote) return;
    const sq = savedQuestions.find(s => s.questionId === qId);
    const nq = noteQuestions.find(n => n.questionId === qId);
    const snapshot: NoteSnapshot = {
      id: generateId(),
      noteId: activeNote.id,
      questionId: qId,
      stem: nq?.stem || `Question ${qId}`,
      skill: nq?.skill || sq?.skill || "Unknown",
      domain: nq?.domain || sq?.domain || "math",
      difficulty: nq?.difficulty || sq?.difficulty || "M",
      correctAnswer: nq?.correctAnswer || [],
      rationale: nq?.rationale,
      takenAt: new Date().toISOString(),
    };
    saveNoteSnapshot(snapshot);
    const updated = { ...activeNote, snapshotIds: [...(activeNote.snapshotIds || []), snapshot.id], updatedAt: new Date().toISOString() };
    setActiveNote(updated);
    saveNote(updated);
    setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
    setSnapshots(prev => [snapshot, ...prev]);
    toast.success("📸 Snapshot saved to this note!");
  };

  const handleDeleteSnapshot = (snapshotId: string) => {
    deleteNoteSnapshot(snapshotId);
    setSnapshots(prev => prev.filter(s => s.id !== snapshotId));
    if (activeNote) {
      const updated = { ...activeNote, snapshotIds: (activeNote.snapshotIds || []).filter(id => id !== snapshotId) };
      setActiveNote(updated);
      saveNote(updated);
    }
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const folder = createFolder({ name: newFolderName.trim(), emoji: "📁", color: "slate" });
    setFolders(prev => [folder, ...prev]);
    setNewFolderName("");
    setCreatingFolder(false);
    setActiveFolderId(folder.id);
    toast.success(`Folder "${folder.name}" created`);
  };

  const handleDeleteFolder = (folderId: string) => {
    deleteFolder(folderId);
    setFolders(prev => prev.filter(f => f.id !== folderId));
    if (activeFolderId === folderId) setActiveFolderId(null);
    setNotes(prev => prev.map(n => n.folderId === folderId ? { ...n, folderId: undefined } : n));
    toast.success("Folder deleted");
  };

  const handleRenameFolder = (folder: Folder) => {
    const updated = { ...folder, name: editFolderName.trim() || folder.name };
    saveFolder(updated);
    setFolders(prev => prev.map(f => f.id === folder.id ? updated : f));
    setEditFolderId(null);
  };

  const handleMoveToFolder = (folderId: string | null) => {
    if (!activeNote) return;
    const updated = { ...activeNote, folderId: folderId || undefined };
    setActiveNote(updated);
    saveNote(updated);
    setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
    setShowMoveFolder(false);
    const name = folderId ? folders.find(f => f.id === folderId)?.name : "All Notes";
    toast.success(`Moved to "${name}"`);
  };

  const handleAISummary = async () => {
    if (!activeNote?.content.trim()) { toast.error("Write some notes first!"); return; }
    setShowAISummary(true);
    setAiSummary(null);
    setAiLoading(true);
    try {
      const res = await fetch("/api/notes/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: activeNote.title, content: activeNote.content }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAiSummary(data.summary);
    } catch {
      toast.error("AI summary failed. Check your API connection.");
      setShowAISummary(false);
    } finally {
      setAiLoading(false);
    }
  };

  const insertMarkdown = (before: string, after = "") => {
    const ta = textareaRef.current;
    if (!ta || !activeNote) return;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const sel = activeNote.content.substring(start, end);
    const next = activeNote.content.substring(0, start) + before + sel + after + activeNote.content.substring(end);
    setActiveNote(p => p ? { ...p, content: next } : p);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + before.length, start + before.length + sel.length); }, 0);
  };

  // Derived state
  const allTags = useMemo(() => {
    const map = new Map<string, number>();
    notes.forEach(n => n.tags.forEach(t => map.set(t, (map.get(t) || 0) + 1)));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [notes]);

  const filteredNotes = useMemo(() => {
    let list = [...notes];
    if (activeFolderId !== null) list = list.filter(n => n.folderId === activeFolderId);
    else if (activeTag) list = list.filter(n => n.tags.includes(activeTag));
    else if (showPinned) list = list.filter(n => n.pinned);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.tags.some(t => t.includes(q)));
    }
    return list.sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "created") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [notes, activeFolderId, activeTag, showPinned, search, sortBy]);

  const folderCounts = useMemo(() => {
    const map = new Map<string, number>();
    notes.forEach(n => { if (n.folderId) map.set(n.folderId, (map.get(n.folderId) || 0) + 1); });
    return map;
  }, [notes]);

  const activeSnapshots = useMemo(() =>
    snapshots.filter(s => activeNote?.snapshotIds?.includes(s.id)),
    [snapshots, activeNote]
  );

  const backlinks = useMemo(() => {
    if (!activeNote) return [];
    const title = activeNote.title.toLowerCase();
    return notes.filter(n => n.id !== activeNote.id && n.content.toLowerCase().includes(`[[${title}]]`));
  }, [notes, activeNote]);

  const availableToAdd = savedQuestions.filter(sq => !activeNote?.savedQuestionIds.includes(sq.questionId));
  const allSnapshots = snapshots.filter(s => s.correctAnswer.length > 0);
  const pinnedNotes  = filteredNotes.filter(n => n.pinned);
  const normalNotes  = filteredNotes.filter(n => !n.pinned);

  if (flashcardMode) {
    return <FlashcardMode snapshots={allSnapshots} onExit={() => setFlashcardMode(false)} />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px_268px_1fr] min-h-[calc(100vh-200px)] rounded-2xl border border-white/8 overflow-hidden bg-[#07101E]/70 backdrop-blur-sm">

      {/* ─── Panel 1: Folders + Tags ────────────────────────────────────────── */}
      <div className={cn("border-r border-white/8 flex flex-col", mobileView === "editor" && "hidden lg:flex")}>
        <div className="p-3 border-b border-white/8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Workspace</span>
            {allSnapshots.length > 0 && (
              <button onClick={() => setFlashcardMode(true)} className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] hover:bg-violet-500/20 transition-all" title="Flashcard mode">
                🃏 Cards
              </button>
            )}
          </div>
          {/* All Notes */}
          <button onClick={() => { setActiveFolderId(null); setActiveTag(null); setShowPinned(false); }} className={cn("w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-all", activeFolderId === null && !activeTag && !showPinned ? "bg-amber-500/15 text-amber-400 border border-amber-500/25" : "text-slate-400 hover:text-white hover:bg-white/5")}>
            <FileText className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="flex-1 text-left text-xs">All Notes</span>
            <span className="text-[10px] opacity-50">{notes.length}</span>
          </button>
          {notes.some(n => n.pinned) && (
            <button onClick={() => { setActiveFolderId(null); setActiveTag(null); setShowPinned(true); }} className={cn("w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-all mt-0.5", showPinned ? "bg-amber-500/15 text-amber-400 border border-amber-500/25" : "text-slate-400 hover:text-white hover:bg-white/5")}>
              <Pin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="flex-1 text-left text-xs">Pinned</span>
              <span className="text-[10px] opacity-50">{notes.filter(n => n.pinned).length}</span>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {/* Folders header */}
          <div className="flex items-center justify-between px-1 py-1.5">
            <span className="text-[10px] text-slate-600 font-medium uppercase tracking-wider">Folders</span>
            <button onClick={() => setCreatingFolder(true)} className="p-0.5 rounded text-slate-600 hover:text-amber-400 transition-colors"><FolderPlus className="w-3.5 h-3.5" /></button>
          </div>

          <AnimatePresence>
            {creatingFolder && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden pb-1">
                <div className="flex gap-1">
                  <Input autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleCreateFolder(); if (e.key === "Escape") setCreatingFolder(false); }} placeholder="Folder name…" className="h-7 text-xs px-2 flex-1" />
                  <button onClick={handleCreateFolder} className="p-1.5 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-all"><CheckCircle2 className="w-3 h-3" /></button>
                  <button onClick={() => setCreatingFolder(false)} className="p-1.5 rounded text-slate-500 hover:text-white"><X className="w-3 h-3" /></button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {folders.length === 0 && !creatingFolder && (
            <p className="text-[11px] text-slate-700 text-center py-3">No folders yet</p>
          )}

          {folders.map(folder => (
            <div key={folder.id} className="group">
              {editFolderId === folder.id ? (
                <div className="flex gap-1">
                  <Input autoFocus value={editFolderName} onChange={e => setEditFolderName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleRenameFolder(folder); if (e.key === "Escape") setEditFolderId(null); }} className="h-7 text-xs px-2 flex-1" />
                  <button onClick={() => setEditFolderId(null)} className="p-1 rounded text-slate-500 hover:text-white"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <button onClick={() => { setActiveFolderId(folder.id); setActiveTag(null); setShowPinned(false); }} className={cn("w-full flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs transition-all", activeFolderId === folder.id ? "bg-amber-500/15 text-amber-400 border border-amber-500/25" : "text-slate-400 hover:text-white hover:bg-white/5")}>
                  <span className="text-sm">{folder.emoji}</span>
                  <span className="flex-1 text-left truncate">{folder.name}</span>
                  <span className="text-[10px] opacity-50">{folderCounts.get(folder.id) || 0}</span>
                  <span className="hidden group-hover:flex items-center gap-0.5">
                    <button onClick={e => { e.stopPropagation(); setEditFolderId(folder.id); setEditFolderName(folder.name); }} className="p-0.5 text-slate-600 hover:text-white rounded"><Edit3 className="w-2.5 h-2.5" /></button>
                    <button onClick={e => { e.stopPropagation(); handleDeleteFolder(folder.id); }} className="p-0.5 text-slate-600 hover:text-red-400 rounded"><Trash2 className="w-2.5 h-2.5" /></button>
                  </span>
                </button>
              )}
            </div>
          ))}

          {/* Tag cloud */}
          {allTags.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/8">
              <div className="flex items-center gap-1 mb-2 px-1">
                <Hash className="w-3 h-3 text-slate-600" />
                <span className="text-[10px] text-slate-600 font-medium uppercase tracking-wider">Tags</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {allTags.slice(0, 24).map(([tag, count]) => (
                  <button key={tag} onClick={() => { setActiveTag(activeTag === tag ? null : tag); setActiveFolderId(null); setShowPinned(false); }} className={cn("px-1.5 py-0.5 rounded-full text-[10px] transition-all", activeTag === tag ? "bg-amber-500/20 text-amber-300 border border-amber-500/35" : "bg-white/5 text-slate-500 border border-white/8 hover:text-white hover:bg-white/10")}>
                    #{tag} <span className="opacity-40">{count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Panel 2: Note List ──────────────────────────────────────────────── */}
      <div className={cn("border-r border-white/8 flex flex-col", mobileView === "editor" && "hidden lg:flex")}>
        <div className="p-2.5 border-b border-white/8 space-y-2">
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes…" className="pl-7 h-7 text-xs" />
            </div>
            <Button onClick={handleCreateNote} size="sm" className="h-7 px-2 flex-shrink-0 text-xs"><Plus className="w-3 h-3" /></Button>
          </div>
          <div className="flex gap-0.5">
            {(["updated", "created", "title"] as const).map(s => (
              <button key={s} onClick={() => setSortBy(s)} className={cn("px-2 py-0.5 rounded text-[10px] capitalize transition-all", sortBy === s ? "bg-white/10 text-white" : "text-slate-600 hover:text-slate-400")}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-10 px-4">
              <FileText className="w-7 h-7 mx-auto text-slate-700 mb-2" />
              <p className="text-xs text-slate-600">{notes.length === 0 ? "No notes yet." : "No notes match."}</p>
              {notes.length === 0 && <button onClick={handleCreateNote} className="mt-2 text-xs text-amber-400 hover:underline">+ Create note</button>}
            </div>
          ) : (
            <>
              {pinnedNotes.length > 0 && <p className="text-[9px] text-slate-600 uppercase tracking-wider px-1 pt-0.5">Pinned</p>}
              {pinnedNotes.map(n => <NoteCard key={n.id} note={n} active={activeNote?.id === n.id} onClick={() => { setActiveNote(n); setMobileView("editor"); setPreviewMode(false); }} />)}
              {pinnedNotes.length > 0 && normalNotes.length > 0 && <div className="border-t border-white/8 my-1" />}
              {normalNotes.map(n => <NoteCard key={n.id} note={n} active={activeNote?.id === n.id} onClick={() => { setActiveNote(n); setMobileView("editor"); setPreviewMode(false); }} />)}
            </>
          )}
        </div>
      </div>

      {/* ─── Panel 3: Editor ────────────────────────────────────────────────── */}
      <div className={cn("flex flex-col min-h-0", mobileView === "list" && "hidden lg:flex")}>
        {activeNote ? (
          <>
            {/* Mobile back */}
            <div className="lg:hidden p-2 border-b border-white/8">
              <button onClick={() => setMobileView("list")} className="flex items-center gap-1 text-sm text-slate-400 hover:text-white">
                <ArrowLeft className="w-4 h-4" />Back
              </button>
            </div>

            {/* Title row */}
            <div className="px-5 pt-4 pb-3 border-b border-white/8">
              <div className="flex items-start gap-3 mb-3">
                {editingTitle ? (
                  <input autoFocus value={activeNote.title} onChange={e => setActiveNote(p => p ? { ...p, title: e.target.value } : p)} onBlur={() => setEditingTitle(false)} onKeyDown={e => e.key === "Enter" && setEditingTitle(false)} className="flex-1 text-xl font-bold text-white bg-transparent border-b border-amber-500/40 outline-none pb-0.5" />
                ) : (
                  <h2 className="flex-1 text-xl font-bold text-white cursor-text hover:text-amber-400 transition-colors truncate" onClick={() => setEditingTitle(true)}>{activeNote.title}</h2>
                )}
                <button onClick={handleSave} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0 transition-all", saved ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" : "bg-[#F59E0B] text-[#050B18] hover:bg-[#FBBF24]")}>
                  {saved ? <><CheckCircle2 className="w-3.5 h-3.5" />Saved</> : <><Save className="w-3.5 h-3.5" />Save</>}
                </button>
              </div>

              {/* Action toolbar */}
              <div className="flex flex-wrap items-center gap-1.5">
                {/* Status */}
                {(Object.entries(STATUS_CFG) as [Note["status"] & string, typeof STATUS_CFG[keyof typeof STATUS_CFG]][]).map(([key, cfg]) => (
                  <button key={key} onClick={() => setActiveNote(p => p ? { ...p, status: key as Note["status"] } : p)} className={cn("px-2 py-0.5 rounded-lg text-[11px] font-medium border transition-all", (activeNote.status || "draft") === key ? `${cfg.bg} ${cfg.border} ${cfg.color}` : "border-transparent text-slate-600 hover:text-slate-400")}>
                    {cfg.icon} {cfg.label}
                  </button>
                ))}

                <div className="h-3 w-px bg-white/10" />

                {/* Colors */}
                {(Object.entries(NOTE_COLORS) as [Note["color"], typeof NOTE_COLORS[Note["color"]]][]).map(([c, cfg]) => (
                  <button key={c} onClick={() => setActiveNote(p => p ? { ...p, color: c } : p)} title={cfg.label} className={cn("w-3.5 h-3.5 rounded-full transition-all", cfg.dot, activeNote.color === c ? "ring-2 ring-white/50 ring-offset-1 ring-offset-[#07101E] scale-110" : "opacity-40 hover:opacity-100")} />
                ))}

                <div className="h-3 w-px bg-white/10" />

                {/* Pin */}
                <button onClick={() => setActiveNote(p => p ? { ...p, pinned: !p.pinned } : p)} className={cn("p-1 rounded-lg transition-all", activeNote.pinned ? "text-amber-400 bg-amber-500/10" : "text-slate-500 hover:text-white hover:bg-white/5")} title={activeNote.pinned ? "Unpin" : "Pin"}>
                  <Pin className="w-3.5 h-3.5" />
                </button>

                {/* Move to folder */}
                <div className="relative">
                  <button onClick={() => setShowMoveFolder(v => !v)} className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all" title="Move to folder"><Move className="w-3.5 h-3.5" /></button>
                  <AnimatePresence>
                    {showMoveFolder && (
                      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="absolute top-8 left-0 z-30 bg-[#0D1B35] border border-white/15 rounded-xl shadow-2xl p-2 min-w-[160px] space-y-0.5">
                        <button onClick={() => handleMoveToFolder(null)} className={cn("w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all", !activeNote.folderId ? "bg-amber-500/15 text-amber-400" : "text-slate-400 hover:bg-white/5 hover:text-white")}>📋 All Notes</button>
                        {folders.map(f => (
                          <button key={f.id} onClick={() => handleMoveToFolder(f.id)} className={cn("w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all", activeNote.folderId === f.id ? "bg-amber-500/15 text-amber-400" : "text-slate-400 hover:bg-white/5 hover:text-white")}>
                            {f.emoji} {f.name}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Export */}
                <button onClick={() => exportMarkdown(activeNote)} className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all" title="Export as .md"><Download className="w-3.5 h-3.5" /></button>

                {/* AI Summary */}
                <button onClick={handleAISummary} className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[11px] hover:bg-violet-500/20 transition-all" title="AI Study Summary">
                  <Sparkles className="w-3 h-3" />AI Summary
                </button>

                <button onClick={() => handleDelete(activeNote.id)} className="p-1 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all ml-auto" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            {/* Markdown toolbar */}
            <div className="flex items-center gap-0.5 px-4 py-1.5 border-b border-white/8 bg-white/[0.02] flex-wrap">
              <MdBtn icon={<Bold className="w-3.5 h-3.5" />} title="Bold" onClick={() => insertMarkdown("**", "**")} />
              <MdBtn icon={<Italic className="w-3.5 h-3.5" />} title="Italic" onClick={() => insertMarkdown("*", "*")} />
              <div className="w-px h-3.5 bg-white/10 mx-0.5" />
              <MdBtn icon={<span className="text-[10px] font-bold leading-none">H1</span>} title="Heading 1" onClick={() => insertMarkdown("\n# ")} />
              <MdBtn icon={<span className="text-[10px] font-bold leading-none">H2</span>} title="Heading 2" onClick={() => insertMarkdown("\n## ")} />
              <MdBtn icon={<span className="text-[10px] font-bold leading-none">H3</span>} title="Heading 3" onClick={() => insertMarkdown("\n### ")} />
              <div className="w-px h-3.5 bg-white/10 mx-0.5" />
              <MdBtn icon={<List className="w-3.5 h-3.5" />} title="Bullet list" onClick={() => insertMarkdown("\n- ")} />
              <MdBtn icon={<Code className="w-3.5 h-3.5" />} title="Inline code" onClick={() => insertMarkdown("`", "`")} />
              <MdBtn icon={<Minus className="w-3.5 h-3.5" />} title="Divider" onClick={() => insertMarkdown("\n---\n")} />
              <MdBtn icon={<Link2 className="w-3.5 h-3.5" />} title="Wiki link [[Note Name]]" onClick={() => insertMarkdown("[[", "]]")} />
              <div className="w-px h-3.5 bg-white/10 mx-0.5" />
              {/* Templates dropdown */}
              <div className="relative">
                <button onClick={() => setShowTemplates(v => !v)} className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-slate-500 hover:text-white hover:bg-white/5 transition-all">
                  <StickyNote className="w-3 h-3" />Template
                </button>
                <AnimatePresence>
                  {showTemplates && (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="absolute top-8 left-0 z-30 bg-[#0D1B35] border border-white/15 rounded-xl shadow-2xl p-2 min-w-[200px] space-y-0.5">
                      {TEMPLATES.map(t => (
                        <button key={t.name} onClick={() => { setActiveNote(p => p ? { ...p, content: p.content ? `${p.content}\n\n${t.content}` : t.content } : p); setShowTemplates(false); }} className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                          {t.name}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="ml-auto">
                <button onClick={() => setPreviewMode(v => !v)} className={cn("flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all border", previewMode ? "bg-teal-500/15 border-teal-500/25 text-teal-400" : "border-white/10 text-slate-500 hover:text-white")}>
                  {previewMode ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {previewMode ? "Edit" : "Preview"}
                </button>
              </div>
            </div>

            {/* Content + sections */}
            <div className="flex-1 overflow-y-auto">
              {/* Editor / Preview */}
              {previewMode ? (
                <div ref={previewRef} className="p-6 min-h-[240px] note-preview" dangerouslySetInnerHTML={{ __html: parseMarkdown(activeNote.content, notes) || '<p class="text-slate-700 italic text-sm">Nothing to preview yet.</p>' }} />
              ) : (
                <textarea
                  ref={textareaRef}
                  value={activeNote.content}
                  onChange={e => setActiveNote(p => p ? { ...p, content: e.target.value } : p)}
                  placeholder={"Start writing… Markdown supported.\n\n**bold**, *italic*, # Heading, - bullet, `code`\n[[Link to another note]]\n\nCtrl+P = Preview  ·  Ctrl+S = Save"}
                  className="w-full min-h-[240px] p-6 resize-none bg-transparent text-slate-200 text-sm leading-relaxed placeholder:text-slate-700 outline-none font-mono"
                  style={{ height: "auto", minHeight: "240px" }}
                  onInput={e => { const ta = e.currentTarget; ta.style.height = "auto"; ta.style.height = ta.scrollHeight + "px"; }}
                />
              )}

              {/* Tags */}
              <div className="px-5 py-3 border-t border-white/8">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Hash className="w-3.5 h-3.5 text-slate-600" />
                  {activeNote.tags.map(tag => (
                    <button key={tag} onClick={() => setActiveNote(p => p ? { ...p, tags: p.tags.filter(t => t !== tag) } : p)} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-white/5 border border-white/10 text-slate-400 hover:border-red-400/30 hover:text-red-400 transition-all">
                      #{tag}<X className="w-2.5 h-2.5" />
                    </button>
                  ))}
                  <Input placeholder="Add tag…" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleAddTag} className="h-6 w-20 text-xs px-2 rounded-full" />
                </div>
              </div>

              {/* Question Snapshots */}
              <div className="px-5 py-4 border-t border-white/8">
                <div className="flex items-center gap-2 mb-3">
                  <Camera className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold text-white">Question Snapshots</span>
                  <span className="text-xs text-slate-600">({activeSnapshots.length})</span>
                  {activeSnapshots.length > 1 && (
                    <button onClick={() => setFlashcardMode(true)} className="ml-auto text-[11px] text-violet-400 hover:underline">🃏 Flashcard mode</button>
                  )}
                </div>
                {activeSnapshots.length === 0 ? (
                  <p className="text-xs text-slate-600 italic">Click 📸 on an attached question below to create a visual snapshot.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {activeSnapshots.map(snap => (
                      <SnapshotCard key={snap.id} snapshot={snap} revealed={revealed.has(snap.id)} onReveal={() => setRevealed(prev => { const n = new Set(prev); n.has(snap.id) ? n.delete(snap.id) : n.add(snap.id); return n; })} onDelete={() => handleDeleteSnapshot(snap.id)} />
                    ))}
                  </div>
                )}
              </div>

              {/* Attached Questions */}
              <div className="px-5 py-4 border-t border-white/8">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BookMarked className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-semibold text-white">Attached Questions ({activeNote.savedQuestionIds.length})</span>
                  </div>
                  {availableToAdd.length > 0 && (
                    <button onClick={() => setShowAddQ(v => !v)} className="text-xs text-slate-500 hover:text-amber-400 transition-colors flex items-center gap-1">
                      <Plus className="w-3 h-3" />Add
                    </button>
                  )}
                </div>
                <AnimatePresence>
                  {showAddQ && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-3">
                      <div className="p-3 bg-white/3 rounded-xl border border-white/8 space-y-1 max-h-40 overflow-y-auto">
                        <p className="text-[11px] text-slate-600">Saved questions from practice:</p>
                        {availableToAdd.map(sq => (
                          <button key={sq.questionId} onClick={() => handleAddQuestion(sq)} className="w-full text-left p-2 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2">
                            <Badge variant={sq.difficulty === "E" ? "easy" : sq.difficulty === "H" ? "hard" : "medium"} className="text-[10px]">{sq.difficulty}</Badge>
                            <span className="text-xs text-slate-300 flex-1 truncate">{sq.skill}</span>
                            <span className="text-[10px] text-slate-600">{sq.domain === "math" ? "Math" : "R&W"}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {activeNote.savedQuestionIds.length === 0 ? (
                  <p className="text-xs text-slate-600 italic">No questions yet. Save questions in practice mode, then attach here.</p>
                ) : (
                  <div className="space-y-2">
                    {activeNote.savedQuestionIds.map(qId => {
                      const nq = noteQuestions.find(q => q.questionId === qId);
                      const sq = savedQuestions.find(s => s.questionId === qId);
                      const isExp = expandedQs.has(qId);
                      const snapped = activeSnapshots.some(s => s.questionId === qId);
                      return (
                        <div key={qId} className="p-3 bg-white/[0.03] rounded-xl border border-white/8">
                          <div className="flex items-center gap-2">
                            <Badge variant={(nq?.difficulty || sq?.difficulty) === "E" ? "easy" : (nq?.difficulty || sq?.difficulty) === "H" ? "hard" : "medium"} className="text-[10px] flex-shrink-0">{nq?.difficulty || sq?.difficulty || "?"}</Badge>
                            <span className="text-xs text-slate-300 flex-1 truncate">{nq?.skill || sq?.skill || "Question"}</span>
                            <div className="flex gap-0.5 flex-shrink-0">
                              {!snapped && <button onClick={() => handleSnapshot(qId)} className="p-1 rounded text-slate-500 hover:text-amber-400 transition-colors" title="📸 Snapshot"><Camera className="w-3 h-3" /></button>}
                              <button onClick={() => setExpandedQs(prev => { const n = new Set(prev); n.has(qId) ? n.delete(qId) : n.add(qId); return n; })} className="p-1 rounded text-slate-500 hover:text-white transition-colors">{isExp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}</button>
                              <button onClick={() => handleRemoveQuestion(qId)} className="p-1 rounded text-slate-600 hover:text-red-400 transition-colors"><X className="w-3 h-3" /></button>
                            </div>
                          </div>
                          <AnimatePresence>
                            {isExp && nq && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                <div className="mt-2 pt-2 border-t border-white/8">
                                  {nq.stem && nq.stem !== `Question ${qId}` && <div className="text-xs text-slate-300 mb-2 question-content" dangerouslySetInnerHTML={{ __html: nq.stem }} />}
                                  {nq.rationale && (
                                    <div className="p-2 bg-amber-500/5 rounded-lg border border-amber-500/15 text-xs text-slate-400">
                                      <span className="text-amber-400 font-semibold">Rationale: </span>
                                      <span dangerouslySetInnerHTML={{ __html: nq.rationale }} />
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Backlinks */}
              {backlinks.length > 0 && (
                <div className="px-5 py-4 border-t border-white/8">
                  <div className="flex items-center gap-2 mb-2">
                    <Link2 className="w-4 h-4 text-teal-400" />
                    <span className="text-sm font-semibold text-white">Linked from ({backlinks.length})</span>
                  </div>
                  <div className="space-y-1">
                    {backlinks.map(n => (
                      <button key={n.id} onClick={() => setActiveNote(n)} className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg bg-teal-500/5 border border-teal-500/15 hover:bg-teal-500/10 transition-all">
                        <div className={cn("w-2 h-2 rounded-full flex-shrink-0", NOTE_COLORS[n.color].dot)} />
                        <span className="text-xs text-teal-300 flex-1 truncate">{n.title}</span>
                        <span className="text-[10px] text-slate-600">{formatRelative(n.updatedAt)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Summary Panel */}
              <AnimatePresence>
                {showAISummary && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-t border-white/8">
                    <div className="px-5 py-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-violet-400" />
                          <span className="text-sm font-bold text-white">AI Study Summary</span>
                          <span className="text-[10px] text-slate-600 bg-white/5 px-1.5 py-0.5 rounded">NotebookLM-style</span>
                        </div>
                        <button onClick={() => { setShowAISummary(false); setAiSummary(null); }} className="p-1 rounded text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
                      </div>
                      {aiLoading ? (
                        <div className="flex items-center gap-2 text-sm text-violet-400 py-4">
                          <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                          Analyzing your notes with AI…
                        </div>
                      ) : aiSummary ? (
                        <AISummaryPanel summary={aiSummary} />
                      ) : null}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Status bar */}
            <div className="px-5 py-2 border-t border-white/8 bg-white/[0.015] flex items-center gap-3 text-[10px] text-slate-600 flex-wrap">
              <span>{wordCount(activeNote.content).toLocaleString()} words</span>
              <span>·</span>
              <span>{readingTime(activeNote.content)} read</span>
              <span>·</span>
              <span>Updated {formatRelative(activeNote.updatedAt)}</span>
              {activeNote.folderId && <span>· 📁 {folders.find(f => f.id === activeNote.folderId)?.name}</span>}
              <span className="ml-auto hidden sm:inline">Ctrl+S save · Ctrl+P preview · Ctrl+N new · [[link]] wiki</span>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-16 px-8">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <Edit3 className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Select or create a note</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto mb-2">Markdown editor with preview, wiki links, folders, AI summary, and question snapshots.</p>
              <p className="text-slate-600 text-xs mb-6">Try typing <code className="bg-white/5 px-1 rounded text-amber-400">[[Note Name]]</code> to link notes together.</p>
              <Button onClick={handleCreateNote}><Plus className="w-4 h-4" />Create First Note</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NoteCard({ note, active, onClick }: { note: Note; active: boolean; onClick: () => void }) {
  const colors = NOTE_COLORS[note.color];
  return (
    <button onClick={onClick} className={cn("w-full text-left px-3 py-2.5 rounded-xl border transition-all", colors.bg, colors.border, active ? "ring-1 ring-amber-500/40 border-amber-500/30" : "hover:bg-white/5")}>
      <div className="flex items-start gap-2">
        <div className={cn("w-[3px] rounded-full flex-shrink-0 self-stretch", colors.dot)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            {note.pinned && <Pin className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />}
            <span className="font-medium text-white text-xs truncate">{note.title}</span>
          </div>
          {note.content && <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{note.content.replace(/[#*`\[\]\n]/g, " ").substring(0, 90)}</p>}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="text-[9px] text-slate-700">{formatRelative(note.updatedAt)}</span>
            {note.status && note.status !== "draft" && <span className="text-[10px]">{STATUS_CFG[note.status].icon}</span>}
            {note.tags.slice(0, 2).map(t => <span key={t} className="text-[9px] text-slate-600">#{t}</span>)}
            {note.snapshotIds && note.snapshotIds.length > 0 && <span className="text-[9px] text-amber-600 flex items-center gap-0.5"><Camera className="w-2 h-2" />{note.snapshotIds.length}</span>}
          </div>
        </div>
      </div>
    </button>
  );
}

function MdBtn({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title={title} className="p-1.5 rounded text-slate-500 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center">
      {icon}
    </button>
  );
}

function SnapshotCard({ snapshot, revealed, onReveal, onDelete }: { snapshot: NoteSnapshot; revealed: boolean; onReveal: () => void; onDelete: () => void }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden text-left">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/8 bg-white/[0.02]">
        <Camera className="w-3 h-3 text-amber-400 flex-shrink-0" />
        <Badge variant={snapshot.difficulty === "E" ? "easy" : snapshot.difficulty === "H" ? "hard" : "medium"} className="text-[10px] px-1 py-0">{snapshot.difficulty}</Badge>
        <span className="text-[10px] text-slate-500 truncate flex-1">{snapshot.skill}</span>
        <button onClick={onDelete} className="p-0.5 rounded text-slate-600 hover:text-red-400 transition-colors flex-shrink-0"><X className="w-3 h-3" /></button>
      </div>
      <div className="p-3 text-[11px] text-slate-300 leading-relaxed max-h-24 overflow-hidden relative question-content" dangerouslySetInnerHTML={{ __html: snapshot.stem }}>
      </div>
      <div className="absolute" style={{ background: "linear-gradient(to top, #07101E, transparent)", height: 24, marginTop: -24, width: "100%", position: "relative" }} />
      <div className="px-3 pb-2">
        <button onClick={onReveal} className={cn("w-full py-1.5 rounded-lg text-[11px] font-medium transition-all border", revealed ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-white/5 border-white/10 text-slate-500 hover:text-white hover:bg-white/8")}>
          {revealed ? `✓ ${snapshot.correctAnswer.join(", ")}` : "Reveal Answer"}
        </button>
        {revealed && snapshot.rationale && (
          <p className="mt-1.5 text-[10px] text-slate-600 leading-relaxed line-clamp-2" dangerouslySetInnerHTML={{ __html: snapshot.rationale }} />
        )}
      </div>
      <div className="px-3 pb-2 text-[9px] text-slate-700">{snapshot.domain === "math" ? "Math" : "R&W"} · {new Date(snapshot.takenAt).toLocaleDateString()}</div>
    </div>
  );
}

function AISummaryPanel({ summary }: { summary: AISummaryData }) {
  return (
    <div className="space-y-3">
      {summary.summary && (
        <div className="p-3 bg-violet-500/5 border border-violet-500/15 rounded-xl">
          <p className="text-xs font-semibold text-violet-400 mb-1">Summary</p>
          <p className="text-xs text-slate-300 leading-relaxed">{summary.summary}</p>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {summary.keyPoints?.length > 0 && (
          <div className="p-3 bg-blue-500/5 border border-blue-500/15 rounded-xl">
            <p className="text-xs font-semibold text-blue-400 mb-2">Key Points</p>
            <ul className="space-y-1">
              {summary.keyPoints.map((pt, i) => (
                <li key={i} className="flex gap-1.5 text-xs text-slate-300"><span className="text-blue-400 flex-shrink-0">▸</span>{pt}</li>
              ))}
            </ul>
          </div>
        )}
        {summary.studyQuestions?.length > 0 && (
          <div className="p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl">
            <p className="text-xs font-semibold text-amber-400 mb-2">Study Questions</p>
            <ol className="space-y-1.5">
              {summary.studyQuestions.map((q, i) => (
                <li key={i} className="flex gap-1.5 text-xs text-slate-300"><span className="text-amber-400 font-bold flex-shrink-0">{i + 1}.</span>{q}</li>
              ))}
            </ol>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {summary.studyTip && (
          <div className="p-3 bg-teal-500/5 border border-teal-500/15 rounded-xl">
            <p className="text-xs font-semibold text-teal-400 mb-1">💡 Study Tip</p>
            <p className="text-xs text-slate-300 leading-relaxed">{summary.studyTip}</p>
          </div>
        )}
        {summary.weaknessHint && (
          <div className="p-3 bg-rose-500/5 border border-rose-500/15 rounded-xl">
            <p className="text-xs font-semibold text-rose-400 mb-1">⚠️ Focus Area</p>
            <p className="text-xs text-slate-300 leading-relaxed">{summary.weaknessHint}</p>
          </div>
        )}
      </div>
      {summary.connections?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-slate-600">Related:</span>
          {summary.connections.map((c, i) => <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>)}
        </div>
      )}
    </div>
  );
}

function FlashcardMode({ snapshots, onExit }: { snapshots: NoteSnapshot[]; onExit: () => void }) {
  const [idx, setIdx]     = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone]   = useState<Set<number>>(new Set());

  if (snapshots.length === 0) {
    return (
      <div className="text-center py-24 max-w-[1680px] mx-auto">
        <p className="text-white mb-4">No snapshots with answers to review yet!</p>
        <button onClick={onExit} className="text-amber-400 hover:underline flex items-center gap-1 mx-auto"><ArrowLeft className="w-4 h-4" />Back to Notes</button>
      </div>
    );
  }

  const current = snapshots[idx % snapshots.length];
  const progress = Math.round((done.size / snapshots.length) * 100);

  const next = () => { setIdx(p => (p + 1) % snapshots.length); setFlipped(false); };
  const prev = () => { setIdx(p => Math.max(0, p - 1)); setFlipped(false); };

  return (
    <div className="max-w-2xl mx-auto px-4">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onExit} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />Back to Notes
        </button>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-400">{idx + 1} / {snapshots.length}</span>
          <span className="text-emerald-400">{done.size} done ✓</span>
        </div>
      </div>

      <div className="h-1.5 bg-white/5 rounded-full mb-8 overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <motion.div
        key={`${idx}-${flipped}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className={cn("min-h-[320px] rounded-2xl border p-8 cursor-pointer transition-all select-none", flipped ? "bg-emerald-500/8 border-emerald-500/25" : "bg-white/3 border-white/10 hover:border-white/20")}
        onClick={() => setFlipped(v => !v)}
      >
        {!flipped ? (
          <div>
            <div className="flex items-center gap-2 mb-5">
              <Badge variant={current.difficulty === "E" ? "easy" : current.difficulty === "H" ? "hard" : "medium"}>{current.difficulty}</Badge>
              <span className="text-xs text-slate-500">{current.skill}</span>
              <span className="text-xs text-slate-600 ml-auto">{current.domain === "math" ? "Math" : "R&W"}</span>
            </div>
            <div className="text-slate-200 text-sm leading-relaxed question-content" dangerouslySetInnerHTML={{ __html: current.stem }} />
            <p className="text-slate-600 text-xs mt-8 text-center">Click to reveal answer ↓</p>
          </div>
        ) : (
          <div>
            <p className="text-xs text-emerald-400 font-semibold mb-3 uppercase tracking-wide">Correct Answer</p>
            <p className="text-3xl font-bold text-emerald-300 mb-5">{current.correctAnswer.join(", ")}</p>
            {current.rationale && (
              <div className="p-3 bg-white/5 rounded-xl text-xs text-slate-300 leading-relaxed question-content" dangerouslySetInnerHTML={{ __html: current.rationale }} />
            )}
          </div>
        )}
      </motion.div>

      <div className="flex items-center justify-center gap-3 mt-6">
        <button onClick={prev} disabled={idx === 0} className="px-4 py-2 rounded-xl border border-white/10 text-sm text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-all">← Prev</button>
        {flipped && (
          <button onClick={() => { setDone(prev => new Set(prev).add(idx)); next(); }} className="px-5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-sm font-medium hover:bg-emerald-500/25 transition-all">
            Got it ✓
          </button>
        )}
        <button onClick={next} className="px-4 py-2 rounded-xl border border-white/10 text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all">Next →</button>
      </div>

      {done.size === snapshots.length && done.size > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 text-center">
          <p className="text-emerald-400 font-semibold mb-2">🎉 All {snapshots.length} cards reviewed!</p>
          <button onClick={() => { setDone(new Set()); setIdx(0); setFlipped(false); }} className="text-xs text-slate-400 hover:underline">Start over</button>
        </motion.div>
      )}
    </div>
  );
}

// ─── Logbook Tab ──────────────────────────────────────────────────────────────

interface AIExplanation {
  concept: string;
  stepByStep: string[];
  whyCorrect: string;
  whyStudentWasWrong: string;
  commonMistake: string;
  memoryTip: string;
  relatedConcepts: string[];
}

function LogbookTab() {
  const [entries, setEntries]               = useState<LogbookEntry[]>([]);
  const [expandedId, setExpandedId]         = useState<string | null>(null);
  const [domainFilter, setDomainFilter]     = useState<QuestionDomain | "all">("all");
  const [diffFilter, setDiffFilter]         = useState<QuestionDifficulty | "all">("all");
  const [sourceFilter, setSourceFilter]     = useState<"all" | "practice" | "mock_test">("all");
  const [search, setSearch]                 = useState("");
  const [confirmClear, setConfirmClear]     = useState(false);
  const [aiExplanations, setAiExplanations] = useState<Map<string, AIExplanation | "loading" | "error">>(new Map());

  useEffect(() => { setEntries(getLogbook()); }, []);

  const fetchExplanation = async (entry: LogbookEntry) => {
    if (aiExplanations.has(entry.id)) return;
    setAiExplanations(prev => new Map(prev).set(entry.id, "loading"));
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stem: entry.stem, correctAnswer: entry.correctAnswer, userAnswer: entry.userAnswer, skill: entry.skill, domain: entry.domain, rationale: entry.rationale }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAiExplanations(prev => new Map(prev).set(entry.id, data.explanation));
    } catch {
      setAiExplanations(prev => new Map(prev).set(entry.id, "error"));
    }
  };

  const filtered = entries.filter(e => {
    if (domainFilter !== "all" && e.domain !== domainFilter) return false;
    if (diffFilter !== "all" && e.difficulty !== diffFilter) return false;
    if (sourceFilter !== "all" && e.source !== sourceFilter) return false;
    if (search && !e.stem.toLowerCase().includes(search.toLowerCase()) && !e.skill.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = getLogbookStats();
  const skillCounts = Object.entries(stats.bySkill).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const handleClear = () => { clearLogbook(); setEntries([]); setConfirmClear(false); };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  if (entries.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24 text-center max-w-[1680px] mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Logbook is empty</h3>
        <p className="text-slate-500 text-sm max-w-xs">Wrong answers from practice and mock tests appear here automatically.</p>
        <a href="/practice" className="mt-6 inline-flex items-center gap-2 h-9 px-4 text-sm rounded-xl font-semibold bg-[#F59E0B] text-[#050B18] hover:bg-[#FBBF24] transition-all">
          <Zap className="w-4 h-4" />Start Practicing
        </a>
      </motion.div>
    );
  }

  return (
    <MathJaxContext config={mathJaxConfig}>
      <div className="max-w-[1680px] mx-auto space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-white/5 rounded-xl border border-white/8 text-center">
            <div className="text-2xl font-bold text-red-400">{stats.total}</div>
            <div className="text-xs text-slate-500 mt-0.5">Total wrong</div>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/8 text-center">
            <div className="text-2xl font-bold text-violet-400">{stats.byDomain["math"] || 0}</div>
            <div className="text-xs text-slate-500 mt-0.5">Math mistakes</div>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/8 text-center">
            <div className="text-2xl font-bold text-[#14B8A6]">{stats.byDomain["reading_and_writing"] || 0}</div>
            <div className="text-xs text-slate-500 mt-0.5">R&W mistakes</div>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/8">
            <div className="text-xs text-slate-500 mb-1.5 font-medium">Top weak skills</div>
            <div className="space-y-0.5">
              {skillCounts.slice(0, 2).map(([skill, count]) => (
                <div key={skill} className="flex items-center justify-between gap-1">
                  <span className="text-xs text-slate-300 truncate">{skill}</span>
                  <Badge variant="danger" className="text-xs px-1.5 py-0 flex-shrink-0">{count}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by skill or question…" className="pl-8 h-8 text-xs" />
          </div>
          <div className="flex gap-1">
            {([["all", "All"], ["math", "Math"], ["reading_and_writing", "R&W"]] as const).map(([v, label]) => (
              <button key={v} onClick={() => setDomainFilter(v)} className={cn("px-2.5 py-1 rounded-lg text-xs font-medium border transition-all", domainFilter === v ? "bg-violet-500/15 border-violet-500/40 text-violet-400" : "bg-white/3 border-white/8 text-slate-500 hover:border-white/15")}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {([["all", "All"], ["E", "Easy"], ["M", "Med"], ["H", "Hard"]] as const).map(([v, label]) => (
              <button key={v} onClick={() => setDiffFilter(v)} className={cn("px-2.5 py-1 rounded-lg text-xs font-medium border transition-all", diffFilter === v ? v === "E" ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" : v === "M" ? "bg-amber-500/15 border-amber-500/40 text-amber-400" : v === "H" ? "bg-red-500/15 border-red-500/40 text-red-400" : "bg-[#F59E0B]/10 border-[#F59E0B]/40 text-[#F59E0B]" : "bg-white/3 border-white/8 text-slate-500 hover:border-white/15")}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {([["all", "All"], ["practice", "Practice"], ["mock_test", "Mock"]] as [typeof sourceFilter, string][]).map(([v, label]) => (
              <button key={v} onClick={() => setSourceFilter(v)} className={cn("px-2.5 py-1 rounded-lg text-xs font-medium border transition-all", sourceFilter === v ? "bg-[#14B8A6]/15 border-[#14B8A6]/40 text-[#14B8A6]" : "bg-white/3 border-white/8 text-slate-500 hover:border-white/15")}>
                {label}
              </button>
            ))}
          </div>
          <div className="ml-auto">
            {confirmClear ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400">Clear all {entries.length}?</span>
                <button onClick={handleClear} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/25 transition-all">Yes</button>
                <button onClick={() => setConfirmClear(false)} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 transition-all">No</button>
              </div>
            ) : (
              <button onClick={() => setConfirmClear(true)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/3 border border-white/8 text-slate-500 hover:text-red-400 hover:border-red-400/30 transition-all">
                <Trash2 className="w-3 h-3" />Clear
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-600">{filtered.length} of {entries.length} entries</p>

        {/* Entries */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">No entries match your filters.</div>
          ) : filtered.map(entry => {
            const isExpanded = expandedId === entry.id;
            return (
              <motion.div key={entry.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                <Card className={cn("cursor-pointer transition-all", isExpanded && "border-red-500/20")}>
                  <CardContent className="p-4" onClick={() => setExpandedId(isExpanded ? null : entry.id)}>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mt-0.5">
                        <X className="w-3.5 h-3.5 text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                          <Badge variant={entry.domain === "math" ? "math" : "rw"} className="text-xs">{entry.domain === "math" ? "Math" : "R&W"}</Badge>
                          <Badge variant={entry.difficulty === "E" ? "easy" : entry.difficulty === "H" ? "hard" : "medium"} className="text-xs">{entry.difficulty === "E" ? "Easy" : entry.difficulty === "H" ? "Hard" : "Medium"}</Badge>
                          <span className="text-xs text-slate-500">{entry.skill}</span>
                          <Badge variant="secondary" className="text-xs ml-auto">{entry.source === "mock_test" ? "Mock Test" : "Practice"}</Badge>
                        </div>
                        <MathJax>
                          <div className={cn("text-sm text-slate-300 question-content", !isExpanded && "line-clamp-2")} dangerouslySetInnerHTML={{ __html: entry.stem }} />
                        </MathJax>
                        {!isExpanded && (
                          <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(entry.timestamp)}</span>
                            <span>Your answer: <span className="text-red-400 font-mono">{entry.userAnswer || "—"}</span></span>
                            <span>Correct: <span className="text-emerald-400 font-mono">{entry.correctAnswer.join(", ")}</span></span>
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-slate-600">{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <div className="mt-4 pt-4 border-t border-white/8 space-y-3 ml-10">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                <p className="text-xs text-slate-500 mb-1">Your answer</p>
                                <p className="font-mono text-sm text-red-300">{entry.userAnswer || "—"}</p>
                              </div>
                              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                <p className="text-xs text-slate-500 mb-1">Correct answer</p>
                                <p className="font-mono text-sm text-emerald-300">{entry.correctAnswer.join(", ")}</p>
                              </div>
                            </div>

                            {entry.rationale && (
                              <div className="p-3 bg-[#F59E0B]/6 border border-[#F59E0B]/20 rounded-xl">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <Lightbulb className="w-3.5 h-3.5 text-[#F59E0B]" />
                                  <span className="text-xs font-semibold text-[#F59E0B]">Official Explanation</span>
                                </div>
                                <MathJax>
                                  <div className="text-xs text-slate-300 leading-relaxed question-content" dangerouslySetInnerHTML={{ __html: entry.rationale }} />
                                </MathJax>
                              </div>
                            )}

                            {!aiExplanations.has(entry.id) && (
                              <button onClick={e => { e.stopPropagation(); fetchExplanation(entry); }} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/25 text-violet-400 text-xs font-semibold hover:bg-violet-500/20 transition-all">
                                <Zap className="w-3.5 h-3.5" />AI Deep Explain — Why did I get this wrong?
                              </button>
                            )}

                            {aiExplanations.get(entry.id) === "loading" && (
                              <div className="p-3 bg-violet-500/5 border border-violet-500/20 rounded-xl flex items-center gap-2 text-xs text-violet-400">
                                <div className="w-3.5 h-3.5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                                Generating deep analysis…
                              </div>
                            )}

                            {aiExplanations.get(entry.id) === "error" && (
                              <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl text-xs text-red-400">
                                Failed to generate explanation.
                                <button onClick={e => { e.stopPropagation(); setAiExplanations(prev => { const n = new Map(prev); n.delete(entry.id); return n; }); }} className="ml-2 underline">Retry</button>
                              </div>
                            )}

                            {(() => {
                              const exp = aiExplanations.get(entry.id);
                              if (!exp || exp === "loading" || exp === "error") return null;
                              const explanation = exp as AIExplanation;
                              return (
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                                  <div className="flex items-center gap-2 text-xs font-bold text-violet-400 uppercase tracking-wide">
                                    <Zap className="w-3.5 h-3.5" />AI Deep Analysis
                                  </div>
                                  {explanation.concept && <div className="p-3 bg-blue-500/8 border border-blue-500/20 rounded-xl"><p className="text-xs font-semibold text-blue-400 mb-1">Core Concept</p><p className="text-xs text-slate-300 leading-relaxed">{explanation.concept}</p></div>}
                                  {explanation.stepByStep?.length > 0 && (
                                    <div className="p-3 bg-white/3 border border-white/8 rounded-xl">
                                      <p className="text-xs font-semibold text-slate-300 mb-2">Step-by-Step Solution</p>
                                      <ol className="space-y-1.5">
                                        {explanation.stepByStep.map((step, si) => (
                                          <li key={si} className="flex gap-2 text-xs text-slate-300">
                                            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-violet-500/20 text-violet-400 text-[10px] font-bold flex items-center justify-center mt-0.5">{si + 1}</span>
                                            <span className="leading-relaxed">{step}</span>
                                          </li>
                                        ))}
                                      </ol>
                                    </div>
                                  )}
                                  {explanation.whyStudentWasWrong && <div className="p-3 bg-red-500/6 border border-red-500/20 rounded-xl"><p className="text-xs font-semibold text-red-400 mb-1">Why You Chose the Wrong Answer</p><p className="text-xs text-slate-300 leading-relaxed">{explanation.whyStudentWasWrong}</p></div>}
                                  {explanation.whyCorrect && <div className="p-3 bg-emerald-500/6 border border-emerald-500/20 rounded-xl"><p className="text-xs font-semibold text-emerald-400 mb-1">Why the Correct Answer Works</p><p className="text-xs text-slate-300 leading-relaxed">{explanation.whyCorrect}</p></div>}
                                  {explanation.commonMistake && <div className="p-3 bg-amber-500/6 border border-amber-500/20 rounded-xl"><p className="text-xs font-semibold text-amber-400 mb-1">Common Mistake to Avoid</p><p className="text-xs text-slate-300 leading-relaxed">{explanation.commonMistake}</p></div>}
                                  {explanation.memoryTip && <div className="p-3 bg-[#14B8A6]/8 border border-[#14B8A6]/25 rounded-xl"><p className="text-xs font-semibold text-[#14B8A6] mb-1">Memory Tip</p><p className="text-xs text-slate-300 leading-relaxed">💡 {explanation.memoryTip}</p></div>}
                                  {explanation.relatedConcepts?.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                      <span className="text-xs text-slate-500">Related:</span>
                                      {explanation.relatedConcepts.map((c, ci) => <Badge key={ci} variant="secondary" className="text-xs">{c}</Badge>)}
                                    </div>
                                  )}
                                </motion.div>
                              );
                            })()}

                            <p className="text-xs text-slate-600 flex items-center gap-1">
                              <Clock className="w-3 h-3" />{formatDate(entry.timestamp)} · {entry.source === "mock_test" ? "Mock Test" : "Practice Session"}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </MathJaxContext>
  );
}
