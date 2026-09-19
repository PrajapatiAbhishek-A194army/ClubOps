import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage
from langgraph.graph import END, StateGraph
from sqlalchemy.orm import Session

from app.ai.agent import SYSTEM_PROMPT, get_groq_agent_model
from app.tools.backend_tools import ClubOpsTools
from app.workflows.state import WorkflowState

logger = logging.getLogger(__name__)


def build_event_operations_workflow(tools_instance: ClubOpsTools):
    """
    Builds a LangGraph StateGraph workflow engine bound to backend tools.
    Transitions:
    NEW -> AI_PROCESSED -> TASKS_CREATED -> ASSIGNED -> IN_PROGRESS -> COMPLETED
    """
    tools = tools_instance.get_langchain_tools()
    tool_map = {t.name: t for t in tools}

    try:
        llm = get_groq_agent_model(temperature=0.1)
        llm_with_tools = llm.bind_tools(tools)
    except Exception as e:
        logger.warning(f"Could not bind ChatGroq: {e}. Falling back to deterministic mode.")
        llm_with_tools = None

    def agent_node(state: WorkflowState) -> Dict[str, Any]:
        """Node 1: Evaluates state and generates tool call requests or conclusions."""
        messages = list(state.get("messages", []))
        if not messages:
            messages = [
                SystemMessage(content=SYSTEM_PROMPT),
                HumanMessage(content=state["input_text"]),
            ]

        if llm_with_tools:
            try:
                response = llm_with_tools.invoke(messages)
                new_stage = "AI_PROCESSED" if state.get("current_stage") == "NEW" else state.get("current_stage")
                return {
                    "messages": [response],
                    "current_stage": new_stage,
                }
            except Exception as e:
                logger.error(f"LLM agent invocation failed: {e}")

        # Deterministic extraction fallback if LLM offline
        return _deterministic_agent_fallback(state, tools_instance)

    def tool_execution_node(state: WorkflowState) -> Dict[str, Any]:
        """Node 2: Executes allowlisted backend tools in sequence."""
        messages = state["messages"]
        last_message = messages[-1]

        tool_messages = []
        extracted_tasks = list(state.get("extracted_tasks", []))
        assigned_volunteers = list(state.get("assigned_volunteers", []))
        current_stage = state.get("current_stage", "AI_PROCESSED")

        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            for tc in last_message.tool_calls:
                t_name = tc["name"]
                t_args = tc["args"]
                tool_fn = tool_map.get(t_name)

                if tool_fn:
                    try:
                        res = tool_fn.invoke(t_args)
                        if t_name == "createTask" and isinstance(res, dict) and res.get("success"):
                            extracted_tasks.append(res)
                            current_stage = "TASKS_CREATED"
                        elif t_name == "assignVolunteer" and isinstance(res, dict) and res.get("success"):
                            assigned_volunteers.append(res)
                            current_stage = "ASSIGNED"
                    except Exception as err:
                        res = {"error": str(err)}
                else:
                    res = {"error": f"Tool '{t_name}' not allowlisted"}

                tool_messages.append(
                    ToolMessage(
                        tool_call_id=tc["id"],
                        name=t_name,
                        content=json.dumps(res),
                    )
                )

        return {
            "messages": tool_messages,
            "extracted_tasks": extracted_tasks,
            "assigned_volunteers": assigned_volunteers,
            "current_stage": current_stage,
        }

    def should_continue(state: WorkflowState) -> str:
        """Conditional routing: continue to tools or complete workflow."""
        messages = state.get("messages", [])
        if not messages:
            return "end"

        last_message = messages[-1]
        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            return "tools"
        return "end"

    def finalize_node(state: WorkflowState) -> Dict[str, Any]:
        """Final node: Synthesizes execution trace and transitions to COMPLETED."""
        messages = state.get("messages", [])
        summary = ""
        for m in reversed(messages):
            if isinstance(m, AIMessage) and m.content and not m.tool_calls:
                summary = str(m.content)
                break

        if not summary:
            created_cnt = len(state.get("extracted_tasks", []))
            assigned_cnt = len(state.get("assigned_volunteers", []))
            summary = (
                f"Workflow execution completed successfully: {created_cnt} task(s) created and "
                f"{assigned_cnt} volunteer(s) assigned with notification dispatch."
            )

        return {
            "current_stage": "COMPLETED",
            "audit_trail": tools_instance.call_audit_log,
            "final_summary": summary,
        }

    # Assemble LangGraph
    graph = StateGraph(WorkflowState)
    graph.add_node("agent", agent_node)
    graph.add_node("tools", tool_execution_node)
    graph.add_node("finalize", finalize_node)

    graph.set_entry_point("agent")
    graph.add_conditional_edges(
        "agent",
        should_continue,
        {
            "tools": "tools",
            "end": "finalize",
        },
    )
    graph.add_edge("tools", "agent")
    graph.add_edge("finalize", END)

    return graph.compile()


