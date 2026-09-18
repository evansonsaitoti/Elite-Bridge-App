export function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
export function payrollCsv(records: any[]) {
  return (
    [
      [
        "Timesheet ID",
        "Caregiver ID",
        "First name",
        "Last name",
        "Email",
        "Clock in UTC",
        "Clock out UTC",
        "Worked minutes",
        "Hours",
        "Hourly rate USD",
        "Recorded gross USD",
        "Status",
      ],
      ...records.map((r) => [
        r.id,
        r.caregiver_id,
        r.first_name,
        r.last_name,
        r.email,
        r.clock_in_utc,
        r.clock_out_utc,
        r.worked_minutes,
        (Number(r.worked_minutes) / 60).toFixed(4),
        r.hourly_rate,
        r.total_amount,
        r.status,
      ]),
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n") + "\r\n"
  );
}
