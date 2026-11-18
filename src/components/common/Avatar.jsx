/** Round profile picture: the student's photo, or the first letter of their name. */
export default function Avatar({ photo, name, size = 68, className = '' }) {
  const letter = String(name || '?').trim().charAt(0);
  return (
    <span
      className={`avatar${photo ? ' has-photo' : ''}${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.44) }}
      aria-hidden="true"
    >
      {photo ? <img src={photo} alt="" /> : letter}
    </span>
  );
}
