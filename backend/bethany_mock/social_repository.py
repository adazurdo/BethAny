from __future__ import annotations

import uuid
from datetime import datetime, timezone

from .account_repository import get_account_by_id, get_account_by_identifier
from .database import dumps, fetch_one, get_connection, initialize_database, loads
from .models import CustomPrediction, FriendRequest, GroupInvite, GroupMembership, PredictionGroup, PredictionVote


class ConflictError(RuntimeError):
    """Raised when an operation would create a duplicate social relationship."""


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_timestamp(value: str) -> datetime:
    try:
        parsed = datetime.fromisoformat(value)
    except (TypeError, ValueError) as exc:
        raise ValueError("invalid timestamp") from exc
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def initialize_repository() -> None:
    initialize_database()


# --- Friend requests -------------------------------------------------------


def _row_to_friend_request(row) -> FriendRequest:
    return FriendRequest(
        id=row["id"],
        requester_account_id=row["requester_account_id"],
        target_account_id=row["target_account_id"],
        status=row["status"],
        created_at=row["created_at"],
        responded_at=row["responded_at"],
    )


def _find_request_between(account_a: str, account_b: str) -> FriendRequest | None:
    with get_connection() as connection:
        row = fetch_one(
            connection,
            """
            SELECT * FROM friend_requests
            WHERE status != 'rejected'
              AND ((requester_account_id = ? AND target_account_id = ?)
                OR (requester_account_id = ? AND target_account_id = ?))
            """,
            (account_a, account_b, account_b, account_a),
        )
    return _row_to_friend_request(row) if row else None


def get_friend_request(request_id: str) -> FriendRequest | None:
    with get_connection() as connection:
        row = fetch_one(connection, "SELECT * FROM friend_requests WHERE id = ?", (request_id,))
    return _row_to_friend_request(row) if row else None


def send_friend_request(requester_account_id: str, identifier: str) -> None:
    requester = get_account_by_id(requester_account_id)
    if requester is None:
        raise LookupError("account not found")

    cleaned_identifier = identifier.strip().lower()
    if not cleaned_identifier:
        raise ValueError("identifier is required")

    target = get_account_by_identifier(cleaned_identifier)
    if target is None:
        raise LookupError("account not found")
    if target.id == requester.id:
        raise ValueError("cannot send a friend request to yourself")
    if _find_request_between(requester.id, target.id) is not None:
        raise ConflictError("a friend request or friendship already exists between these accounts")

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO friend_requests (id, requester_account_id, target_account_id, status, created_at)
            VALUES (?, ?, ?, 'pending', ?)
            """,
            (_new_id("freq"), requester.id, target.id, _utcnow()),
        )
        connection.commit()


def respond_friend_request(account_id: str, request_id: str, accept: bool) -> None:
    request = get_friend_request(request_id)
    if request is None:
        raise LookupError("friend request not found")
    if request.target_account_id != account_id:
        raise PermissionError("this request is not addressed to you")
    if request.status != "pending":
        raise ConflictError("this request is no longer pending")

    new_status = "accepted" if accept else "rejected"
    with get_connection() as connection:
        connection.execute(
            "UPDATE friend_requests SET status = ?, responded_at = ? WHERE id = ?",
            (new_status, _utcnow(), request.id),
        )
        connection.commit()


def list_friends(account_id: str) -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT * FROM friend_requests
            WHERE status = 'accepted' AND (requester_account_id = ? OR target_account_id = ?)
            """,
            (account_id, account_id),
        ).fetchall()
    resolved: list[dict] = []
    for row in rows:
        request = _row_to_friend_request(row)
        other_id = request.target_account_id if request.requester_account_id == account_id else request.requester_account_id
        other_account = get_account_by_id(other_id)
        if other_account is None:
            continue
        resolved.append(
            {
                "requestId": request.id,
                "accountId": other_account.id,
                "displayName": other_account.profile.display_name,
                "avatarUrl": other_account.profile.avatar_url,
                "elo": other_account.profile.elo,
            }
        )
    return resolved


