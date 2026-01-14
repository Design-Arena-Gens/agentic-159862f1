'use client';

import { FormEvent, KeyboardEvent, useMemo, useState } from "react";

type Priority = "High" | "Medium" | "Low";
type CallStatus = "Scheduled" | "Completed" | "Needs Follow-up";

type CallRecord = {
  id: string;
  contact: string;
  company: string;
  role: string;
  phone: string;
  scheduled: string;
  priority: Priority;
  status: CallStatus;
  owner: string;
  focus: string;
  notes: string;
  lastOutcome?: string;
  nextAction?: string;
  sentiment?: "Positive" | "Neutral" | "Negative";
  tags?: string[];
};

type TaskItem = {
  id: string;
  title: string;
  due: string;
  owner: string;
  category: "Follow-up" | "Preparation" | "Insights";
  completed: boolean;
};

type AgentMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const today = new Date();
const midnight = new Date(today);
midnight.setHours(0, 0, 0, 0);

const initialCalls: CallRecord[] = [
  {
    id: "call-1",
    contact: "Jordan Smith",
    company: "Acme Logistics",
    role: "Operations Director",
    phone: "+1 (312) 555-9021",
    scheduled: new Date(midnight.getTime() + 10 * 60 * 60 * 1000).toISOString(), // 10:00 AM
    priority: "High",
    status: "Scheduled",
    owner: "Taylor",
    focus: "Renew enterprise contract and uncover expansion opportunity",
    notes:
      "Customer flagged missed SLAs last week; prep updated fulfillment report.",
    nextAction: "Present revised SLA dashboard and map upgrade path.",
    tags: ["Renewal", "At-Risk"],
  },
  {
    id: "call-2",
    contact: "Mei Chen",
    company: "Brightside Health",
    role: "Head of Patient Ops",
    phone: "+1 (415) 555-7322",
    scheduled: new Date(midnight.getTime() + 13 * 60 * 60 * 1000).toISOString(), // 1:00 PM
    priority: "Medium",
    status: "Scheduled",
    owner: "Alex",
    focus: "Walk through pilot analytics and align on rollout timeline",
    notes: "They need patient engagement benchmarks before expanding.",
    lastOutcome:
      "Requested comparative metrics vs Q1 baseline to share with COO.",
    nextAction:
      "Compile engagement benchmarks and flag likely blockers to rollout.",
    tags: ["Pilot", "Analytics"],
  },
  {
    id: "call-3",
    contact: "Luis Ramirez",
    company: "Northwind Holdings",
    role: "Portfolio Manager",
    phone: "+1 (917) 555-1844",
    scheduled: new Date(midnight.getTime() - 3 * 60 * 60 * 1000).toISOString(), // Earlier today
    priority: "High",
    status: "Needs Follow-up",
    owner: "Jordan",
    focus: "Resolve billing dispute on overage fees",
    notes:
      "Send revised invoice and capture approval; identify root cause of overage.",
    lastOutcome:
      "Call ended with action to deliver updated billing detail within 4hrs.",
    nextAction:
      "Escalate to finance for credit approval and draft apology email.",
    sentiment: "Negative",
    tags: ["Billing", "Escalation"],
  },
];

const initialTasks: TaskItem[] = [
  {
    id: "task-1",
    title: "Finalize SLA recovery deck for Acme Logistics",
    due: new Date(midnight.getTime() + 8 * 60 * 60 * 1000).toISOString(),
    owner: "Taylor",
    category: "Preparation",
    completed: false,
  },
  {
    id: "task-2",
    title: "Compile engagement benchmarks for Brightside pilot",
    due: new Date(midnight.getTime() + 12 * 60 * 60 * 1000).toISOString(),
    owner: "Alex",
    category: "Insights",
    completed: false,
  },
  {
    id: "task-3",
    title: "Send revised invoice to Northwind finance team",
    due: new Date(midnight.getTime() + 2 * 60 * 60 * 1000).toISOString(),
    owner: "Jordan",
    category: "Follow-up",
    completed: false,
  },
];

const formatTime = (iso: string) =>
  new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));

const formatDateShort = (iso: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(iso));

const priorityColors: Record<Priority, string> = {
  High: "bg-rose-100 text-rose-700 border border-rose-200",
  Medium: "bg-amber-100 text-amber-700 border border-amber-200",
  Low: "bg-emerald-100 text-emerald-700 border border-emerald-200",
};

