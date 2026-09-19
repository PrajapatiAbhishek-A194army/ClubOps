from typing import Annotated, Any, Dict, List, Optional
from typing_extensions import TypedDict
from langgraph.graph.message import add_messages


class WorkflowState(TypedDict):
    """
    State managed across LangGraph workflow nodes.
    Follows strict operational progression:
    NEW -> AI_PROCESSED -> TASKS_CREATED -> ASSIGNED -> IN_PROGRESS -> COMPLETED -> KNOWLEDGE_ARCHIVED
    """
    messages: Annotated[List[Any], add_messages]
    club_id: str
    actor_id: str
    event_id: Optional[str]
    input_text: str
    current_stage: str
    extracted_tasks: List[Dict[str, Any]]
    assigned_volunteers: List[Dict[str, Any]]
    detected_risks: List[Dict[str, Any]]
    audit_trail: List[Dict[str, Any]]
    final_summary: str
