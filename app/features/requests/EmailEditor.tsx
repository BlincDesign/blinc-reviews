import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  useActionData,
  useFetcher,
  useNavigation,
  useSubmit,
} from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";

import {
  normalizeEmailSettings,
  type EmailKind,
  type EmailSettings,
} from "./email-settings";

// Shared by the email editor pages: a settings form on the left that drives a live
// preview on the right, Judge.me style.

type ActionResult = { ok: boolean; message: string } | undefined;

// Field names are paths into EmailSettings ("logoUrl", "reply.subject").
function setPath(
  target: Record<string, unknown>,
  path: string,
  value: unknown,
) {
  const [group, key] = path.split(".");
  if (!key) target[group] = value;
  else target[group] = { ...(target[group] as object), [key]: value };
}

/**
 * Live form state. Fields on the page overwrite the saved settings, so each page
 * can edit its own slice and still save the whole object.
 */
export function useEmailForm(
  saved: EmailSettings,
  {
    checkboxes = [],
    numbers = [],
  }: { checkboxes?: string[]; numbers?: string[] } = {},
) {
  const formRef = useRef<HTMLFormElement>(null);
  const [settings, setSettings] = useState(saved);
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData() as ActionResult;
  const shopify = useAppBridge();

  const read = useCallback(
    (form: HTMLFormElement) => {
      const data = new FormData(form);
      const raw = structuredClone(saved) as unknown as Record<string, unknown>;
      for (const [name, value] of data.entries()) setPath(raw, name, value);
      for (const name of checkboxes) setPath(raw, name, data.has(name));
      for (const name of numbers) setPath(raw, name, Number(data.get(name)));
      return normalizeEmailSettings(raw);
    },
    // The field lists are static per page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [saved],
  );

  const sync = useCallback(() => {
    // Polaris fields update their form value after the event.
    setTimeout(() => {
      if (formRef.current) setSettings(read(formRef.current));
    }, 0);
  }, [read]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    form.addEventListener("input", sync, true);
    form.addEventListener("change", sync, true);
    form.addEventListener("reset", sync);
    return () => {
      form.removeEventListener("input", sync, true);
      form.removeEventListener("change", sync, true);
      form.removeEventListener("reset", sync);
    };
  }, [sync]);

  useEffect(() => {
    if (actionData)
      shopify.toast.show(actionData.message, { isError: !actionData.ok });
  }, [actionData, shopify]);

  return {
    settings,
    saving: navigation.state === "submitting",
    // Polaris fields handle input inside their shadow DOM, so each one reports too.
    live: { onInput: sync, onChange: sync },
    formProps: {
      ref: formRef,
      "data-save-bar": true,
      onSubmit: (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        submit(
          {
            intent: "save",
            settings: JSON.stringify(read(event.currentTarget)),
          },
          { method: "post" },
        );
      },
    },
  };
}

const EDITOR_CSS = `
.be-editor { display: grid; gap: 16px; align-items: start; grid-template-columns: minmax(300px, 380px) minmax(0, 1fr); }
.be-preview { position: sticky; top: 16px; border-radius: 12px; overflow: hidden; background: #fff; box-shadow: 0 1px 0 rgba(26,26,26,.07), 0 0 0 1px rgba(26,26,26,.08); }
.be-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid #e3e3e3; }
.be-tabs { display: flex; gap: 4px; margin-inline-end: auto; overflow-x: auto; }
.be-tab { appearance: none; border: 0; background: none; font: inherit; font-size: 13px; padding: 8px 12px; color: #616161; cursor: pointer; border-bottom: 2px solid transparent; }
.be-tab[aria-selected="true"] { color: #303030; font-weight: 600; border-bottom-color: #303030; }
.be-subject { padding: 8px 16px; font-size: 13px; color: #303030; border-bottom: 1px solid #e3e3e3; overflow-wrap: anywhere; }
.be-stage { background: #e5e5e5; padding: 0; }
.be-frame { display: block; width: 100%; height: 820px; border: 0; margin: 0 auto; transition: max-width .2s; }
@media (max-width: 900px) {
  .be-editor { grid-template-columns: 1fr; }
  .be-preview { position: static; }
  .be-frame { height: 640px; }
}`;