def _deterministic_agent_fallback(state: WorkflowState, tools: ClubOpsTools) -> Dict[str, Any]:
    """
    Intelligent NLP regex fallback that identifies person names, tasks,
    and creates them via backend tools even if Groq API is offline.
    """
    text = state["input_text"]
    extracted_tasks = []
    assigned_volunteers = []

    # Check for known action keywords
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    for line in lines:
        # Match pattern: "[Name] [action] before/by [date]"
        words = line.split()
        if len(words) >= 3:
            first_word = words[0].strip(":,-")
            user_info = tools.get_user(first_word)

            due_date = None
            if "friday" in line.lower():
                today = datetime.utcnow()
                days_ahead = (4 - today.weekday() + 7) % 7 or 7
                due_date = (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")

            task_res = tools.create_task(
                title=line,
                description=f"Generated from meeting operational directive: '{line}'",
                priority="HIGH" if any(w in line.lower() for w in ["urgent", "asap", "critical"]) else "MEDIUM",
                due_date=due_date,
            )
            extracted_tasks.append(task_res)

            if user_info.get("found"):
                assign_res = tools.assign_volunteer(task_res["task_id"], user_info["user_id"])
                assigned_volunteers.append(assign_res)

    ai_msg = AIMessage(
        content=(
            f"Processed directive into {len(extracted_tasks)} operational task(s) on the board. "
            f"Mapped {len(assigned_volunteers)} assignments to club volunteers."
        )
    )
    return {
        "messages": [ai_msg],
        "extracted_tasks": extracted_tasks,
        "assigned_volunteers": assigned_volunteers,
        "current_stage": "COMPLETED",
    }


class WorkflowExecutionService:
    """Service orchestrating execution of the LangGraph event operations workflow."""

    @staticmethod
    def execute_workflow(
        db: Session,
        club_id: str,
        actor_id: str,
        input_text: str,
        event_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        tools_instance = ClubOpsTools(db=db, club_id=club_id, actor_id=actor_id)
        compiled_graph = build_event_operations_workflow(tools_instance)

        initial_state: WorkflowState = {
            "messages": [],
            "club_id": club_id,
            "actor_id": actor_id,
            "event_id": event_id,
            "input_text": input_text,
            "current_stage": "NEW",
            "extracted_tasks": [],
            "assigned_volunteers": [],
            "detected_risks": [],
            "audit_trail": [],
            "final_summary": "",
        }

        final_state = compiled_graph.invoke(initial_state)

        return {
            "club_id": club_id,
            "current_stage": final_state.get("current_stage", "COMPLETED"),
            "extracted_tasks": final_state.get("extracted_tasks", []),
            "assigned_volunteers": final_state.get("assigned_volunteers", []),
            "audit_trail": tools_instance.call_audit_log,
            "final_summary": final_state.get("final_summary", ""),
        }
