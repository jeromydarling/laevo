import { redirect } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { ctx } from "~/lib/loader";
import { endSession, clearSessionCookie } from "~/lib/auth";

async function signOut({ context, request }: LoaderFunctionArgs) {
  const { env } = ctx(context);
  await endSession(env, request);
  return redirect("/", { headers: { "Set-Cookie": clearSessionCookie() } });
}

export const loader = signOut;
export const action = (args: ActionFunctionArgs) => signOut(args);
