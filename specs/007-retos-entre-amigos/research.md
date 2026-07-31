# Research: Retos entre amigos

## Decision 1 — Un reto es una entidad nueva, no una `PlacedBet` con dos cuentas

`PlacedBet` (005-combinada, 006-elo) está modelado alrededor de una única `account_id` apostando contra el mercado (una cuota generada por `odds.py`). Forzar un reto 1v1 dentro de esa misma tabla habría requerido o bien dos filas enlazadas (una por cuenta, con un `pair_id` sintético) o bien una cuota de mercado ficticia solo para rellenar `combined_odds`. Ambas opciones complican una tabla ya usada por la liquidación de apuestas de partido. Una tabla nueva y pequeña (`friend_challenges`) con las dos cuentas como columnas propias (`challenger_account_id`, `opponent_account_id`) es más simple y evita tocar `bet_repository.py` en absoluto.

## Decision 2 — Sin cuota de mercado, sin efecto en Elo

Ya establecido explícitamente en el spec (Clarifications): un reto no tiene una "dificultad" de mercado objetiva (no hay libro de apuestas real detrás de un 1v1 entre amigos), así que no hay ningún `implied_probability` razonable que darle a `elo.update_elo_from_bet`. Se sigue el mismo precedente que las predicciones de grupo (006-elo FR-003): mueven Beths, no Elo.

## Decision 3 — Reutilizar la resolución de resultados y la ventana de liquidación de 006-elo

`match_results.resolve_match_result(match_id)` y la constante `SETTLEMENT_DELAY_MINUTES = 90` (hoy en `bet_repository.py`) ya resuelven exactamente el problema de "¿cuándo se considera terminado un partido y cuál fue su resultado?". Un reto usa las mismas dos piezas sin cambios, así que su resultado y el de una apuesta de partido sobre el mismo `match_id` siempre coinciden — no puede haber dos "verdades" distintas sobre quién ganó un partido. `SETTLEMENT_DELAY_MINUTES` se importa desde `bet_repository` en vez de duplicarse.

> **Actualizado 2026-07-31**: `match_results.generate_match_result` (simulación determinista) ya no existe; se reutiliza en su lugar `resolve_match_result(match_id) -> str | None`, que consulta el resultado real del partido en su fuente (football-data.org/PandaScore) y devuelve `None` mientras no esté confirmado (ver `006-elo/research.md`, Revisión 2026-07-31). `challenge_repository._settle_due_challenges` ahora, igual que `bet_repository._settle_due_bets`, solo liquida un reto de partido cuando `resolve_match_result` devuelve un resultado no nulo — si el partido pasó `SETTLEMENT_DELAY_MINUTES` pero la fuente todavía no lo reporta como terminado, el reto permanece `"accepted"` en vez de liquidarse contra una adivinanza. Esto no cambia nada del resto de esta Decision: sigue sin haber Elo ni Beths en juego (Decision 2), y el reto y la apuesta de partido sobre el mismo `match_id` siguen sin poder discrepar sobre el resultado.

## Decision 4 — Liquidación perezosa, sin scheduler, calcada de `_settle_due_bets`

Mismo patrón ya usado tres veces en el proyecto (`_group_has_unseen_update`, `_grant_periodic_income`, `_settle_due_bets`): comprobar en el momento de lectura (`list_challenges_for_account`) si algo pendiente de tiempo ya venció, y resolverlo ahí mismo antes de devolver la respuesta. Ningún proceso en segundo plano, consistente con el principio Local-First y con `Constraints` de 006-elo/plan.md.

## Decision 5 — Débito en creación (quien reta), débito en aceptación (quien acepta)

Alternativa considerada: debitar a ambas cuentas solo al aceptar. Se descartó porque entonces quien reta podría gastar ese mismo saldo en otra apuesta mientras el reto sigue pendiente, y la aceptación fallaría de forma confusa por un saldo que ya no está "reservado" a ojos del usuario que retó. Debitar de inmediato a quien reta dejó el diseño simple: en el momento en que un reto existe, su lado "challenger" siempre está cubierto; el lado "opponent" solo se compromete si decide aceptar.

## Decision 6 — Sin negociación de importe ni de resultado por parte del retado

Alternativa considerada: dejar que el retado proponga una contraoferta (otro importe, o "creo que gana el otro"). Se descartó por alcance — convertiría un reto simple en un mini-sistema de negociación con más estados (contraoferta pendiente, contraoferta aceptada/rechazada...). La spec de v1 es deliberadamente simétrica: mismo importe para ambos, el retado apuesta implícitamente "lo contrario" del resultado elegido por quien retó. Puede revisarse en una spec futura.

## Decision 7 — Sin expiración automática de un reto pendiente

Alternativa considerada: expirar un reto no respondido tras N horas, devolviendo el importe automáticamente. Se descartó para v1 por la misma razón que 006-elo dejó fuera un scheduler: expirar por tiempo sin que nadie lo consulte requeriría o bien un proceso en segundo plano, o bien colar la comprobación de expiración en cualquier lectura de estado del retado (posible, pero no pedido explícitamente y añade una quinta transición de estado). Se documenta como Assumption, no como limitación oculta.

## Decision 8 — Frontend: nueva sección dentro de la pantalla Social ya existente, no una pestaña nueva

Alternativa considerada: una pestaña de navegación dedicada a "Retos". Se descartó porque un reto es conceptualmente una extensión de la relación de amistad (solo puedes retar a un amigo), igual que los grupos ya viven en la pantalla Social junto a la lista de amigos; añadir una pestaña nueva habría sido una superficie de navegación extra sin necesidad. La creación de un reto se lanza desde un modal (mismo patrón que `CreateGroupModal.tsx`) accesible desde la nueva sección "Retos" de `social.tsx`, con un selector de partido ligero que reutiliza `fetchMockCompetitions`/`fetchMockCompetitionMatches` ya existentes — no se toca `matches/index.tsx` ni `EventCard.tsx`.
