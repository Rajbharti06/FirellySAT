"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Plus, Trash2, Save, X, Tag, BookMarked,
  ChevronDown, ChevronUp, Edit3, Search, Palette,
  FileText, CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getNotes, saveNote, deleteNote, createNote,
  getSavedQuestions, getNoteQuestions, saveNoteQuestion,
  addQuestionToNote, removeQuestionFromNote,
} from "@/lib/storage";
import type { Note, NoteQuestion, SavedQuestion } from "@/types";

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

export default function NotesPage() {
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
    const n = getNotes();
    setNotes(n);
    setSavedQuestions(getSavedQuestions());
    setNoteQuestions(getNoteQuestions());
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    setActiveNote((prev) =>
      prev ? { ...prev, tags: prev.tags.filter((t) => t !== tag) } : prev
    );
  };

  const handleAddQuestionToNote = (sq: SavedQuestion) => {
    if (!activeNote) return;
    addQuestionToNote(activeNote.id, sq.questionId);

    // Snapshot the question data
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
      prev
        ? {
            ...prev,
            savedQuestionIds: prev.savedQuestionIds.includes(sq.questionId)
              ? prev.savedQuestionIds
              : [...prev.savedQuestionIds, sq.questionId],
          }
        : prev
    );
    setShowAddQuestion(false);
    loadData();
  };

  const handleRemoveQuestion = (qId: string) => {
    if (!activeNote) return;
    removeQuestionFromNote(activeNote.id, qId);
    setActiveNote((prev) =>
      prev
        ? { ...prev, savedQuestionIds: prev.savedQuestionIds.filter((id) => id !== qId) }
        : prev
    );
    loadData();
  };

  const toggleQuestionExpand = (qId: string) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const filteredNotes = notes.filter(
    (n) =>
      !search ||
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase()) ||
      n.tags.some((t) => t.includes(search.toLowerCase()))
  );

  const availableToAdd = savedQuestions.filter(
    (sq) => !activeNote?.savedQuestionIds.includes(sq.questionId)
  );

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050B18] via-[#050F1E] to-[#050B18] pt-20">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <BookOpen className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">My Notes</h1>
              <p className="text-slate-500 text-sm">{notes.length} note{notes.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <Button onClick={handleCreateNote} size="sm">
            <Plus className="w-4 h-4" />
            New Note
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Sidebar — note list */}
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Search notes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex flex-col gap-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {filteredNotes.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  {notes.length === 0 ? (
                    <div className="space-y-3">
                      <FileText className="w-10 h-10 mx-auto opacity-30" />
                      <p>No notes yet.<br />Create your first note!</p>
                    </div>
                  ) : (
                    "No notes match your search."
                  )}
                </div>
              ) : (
                filteredNotes.map((note) => {
                  const colors = NOTE_COLORS[note.color];
                  return (
                    <motion.div
                      key={note.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <button
                        onClick={() => setActiveNote(note)}
                        className={cn(
                          "w-full text-left p-3.5 rounded-xl border transition-all",
                          colors.bg,
                          colors.border,
                          activeNote?.id === note.id
                            ? "ring-1 ring-[#F59E0B]/40"
                            : "hover:bg-white/5"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={cn("w-2 h-2 rounded-full flex-shrink-0 mt-1", COLOR_DOTS[note.color])} />
                            <span className="font-medium text-white text-sm truncate">
                              {note.title}
                            </span>
                          </div>
                          <span className="text-xs text-slate-600 flex-shrink-0">
                            {formatDate(note.updatedAt)}
                          </span>
                        </div>
                        {note.content && (
                          <p className="text-xs text-slate-500 mt-1.5 ml-4 line-clamp-2">
                            {note.content}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 ml-4 flex-wrap">
                          {note.savedQuestionIds.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-[#F59E0B]/70">
                              <BookMarked className="w-3 h-3" />
                              {note.savedQuestionIds.length}
                            </span>
                          )}
                          {note.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs py-0 px-1.5">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </button>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>

          {/* Editor pane */}
          <div>
            {activeNote ? (
              <Card className={cn("h-full", NOTE_COLORS[activeNote.color].bg, NOTE_COLORS[activeNote.color].border)}>
                <CardContent className="p-6 flex flex-col gap-5 h-full">
                  {/* Title bar */}
                  <div className="flex items-center gap-3">
                    {editingTitle ? (
                      <Input
                        autoFocus
                        value={activeNote.title}
                        onChange={(e) =>
                          setActiveNote((p) => p ? { ...p, title: e.target.value } : p)
                        }
                        onBlur={() => setEditingTitle(false)}
                        onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
                        className="text-lg font-bold flex-1"
                      />
                    ) : (
                      <h2
                        className="text-lg font-bold text-white flex-1 cursor-text hover:text-[#F59E0B] transition-colors"
                        onClick={() => setEditingTitle(true)}
                      >
                        {activeNote.title}
                      </h2>
                    )}

                    {/* Color picker */}
                    <div className="flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-slate-500" />
                      {(Object.keys(NOTE_COLORS) as Note["color"][]).map((c) => (
                        <button
                          key={c}
                          onClick={() =>
                            setActiveNote((p) => p ? { ...p, color: c } : p)
                          }
                          className={cn(
                            "w-4 h-4 rounded-full transition-all border",
                            COLOR_DOTS[c],
                            activeNote.color === c
                              ? "ring-1 ring-white ring-offset-1 ring-offset-[#050B18] scale-110"
                              : "opacity-60 hover:opacity-100"
                          )}
                          title={NOTE_COLORS[c].label}
                        />
                      ))}
                    </div>

                    <div className="flex gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleSave}
                        className={cn(saved && "text-emerald-400")}
                      >
                        {saved ? (
                          <><CheckCircle2 className="w-3.5 h-3.5" /> Saved</>
                        ) : (
                          <><Save className="w-3.5 h-3.5" /> Save</>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(activeNote.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Text area */}
                  <textarea
                    value={activeNote.content}
                    onChange={(e) =>
                      setActiveNote((p) => p ? { ...p, content: e.target.value } : p)
                    }
                    placeholder="Write your notes here… Summarize concepts, jot down strategies, track what you've learned."
                    className="flex-1 min-h-[200px] resize-none bg-transparent text-slate-200 text-sm leading-relaxed placeholder:text-slate-600 outline-none"
                  />

                  {/* Tags */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Tag className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      {activeNote.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                          {tag}
                          <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-400">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                      <Input
                        placeholder="Add tag…"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleAddTag}
                        className="h-6 w-24 text-xs px-2 rounded-full"
                      />
                    </div>
                  </div>

                  {/* Saved questions attached to note */}
                  <div className="border-t border-white/8 pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookMarked className="w-4 h-4 text-[#F59E0B]" />
                        <span className="text-sm font-semibold text-white">
                          Attached Questions ({activeNote.savedQuestionIds.length})
                        </span>
                      </div>
                      {availableToAdd.length > 0 && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setShowAddQuestion(!showAddQuestion)}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Question
                        </Button>
                      )}
                    </div>

                    {/* Picker to add saved questions */}
                    <AnimatePresence>
                      {showAddQuestion && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-2 max-h-48 overflow-y-auto">
                            <p className="text-xs text-slate-500">Select a saved question to attach:</p>
                            {availableToAdd.length === 0 ? (
                              <p className="text-xs text-slate-600">
                                All saved questions are already in this note.
                              </p>
                            ) : (
                              availableToAdd.map((sq) => (
                                <button
                                  key={sq.questionId}
                                  onClick={() => handleAddQuestionToNote(sq)}
                                  className="w-full text-left p-2.5 rounded-lg hover:bg-white/8 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant={
                                        sq.difficulty === "E"
                                          ? "success"
                                          : sq.difficulty === "H"
                                          ? "danger"
                                          : "medium"
                                      }
                                      className="text-xs"
                                    >
                                      {sq.difficulty}
                                    </Badge>
                                    <span className="text-xs text-slate-300">{sq.skill}</span>
                                    <span className="text-xs text-slate-600 ml-auto">
                                      {sq.domain === "math" ? "Math" : "R&W"}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 mt-1 font-mono truncate">
                                    ID: {sq.questionId.slice(0, 20)}…
                                  </p>
                                </button>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* List of attached questions */}
                    {activeNote.savedQuestionIds.length === 0 ? (
                      <p className="text-xs text-slate-600 italic">
                        No questions attached. Save questions during practice and add them here.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {activeNote.savedQuestionIds.map((qId) => {
                          const snapshot = noteQuestions.find((nq) => nq.questionId === qId);
                          const sq = savedQuestions.find((s) => s.questionId === qId);
                          const isExpanded = expandedQuestions.has(qId);

                          return (
                            <div
                              key={qId}
                              className="p-3 bg-white/3 rounded-xl border border-white/8"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Badge
                                    variant={
                                      (snapshot?.difficulty || sq?.difficulty) === "E"
                                        ? "success"
                                        : (snapshot?.difficulty || sq?.difficulty) === "H"
                                        ? "danger"
                                        : "medium"
                                    }
                                    className="text-xs flex-shrink-0"
                                  >
                                    {snapshot?.difficulty || sq?.difficulty || "?"}
                                  </Badge>
                                  <span className="text-xs text-slate-300 truncate">
                                    {snapshot?.skill || sq?.skill || "Question"}
                                  </span>
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => toggleQuestionExpand(qId)}
                                    className="p-1 rounded text-slate-500 hover:text-white transition-colors"
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleRemoveQuestion(qId)}
                                    className="p-1 rounded text-slate-600 hover:text-red-400 transition-colors"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <AnimatePresence>
                                {isExpanded && snapshot && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="mt-2 pt-2 border-t border-white/8 space-y-1.5">
                                      {snapshot.stem && snapshot.stem !== `Question ${qId}` && (
                                        <div
                                          className="text-xs text-slate-300 prose prose-invert max-w-none"
                                          dangerouslySetInnerHTML={{ __html: snapshot.stem }}
                                        />
                                      )}
                                      {snapshot.rationale && (
                                        <div className="text-xs text-[#14B8A6] mt-1">
                                          <span className="font-semibold">Rationale:</span>{" "}
                                          <span dangerouslySetInnerHTML={{ __html: snapshot.rationale }} />
                                        </div>
                                      )}
                                      <p className="text-xs text-slate-600">
                                        Domain: {snapshot.domain === "math" ? "Math" : "Reading & Writing"} ·
                                        Saved {new Date(snapshot.snapshotAt).toLocaleDateString()}
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
                  <p className="text-slate-500 text-sm max-w-xs mx-auto mb-6">
                    Take notes while studying, attach saved questions, and organize your insights by topic.
                  </p>
                  <Button onClick={handleCreateNote}>
                    <Plus className="w-4 h-4" />
                    Create First Note
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
