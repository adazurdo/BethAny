# Quickstart: validar Retos entre amigos

Requiere el backend local corriendo (`python backend/scripts/run_local_api.py` o `python scripts/dev_local.py`) y dos cuentas de prueba que ya sean amigas entre sí (crear vía `/auth/register` + `/social/friends` + aceptar, como en `004-social/quickstart.md`).

1. **Amistad requerida**: con Cuenta A y Cuenta B **sin** amistad, `POST /challenges` de A hacia B debe devolver 403. Enviar solicitud de amistad y aceptarla, y repetir: ahora debe devolver 201.
2. **Débito en creación**: anotar el saldo de Beths de A (`GET /account/me`). Crear un reto de A hacia B por `stake=50` sobre un `matchId` abierto a apuestas. Volver a consultar `GET /account/me` de A: su saldo debe haber bajado exactamente 50.
3. **Saldo insuficiente al crear**: intentar crear un reto con `stake` mayor que el saldo actual de A. Debe devolver 400 y el saldo de A no debe cambiar.
4. **Listado agrupado**: `GET /challenges/mine` de A debe mostrar el reto del paso 2 en `outgoing`; el mismo `GET /challenges/mine` de B debe mostrarlo en `incoming`.
5. **Aceptar**: con el saldo de B anotado, `POST /challenges/{id}/accept` desde B. Confirmar `status: "accepted"` y que el saldo de B bajó exactamente 50. `GET /challenges/mine` de ambos debe mostrar el reto ahora en `active`.
6. **Rechazar** (con un segundo reto nuevo): `POST /challenges/{id}/decline` desde B. Confirmar `status: "declined"` y que el saldo de A (quien retó) recuperó su importe retenido.
7. **Cancelar** (con un tercer reto nuevo, aún sin respuesta): `POST /challenges/{id}/cancel` desde A. Confirmar `status: "cancelled"` y que el saldo de A recuperó su importe.
8. **Liquidación**: retomar el reto aceptado del paso 5. Adelantar su `created_at` en la base de datos (o esperar los 90 minutos de `SETTLEMENT_DELAY_MINUTES`) y volver a llamar `GET /challenges/mine` de cualquiera de las dos cuentas. El reto debe aparecer en `resolved` con `status: "settled"`, `result` y `winnerAccountId` rellenos, y el saldo del ganador debe haber subido exactamente `2 * stake` respecto a justo antes de la liquidación.
9. **Elo intacto**: en cualquier punto de los pasos 2-8, `profile.elo` de A y B en `GET /account/me` no debe haber cambiado por ninguna operación de reto.
10. **Validación móvil (Expo)**: abrir la app en Expo, ir a la pestaña Social, comprobar que la sección "Retos" muestra correctamente los cuatro grupos (recibidos, enviados, en curso, resueltos), que se puede lanzar un reto nuevo desde el modal eligiendo amigo/partido/resultado/importe, y que aceptar/rechazar/cancelar desde la UI refleja los mismos cambios de saldo verificados por API arriba.