export function EmailEditorLayout({
  heading,
  subtitle,
  form,
  preview,
  dryRun,
}: {
  heading: string;
  subtitle?: ReactNode;
  form: ReactNode;
  preview: {
    tabs?: { id: string; label: string }[];
    tab?: string;
    onTab?: (id: string) => void;
    subject: string;
    html: string;
    sampleKind: EmailKind;
  };
  dryRun: boolean;
}) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const sample = useFetcher<ActionResult>();
  const modal = useRef<HTMLElementTagNameMap["s-modal"]>(null);
  const shopify = useAppBridge();

  useEffect(() => {
    if (sample.state !== "idle" || !sample.data) return;
    shopify.toast.show(sample.data.message, { isError: !sample.data.ok });
    if (sample.data.ok) modal.current?.hideOverlay();
  }, [sample.state, sample.data, shopify]);

  return (
    <s-page heading={heading} inlineSize="large">
      <s-link slot="breadcrumb-actions" href="/app/settings/email">
        Email templates
      </s-link>
      <style dangerouslySetInnerHTML={{ __html: EDITOR_CSS }} />
      <s-stack gap="base">
        {dryRun ? (
          <s-banner tone="info" heading="Emails are in test mode">
            Emails are logged, not delivered, until an email provider is
            connected.
          </s-banner>
        ) : null}
        {subtitle}
        <div className="be-editor">
          {form}
          <div className="be-preview">
            <div className="be-bar">
              <div className="be-tabs" role="tablist">
                {preview.tabs?.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    className="be-tab"
                    aria-selected={t.id === preview.tab}
                    onClick={() => preview.onTab?.(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <s-button-group gap="none">
                <s-button
                  slot="secondary-actions"
                  icon="desktop"
                  variant={device === "desktop" ? "primary" : "secondary"}
                  accessibilityLabel="Desktop preview"
                  onClick={() => setDevice("desktop")}
                />
                <s-button
                  slot="secondary-actions"
                  icon="mobile"
                  variant={device === "mobile" ? "primary" : "secondary"}
                  accessibilityLabel="Mobile preview"
                  onClick={() => setDevice("mobile")}
                />
              </s-button-group>
              <s-button commandFor="email-sample" command="--show">
                Send sample email
              </s-button>
            </div>
            <div className="be-subject">
              <strong>Subject:</strong> {preview.subject}
            </div>
            <div className="be-stage">
              <iframe
                className="be-frame"
                title="Email preview"
                sandbox=""
                srcDoc={preview.html}
                style={{ maxWidth: device === "mobile" ? 375 : "100%" }}
              />
            </div>
          </div>
        </div>
      </s-stack>

      <s-modal ref={modal} id="email-sample" heading="Send sample email">
        <sample.Form method="post" id="email-sample-form">
          <input type="hidden" name="intent" value="sample" />
          <input type="hidden" name="kind" value={preview.sampleKind} />
          <s-stack gap="base">
            <s-email-field
              name="to"
              label="Send to"
              placeholder="you@example.com"
              required
            />
            <s-text color="subdued">
              Uses your saved template. Save your changes first.
            </s-text>
          </s-stack>
        </sample.Form>
        <s-button
          slot="primary-action"
          variant="primary"
          loading={sample.state !== "idle"}
          onClick={() =>
            sample.submit(
              document.getElementById("email-sample-form") as HTMLFormElement,
            )
          }
        >
          Send
        </s-button>
        <s-button
          slot="secondary-actions"
          commandFor="email-sample"
          command="--hide"
        >
          Cancel
        </s-button>
      </s-modal>
    </s-page>
  );
}
