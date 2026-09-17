const COUNTRY_CODES = [
  { code: '+52', label: '+52 MX', name: 'México' },
  { code: '+1', label: '+1 US/CA', name: 'Estados Unidos / Canadá' },
  { code: '+502', label: '+502 GT', name: 'Guatemala' },
  { code: '+503', label: '+503 SV', name: 'El Salvador' },
  { code: '+504', label: '+504 HN', name: 'Honduras' },
  { code: '+505', label: '+505 NI', name: 'Nicaragua' },
  { code: '+506', label: '+506 CR', name: 'Costa Rica' },
  { code: '+507', label: '+507 PA', name: 'Panamá' },
  { code: '+57', label: '+57 CO', name: 'Colombia' },
  { code: '+54', label: '+54 AR', name: 'Argentina' },
  { code: '+34', label: '+34 ES', name: 'España' },
];

function parsePhone(value) {
  const raw = (value || '').trim();
  const match = raw.match(/^(\+\d{1,3})\s*(\d*)$/);
  if (match) return { countryCode: match[1], number: match[2] };
  const digits = raw.replace(/\D/g, '').slice(-10);
  return { countryCode: '+52', number: digits };
}

export default function PhoneInput({ value, onChange, placeholder }) {
  const { countryCode, number } = parsePhone(value);

  function update(nextCode, nextNumberRaw) {
    const digits = nextNumberRaw.replace(/\D/g, '').slice(0, 10);
    onChange(digits ? `${nextCode} ${digits}` : '');
  }

  return (
    <div className="flex gap-2">
      <select
        className="input w-28 shrink-0"
        value={countryCode}
        onChange={(e) => update(e.target.value, number)}
      >
        {COUNTRY_CODES.map((c) => (
          <option key={c.code} value={c.code} title={c.name}>
            {c.label}
          </option>
        ))}
      </select>
      <input
        className="input flex-1"
        inputMode="numeric"
        maxLength={10}
        placeholder={placeholder || '10 dígitos'}
        value={number}
        onChange={(e) => update(countryCode, e.target.value)}
      />
    </div>
  );
}