const statusBadge: Record<CallStatus, string> = {
  Scheduled: "bg-blue-100 text-blue-700 border border-blue-200",
  Completed: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  "Needs Follow-up": "bg-orange-100 text-orange-700 border border-orange-200",
};

const categoryColors: Record<TaskItem["category"], string> = {
  "Follow-up": "bg-orange-100 text-orange-700 border border-orange-200",
  Preparation: "bg-blue-100 text-blue-700 border border-blue-200",
  Insights: "bg-purple-100 text-purple-700 border border-purple-200",
};

const sentimentBadge = {
  Positive: "text-emerald-600 bg-emerald-50 border border-emerald-200",
  Neutral: "text-slate-600 bg-slate-100 border border-slate-200",
  Negative: "text-rose-600 bg-rose-50 border border-rose-200",
};

type NewCallForm = {
  contact: string;
  company: string;
  role: string;
  phone: string;
  scheduled: string;
  priority: Priority;
  owner: string;
  focus: string;
};

export function CallAgentApp() {
  const [calls, setCalls] = useState<CallRecord[]>(initialCalls);
  const [selectedCallId, setSelectedCallId] = useState<string>(
    initialCalls[0]?.id ?? ""
  );
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: "assistant-initial",
      role: "assistant",
      content:
        "Hi, I'm CallFlow. I monitor your call queue, prep materials, and keep follow-ups on track. Select a call or tell me what you need.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [newCallForm, setNewCallForm] = useState<NewCallForm>({
    contact: "",
    company: "",
    role: "",
    phone: "",
    scheduled: "",
    priority: "Medium",
    owner: "",
    focus: "",
  });
  const [addingCall, setAddingCall] = useState(false);

  const selectedCall = calls.find((c) => c.id === selectedCallId) ?? null;

  const stats = useMemo(() => {
    const upcoming = calls.filter((call) => call.status === "Scheduled");
    const followUps = calls.filter((call) => call.status === "Needs Follow-up");
    const highPriority = calls.filter((call) => call.priority === "High");
    const nextCall = upcoming
      .slice()
      .sort(
        (a, b) =>
          new Date(a.scheduled).getTime() - new Date(b.scheduled).getTime()
      )[0];

    return {
      totalCalls: calls.length,
      scheduledCount: upcoming.length,
      followUpCount: followUps.length,
      highPriorityCount: highPriority.length,
      escalations: calls.filter((call) => call.sentiment === "Negative").length,
      nextCallLabel: nextCall
        ? `${nextCall.contact} • ${formatTime(nextCall.scheduled)}`
        : "No upcoming calls",
    };
  }, [calls]);

  const upcomingCalls = useMemo(
    () =>
      calls
        .slice()
        .sort(
          (a, b) =>
            new Date(a.scheduled).getTime() - new Date(b.scheduled).getTime()
        ),
    [calls]
  );

  const handleStatusUpdate = (id: string, status: CallStatus) => {
    setCalls((prev) =>
      prev.map((call) =>
        call.id === id
          ? { ...call, status, sentiment: status === "Completed" ? "Positive" : call.sentiment }
          : call
      )
    );
  };

  const updateCallNotes = (id: string, notes: string) => {
    setCalls((prev) =>
      prev.map((call) => (call.id === id ? { ...call, notes } : call))
    );
  };

  const updateCallNextAction = (id: string, value: string) => {
    setCalls((prev) =>
      prev.map((call) => (call.id === id ? { ...call, nextAction: value } : call))
    );
  };

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const handleAddCall = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const id = createId();
    const scheduledIso = newCallForm.scheduled
      ? new Date(newCallForm.scheduled).toISOString()
      : new Date().toISOString();
    const entry: CallRecord = {
      id,
      notes: "",
      lastOutcome: undefined,
      nextAction: "",
      sentiment: undefined,
      tags: [],
      ...newCallForm,
      scheduled: scheduledIso,
      status: "Scheduled",
    };

    setCalls((prev) => [entry, ...prev]);
    setSelectedCallId(id);
    setNewCallForm({
      contact: "",
      company: "",
      role: "",
      phone: "",
      scheduled: "",
      priority: "Medium",
      owner: "",
      focus: "",
    });
    setAddingCall(false);
  };

  const handleMessageSend = async () => {
    if (!input.trim()) return;
    const userMessage: AgentMessage = {
      id: `user-${createId()}`,
      role: "user",
      content: input.trim(),
    };

    const pendingMessages = [...messages, userMessage];
    setMessages(pendingMessages);
    setInput("");
    setIsThinking(true);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: pendingMessages.map(({ role, content }) => ({
            role,
            content,
          })),
          state: {
            calls,
            tasks,
            selectedCallId,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const data = (await response.json()) as { reply?: string };
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${createId()}`,
          role: "assistant",
          content:
            data.reply ??
            "I wasn't able to parse a response, but your call data is intact. Try again or adjust the request.",
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${createId()}`,
          role: "assistant",
          content:
            "I hit an issue reaching the intelligence engine. Double-check the API key and try again.",
        },
      ]);
      console.error(error);
    } finally {
      setIsThinking(false);
    }
  };

  const regenerateBrief = async () => {
    if (!selectedCall) return;
    setIsThinking(true);
    const systemPrompt =
      `Generate a high-impact call brief for ${selectedCall.contact} at ${selectedCall.company}. ` +
      `Focus on: ${selectedCall.focus}. Highlight risk, opportunity, and next steps.`;
    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: systemPrompt,
            },
          ],
          state: {
            calls: [selectedCall],
            tasks,
            selectedCallId: selectedCall.id,
          },
        }),
      });
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      const data = (await response.json()) as { reply?: string };
      setCalls((prev) =>
        prev.map((call) =>
          call.id === selectedCall.id
            ? {
                ...call,
                notes:
                  data.reply ??
                  call.notes ??
                  "Call brief generation returned no content.",
              }
            : call
        )
      );
    } catch (error) {
      console.error(error);
    } finally {
      setIsThinking(false);
    }
  };

  const handleInputKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleMessageSend();
    }
  };

  const activeTasks = tasks.filter((task) => !task.completed);
  const completedTasks = tasks.filter((task) => task.completed);
  const isSendDisabled = isThinking || !input.trim();

  return (
    <div className="min-h-screen bg-slate-100 pb-16">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 pt-12">
        <header className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              Call Operations Control Center
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">
              CallFlow AI — Business Call Management
            </h1>
            <p className="mt-3 max-w-xl text-sm text-slate-600">
              Supervise live calls, prep talking points, and close loops on
              follow-ups in one place. The agent maintains call context so you
              can focus on strategy.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setAddingCall((prev) => !prev)}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-slate-700"
            >
              {addingCall ? "Close Form" : "Add Call to Queue"}
            </button>
            <button
              onClick={regenerateBrief}
              disabled={!selectedCall || isThinking}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Refresh Call Brief
            </button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Calls Tracked"
            primary={stats.totalCalls.toString()}
            helper={`${stats.scheduledCount} scheduled`}
          />
          <StatCard
            title="Follow-ups"
            primary={stats.followUpCount.toString()}
            helper="Need loops closed"
            tone="amber"
          />
          <StatCard
            title="High Priority"
            primary={stats.highPriorityCount.toString()}
            helper="Escalate before EOD"
            tone="rose"
          />
          <StatCard
            title="Next Call"
            primary={stats.nextCallLabel}
            helper={
              stats.escalations > 0
                ? `${stats.escalations} flagged escalations`
                : "All clear"
            }
            tone="emerald"
          />
        </section>

        {addingCall && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Queue a new call
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Capture the essentials. The agent will stitch this into the
              operating picture and prep a brief.
            </p>
            <form
              onSubmit={handleAddCall}
              className="mt-6 grid gap-4 md:grid-cols-2"
            >
              <label className="flex flex-col text-sm font-medium text-slate-700">
                Contact name
                <input
                  required
                  value={newCallForm.contact}
                  onChange={(event) =>
                    setNewCallForm((prev) => ({
                      ...prev,
                      contact: event.target.value,
                    }))
                  }
                  className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
                />
              </label>
              <label className="flex flex-col text-sm font-medium text-slate-700">
                Company
                <input
                  required
                  value={newCallForm.company}
                  onChange={(event) =>
                    setNewCallForm((prev) => ({
                      ...prev,
                      company: event.target.value,
                    }))
                  }
                  className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
                />
              </label>
              <label className="flex flex-col text-sm font-medium text-slate-700">
                Role / Title
                <input
                  required
                  value={newCallForm.role}
                  onChange={(event) =>
                    setNewCallForm((prev) => ({
                      ...prev,
                      role: event.target.value,
                    }))
                  }
                  className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
                />
              </label>
              <label className="flex flex-col text-sm font-medium text-slate-700">
                Owner
                <input
                  required
                  value={newCallForm.owner}
                  onChange={(event) =>
                    setNewCallForm((prev) => ({
                      ...prev,
                      owner: event.target.value,
                    }))
                  }
                  className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
                />
              </label>
              <label className="flex flex-col text-sm font-medium text-slate-700">
                Phone
                <input
                  required
                  value={newCallForm.phone}
                  onChange={(event) =>
                    setNewCallForm((prev) => ({
                      ...prev,
                      phone: event.target.value,
                    }))
                  }
                  className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
                />
              </label>
              <label className="flex flex-col text-sm font-medium text-slate-700">
                Scheduled time
                <input
                  required
                  type="datetime-local"
                  value={newCallForm.scheduled}
                  onChange={(event) =>
                    setNewCallForm((prev) => ({
                      ...prev,
                      scheduled: event.target.value,
                    }))
                  }
                  className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
                />
              </label>
              <label className="flex flex-col text-sm font-medium text-slate-700">
                Priority
                <select
                  value={newCallForm.priority}
                  onChange={(event) =>
                    setNewCallForm((prev) => ({
                      ...prev,
                      priority: event.target.value as Priority,
                    }))
                  }
                  className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </label>
              <label className="md:col-span-2 flex flex-col text-sm font-medium text-slate-700">
                Call focus
                <textarea
                  required
                  rows={3}
                  value={newCallForm.focus}
                  onChange={(event) =>
                    setNewCallForm((prev) => ({
                      ...prev,
                      focus: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
                />
              </label>
              <div className="md:col-span-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAddingCall(false)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-blue-500"
                >
                  Queue Call
                </button>
              </div>
            </form>
          </section>
        )}

        <main className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
          <section className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  Call queue
                </h2>
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Chronological
                </span>
              </div>
              <div className="mt-5 space-y-3">
                {upcomingCalls.map((call) => {
                  const isActive = call.id === selectedCallId;
                  return (
                    <button
                      key={call.id}
                      onClick={() => setSelectedCallId(call.id)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                        isActive
                          ? "border-slate-900 bg-slate-900/90 text-white shadow-lg"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="text-base font-semibold">
                            {call.contact}
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityColors[call.priority]}`}
                          >
                            {call.priority}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge[call.status]}`}
                          >
                            {call.status}
                          </span>
                        </div>
                        <div className="text-sm font-medium">
                          {formatTime(call.scheduled)} • {call.owner}
                        </div>
                      </div>
                      <div
                        className={`mt-2 text-sm ${
                          isActive ? "text-blue-100" : "text-slate-600"
                        }`}
                      >
                        {call.company} — {call.focus}
                      </div>
                      {call.tags && call.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
                          {call.tags.map((tag) => (
                            <span
                              key={tag}
                              className={`rounded-full px-2 py-1 ${
                                isActive
                                  ? "bg-white/10 text-white"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              {selectedCall ? (
                <div className="space-y-5">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">
                        {selectedCall.contact}
                      </h2>
                      <p className="text-sm text-slate-600">
                        {selectedCall.role} • {selectedCall.company}
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        Owner: {selectedCall.owner}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 px-4 py-2 text-right text-sm font-medium text-slate-700 shadow-sm">
                      <div>{formatDateShort(selectedCall.scheduled)}</div>
                      <div>{formatTime(selectedCall.scheduled)}</div>
                      <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                        {selectedCall.phone}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs font-semibold">
                    <span
                      className={`rounded-full px-3 py-1.5 ${priorityColors[selectedCall.priority]}`}
                    >
                      {selectedCall.priority} priority
                    </span>
                    <span
                      className={`rounded-full px-3 py-1.5 ${statusBadge[selectedCall.status]}`}
                    >
                      {selectedCall.status}
                    </span>
                    {selectedCall.sentiment && (
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                          sentimentBadge[selectedCall.sentiment]
                        }`}
                      >
                        Sentiment: {selectedCall.sentiment}
                      </span>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <h3 className="text-sm font-semibold text-slate-800">
                        Call objective
                      </h3>
                      <p className="mt-2 text-sm text-slate-600">
                        {selectedCall.focus}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <h3 className="text-sm font-semibold text-slate-800">
                        Next strategic action
                      </h3>
                      <textarea
                        rows={3}
                        value={selectedCall.nextAction ?? ""}
                        onChange={(event) =>
                          updateCallNextAction(
                            selectedCall.id,
                            event.target.value
                          )
                        }
                        className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-inner">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-slate-900">
                        Call brief & intelligence
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        Auto-saved
                      </div>
                    </div>
                    <textarea
                      rows={6}
                      value={selectedCall.notes}
                      onChange={(event) =>
                        updateCallNotes(selectedCall.id, event.target.value)
                      }
                      placeholder="Drop in important context, talk tracks, or risk intel."
                      className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
                    />
                  </div>

                  {selectedCall.lastOutcome && (
                    <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">
                      <h3 className="font-semibold text-emerald-800">
                        Last call outcome
                      </h3>
                      <p className="mt-1">{selectedCall.lastOutcome}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() =>
                        handleStatusUpdate(selectedCall.id, "Completed")
                      }
                      className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-500"
                    >
                      Mark Completed
                    </button>
                    <button
                      onClick={() =>
                        handleStatusUpdate(selectedCall.id, "Needs Follow-up")
                      }
                      className="rounded-full border border-amber-400 px-4 py-2 text-sm font-semibold text-amber-600 hover:bg-amber-50"
                    >
                      Flag Follow-up
                    </button>
                    <button
                      onClick={() =>
                        handleStatusUpdate(selectedCall.id, "Scheduled")
                      }
                      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Reset Status
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500">
                  Select a call to review briefing intel and live updates.
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  Mission-critical tasks
                </h2>
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {activeTasks.length} open
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {tasks.map((task) => (
                  <label
                    key={task.id}
                    className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 transition hover:border-slate-300 hover:bg-white"
                  >
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleTask(task.id)}
                      className="mt-1 size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">
                          {task.title}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${categoryColors[task.category]}`}
                        >
                          {task.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Owner: {task.owner} • Due {formatTime(task.due)}
                      </p>
                    </div>
                  </label>
                ))}
              </div>

              {completedTasks.length > 0 && (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
                  🎉 {completedTasks.length} tasks closed today. Keep momentum.
                </div>
              )}
            </div>

            <div className="flex h-[500px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  CallFlow Agent
                </h2>
                <p className="text-xs text-slate-500">
                  Ask for scripts, next steps, or follow-up plans.
                </p>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-xs rounded-2xl px-4 py-3 text-sm shadow ${
                      message.role === "assistant"
                        ? "bg-slate-900 text-white"
                        : "ml-auto bg-blue-100 text-slate-900"
                    }`}
                  >
                    {message.content}
                  </div>
                ))}
                {isThinking && (
                  <div className="text-xs font-medium text-slate-500">
                    Agent is synthesizing…
                  </div>
                )}
              </div>
              <div className="border-t border-slate-200 bg-slate-50 px-4 py-4">
                <textarea
                  rows={2}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder='Type a request — e.g. "Draft follow-up email for Acme Logistics call."'
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
                />
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>Shift + Enter for multiline</span>
                  <button
                    onClick={handleMessageSend}
                    disabled={isSendDisabled}
                    className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {isThinking ? "Working…" : "Send to Agent"}
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}

type StatCardProps = {
  title: string;
  primary: string;
  helper?: string;
  tone?: "default" | "emerald" | "rose" | "amber";
};

const statStyles: Record<
  NonNullable<StatCardProps["tone"]>,
  { bg: string; border: string; text: string }
> = {
  default: {
    bg: "bg-white",
    border: "border-slate-200",
    text: "text-slate-900",
  },
  emerald: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
  },
  rose: {
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-700",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
  },
};

function StatCard({ title, primary, helper, tone = "default" }: StatCardProps) {
  const toneStyle = statStyles[tone];

  return (
    <div
      className={`rounded-3xl border ${toneStyle.border} ${toneStyle.bg} p-5 shadow-sm`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <div className={`mt-2 text-xl font-semibold ${toneStyle.text}`}>
        {primary}
      </div>
      {helper && <p className="mt-1 text-xs text-slate-500">{helper}</p>}
    </div>
  );
}
