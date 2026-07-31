from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, Query

from ..challenge_repository import head_to_head_counts
from ..session import require_session
from ..social_repository import (
    abort_prediction,
    add_prediction,
    cast_vote,
    create_group,
    friend_state,
    get_group,
    invite_member,
    list_groups_for_account,
    list_incoming_group_invites,
    mark_group_seen,
    remove_friend,
    resolve_prediction,
    respond_friend_request,
    respond_group_invite,
    search_accounts,
    send_friend_request,
    serialize_group_detail,
)

router = APIRouter()


def _friend_state_with_head_to_head(account_id: str) -> dict[str, Any]:
    """`friend_state` (social_repository) and `head_to_head_counts` (challenge_repository)
    are merged here rather than one module importing the other, to avoid a circular import
    (challenge_repository already depends on social_repository for `is_friend`)."""
    state = friend_state(account_id)
    counts = head_to_head_counts(account_id)
    for friend in state["friends"]:
        record = counts.get(friend["accountId"], {"wins": 0, "losses": 0})
        friend["challengeWins"] = record["wins"]
        friend["challengeLosses"] = record["losses"]
    return state


def _get_group_or_404(group_id: str):
    group = get_group(group_id)
    if group is None:
        raise HTTPException(status_code=404, detail="group not found")
    return group


# --- Friends -----------------------------------------------------------


@router.get("/social/friends")
def get_friends(account_id: str = Depends(require_session)) -> dict[str, Any]:
    return _friend_state_with_head_to_head(account_id)


@router.get("/social/friends/search")
def search_friends(
    account_id: str = Depends(require_session),
    q: str = Query(default=""),
) -> dict[str, Any]:
    return {"results": search_accounts(account_id, q)}


@router.post("/social/friends")
def request_friend(
    payload: dict[str, Any] = Body(default={}),
    account_id: str = Depends(require_session),
) -> dict[str, Any]:
    send_friend_request(account_id, str(payload.get("identifier", "")))
    return _friend_state_with_head_to_head(account_id)


@router.delete("/social/friends/{friend_account_id}")
def delete_friend(
    friend_account_id: str,
    account_id: str = Depends(require_session),
) -> dict[str, Any]:
    remove_friend(account_id, friend_account_id)
    return _friend_state_with_head_to_head(account_id)


@router.post("/social/friends/requests/{request_id}/accept")
def accept_friend_request(request_id: str, account_id: str = Depends(require_session)) -> dict[str, Any]:
    respond_friend_request(account_id, request_id, accept=True)
    return _friend_state_with_head_to_head(account_id)


@router.post("/social/friends/requests/{request_id}/reject")
def reject_friend_request(request_id: str, account_id: str = Depends(require_session)) -> dict[str, Any]:
    respond_friend_request(account_id, request_id, accept=False)
    return _friend_state_with_head_to_head(account_id)


# --- Groups --------------------------------------------------------------


@router.get("/social/groups")
def list_groups(account_id: str = Depends(require_session)) -> dict[str, Any]:
    return {"groups": list_groups_for_account(account_id)}


@router.get("/social/groups/invites")
def list_invites(account_id: str = Depends(require_session)) -> dict[str, Any]:
    return {"invites": list_incoming_group_invites(account_id)}


@router.post("/social/groups", status_code=201)
def create_new_group(
    payload: dict[str, Any] = Body(default={}),
    account_id: str = Depends(require_session),
) -> dict[str, Any]:
    group = create_group(account_id, str(payload.get("name", "")))
    return serialize_group_detail(group, account_id)


@router.get("/social/groups/{group_id}")
def get_group_detail(group_id: str, account_id: str = Depends(require_session)) -> dict[str, Any]:
    group = _get_group_or_404(group_id)
    detail = serialize_group_detail(group, account_id)
    if not any(member["accountId"] == account_id for member in detail["members"]):
        raise HTTPException(status_code=403, detail="requester is not a member of this group")
    mark_group_seen(account_id, group_id)
    return detail


@router.post("/social/groups/{group_id}/members")
def add_member(
    group_id: str,
    payload: dict[str, Any] = Body(default={}),
    account_id: str = Depends(require_session),
) -> dict[str, Any]:
    group = invite_member(group_id, account_id, str(payload.get("friendAccountId", "")))
    return serialize_group_detail(group, account_id)


@router.post("/social/groups/invites/{invite_id}/accept")
def accept_group_invite(invite_id: str, account_id: str = Depends(require_session)) -> dict[str, Any]:
    invite = respond_group_invite(account_id, invite_id, accept=True)
    group = get_group(invite.group_id)
    return serialize_group_detail(group, account_id)


@router.post("/social/groups/invites/{invite_id}/reject")
def reject_group_invite(invite_id: str, account_id: str = Depends(require_session)) -> dict[str, Any]:
    respond_group_invite(account_id, invite_id, accept=False)
    return {"ok": True}


@router.post("/social/groups/{group_id}/predictions", status_code=201)
def create_prediction(
    group_id: str,
    payload: dict[str, Any] = Body(default={}),
    account_id: str = Depends(require_session),
) -> dict[str, Any]:
    options = payload.get("options", [])
    add_prediction(
        group_id,
        account_id,
        str(payload.get("question", "")),
        [str(option) for option in options] if isinstance(options, list) else [],
        str(payload.get("closesAt", "")),
    )
    group = _get_group_or_404(group_id)
    return serialize_group_detail(group, account_id)


@router.post("/social/groups/{group_id}/predictions/{prediction_id}/votes")
def vote_prediction(
    group_id: str,
    prediction_id: str,
    payload: dict[str, Any] = Body(default={}),
    account_id: str = Depends(require_session),
) -> dict[str, Any]:
    cast_vote(group_id, prediction_id, account_id, str(payload.get("option", "")))
    group = _get_group_or_404(group_id)
    return serialize_group_detail(group, account_id)


@router.post("/social/groups/{group_id}/predictions/{prediction_id}/resolve")
def resolve_prediction_route(
    group_id: str,
    prediction_id: str,
    payload: dict[str, Any] = Body(default={}),
    account_id: str = Depends(require_session),
) -> dict[str, Any]:
    resolve_prediction(group_id, prediction_id, account_id, str(payload.get("option", "")))
    group = _get_group_or_404(group_id)
    return serialize_group_detail(group, account_id)


@router.post("/social/groups/{group_id}/predictions/{prediction_id}/abort")
def abort_prediction_route(
    group_id: str,
    prediction_id: str,
    account_id: str = Depends(require_session),
) -> dict[str, Any]:
    abort_prediction(group_id, prediction_id, account_id)
    group = _get_group_or_404(group_id)
    return serialize_group_detail(group, account_id)
