import { useEffect, useRef } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import {
  QUESTION_FILTERS,
  QUESTION_LIMITS,
  answerQuestion,
  listQuestions,
  moderateQuestions,
  type QuestionFilter,
  type QuestionIntent,
} from "../features/questions/questions.server";
import { getProductTitles } from "../features/reviews/reviews.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const param = new URL(request.url).searchParams.get("status");
  const filter: QuestionFilter = (
    QUESTION_FILTERS as readonly string[]
  ).includes(param ?? "")
    ? (param as QuestionFilter)
    : "PENDING";
  const { questions, counts } = await listQuestions(session.shop, filter);
  const titles = await getProductTitles(
    admin,
    questions.map((q) => q.productId),
  ).catch(() => ({}) as Record<string, string>);

  return {
    filter,
    counts,
    questions: questions.map((q) => ({
      id: q.id,
      product: titles[q.productId] ?? "Deleted product",
      productId: q.productId.split("/").pop(),
      askerName: q.askerName,
      askerEmail: q.askerEmail,
      body: q.body,
      answer: q.answer,
      status: q.status,
      createdAt: q.createdAt.toISOString(),
    })),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = String(form.get("intent"));
  const id = String(form.get("id") ?? "");

  if (intent === "answer") {
    return answerQuestion(
      admin,
      session.shop,
      id,
      String(form.get("answer") ?? ""),
    );
  }
  if (["publish", "hide", "delete"].includes(intent)) {
    const updated = await moderateQuestions(
      admin,
      session.shop,
      [id],
      intent as QuestionIntent,
    );
    if (!updated) return { ok: false as const, message: "Question not found." };
    const label = {
      publish: "Question published",
      hide: "Question hidden",
      delete: "Question deleted",
    };
    return { ok: true as const, message: label[intent as QuestionIntent] };
  }
  return { ok: false as const, message: "Nothing to update." };
};

const FILTER_LABELS: Record<QuestionFilter, string> = {
  PENDING: "Unanswered",
  PUBLISHED: "Published",
  HIDDEN: "Hidden",
  ALL: "All",
};

const STATUS_BADGE = {
  PENDING: { tone: "warning", label: "Unanswered" },
  PUBLISHED: { tone: "success", label: "Published" },
  HIDDEN: { tone: undefined, label: "Hidden" },
} as const;

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

type Row = ReturnType<typeof useLoaderData<typeof loader>>["questions"][number];

function useResultToast(fetcher: {
  state: string;
  data?: { ok: boolean; message: string };
}) {
  const shopify = useAppBridge();
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data)
      shopify.toast.show(fetcher.data.message, { isError: !fetcher.data.ok });
  }, [fetcher.state, fetcher.data, shopify]);
}

function AnswerModal({ question }: { question: Row }) {
  const fetcher = useFetcher<typeof action>();
  const modal = useRef<HTMLElementTagNameMap["s-modal"]>(null);
  const modalId = `answer-${question.id}`;
  useResultToast(fetcher);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok)
      modal.current?.hideOverlay();
  }, [fetcher.state, fetcher.data]);

  return (
    <>
      <s-button
        variant={question.answer ? "secondary" : "primary"}
        commandFor={modalId}
        command="--show"
      >
        {question.answer ? "Edit answer" : "Answer"}
      </s-button>
      <s-modal
        ref={modal}
        id={modalId}
        heading={`Answer ${question.askerName}`}
      >
        <s-stack gap="base">
          <s-text>{question.body}</s-text>
          <fetcher.Form method="post" id={`${modalId}-form`}>
            <input type="hidden" name="intent" value="answer" />
            <input type="hidden" name="id" value={question.id} />
            <s-text-area
              name="answer"
              label="Your answer"
              details="Shown under the question on the product page. The customer gets an email with your answer."
              rows={5}
              maxLength={QUESTION_LIMITS.answer}
              defaultValue={question.answer ?? ""}
            />
          </fetcher.Form>
        </s-stack>
        <s-button
          slot="primary-action"
          variant="primary"
          loading={fetcher.state !== "idle"}
          onClick={() =>
            fetcher.submit(
              document.getElementById(`${modalId}-form`) as HTMLFormElement,
            )
          }
        >
          Publish answer
        </s-button>
        <s-button
          slot="secondary-actions"
          commandFor={modalId}
          command="--hide"
        >
          Cancel
        </s-button>
      </s-modal>
    </>
  );
}

function QuestionRow({ question }: { question: Row }) {
  const fetcher = useFetcher<typeof action>();
  useResultToast(fetcher);
  const badge = STATUS_BADGE[question.status];
  const act = (intent: QuestionIntent) =>
    fetcher.submit({ intent, id: question.id }, { method: "post" });

  return (
    <s-box border="base" borderRadius="base" padding="base">
      <s-stack gap="small-200">
        <s-stack
          direction="inline"
          justifyContent="space-between"
          alignItems="center"
          gap="base"
        >
          <s-stack direction="inline" gap="small-200" alignItems="center">
            <s-text type="strong">{question.product}</s-text>
            <s-badge tone={badge.tone}>{badge.label}</s-badge>
          </s-stack>
          <s-text color="subdued">
            {dateFormat.format(new Date(question.createdAt))}
          </s-text>
        </s-stack>
        <s-text>{question.body}</s-text>
        <s-text color="subdued">
          {question.askerName} · {question.askerEmail}
        </s-text>
        {question.answer ? (
          <s-box padding="small" background="subdued" borderRadius="base">
            <s-text>Your answer: {question.answer}</s-text>
          </s-box>
        ) : null}
        <s-stack direction="inline" gap="small-200">
          <AnswerModal question={question} />
          {question.status === "PUBLISHED" ? (
            <s-button onClick={() => act("hide")}>Hide</s-button>
          ) : question.status === "HIDDEN" && question.answer ? (
            <s-button onClick={() => act("publish")}>Publish</s-button>
          ) : null}
          <s-button
            tone="critical"
            variant="tertiary"
            onClick={() => {
              if (confirm("Delete this question? This can't be undone."))
                act("delete");
            }}
          >
            Delete
          </s-button>
        </s-stack>
      </s-stack>
    </s-box>
  );
}

export default function Questions() {
  const { filter, counts, questions } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Questions">
      <s-stack gap="base">
        <s-stack direction="inline" gap="small-200">
          {QUESTION_FILTERS.map((f) => {
            const count = f === "ALL" ? undefined : counts[f];
            return (
              <s-button
                key={f}
                href={`/app/questions?status=${f}`}
                variant={f === filter ? "primary" : "secondary"}
              >
                {count ? `${FILTER_LABELS[f]} (${count})` : FILTER_LABELS[f]}
              </s-button>
            );
          })}
        </s-stack>
        <s-section>
          {questions.length === 0 ? (
            <s-stack gap="small-200" alignItems="center">
              <s-icon type="question-circle" />
              <s-text color="subdued">
                {filter === "PENDING"
                  ? "No questions waiting for an answer."
                  : "No questions here yet."}
              </s-text>
              <s-text color="subdued">
                Customers ask questions in the Q&amp;A section of your reviews
                widget on product pages.
              </s-text>
            </s-stack>
          ) : (
            <s-stack gap="base">
              {questions.map((q) => (
                <QuestionRow key={q.id} question={q} />
              ))}
            </s-stack>
          )}
        </s-section>
      </s-stack>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
