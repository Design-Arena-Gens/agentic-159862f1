import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["assistant", "user"]),
        content: z.string(),
      })
    )
    .min(1),
  state: z.object({
    calls: z
      .array(
        z.object({
          id: z.string(),
          contact: z.string(),
          company: z.string(),
          role: z.string(),
          phone: z.string(),
          scheduled: z.string(),
          priority: z.enum(["High", "Medium", "Low"]),
          status: z.enum(["Scheduled", "Completed", "Needs Follow-up"]),
          owner: z.string(),
          focus: z.string(),
          notes: z.string(),
          lastOutcome: z.string().optional(),
          nextAction: z.string().optional(),
          sentiment: z.enum(["Positive", "Neutral", "Negative"]).optional(),
          tags: z.array(z.string()).optional(),
        })
      )
      .optional(),
    tasks: z
      .array(
        z.object({
          id: z.string(),
          title: z.string(),
          due: z.string(),
          owner: z.string(),
          category: z.enum(["Follow-up", "Preparation", "Insights"]),
          completed: z.boolean(),
        })
      )
      .optional(),
    selectedCallId: z.string().optional(),
  }),
});

const openai =
  process.env.OPENAI_API_KEY !== undefined
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

const systemPrompt = `
You are CallFlow, an elite business call operations AI.
You orchestrate complex customer conversations, mitigate risk, unlock expansion opportunities, and write editorial-quality follow-ups.

Operating principles:
- Prioritise call outcomes, measurable next actions, and strategic guidance.
- Be concise yet actionable; use bullets and headings when it improves readability.
- Keep tone calm, confident, and revenue-focused.
- When asked for emails or scripts, provide fully drafted artifacts with subject lines.
- Reference call owners, customers, and timelines pulled from the call state.
- If information is missing, state the assumption and proceed.
`;

const buildContext = (state: z.infer<typeof requestSchema>["state"]) => {
  const calls = state.calls ?? [];
  const tasks = state.tasks ?? [];
  const selected = calls.find((call) => call.id === state.selectedCallId);

  const queueSummary =
    calls.length === 0
      ? "No calls on the board."
      : calls
          .map((call) => {
            const timeframe = new Date(call.scheduled).toLocaleString(undefined, {
              hour: "numeric",
              minute: "2-digit",
              month: "short",
              day: "numeric",
            });
            return `• ${call.contact} (${call.company}) — ${call.status}, priority ${call.priority}. Owner ${call.owner}. Focus: ${call.focus}. Time ${timeframe}.`;
          })
          .join("\n");

  const taskSummary =
    tasks.length === 0
      ? "No tasks logged."
      : tasks
          .map((task) => {
            const due = new Date(task.due).toLocaleString(undefined, {
              hour: "numeric",
              minute: "2-digit",
              month: "short",
              day: "numeric",
            });
            return `• ${task.title} — ${task.category} owned by ${task.owner}, due ${due}, ${
              task.completed ? "completed" : "open"
            }.`;
          })
          .join("\n");

  const selectedSummary = selected
    ? `Focus on ${selected.contact} (${selected.company}). Objective: ${selected.focus}. Next action: ${
        selected.nextAction || "Not captured yet."
      }.`
    : "No call currently selected.";

  return `Current queue:\n${queueSummary}\n\nTasks:\n${taskSummary}\n\nActive lens:\n${selectedSummary}`;
};

export async function POST(request: Request) {
  if (!openai) {
    return NextResponse.json(
      { error: "OpenAI API key is missing from the environment." },
      { status: 500 }
    );
  }

  let payload: z.infer<typeof requestSchema>;

  try {
    const data = await request.json();
    payload = requestSchema.parse(data);
  } catch (error) {
    console.error("Validation error", error);
    return NextResponse.json(
      { error: "Invalid payload for call agent." },
      { status: 400 }
    );
  }

  const context = buildContext(payload.state);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.25,
      max_tokens: 600,
      messages: [
        {
          role: "system",
          content: `${systemPrompt.trim()}\n\n${context}`,
        },
        ...payload.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
    });

    const reply =
      completion.choices[0]?.message?.content ??
      "No response generated. Re-run your last request.";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("OpenAI error", error);
    return NextResponse.json(
      {
        error:
          "Unable to reach the intelligence engine right now. Try again shortly.",
      },
      { status: 502 }
    );
  }
}
