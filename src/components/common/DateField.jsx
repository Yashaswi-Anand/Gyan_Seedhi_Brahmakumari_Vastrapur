import Icon from './Icon';

/** 'YYYY-MM-DD' → 'DD-MM-YYYY' */
export const toDmy = (key) => (key ? key.split('-').reverse().join('-') : '');

/**
 * A date box that always shows DD-MM-YYYY (phones otherwise show the date in their own locale format).
 * The real <input type="date"> lies invisibly on top, so a tap still opens the phone's date picker.
 * `onChange` gets the input's change event; the value stays 'YYYY-MM-DD'.
 */
export default function DateField({ value, onChange, className = '', ...inputProps }) {
  const openPicker = (e) => {
    try {
      e.currentTarget.showPicker?.(); // computers: open the calendar on any click, not only on the icon
    } catch {
      /* not allowed in this browser – the normal picker still works */
    }
  };
  return (
    <span className={`datefield ${className}`}>
      <span className={value ? 'df-text' : 'df-text empty'}>{value ? toDmy(value) : 'DD-MM-YYYY'}</span>
      <Icon name="calendar" size={20} />
      <input type="date" value={value} onChange={onChange} onClick={openPicker} {...inputProps} />
    </span>
  );
}
