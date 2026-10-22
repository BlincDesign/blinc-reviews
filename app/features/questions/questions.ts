// Shared by the Questions admin page (client) and questions.server.ts.

export const QUESTION_LIMITS = {
  name: 60,
  email: 254,
  body: 1000,
  answer: 2000,
};

export const QUESTION_FILTERS = [
  "PENDING",
  "PUBLISHED",
  "HIDDEN",
  "ALL",
] as const;
export type QuestionFilter = (typeof QUESTION_FILTERS)[number];

export type QuestionIntent = "publish" | "hide" | "delete";
