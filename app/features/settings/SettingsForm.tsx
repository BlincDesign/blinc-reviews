import { useEffect, type ReactNode } from "react";
import { useActionData, useNavigation, useSubmit } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";

import type { SettingsErrors } from "./settings.server";

type SaveResult = { saved: boolean; errors: SettingsErrors } | undefined;

/** A settings section page: one form with the contextual save bar and a toast. */
export function SettingsForm({
  heading,
  description,
  children,
}: {
  heading: string;
  description?: string;
  children: (errors: SettingsErrors) => ReactNode;
}) {
  const actionData = useActionData() as SaveResult;
  const navigation = useNavigation();
  const submit = useSubmit();
  const shopify = useAppBridge();

  useEffect(() => {
    if (actionData?.saved) shopify.toast.show("Settings saved");
  }, [actionData, shopify]);

  return (
    <form
      data-save-bar
      onSubmit={(event) => {
        event.preventDefault();
        submit(event.currentTarget, { method: "post" });
      }}
    >
      <s-section heading={heading}>
        <s-stack gap="base">
          {description ? <s-text color="subdued">{description}</s-text> : null}
          {children(actionData?.errors ?? {})}
          {navigation.state === "submitting" ? (
            <s-spinner accessibilityLabel="Saving settings" />
          ) : null}
        </s-stack>
      </s-section>
    </form>
  );
}
