import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Icon } from "./Icon";
import { Tappable } from "./Tappable";
import { accentForKey, colors, radii, shadows, spacing } from "../theme";
import { BetOutcome } from "../data/bets";
import { ChallengeType, createCustomChallenge, createMatchChallenge } from "../data/challenges";
import { CompetitionSource, MockCompetitionMatch, fetchMockCompetitionMatches, fetchMockCompetitions } from "../data/mockCompetitions";
import { SocialFriend } from "../data/social";

const OUTCOME_OPTIONS: { value: BetOutcome; label: string }[] = [
  { value: "local", label: "Local" },
  { value: "empate", label: "Empate" },
  { value: "visitante", label: "Visitante" },
];

const TYPE_OPTIONS: { value: ChallengeType; label: string; icon: string }[] = [
  { value: "match", label: "Partido oficial", icon: "matches" },
  { value: "custom", label: "Apuesta personalizada", icon: "sparkles" },
];

type ChallengeModalProps = {
  visible: boolean;
  friends: SocialFriend[];
  onClose: () => void;
  onCreated: () => void;
};

export function ChallengeModal({ visible, friends, onClose, onCreated }: ChallengeModalProps) {
  const [mode, setMode] = useState<ChallengeType>("match");
  const [opponentId, setOpponentId] = useState<string | null>(null);

  // Match mode
  const [competitions, setCompetitions] = useState<CompetitionSource[]>([]);
  const [competitionCode, setCompetitionCode] = useState<string | null>(null);
  const [matches, setMatches] = useState<MockCompetitionMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<BetOutcome | null>(null);

  // Custom mode
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [pickedOption, setPickedOption] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible || mode !== "match") return;
    fetchMockCompetitions()
      .then(setCompetitions)
      .catch(() => setCompetitions([]));
  }, [visible, mode]);

  useEffect(() => {
    if (!competitionCode) {
      setMatches([]);
      return;
    }
    setLoadingMatches(true);
    fetchMockCompetitionMatches(competitionCode)
      .then((result) => setMatches(result.matches.filter((match) => match.status === "scheduled" || match.status === "timed")))
      .catch(() => setMatches([]))
      .finally(() => setLoadingMatches(false));
  }, [competitionCode]);

  const filledOptions = options.map((option) => option.trim()).filter(Boolean);

  function reset() {
    setMode("match");
    setOpponentId(null);
    setCompetitionCode(null);
    setMatches([]);
    setMatchId(null);
    setOutcome(null);
    setTitle("");
    setOptions(["", ""]);
    setPickedOption(null);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function switchMode(nextMode: ChallengeType) {
    setMode(nextMode);
    setError(null);
  }

  function updateOption(index: number, value: string) {
    setOptions((current) => current.map((option, i) => (i === index ? value : option)));
    setPickedOption(null);
  }

  function addOptionField() {
    setOptions((current) => [...current, ""]);
  }

  function removeOptionField(index: number) {
    setOptions((current) => current.filter((_, i) => i !== index));
    setPickedOption(null);
  }

  async function handleSubmit() {
    if (!opponentId) {
      setError("Elige a que amigo retas.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (mode === "match") {
        if (!matchId || !outcome) {
          setError("Elige un partido y un resultado.");
          return;
        }
        await createMatchChallenge(opponentId, matchId, outcome);
      } else {
        if (!title.trim()) {
          setError("Ponle un titulo a la apuesta.");
          return;
        }
        if (filledOptions.length < 2) {
          setError("Necesitas al menos dos opciones.");
          return;
        }
        if (!pickedOption) {
          setError("Elige por cual opcion apuestas tu.");
          return;
        }
        await createCustomChallenge(opponentId, title.trim(), filledOptions, pickedOption);
      }
      reset();
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el reto.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Icon glyph="challenge" size={20} color={colors.primary} />
            <Text style={styles.title}>Nuevo reto</Text>
          </View>
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            <Text style={styles.sectionLabel}>Amigo</Text>
            <View style={styles.pillRow}>
              {friends.length === 0 ? <Text style={styles.emptyText}>Necesitas al menos un amigo para retarle.</Text> : null}
              {friends.map((friend) => {
                const isSelected = opponentId === friend.accountId;
                const accent = accentForKey(friend.accountId);
                return (
                  <Tappable
                    key={friend.accountId}
                    onPress={() => setOpponentId(friend.accountId)}
                    style={[styles.pill, { borderColor: isSelected ? colors.primary : accent }, isSelected ? styles.pillActive : null]}
                  >
                    {isSelected ? <Icon glyph="check" size={13} color={colors.background} /> : null}
                    <Text style={[styles.pillText, isSelected ? styles.pillTextActive : null]}>{friend.displayName}</Text>
                  </Tappable>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>Tipo de reto</Text>
            <View style={styles.pillRow}>
              {TYPE_OPTIONS.map((option) => {
                const isSelected = mode === option.value;
                return (
                  <Tappable
                    key={option.value}
                    onPress={() => switchMode(option.value)}
                    style={[styles.pill, isSelected ? styles.pillActive : null]}
                  >
                    <Icon glyph={option.icon} size={14} color={isSelected ? colors.background : colors.accent} />
                    <Text style={[styles.pillText, isSelected ? styles.pillTextActive : null]}>{option.label}</Text>
                  </Tappable>
                );
              })}
            </View>

            {mode === "match" ? (
              <>
                <Text style={styles.sectionLabel}>Competicion</Text>
                <View style={styles.pillRow}>
                  {competitions.map((competition) => {
                    const isSelected = competitionCode === competition.code;
                    return (
                      <Tappable
                        key={competition.code}
                        onPress={() => {
                          setCompetitionCode(competition.code);
                          setMatchId(null);
                          setOutcome(null);
                        }}
                        style={[styles.pill, isSelected ? styles.pillActive : null]}
                      >
                        {isSelected ? <Icon glyph="check" size={13} color={colors.background} /> : null}
                        <Text style={[styles.pillText, isSelected ? styles.pillTextActive : null]}>{competition.displayName}</Text>
                      </Tappable>
                    );
                  })}
                </View>

                {competitionCode ? (
                  <>
                    <Text style={styles.sectionLabel}>Partido y resultado</Text>
                    {loadingMatches ? <ActivityIndicator color={colors.primary} /> : null}
                    {!loadingMatches && matches.length === 0 ? (
                      <Text style={styles.emptyText}>No hay partidos abiertos a apuestas en esta competicion.</Text>
                    ) : null}
                    {matches.map((match) => (
                      <View key={match.id} style={styles.matchCard}>
                        <Text style={styles.matchTitle} numberOfLines={1}>
                          {match.homeTeamName} vs {match.awayTeamName}
                        </Text>
                        <Text style={styles.matchMeta}>{match.kickoffLabel}</Text>
                        <View style={styles.outcomeRow}>
                          {OUTCOME_OPTIONS.map((option) => {
                            const isSelected = matchId === match.id && outcome === option.value;
                            return (
                              <Tappable
                                key={option.value}
                                onPress={() => {
                                  setMatchId(match.id);
                                  setOutcome(option.value);
                                }}
                                style={[styles.outcomeButton, isSelected ? styles.outcomeButtonActive : null]}
                              >
                                {isSelected ? <Icon glyph="check" size={12} color={colors.background} /> : null}
                                <Text style={[styles.outcomeText, isSelected ? styles.outcomeTextActive : null]}>{option.label}</Text>
                              </Tappable>
                            );
                          })}
                        </View>
                      </View>
                    ))}
                  </>
                ) : null}
              </>
            ) : (
              <>
                <Text style={styles.sectionLabel}>Titulo de la apuesta</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. Quien pierde paga la cena"
                  placeholderTextColor={colors.muted}
                  value={title}
                  onChangeText={setTitle}
                  returnKeyType="done"
                  onSubmitEditing={() => handleSubmit()}
                />

                <Text style={styles.sectionLabel}>Opciones</Text>
                {options.map((option, index) => (
                  <View key={index} style={styles.optionRow}>
                    <TextInput
                      style={[styles.input, styles.optionInput]}
                      placeholder={`Opcion ${index + 1}`}
                      placeholderTextColor={colors.muted}
                      returnKeyType="done"
                      onSubmitEditing={() => handleSubmit()}
                      value={option}
                      onChangeText={(value) => updateOption(index, value)}
                    />
                    {options.length > 2 ? (
                      <Tappable onPress={() => removeOptionField(index)} style={styles.removeOptionButton}>
                        <Icon glyph="close" size={16} color={colors.danger} />
                      </Tappable>
                    ) : null}
                  </View>
                ))}
                <Tappable onPress={addOptionField} style={styles.addOptionButton}>
                  <Icon glyph="add" size={16} color={colors.accent} />
                  <Text style={styles.addOptionText}>Añadir opcion</Text>
                </Tappable>

                {filledOptions.length >= 2 ? (
                  <>
                    <Text style={styles.sectionLabel}>Tu apuesta</Text>
                    <View style={styles.pillRow}>
                      {filledOptions.map((option) => {
                        const isSelected = pickedOption === option;
                        return (
                          <Tappable
                            key={option}
                            onPress={() => setPickedOption(option)}
                            style={[styles.pill, isSelected ? styles.pillActive : null]}
                          >
                            {isSelected ? <Icon glyph="check" size={13} color={colors.background} /> : null}
                            <Text style={[styles.pillText, isSelected ? styles.pillTextActive : null]}>{option}</Text>
                          </Tappable>
                        );
                      })}
                    </View>
                  </>
                ) : null}
              </>
            )}
          </ScrollView>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Tappable onPress={handleClose} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Tappable>
            <Tappable onPress={handleSubmit} style={styles.createButton} disabled={submitting}>
              <Icon glyph="challenge" size={14} color={colors.background} />
              <Text style={styles.createText}>{submitting ? "Enviando..." : "Retar"}</Text>
            </Tappable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(4,10,32,0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "85%",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.card,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  sectionLabel: {
    color: colors.accent,
    fontWeight: "800",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: spacing.xs,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.selected,
  },
  pillText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 13,
  },
  pillTextActive: {
    color: colors.background,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
  },
  matchCard: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 6,
  },
  matchTitle: {
    color: colors.text,
    fontWeight: "800",
  },
  matchMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  outcomeRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  outcomeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 8,
  },
  outcomeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.selected,
  },
  outcomeText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 12,
  },
  outcomeTextActive: {
    color: colors.background,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  optionInput: {
    flex: 1,
  },
  removeOptionButton: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  addOptionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
  },
  addOptionText: {
    color: colors.accent,
    fontWeight: "800",
    fontSize: 13,
  },
  input: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    color: colors.text,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
  },
  cancelButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  cancelText: {
    color: colors.muted,
    fontWeight: "700",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.pill,
    ...shadows.glow,
  },
  createText: {
    color: colors.background,
    fontWeight: "800",
  },
});
