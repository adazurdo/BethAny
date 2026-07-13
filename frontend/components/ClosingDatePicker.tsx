import { StyleSheet, View } from "react-native";
import { spacing } from "../theme";
import { Dropdown, DropdownOption } from "./Dropdown";

export type ClosingDateValue = {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
};

const MONTH_LABELS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function range(start: number, end: number): number[] {
  const result: number[] = [];
  for (let value = start; value <= end; value++) result.push(value);
  return result;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function closingValueToDate(value: ClosingDateValue): Date {
  return new Date(value.year, value.month - 1, value.day, value.hour, value.minute, 0, 0);
}

export function defaultClosingValue(): ClosingDateValue {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: now.getHours(),
    minute: now.getMinutes(),
  };
}

type ClosingDatePickerProps = {
  value: ClosingDateValue;
  onChange: (value: ClosingDateValue) => void;
};

export function ClosingDatePicker({ value, onChange }: ClosingDatePickerProps) {
  const currentYear = new Date().getFullYear();
  const yearOptions: DropdownOption[] = range(currentYear, currentYear + 3).map((year) => ({
    value: year,
    label: String(year),
  }));
  const monthOptions: DropdownOption[] = MONTH_LABELS.map((label, index) => ({ value: index + 1, label }));
  const dayOptions: DropdownOption[] = range(1, daysInMonth(value.year, value.month)).map((day) => ({
    value: day,
    label: String(day),
  }));
  const hourOptions: DropdownOption[] = range(0, 23).map((hour) => ({
    value: hour,
    label: hour.toString().padStart(2, "0"),
  }));
  const minuteOptions: DropdownOption[] = range(0, 59).map((minute) => ({
    value: minute,
    label: minute.toString().padStart(2, "0"),
  }));

  function update(partial: Partial<ClosingDateValue>) {
    const next = { ...value, ...partial };
    const maxDay = daysInMonth(next.year, next.month);
    if (next.day > maxDay) next.day = maxDay;
    onChange(next);
  }

  return (
    <View style={styles.row}>
      <Dropdown label="Año" value={value.year} options={yearOptions} onChange={(year) => update({ year })} />
      <Dropdown label="Mes" value={value.month} options={monthOptions} onChange={(month) => update({ month })} />
      <Dropdown label="Dia" value={value.day} options={dayOptions} onChange={(day) => update({ day })} />
      <Dropdown label="Hora" value={value.hour} options={hourOptions} onChange={(hour) => update({ hour })} />
      <Dropdown label="Min" value={value.minute} options={minuteOptions} onChange={(minute) => update({ minute })} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
});
