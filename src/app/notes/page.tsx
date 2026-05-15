"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Plus, Trash2, Save, X, Tag, BookMarked,
  ChevronDown, ChevronUp, Edit3, Search, Palette,
  FileText, CheckCircle2, BookX, Filter, AlertCircle,
  Lightbulb, Clock, Zap
} from "lucide-react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getNotes, saveNote, deleteNote, createNote,
  getSavedQuestions, getNoteQuestions, saveNoteQuestion,
  addQuestionToNote, removeQuestionFromNote,
  getLogbook, clearLogbook, getLogbookStats,
} from "@/lib/storage";
import type { Note, NoteQuestion, SavedQuestion, LogbookEntry, QuestionDomain, QuestionDifficulty } from "@/types";

const mathJaxConfig = {
  loader: { load: ["input/tex", "output/chtml"] },
  tex: { inlineMath: [["$", "$"], ["\\(", "\\)"]] },
};

const NOTE_COLORS: Record<Note["color"], { bg: string; border: string; label: string }> = {
  default: { bg: "bg-white/5", border: "border-white/10", label: "Default" },
  amber: { bg: "bg-[#F59E0B]/8", border: "border-[#F59E0B]/25", label: "Amber" },
  teal: { bg: "bg-[#14B8A6]/8", border: "border-[#14B8A6]/25", label: "Teal" },
  violet: { bg: "bg-violet-500/8", border: "border-violet-500/25", label: "Violet" },
  rose: { bg: "bg-rose-500/8", border: "border-rose-500/25", label: "Rose" },
};

const COLOR_DOTS: Record<Note["color"], string> = {
  default: "bg-slate-500",
  amber: "bg-[#F59E0B]",
  teal: "bg-[#14B8A6]",
  violet: "bg-violet-500",
  rose: "bg-rose-500",
};

type ActiveTab = "notes" | "logbook";

export default function NotesPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("notes");

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050B18] via-[#050F1E] to-[#050B18] pt-20">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <BookOpen className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <h1 className="text-2xl font-bold text-white">Notes & Logbook</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/8 w-fit mb-6">
          {(["notes", "logbook"] as ActiveTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize",
                activeTab === tab
                  ? "bg-[#F59E0B] text-[#050B18]"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              {tab === "notes" ? "My Notes" : "Wrong Answers Logbook"}
            </button>
          ))}
        </div>

        {activeTab === "notes" ? <NotesTab /> : <LogbookTab />}
      </div>
    </div>
  );
}

// ─── Notes Tab ────────────────────────────────────────────────────────────────