def list_incoming_requests(account_id: str) -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM friend_requests WHERE status = 'pending' AND target_account_id = ?",
            (account_id,),
        ).fetchall()
    resolved: list[dict] = []
    for row in rows:
        request = _row_to_friend_request(row)
        requester_account = get_account_by_id(request.requester_account_id)
        if requester_account is None:
            continue
        resolved.append(
            {
                "id": request.id,
                "accountId": requester_account.id,
                "displayName": requester_account.profile.display_name,
                "avatarUrl": requester_account.profile.avatar_url,
                "elo": requester_account.profile.elo,
            }
        )
    return resolved


def list_outgoing_requests(account_id: str) -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM friend_requests WHERE status = 'pending' AND requester_account_id = ?",
            (account_id,),
        ).fetchall()
    resolved: list[dict] = []
    for row in rows:
        request = _row_to_friend_request(row)
        target_account = get_account_by_id(request.target_account_id)
        if target_account is None:
            continue
        resolved.append(
            {
                "id": request.id,
                "accountId": target_account.id,
                "displayName": target_account.profile.display_name,
                "avatarUrl": target_account.profile.avatar_url,
                "elo": target_account.profile.elo,
            }
        )
    return resolved


def friend_state(account_id: str) -> dict:
    return {
        "friends": list_friends(account_id),
        "incomingRequests": list_incoming_requests(account_id),
        "outgoingRequests": list_outgoing_requests(account_id),
    }


def is_friend(account_id: str, other_account_id: str) -> bool:
    with get_connection() as connection:
        row = fetch_one(
            connection,
            """
            SELECT 1 FROM friend_requests
            WHERE status = 'accepted'
              AND ((requester_account_id = ? AND target_account_id = ?)
                OR (requester_account_id = ? AND target_account_id = ?))
            """,
            (account_id, other_account_id, other_account_id, account_id),
        )
    return row is not None


def remove_friend(account_id: str, friend_account_id: str) -> None:
    with get_connection() as connection:
        cursor = connection.execute(
            """
            DELETE FROM friend_requests
            WHERE status = 'accepted'
              AND ((requester_account_id = ? AND target_account_id = ?)
                OR (requester_account_id = ? AND target_account_id = ?))
            """,
            (account_id, friend_account_id, friend_account_id, account_id),
        )
        connection.commit()
        if cursor.rowcount == 0:
            raise LookupError("friend not found")


# --- Prediction groups -------------------------------------------------------


def _row_to_group(row) -> PredictionGroup:
    return PredictionGroup(id=row["id"], name=row["name"], owner_account_id=row["owner_account_id"], created_at=row["created_at"])


def get_group(group_id: str) -> PredictionGroup | None:
    with get_connection() as connection:
        row = fetch_one(connection, "SELECT * FROM prediction_groups WHERE id = ?", (group_id,))
    return _row_to_group(row) if row else None


def list_memberships(group_id: str) -> list[GroupMembership]:
    with get_connection() as connection:
        rows = connection.execute("SELECT * FROM group_memberships WHERE group_id = ?", (group_id,)).fetchall()
    return [
        GroupMembership(id=row["id"], group_id=row["group_id"], account_id=row["account_id"], joined_at=row["joined_at"])
        for row in rows
    ]


def is_member(group_id: str, account_id: str) -> bool:
    return any(membership.account_id == account_id for membership in list_memberships(group_id))


def create_group(owner_account_id: str, name: str) -> PredictionGroup:
    cleaned_name = name.strip()
    if not cleaned_name:
        raise ValueError("group name is required")

    now = _utcnow()
    group = PredictionGroup(id=_new_id("group"), name=cleaned_name, owner_account_id=owner_account_id, created_at=now)
    with get_connection() as connection:
        connection.execute(
            "INSERT INTO prediction_groups (id, name, owner_account_id, created_at) VALUES (?, ?, ?, ?)",
            (group.id, group.name, group.owner_account_id, group.created_at),
        )
        connection.execute(
            "INSERT INTO group_memberships (id, group_id, account_id, joined_at) VALUES (?, ?, ?, ?)",
            (_new_id("member"), group.id, owner_account_id, now),
        )
        connection.commit()
    return group


