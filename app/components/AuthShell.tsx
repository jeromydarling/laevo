import { Link } from "react-router";
import { WheatMark } from "./Brand";
import { TextSizeControl } from "./TextSize";

/**
 * The frame around signing in, signing up and setting a password.
 *
 * Deliberately plain: one column, one job, nothing to navigate away into.
 * The text-size control is here too, because someone who cannot read this page
 * cannot get to the one where it usually lives.
 */
export function AuthShell({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main id="main" style={{ padding: "24px 0 64px" }}>
      <div className="wrap-narrow">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <Link to="/" className="wordmark">
            <WheatMark size={32} />
            <span>Laevo</span>
          </Link>
          <TextSizeControl />
        </div>

        <h1>{title}</h1>
        {intro && (
          <div className="lead" style={{ marginTop: 16 }}>
            {intro}
          </div>
        )}

        {children && <div style={{ marginTop: 28 }}>{children}</div>}

        {footer && <div style={{ marginTop: 28 }}>{footer}</div>}
      </div>
    </main>
  );
}