function NotesTab() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [savedQuestions, setSavedQuestions] = useState<SavedQuestion[]>([]);
  const [noteQuestions, setNoteQuestions] = useState<NoteQuestion[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [search, setSearch] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadData = useCallback(() => {
    setNotes(getNotes());
    setSavedQuestions(getSavedQuestions());
    setNoteQuestions(getNoteQuestions());
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateNote = () => {
    const note = createNote({ title: `Note ${notes.length + 1}` });
    setNotes((prev) => [note, ...prev]);
    setActiveNote(note);
  };

  const handleSave = () => {
    if (!activeNote) return;
    const updated = { ...activeNote, updatedAt: new Date().toISOString() };
    saveNote(updated);
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleDelete = (noteId: string) => {
    deleteNote(noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    if (activeNote?.id === noteId) setActiveNote(null);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (!activeNote || e.key !== "Enter" || !tagInput.trim()) return;
    const tag = tagInput.trim().toLowerCase();
    if (!activeNote.tags.includes(tag)) {
      setActiveNote((prev) => prev ? { ...prev, tags: [...prev.tags, tag] } : prev);
    }
    setTagInput("");
  };

  const handleRemoveTag = (tag: string) => {
    setActiveNote((prev) => prev ? { ...prev, tags: prev.tags.filter((t) => t !== tag) } : prev);
  };

  const handleAddQuestionToNote = (sq: SavedQuestion) => {
    if (!activeNote) return;
    addQuestionToNote(activeNote.id, sq.questionId);
    saveNoteQuestion({
      questionId: sq.questionId,
      stem: `Question ${sq.questionId}`,
      domain: sq.domain,
      difficulty: sq.difficulty,
      skill: sq.skill,
      correctAnswer: [],
      snapshotAt: new Date().toISOString(),
    });
    setActiveNote((prev) =>
      prev ? { ...prev, savedQuestionIds: prev.savedQuestionIds.includes(sq.questionId) ? prev.savedQuestionIds : [...prev.savedQuestionIds, sq.questionId] } : prev
    );
    setShowAddQuestion(false);
    loadData();
  };

  const handleRemoveQuestion = (qId: string) => {
    if (!activeNote) return;
    removeQuestionFromNote(activeNote.id, qId);
    setActiveNote((prev) => prev ? { ...prev, savedQuestionIds: prev.savedQuestionIds.filter((id) => id !== qId) } : prev);
    loadData();
  };

  const toggleQuestionExpand = (qId: string) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId); else next.add(qId);
      return next;
    });
  };

  const filteredNotes = notes.filter(
    (n) => !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase()) || n.tags.some((t) => t.includes(search.toLowerCase()))
  );

  const availableToAdd = savedQuestions.filter((sq) => !activeNote?.savedQuestionIds.includes(sq.questionId));

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-slate-500 text-sm">{notes.length} note{notes.length !== 1 ? "s" : ""}</p>
        <Button onClick={handleCreateNote} size="sm">
          <Plus className="w-4 h-4" />New Note
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Sidebar */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input placeholder="Search notes…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>

          <div className="flex flex-col gap-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                {notes.length === 0 ? (
                  <div className="space-y-3"><FileText className="w-10 h-10 mx-auto opacity-30" /><p>No notes yet.<br />Create your first note!</p></div>
                ) : "No notes match your search."}
              </div>
            ) : (
              filteredNotes.map((note) => {
                const colors = NOTE_COLORS[note.color];
                return (
                  <motion.div key={note.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                    <button
                      onClick={() => setActiveNote(note)}
                      className={cn("w-full text-left p-3.5 rounded-xl border transition-all", colors.bg, colors.border, activeNote?.id === note.id ? "ring-1 ring-[#F59E0B]/40" : "hover:bg-white/5")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={cn("w-2 h-2 rounded-full flex-shrink-0 mt-1", COLOR_DOTS[note.color])} />
                          <span className="font-medium text-white text-sm truncate">{note.title}</span>
                        </div>
                        <span className="text-xs text-slate-600 flex-shrink-0">{formatDate(note.updatedAt)}</span>
                      </div>
                      {note.content && <p className="text-xs text-slate-500 mt-1.5 ml-4 line-clamp-2">{note.content}</p>}
                      <div className="flex items-center gap-2 mt-2 ml-4 flex-wrap">
                        {note.savedQuestionIds.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-[#F59E0B]/70"><BookMarked className="w-3 h-3" />{note.savedQuestionIds.length}</span>
                        )}
                        {note.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs py-0 px-1.5">{tag}</Badge>
                        ))}
                      </div>
                    </button>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Editor */}
        <div>
          {activeNote ? (
            <Card className={cn("h-full", NOTE_COLORS[activeNote.color].bg, NOTE_COLORS[activeNote.color].border)}>
              <CardContent className="p-6 flex flex-col gap-5 h-full">
                <div className="flex items-center gap-3">
                  {editingTitle ? (
                    <Input autoFocus value={activeNote.title} onChange={(e) => setActiveNote((p) => p ? { ...p, title: e.target.value } : p)} onBlur={() => setEditingTitle(false)} onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)} className="text-lg font-bold flex-1" />
                  ) : (
                    <h2 className="text-lg font-bold text-white flex-1 cursor-text hover:text-[#F59E0B] transition-colors" onClick={() => setEditingTitle(true)}>{activeNote.title}</h2>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-slate-500" />
                    {(Object.keys(NOTE_COLORS) as Note["color"][]).map((c) => (
                      <button key={c} onClick={() => setActiveNote((p) => p ? { ...p, color: c } : p)} className={cn("w-4 h-4 rounded-full transition-all border", COLOR_DOTS[c], activeNote.color === c ? "ring-1 ring-white ring-offset-1 ring-offset-[#050B18] scale-110" : "opacity-60 hover:opacity-100")} title={NOTE_COLORS[c].label} />
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <Button variant="secondary" size="sm" onClick={handleSave} className={cn(saved && "text-emerald-400")}>
                      {saved ? <><CheckCircle2 className="w-3.5 h-3.5" /> Saved</> : <><Save className="w-3.5 h-3.5" /> Save</>}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(activeNote.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>

                <textarea value={activeNote.content} onChange={(e) => setActiveNote((p) => p ? { ...p, content: e.target.value } : p)} placeholder="Write your notes here… Summarize concepts, jot down strategies, track what you've learned." className="flex-1 min-h-[200px] resize-none bg-transparent text-slate-200 text-sm leading-relaxed placeholder:text-slate-600 outline-none" />

                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tag className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    {activeNote.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1 text-xs">{tag}<button onClick={() => handleRemoveTag(tag)} className="hover:text-red-400"><X className="w-3 h-3" /></button></Badge>
                    ))}
                    <Input placeholder="Add tag…" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleAddTag} className="h-6 w-24 text-xs px-2 rounded-full" />
                  </div>
                </div>

                <div className="border-t border-white/8 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookMarked className="w-4 h-4 text-[#F59E0B]" />
                      <span className="text-sm font-semibold text-white">Attached Questions ({activeNote.savedQuestionIds.length})</span>
                    </div>
                    {availableToAdd.length > 0 && (
                      <Button variant="secondary" size="sm" onClick={() => setShowAddQuestion(!showAddQuestion)}>
                        <Plus className="w-3.5 h-3.5" />Add Question
                      </Button>
                    )}
                  </div>

                  <AnimatePresence>
                    {showAddQuestion && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-2 max-h-48 overflow-y-auto">
                          <p className="text-xs text-slate-500">Select a saved question to attach:</p>
                          {availableToAdd.map((sq) => (
                            <button key={sq.questionId} onClick={() => handleAddQuestionToNote(sq)} className="w-full text-left p-2.5 rounded-lg hover:bg-white/8 transition-colors">
                              <div className="flex items-center gap-2">
                                <Badge variant={sq.difficulty === "E" ? "success" : sq.difficulty === "H" ? "danger" : "medium"} className="text-xs">{sq.difficulty}</Badge>
                                <span className="text-xs text-slate-300">{sq.skill}</span>
                                <span className="text-xs text-slate-600 ml-auto">{sq.domain === "math" ? "Math" : "R&W"}</span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1 font-mono truncate">ID: {sq.questionId.slice(0, 20)}…</p>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {activeNote.savedQuestionIds.length === 0 ? (
                    <p className="text-xs text-slate-600 italic">No questions attached. Save questions during practice and add them here.</p>
                  ) : (
                    <div className="space-y-2">
                      {activeNote.savedQuestionIds.map((qId) => {
                        const snapshot = noteQuestions.find((nq) => nq.questionId === qId);
                        const sq = savedQuestions.find((s) => s.questionId === qId);
                        const isExpanded = expandedQuestions.has(qId);
                        return (
                          <div key={qId} className="p-3 bg-white/3 rounded-xl border border-white/8">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Badge variant={(snapshot?.difficulty || sq?.difficulty) === "E" ? "success" : (snapshot?.difficulty || sq?.difficulty) === "H" ? "danger" : "medium"} className="text-xs flex-shrink-0">
                                  {snapshot?.difficulty || sq?.difficulty || "?"}
                                </Badge>
                                <span className="text-xs text-slate-300 truncate">{snapshot?.skill || sq?.skill || "Question"}</span>
                              </div>
                              <div className="flex gap-1">
                                <button onClick={() => toggleQuestionExpand(qId)} className="p-1 rounded text-slate-500 hover:text-white transition-colors">
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                                <button onClick={() => handleRemoveQuestion(qId)} className="p-1 rounded text-slate-600 hover:text-red-400 transition-colors">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <AnimatePresence>
                              {isExpanded && snapshot && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                  <div className="mt-2 pt-2 border-t border-white/8 space-y-1.5">
                                    {snapshot.stem && snapshot.stem !== `Question ${qId}` && (
                                      <div className="text-xs text-slate-300 prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: snapshot.stem }} />
                                    )}
                                    {snapshot.rationale && (
                                      <div className="text-xs text-[#14B8A6] mt-1">
                                        <span className="font-semibold">Rationale:</span>{" "}
                                        <span dangerouslySetInnerHTML={{ __html: snapshot.rationale }} />
                                      </div>
                                    )}
                                    <p className="text-xs text-slate-600">
                                      Domain: {snapshot.domain === "math" ? "Math" : "Reading & Writing"} · Saved {new Date(snapshot.snapshotAt).toLocaleDateString()}
                                    </p>
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
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full min-h-[400px] flex items-center justify-center">
              <CardContent className="text-center py-16 px-8">
                <div className="w-16 h-16 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center mx-auto mb-4">
                  <Edit3 className="w-8 h-8 text-[#F59E0B]" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Select or create a note</h3>
                <p className="text-slate-500 text-sm max-w-xs mx-auto mb-6">Take notes while studying, attach saved questions, and organize your insights by topic.</p>
                <Button onClick={handleCreateNote}><Plus className="w-4 h-4" />Create First Note</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Logbook Tab ──────────────────────────────────────────────────────────────

function LogbookTab() {
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [domainFilter, setDomainFilter] = useState<QuestionDomain | "all">("all");
  const [diffFilter, setDiffFilter] = useState<QuestionDifficulty | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "practice" | "mock_test">("all");
  const [search, setSearch] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => { setEntries(getLogbook()); }, []);

  const filtered = entries.filter((e) => {
    if (domainFilter !== "all" && e.domain !== domainFilter) return false;
    if (diffFilter !== "all" && e.difficulty !== diffFilter) return false;
    if (sourceFilter !== "all" && e.source !== sourceFilter) return false;
    if (search && !e.stem.toLowerCase().includes(search.toLowerCase()) && !e.skill.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = getLogbookStats();
  const skillCounts = Object.entries(stats.bySkill).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const handleClear = () => {
    clearLogbook();
    setEntries([]);
    setConfirmClear(false);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  if (entries.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Logbook is empty</h3>
        <p className="text-slate-500 text-sm max-w-xs">
          Wrong answers from practice sessions and mock tests will appear here automatically. Keep practicing!
        </p>
        <a href="/practice" className="mt-6 inline-flex items-center gap-2 h-9 px-4 text-sm rounded-xl font-semibold bg-[#F59E0B] text-[#050B18] hover:bg-[#FBBF24] transition-all">
          <Zap className="w-4 h-4" />Start Practicing
        </a>
      </motion.div>
    );
  }

  return (
    <MathJaxContext config={mathJaxConfig}>
      <div className="space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-white/5 rounded-xl border border-white/8 text-center">
            <div className="text-2xl font-bold text-red-400">{stats.total}</div>
            <div className="text-xs text-slate-500 mt-0.5">Total wrong answers</div>
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
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by skill or question…" className="pl-8 h-8 text-xs" />
          </div>

          {/* Domain filter */}
          <div className="flex gap-1">
            {([["all", "All"], ["math", "Math"], ["reading_and_writing", "R&W"]] as const).map(([v, label]) => (
              <button key={v} onClick={() => setDomainFilter(v)} className={cn("px-2.5 py-1 rounded-lg text-xs font-medium border transition-all", domainFilter === v ? "bg-violet-500/15 border-violet-500/40 text-violet-400" : "bg-white/3 border-white/8 text-slate-500 hover:border-white/15")}>
                {label}
              </button>
            ))}
          </div>

          {/* Difficulty filter */}
          <div className="flex gap-1">
            {([["all", "All"], ["E", "Easy"], ["M", "Med"], ["H", "Hard"]] as const).map(([v, label]) => (
              <button key={v} onClick={() => setDiffFilter(v)} className={cn("px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
                diffFilter === v
                  ? v === "E" ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                    : v === "M" ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                    : v === "H" ? "bg-red-500/15 border-red-500/40 text-red-400"
                    : "bg-[#F59E0B]/10 border-[#F59E0B]/40 text-[#F59E0B]"
                  : "bg-white/3 border-white/8 text-slate-500 hover:border-white/15"
              )}>
                {label}
              </button>
            ))}
          </div>

          {/* Source filter */}
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
                <span className="text-xs text-red-400">Clear all {entries.length} entries?</span>
                <button onClick={handleClear} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/25 transition-all">Yes, clear</button>
                <button onClick={() => setConfirmClear(false)} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 transition-all">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmClear(true)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/3 border border-white/8 text-slate-500 hover:text-red-400 hover:border-red-400/30 transition-all">
                <Trash2 className="w-3 h-3" />Clear logbook
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-600">{filtered.length} of {entries.length} entries</p>

        {/* Entries */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">No entries match your filters.</div>
          ) : (
            filtered.map((entry) => {
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
                            <Badge variant={entry.domain === "math" ? "math" : "rw"} className="text-xs">
                              {entry.domain === "math" ? "Math" : "R&W"}
                            </Badge>
                            <Badge variant={entry.difficulty === "E" ? "easy" : entry.difficulty === "H" ? "hard" : "medium"} className="text-xs">
                              {entry.difficulty === "E" ? "Easy" : entry.difficulty === "H" ? "Hard" : "Medium"}
                            </Badge>
                            <span className="text-xs text-slate-500">{entry.skill}</span>
                            <Badge variant="secondary" className="text-xs ml-auto">
                              {entry.source === "mock_test" ? "Mock Test" : "Practice"}
                            </Badge>
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
                        <div className="flex-shrink-0 text-slate-600">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                            <div className="mt-4 pt-4 border-t border-white/8 space-y-3 ml-10">
                              {/* Answer comparison */}
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

                              {/* Rationale */}
                              {entry.rationale && (
                                <div className="p-3 bg-[#F59E0B]/6 border border-[#F59E0B]/20 rounded-xl">
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <Lightbulb className="w-3.5 h-3.5 text-[#F59E0B]" />
                                    <span className="text-xs font-semibold text-[#F59E0B]">Explanation</span>
                                  </div>
                                  <MathJax>
                                    <div className="text-xs text-slate-300 leading-relaxed question-content" dangerouslySetInnerHTML={{ __html: entry.rationale }} />
                                  </MathJax>
                                </div>
                              )}

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
            })
          )}
        </div>
      </div>
    </MathJaxContext>
  );
}