def list_groups_for_account(account_id: str) -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT g.* FROM prediction_groups g
            JOIN group_memberships m ON m.group_id = g.id
            WHERE m.account_id = ?
            ORDER BY g.created_at
            """,
            (account_id,),
        ).fetchall()
    groups = [_row_to_group(row) for row in rows]
    return [
        {
            "id": group.id,
            "name": group.name,
            "ownerAccountId": group.owner_account_id,
            "memberCount": len(list_memberships(group.id)),
            "createdAt": group.created_at,
        }
        for group in groups
    ]


# --- Group invites -------------------------------------------------------


def _row_to_invite(row) -> GroupInvite:
    return GroupInvite(
        id=row["id"],
        group_id=row["group_id"],
        inviter_account_id=row["inviter_account_id"],
        invitee_account_id=row["invitee_account_id"],
        status=row["status"],
        created_at=row["created_at"],
        responded_at=row["responded_at"],
    )


def get_invite(invite_id: str) -> GroupInvite | None:
    with get_connection() as connection:
        row = fetch_one(connection, "SELECT * FROM group_invites WHERE id = ?", (invite_id,))
    return _row_to_invite(row) if row else None


def _find_pending_invite(group_id: str, invitee_account_id: str) -> GroupInvite | None:
    with get_connection() as connection:
        row = fetch_one(
            connection,
            "SELECT * FROM group_invites WHERE group_id = ? AND invitee_account_id = ? AND status = 'pending'",
            (group_id, invitee_account_id),
        )
    return _row_to_invite(row) if row else None


def list_pending_invites_for_group(group_id: str) -> list[GroupInvite]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM group_invites WHERE group_id = ? AND status = 'pending'",
            (group_id,),
        ).fetchall()
    return [_row_to_invite(row) for row in rows]


def list_incoming_group_invites(account_id: str) -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM group_invites WHERE invitee_account_id = ? AND status = 'pending'",
            (account_id,),
        ).fetchall()
    resolved: list[dict] = []
    for row in rows:
        invite = _row_to_invite(row)
        group = get_group(invite.group_id)
        inviter = get_account_by_id(invite.inviter_account_id)
        if group is None or inviter is None:
            continue
        resolved.append(
            {
                "id": invite.id,
                "groupId": group.id,
                "groupName": group.name,
                "inviterAccountId": inviter.id,
                "inviterDisplayName": inviter.profile.display_name,
                "createdAt": invite.created_at,
            }
        )
    return resolved


def invite_member(group_id: str, requester_account_id: str, friend_account_id: str) -> PredictionGroup:
    group = get_group(group_id)
    if group is None:
        raise LookupError("group not found")
    if not is_member(group_id, requester_account_id):
        raise PermissionError("requester is not a member of this group")
    if not is_friend(requester_account_id, friend_account_id):
        raise ValueError("account is not a friend of the requester")
    if get_account_by_id(friend_account_id) is None:
        raise LookupError("friend account not found")
    if is_member(group_id, friend_account_id):
        raise ConflictError("account already a member of this group")
    if _find_pending_invite(group_id, friend_account_id) is not None:
        raise ConflictError("account already has a pending invite to this group")

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO group_invites (id, group_id, inviter_account_id, invitee_account_id, status, created_at)
            VALUES (?, ?, ?, ?, 'pending', ?)
            """,
            (_new_id("ginv"), group_id, requester_account_id, friend_account_id, _utcnow()),
        )
        connection.commit()
    return group


