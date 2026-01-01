"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AgentState,
  AgentStep,
  AgentEvent,
  createAgent,
  advanceAgent
} from "../lib/agent";

const statusLabel = (state: AgentState | null) => {
  if (!state) return "idle";
  return state.status;
};

const formatTimestamp = (timestamp: number) =>
  new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(timestamp);

const renderList = (items: string[], fallback: string) =>
  items.length ? items.join(" • ") : fallback;

const activeStep = (plan: AgentStep[]) =>
  plan.find((step) => step.status === "in-progress") ??
  plan.find((step) => step.status === "pending");

export default function HomePage() {
  const [goal, setGoal] = useState("");
  const [constraintsInput, setConstraintsInput] = useState("");
  const [agent, setAgent] = useState<AgentState | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || !agent) {
      return;
    }
    if (agent.status !== "running") {
      setRunning(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setAgent((prev) => {
        if (!prev || prev.status !== "running") {
          return prev;
        }
        return advanceAgent(prev);
      });
    }, 900);

    return () => window.clearTimeout(timer);
  }, [running, agent]);

  const handleLaunch = () => {
    if (!goal.trim()) {
      return;
    }
    const constraints = constraintsInput
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const nextAgent = createAgent(goal, constraints);
    setAgent(nextAgent);
    setRunning(true);
  };

  const handlePause = () => setRunning(false);

  const handleResume = () => {
    if (agent && agent.status === "running") {
      setRunning(true);
    }
  };

  const handleStep = () => {
    setAgent((prev) => {
      if (!prev || prev.status !== "running") {
        return prev;
      }
      return advanceAgent(prev);
    });
  };

  const handleReset = () => {
    setAgent(null);
    setRunning(false);
  };

  const isComplete = agent?.status === "success";
  const canLaunch = goal.trim().length > 0;
  const canStep = Boolean(agent && agent.status === "running" && !running);
  const currentStep = agent ? activeStep(agent.plan) : undefined;

  const knowledgeSummaries = useMemo(() => {
    if (!agent) {
      return null;
    }
    const { knowledge } = agent;
    return [
      { title: "Focus areas", value: renderList(knowledge.focusAreas, "Not yet defined.") },
      { title: "Requirements", value: renderList(knowledge.requirements, "Draft in progress.") },
      { title: "Strategy notes", value: renderList(knowledge.strategy, "Execution pending refinement.") },
      { title: "Mitigations", value: renderList(knowledge.mitigations, "No risks resolved yet.") },
      { title: "Evidence", value: renderList(knowledge.evidence, "Evidence collection pending.") },
      { title: "Insights", value: renderList(knowledge.insights, "Insights will appear as the agent learns.") }
    ];
  }, [agent]);

  return (
    <main>
      <h1>Adaptive Goal Agent</h1>
      <p className="lead">
        Provide a goal and constraints. The agent will create a plan, act, evaluate, and adapt
        until it reaches completion.
      </p>

      <section className="field">
        <label htmlFor="goal">Goal</label>
        <textarea
          id="goal"
          placeholder="e.g., Launch a beta version of the productivity dashboard with stakeholder buy-in."
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
          rows={3}
        />
      </section>

      <section className="field">
        <label htmlFor="constraints">Constraints or context (one per line)</label>
        <textarea
          id="constraints"
          placeholder="e.g., Timeline limited to six weeks&#10;e.g., Customer data availability is uncertain"
          value={constraintsInput}
          onChange={(event) => setConstraintsInput(event.target.value)}
          rows={3}
        />
      </section>

      <div className="controls">
        {!agent && (
          <button onClick={handleLaunch} disabled={!canLaunch}>
            Run Agent
          </button>
        )}
        {agent && agent.status === "running" && !running && (
          <button onClick={handleResume}>Resume</button>
        )}
        {agent && agent.status === "running" && running && (
          <button className="secondary" onClick={handlePause}>
            Pause
          </button>
        )}
        {agent && agent.status === "running" && (
          <button className="secondary" onClick={handleStep} disabled={!canStep}>
            Step Once
          </button>
        )}
        {agent && (
          <button className="secondary" onClick={handleReset}>
            Reset
          </button>
        )}
      </div>

      {agent && (
        <div className="grid">
          <div className="card">
            <h2>Execution Status</h2>
            <div className={`status-chip ${statusLabel(agent)}`}>
              {statusLabel(agent)} • iteration {agent.iteration}
            </div>
            {currentStep ? (
              <p>
                Current focus: <strong>{currentStep.title}</strong>
              </p>
            ) : (
              <p className="empty">All actions completed.</p>
            )}
            {isComplete && <p>✅ Goal achieved. Review timeline for the journey.</p>}
          </div>

          <div className="card">
            <h2>Agent Memory</h2>
            {knowledgeSummaries?.map((entry) => (
              <div key={entry.title}>
                <strong>{entry.title}</strong>
                <p>{entry.value}</p>
              </div>
            ))}
          </div>

          <div className="card">
            <h2>Plan</h2>
            <ul className="plan-list">
              {agent.plan.map((step) => (
                <li key={step.id} className="plan-item">
                  <div className="meta">
                    <span className={`status-chip ${step.status}`}>{step.status}</span>
                    <span className={`badge ${step.kind}`}>{step.kind}</span>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                  <div className="attempts">Attempts: {step.attempts}</div>
                  {step.notes.length ? (
                    <ul className="notes">
                      {step.notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="empty">No insights yet.</p>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h2>Timeline</h2>
            <div className="timeline">
              {agent.events.map((event: AgentEvent) => (
                <div key={event.id} className="timeline-item">
                  <span>{formatTimestamp(event.timestamp)}</span>
                  <strong>{event.type}</strong>
                  <div>{event.message}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
