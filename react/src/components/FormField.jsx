export function Field({ label, name, type = 'text', placeholder, required, minLength, value, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input name={name} type={type} placeholder={placeholder} required={required} minLength={minLength} value={value} onChange={onChange} />
    </label>
  );
}