def respond_group_invite(account_id: str, invite_id: str, accept: bool) -> GroupInvite:
    invite = get_invite(invite_id)
    if invite is None:
        raise LookupError("invite not found")
    if invite.invitee_account_id != account_id:
        raise PermissionError("this invite is not addressed to you")
    if invite.status != "pending":
        raise ConflictError("this invite is no longer pending")

    new_status = "accepted" if accept else "rejected"
    with get_connection() as connection:
        connection.execute(
            "UPDATE group_invites SET status = ?, responded_at = ? WHERE id = ?",
            (new_status, _utcnow(), invite.id),
        )
        if accept:
            connection.execute(
                "INSERT INTO group_memberships (id, group_id, account_id, joined_at) VALUES (?, ?, ?, ?)",
                (_new_id("member"), invite.group_id, account_id, _utcnow()),
            )
        connection.commit()
    return invite


# --- Custom predictions and votes -------------------------------------------------------


def _row_to_prediction(row) -> CustomPrediction:
    return CustomPrediction(
        id=row["id"],
        group_id=row["group_id"],
        created_by_account_id=row["created_by_account_id"],
        question=row["question"],
        options=loads(row["options_json"]),
        created_at=row["created_at"],
        closes_at=row["closes_at"],
        status=row["status"],
        resolved_option=row["resolved_option"],
        resolved_at=row["resolved_at"],
    )


def list_predictions(group_id: str) -> list[CustomPrediction]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM custom_predictions WHERE group_id = ? ORDER BY created_at",
            (group_id,),
        ).fetchall()
    return [_row_to_prediction(row) for row in rows]


def get_prediction(prediction_id: str) -> CustomPrediction | None:
    with get_connection() as connection:
        row = fetch_one(connection, "SELECT * FROM custom_predictions WHERE id = ?", (prediction_id,))
    return _row_to_prediction(row) if row else None


def add_prediction(
    group_id: str, requester_account_id: str, question: str, options: list[str], closes_at: str
) -> CustomPrediction:
    group = get_group(group_id)
    if group is None:
        raise LookupError("group not found")
    if not is_member(group_id, requester_account_id):
        raise PermissionError("requester is not a member of this group")

    cleaned_question = question.strip()
    cleaned_options = [option.strip() for option in options if option.strip()]
    if not cleaned_question or len(cleaned_options) < 2:
        raise ValueError("question and at least two options are required")

    now = _utcnow()
    closes_at_dt = _parse_timestamp(closes_at)
    if closes_at_dt <= _parse_timestamp(now):
        raise ValueError("closesAt must be a future date")

    prediction = CustomPrediction(
        id=_new_id("pred"),
        group_id=group_id,
        created_by_account_id=requester_account_id,
        question=cleaned_question,
        options=cleaned_options,
        created_at=now,
        closes_at=closes_at_dt.isoformat(),
        status="open",
    )
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO custom_predictions
                (id, group_id, created_by_account_id, question, options_json, created_at, closes_at, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'open')
            """,
            (
                prediction.id,
                prediction.group_id,
                prediction.created_by_account_id,
                prediction.question,
                dumps(prediction.options),
                prediction.created_at,
                prediction.closes_at,
            ),
        )
        connection.commit()
    return prediction


def resolve_prediction(group_id: str, prediction_id: str, requester_account_id: str, option: str) -> CustomPrediction:
    prediction = get_prediction(prediction_id)
    if prediction is None or prediction.group_id != group_id:
        raise LookupError("prediction not found")
    if prediction.created_by_account_id != requester_account_id:
        raise PermissionError("only the prediction's author can resolve it")
    if prediction.status != "open":
        raise ConflictError("this prediction is no longer open")
    if option not in prediction.options:
        raise ValueError("option is not part of this prediction")

    now = _utcnow()
    with get_connection() as connection:
        connection.execute(
            "UPDATE custom_predictions SET status = 'resolved', resolved_option = ?, resolved_at = ? WHERE id = ?",
            (option, now, prediction.id),
        )
        connection.commit()
    return get_prediction(prediction_id)


def abort_prediction(group_id: str, prediction_id: str, requester_account_id: str) -> CustomPrediction:
    prediction = get_prediction(prediction_id)
    if prediction is None or prediction.group_id != group_id:
        raise LookupError("prediction not found")
    if prediction.created_by_account_id != requester_account_id:
        raise PermissionError("only the prediction's author can abort it")
    if prediction.status != "open":
        raise ConflictError("this prediction is no longer open")

    now = _utcnow()
    with get_connection() as connection:
        connection.execute(
            "UPDATE custom_predictions SET status = 'aborted', resolved_at = ? WHERE id = ?",
            (now, prediction.id),
        )
        connection.commit()
    return get_prediction(prediction_id)


def list_votes(prediction_id: str) -> list[PredictionVote]:
    with get_connection() as connection:
        rows = connection.execute("SELECT * FROM prediction_votes WHERE prediction_id = ?", (prediction_id,)).fetchall()
    return [
        PredictionVote(
            id=row["id"],
            prediction_id=row["prediction_id"],
            account_id=row["account_id"],
            option=row["option"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
        for row in rows
    ]


def cast_vote(group_id: str, prediction_id: str, requester_account_id: str, option: str) -> None:
    if not is_member(group_id, requester_account_id):
        raise PermissionError("requester is not a member of this group")
    prediction = get_prediction(prediction_id)
    if prediction is None or prediction.group_id != group_id:
        raise LookupError("prediction not found")
    if option not in prediction.options:
        raise ValueError("option is not part of this prediction")

    now = _utcnow()
    if prediction.status != "open" or _parse_timestamp(now) >= _parse_timestamp(prediction.closes_at):
        raise ConflictError("this prediction is no longer open to votes")

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO prediction_votes (id, prediction_id, account_id, option, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(prediction_id, account_id) DO UPDATE SET
                option = excluded.option,
                updated_at = excluded.updated_at
            """,
            (_new_id("vote"), prediction_id, requester_account_id, option, now, now),
        )
        connection.commit()


