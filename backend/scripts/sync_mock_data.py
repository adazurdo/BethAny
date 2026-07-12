import os
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from bethany_mock import CONFIGURED_COMPETITIONS, initialize_mock_dataset_repository, sync_competition


def main() -> None:
    if not os.getenv("FOOTBALL_DATA_API_TOKEN"):
        print("FOOTBALL_DATA_API_TOKEN no esta configurado; los sync fallaran y se conservara el ultimo snapshot local.")

    initialize_mock_dataset_repository()
    for source in CONFIGURED_COMPETITIONS:
        result = sync_competition(source.code)
        if result["ok"]:
            snapshot = result["snapshot"]
            print(f"[ok] {source.display_name}: v{snapshot.version} con {len(snapshot.teams)} equipos y {len(snapshot.matches)} partidos mock")
        else:
            print(f"[fallo] {source.display_name}: {result['error']}")


if __name__ == "__main__":
    main()
