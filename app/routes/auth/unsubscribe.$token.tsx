import { Link } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { AuthShell } from "~/components/AuthShell";
import { ctx } from "~/lib/loader";
import { marketingMeta } from "~/lib/meta";
import { suppress } from "~/lib/email";

export function meta() {
  return marketingMeta({
    title: "Unsubscribed",
    description: "You will not get any more of these.",
    path: "/unsubscribe",
    siteUrl: "https://laevo.app",
    noIndex: true,
  });
}

/**
 * One click, no questions, no "are you sure", no login. The person asked to
 * stop hearing from us, so they stop hearing from us.
 */
export async function loader({ context, params }: LoaderFunctionArgs) {
  const { env } = ctx(context);
  const contact = await env.DB.prepare(
    "SELECT email FROM contacts WHERE unsub_token = ? AND email IS NOT NULL LIMIT 1",
  )
    .bind(params.token!)
    .first<{ email: string }>();

  if (contact?.email) {
    await suppress(env, contact.email, "unsubscribed by link");
    return { done: true, email: contact.email };
  }
  return { done: false, email: null };
}

export default function Unsubscribe({
  loaderData,
}: {
  loaderData: { done: boolean; email: string | null };
}) {
  if (!loaderData.done) {
    return (
      <AuthShell
        title="We could not find that"
        intro="The link may be from an old message. If you are still getting emails you do not want, reply to any one of them and a person will stop them by hand."
      >
        <Link className="btn btn-secondary btn-big btn-block" to="/">
          Go to the front page
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Done — no more of those"
      intro={
        <>
          We have stopped sending to {loaderData.email}. It takes effect
          immediately, and you do not need to do anything else.
        </>
      }
    >
      <p>
        Anything genuinely necessary about an account you hold — a password
        reset, for instance — will still reach you, because otherwise you could
        be locked out of something you need.
      </p>
      <p style={{ marginTop: 24 }}>
        <Link className="btn btn-secondary btn-big btn-block" to="/">
          Go to the front page
        </Link>
      </p>
    </AuthShell>
  );
}