# --- Serialization -------------------------------------------------------


def serialize_group_detail(group: PredictionGroup, requester_account_id: str) -> dict:
    members = []
    for membership in list_memberships(group.id):
        member_account = get_account_by_id(membership.account_id)
        if member_account is None:
            continue
        members.append(
            {
                "accountId": member_account.id,
                "displayName": member_account.profile.display_name,
                "elo": member_account.profile.elo,
            }
        )

    pending_invites = []
    for invite in list_pending_invites_for_group(group.id):
        invitee = get_account_by_id(invite.invitee_account_id)
        if invitee is None:
            continue
        pending_invites.append({"id": invite.id, "accountId": invitee.id, "displayName": invitee.profile.display_name})

    correct_counts = {member["accountId"]: 0 for member in members}
    predictions = []
    for prediction in list_predictions(group.id):
        votes = list_votes(prediction.id)
        tally = {option: 0 for option in prediction.options}
        my_vote = None
        for vote in votes:
            if vote.option in tally:
                tally[vote.option] += 1
            if vote.account_id == requester_account_id:
                my_vote = vote.option
            if (
                prediction.status == "resolved"
                and vote.option == prediction.resolved_option
                and vote.account_id in correct_counts
            ):
                correct_counts[vote.account_id] += 1
        predictions.append(
            {
                "id": prediction.id,
                "question": prediction.question,
                "options": prediction.options,
                "createdByAccountId": prediction.created_by_account_id,
                "createdAt": prediction.created_at,
                "closesAt": prediction.closes_at,
                "status": prediction.status,
                "resolvedOption": prediction.resolved_option,
                "resolvedAt": prediction.resolved_at,
                "votes": tally,
                "totalVotes": len(votes),
                "myVote": my_vote,
            }
        )

    ranking = sorted(
        (
            {"accountId": member["accountId"], "displayName": member["displayName"], "correctCount": correct_counts[member["accountId"]]}
            for member in members
        ),
        key=lambda entry: (-entry["correctCount"], entry["displayName"].lower()),
    )

    return {
        "id": group.id,
        "name": group.name,
        "ownerAccountId": group.owner_account_id,
        "createdAt": group.created_at,
        "members": members,
        "ranking": ranking,
        "pendingInvites": pending_invites,
        "predictions": predictions,
    }
