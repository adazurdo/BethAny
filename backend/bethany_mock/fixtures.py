from __future__ import annotations


def get_mock_events() -> list[dict[str, object]]:
    return [
        {
            "id": "event-1",
            "title": "Real Madrid vs Barcelona",
            "sport": "Football",
            "league": "LaLiga",
            "start_label": "Tonight 21:00",
            "featured": True,
        },
        {
            "id": "event-2",
            "title": "Carlos Alcaraz v Sinner",
            "sport": "Tennis",
            "league": "ATP Masters",
            "start_label": "Tomorrow 18:30",
            "featured": True,
        },
        {
            "id": "event-3",
            "title": "Lakers vs Celtics",
            "sport": "Basketball",
            "league": "NBA Finals",
            "start_label": "Friday 02:00",
            "featured": True,
        },
    ]


def get_mock_profile() -> dict[str, object]:
    return {
        "id": "profile-1",
        "display_name": "bethany_fox",
        "elo": 1768,
        "rank_label": "Prediction Captain",
        "win_rate": "68% win rate",
        "streak": "5 wins in a row",
    }


def get_mock_ranking() -> list[dict[str, object]]:
    return [
        {"id": "rank-1", "position": 1, "display_name": "Luna", "elo": 1842, "trend": "up", "badge": "Hot streak"},
        {"id": "rank-2", "position": 2, "display_name": "Maks", "elo": 1810, "trend": "stable", "badge": "All-rounder"},
        {"id": "rank-3", "position": 3, "display_name": "BethAny", "elo": 1796, "trend": "up", "badge": "Climbing"},
    ]


def get_mock_groups() -> list[dict[str, object]]:
    return [
        {"id": "group-1", "name": "Friday Legends", "member_count": 8, "owner_name": "Marta", "last_activity_label": "New picks for tonight", "score": 128},
        {"id": "group-2", "name": "LaLiga Crew", "member_count": 6, "owner_name": "Alex", "last_activity_label": "3 friends joined today", "score": 112},
    ]


def get_mock_friends() -> list[dict[str, object]]:
    return [
        {"id": "friend-1", "name": "Marta Ruiz", "sport_focus": "Football", "status": "online", "selected": True},
        {"id": "friend-2", "name": "Alex Vega", "sport_focus": "Basketball", "status": "busy", "selected": True},
        {"id": "friend-3", "name": "Nerea Polo", "sport_focus": "Tennis", "status": "online", "selected": False},
    ]
