export const scoreHistory = [
  { week: "W1", score: 1060 },
  { week: "W2", score: 1120 },
  { week: "W3", score: 1180 },
  { week: "W4", score: 1240 },
  { week: "W5", score: 1290 },
  { week: "W6", score: 1330 },
];

export const dashboardStats = [
  { label: "Current SAT estimate", value: "1330" },
  { label: "Daily streak", value: "9 days" },
  { label: "Questions solved", value: "427" },
  { label: "Calm sessions", value: "31" },
];

export const practiceQuestions = [
  {
    id: 1,
    topic: "Algebra",
    difficulty: "Medium",
    prompt: "If 3x + 5 = 26, what is x?",
    options: ["6", "7", "8", "9"],
    answer: "7",
  },
  {
    id: 2,
    topic: "Reading",
    difficulty: "Easy",
    prompt:
      "Which choice best describes the author's tone in a passage that praises innovation while warning of overconfidence?",
    options: ["Neutral", "Optimistic yet cautious", "Sarcastic", "Dismissive"],
    answer: "Optimistic yet cautious",
  },
  {
    id: 3,
    topic: "Geometry",
    difficulty: "Hard",
    prompt: "A right triangle has legs 9 and 12. What is the hypotenuse?",
    options: ["13", "14", "15", "16"],
    answer: "15",
  },
];

export const questionBank = [
  {
    id: "Q-101",
    section: "Math",
    topic: "Linear equations",
    difficulty: "Easy",
    stem: "Solve for y: 2y - 6 = 10",
  },
  {
    id: "Q-203",
    section: "Reading & Writing",
    topic: "Rhetorical synthesis",
    difficulty: "Medium",
    stem: "Choose the sentence that best integrates evidence from two source notes.",
  },
  {
    id: "Q-318",
    section: "Math",
    topic: "Data analysis",
    difficulty: "Hard",
    stem: "Interpret a two-way frequency table and compare conditional percentages.",
  },
  {
    id: "Q-407",
    section: "Reading & Writing",
    topic: "Transitions",
    difficulty: "Easy",
    stem: "Select the transition that best connects two related claims.",
  },
];

export const calmExercises = [
  { name: "4-4-4 Box Breathing", length: "2 min" },
  { name: "Progressive Muscle Release", length: "5 min" },
  { name: "Pre-Test Confidence Reset", length: "3 min" },
];
