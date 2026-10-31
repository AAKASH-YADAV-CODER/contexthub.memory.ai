import { runMultiAgent } from "@/agents";
import { scoreKeywords } from "@/lib/evals/score";
import { supabase } from "@/lib/supabase/server";

export type EvalCaseRow = {
  id: string;
  question: string;
  expected_keywords: string[];
};

export type EvalSuiteResult = {
  evalRunId: string;
  passed: number;
  failed: number;
  total: number;
  results: Array<{
    caseId: string;
    question: string;
    answer: string;
    passed: boolean;
    matched: string[];
    missing: string[];
    agent: string | null;
    latencyMs: number | null;
    error: string | null;
  }>;
};

async function resolveEvalIdentity(params?: {
  userId?: string;
  teamId?: string;
}): Promise<{ userId: string; teamId: string }> {
  if (params?.userId && params?.teamId) {
    return { userId: params.userId, teamId: params.teamId };
  }

  const envUser = process.env.EVAL_USER_ID?.trim();
  const envTeam = process.env.EVAL_TEAM_ID?.trim();
  if (envUser && envTeam) {
    return { userId: envUser, teamId: envTeam };
  }

  const { data: membership, error } = await supabase
    .from("team_members")
    .select("user_id, team_id")
    .limit(1)
    .maybeSingle();

  if (error || !membership) {
    throw new Error(
      "No team for evals. Set EVAL_USER_ID + EVAL_TEAM_ID or sign in once to create a team."
    );
  }

  return {
    userId: membership.user_id as string,
    teamId: membership.team_id as string,
  };
}

export async function listEvalCases(): Promise<EvalCaseRow[]> {
  const { data, error } = await supabase
    .from("eval_cases")
    .select("id, question, expected_keywords")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Load eval cases failed: ${error.message}`);
  return (data ?? []) as EvalCaseRow[];
}

/**
 * Run all eval cases through the multi-agent pipeline and persist results.
 */
export async function runEvalSuite(options: {
  trigger: "manual" | "ci";
  userId?: string;
  teamId?: string;
}): Promise<EvalSuiteResult> {
  const identity = await resolveEvalIdentity(options);
  const cases = await listEvalCases();

  if (cases.length === 0) {
    throw new Error(
      "No eval_cases found. Run supabase/week11-setup.sql in Supabase."
    );
  }

  const { data: runRow, error: runError } = await supabase
    .from("eval_runs")
    .insert({
      trigger: options.trigger,
      total: cases.length,
      passed: 0,
      failed: 0,
    })
    .select("id")
    .single();

  if (runError || !runRow) {
    throw new Error(`Create eval_run failed: ${runError?.message}`);
  }

  const evalRunId = runRow.id as string;
  let passed = 0;
  let failed = 0;
  const results: EvalSuiteResult["results"] = [];

  for (const testCase of cases) {
    const started = Date.now();
    let answer = "";
    let agent: string | null = null;
    let error: string | null = null;
    let casePassed = false;
    let matched: string[] = [];
    let missing: string[] = testCase.expected_keywords ?? [];

    try {
      const result = await runMultiAgent({
        message: testCase.question,
        userId: identity.userId,
        teamId: identity.teamId,
        runId: crypto.randomUUID(),
        history: [],
        preferences: [],
      });
      answer = result.text;
      agent = result.agent;
      const score = scoreKeywords(answer, testCase.expected_keywords ?? []);
      casePassed = score.passed;
      matched = score.matched;
      missing = score.missing;
    } catch (err) {
      error = err instanceof Error ? err.message : "Eval case failed";
      casePassed = false;
    }

    const latencyMs = Date.now() - started;
    if (casePassed) passed += 1;
    else failed += 1;

    await supabase.from("eval_results").insert({
      eval_run_id: evalRunId,
      case_id: testCase.id,
      question: testCase.question,
      answer,
      passed: casePassed,
      matched_keywords: matched,
      missing_keywords: missing,
      agent,
      latency_ms: latencyMs,
      error,
    });

    results.push({
      caseId: testCase.id,
      question: testCase.question,
      answer,
      passed: casePassed,
      matched,
      missing,
      agent,
      latencyMs,
      error,
    });
  }

  await supabase
    .from("eval_runs")
    .update({
      passed,
      failed,
      total: cases.length,
      finished_at: new Date().toISOString(),
    })
    .eq("id", evalRunId);

  return { evalRunId, passed, failed, total: cases.length, results };
}

export async function getLatestEvalRun() {
  const { data: run, error } = await supabase
    .from("eval_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Load eval run failed: ${error.message}`);
  if (!run) return null;

  const { data: results, error: resultsError } = await supabase
    .from("eval_results")
    .select("*")
    .eq("eval_run_id", run.id)
    .order("created_at", { ascending: true });

  if (resultsError) {
    throw new Error(`Load eval results failed: ${resultsError.message}`);
  }

  return { run, results: results ?? [] };
}

export async function listRecentEvalRuns(limit = 10) {
  const { data, error } = await supabase
    .from("eval_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`List eval runs failed: ${error.message}`);
  return data ?? [];
}
