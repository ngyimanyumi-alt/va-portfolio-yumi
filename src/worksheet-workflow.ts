export type WorksheetQuestion = {
  id: string;
  type: "mc" | "truefalse" | "multiple" | "short";
  question: string;
  options?: string[];
  answer?: string | string[];
  points: number;
  explanation?: string;
};

export type Worksheet = {
  id: string;
  titleZh: string;
  titleEn: string;
  classIds: string[];
  studentIds?: string[];
  dueDate: string;
  questions: WorksheetQuestion[];
  sourceName?: string;
  sourceImage?: string;
  sourceImageName?: string;
  status: "draft" | "published";
  topicId?: string;
  createdAt: string;
  updatedAt?: string;
};

export function normalizeWorksheetQuestions(input: any[]): WorksheetQuestion[] {
  return (Array.isArray(input) ? input : []).map((q, i) => ({
    id: String(q?.id || `q-${Date.now()}-${i}`),
    type: q?.type === "truefalse" || q?.type === "multiple" || q?.type === "short" ? q.type : "mc",
    question: String(q?.question || "").trim(),
    options: Array.isArray(q?.options) ? q.options.filter((x: any) => typeof x === "string" && x.trim()) : undefined,
    answer: Array.isArray(q?.answer) ? q.answer : typeof q?.answer === "string" ? q.answer : undefined,
    points: Math.max(1, Number(q?.points) || 1),
    explanation: q?.explanation ? String(q.explanation) : undefined,
  })).filter(q => q.question);
}

/** Allocate exactly 100 points while keeping every question at least 1 point. */
export function allocate100(count: number): number[] {
  const n = Math.max(1, Math.floor(count || 1));
  const base = Math.floor(100 / n);
  const remainder = 100 - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function rebalanceTo100(questions: WorksheetQuestion[]): WorksheetQuestion[] {
  const clean = normalizeWorksheetQuestions(questions);
  if (!clean.length) return [];
  const points = allocate100(clean.length);
  return clean.map((q, i) => ({ ...q, points: points[i] }));
}

export function buildWorksheet(input: Partial<Worksheet> & { questions: WorksheetQuestion[] }): Worksheet {
  const questions = rebalanceTo100(input.questions);
  return {
    id: input.id || `ws-${Date.now()}`,
    titleZh: input.titleZh || "未命名工作紙",
    titleEn: input.titleEn || "Untitled Worksheet",
    classIds: input.classIds?.length ? input.classIds : [],
    dueDate: input.dueDate || new Date().toISOString().slice(0, 10),
    questions,
    sourceName: input.sourceName,
    sourceImage: input.sourceImage,
    sourceImageName: input.sourceImageName,
    status: input.status || "draft",
    topicId: input.topicId,
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
