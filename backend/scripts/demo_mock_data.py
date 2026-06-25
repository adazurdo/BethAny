from bethany_mock import build_global_ranking_summary, get_mock_events, get_mock_profile


def main() -> None:
    print("BethAny mock profile:", get_mock_profile())
    print("BethAny mock events:", len(get_mock_events()))
    print("BethAny ranking:", build_global_ranking_summary())


if __name__ == "__main__":
    main()
