// Pure helpers adapted from the reviewed local three-bill prototype. No I/O.
export const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const validYear = year => Number.isInteger(year) && year >= 1900 && year <= 9999;

export function parseDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const valid = validYear(year) && month >= 0 && month < 12 && day > 0
    && day <= new Date(year, month + 1, 0).getDate();
  return valid ? {year, month, day} : null;
}

export function dateLabel(value) {
  const date = parseDate(value);
  return date ? `${months[date.month]} ${date.day}, ${date.year}` : 'Check date';
}

export function inMonth(value, year, month) {
  const date = parseDate(value);
  return !!date && date.year === year && date.month === month;
}

export function calendar(year, month) {
  const start = new Date(year, month, 1).getDay();
  const count = new Date(year, month + 1, 0).getDate();
  return Array.from({length: Math.ceil((start + count) / 7) * 7}, (_, index) =>
    index >= start && index < start + count ? index - start + 1 : null);
}

export function amount(value) {
  if (!/^\d+(\.\d{1,2})?$/.test(String(value ?? ''))) return null;
  const number = Number(value);
  return Number.isFinite(number) && number <= 999999999 ? Math.round(number * 100) : null;
}

export function active(bill) {
  return !!(bill.label?.trim() || bill.due || bill.planned || bill.amount || bill.notes?.trim()
    || (bill.method && bill.method !== 'check')
    || (bill.certainty && bill.certainty !== 'check'));
}

export function summary(bills) {
  const entries = bills.filter(active);
  const amounts = entries.map(bill => amount(bill.amount)).filter(value => value !== null);
  return {
    entries,
    total: amounts.reduce((sum, value) => sum + value, 0),
    amountCount: amounts.length,
    estimates: entries.filter(bill => bill.certainty === 'estimate').length,
    unchecked: entries.filter(bill => bill.certainty !== 'confirmed').length,
  };
}

// Blank previews are built from an allowlist, never from the private entry snapshot.
export function printModel(data, blank) {
  if (blank) {
    return {
      year: data.year, month: data.month, bills: [], followup: '', source: '',
      when: '', example: false, blank: true,
    };
  }
  return {...data, bills: data.bills.map(bill => ({...bill})), blank: false};
}
