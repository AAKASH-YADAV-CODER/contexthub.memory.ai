/**
 * CI / local eval runner.
 * Usage: node scripts/run-evals.mjs
 * Requires EVAL_API_SECRET + a running app (EVAL_BASE_URL) OR direct env for DB+LLM.
 *
 * Default: hits POST {EVAL_BASE_URL}/api/evals/run with Bearer secret.
 */
const baseUrl = (process.env.EVAL_BASE_URL || "http://localhost:3000").replace(
  /\/$/,
  ""
);
const secret = process.env.EVAL_API_SECRET;

if (!secret) {
  console.error("EVAL_API_SECRET is required");
  process.exit(1);
}

const res = await fetch(`${baseUrl}/api/evals/run`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
  },
});

const body = await res.json().catch(() => ({}));

if (!res.ok) {
  console.error("Eval request failed:", res.status, body);
  process.exit(1);
}

console.log(
  `Evals: ${body.passed}/${body.total} passed (${body.failed} failed) run=${body.evalRunId}`
);

for (const r of body.results ?? []) {
  const mark = r.passed ? "PASS" : "FAIL";
  console.log(`  [${mark}] ${r.question.slice(0, 60)}`);
  if (!r.passed && r.missing?.length) {
    console.log(`         missing: ${r.missing.join(", ")}`);
  }
}

process.exit(body.ok ? 0 : 1);
