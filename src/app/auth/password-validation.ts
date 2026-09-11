export function passwordValidationMessages(password: string): string[] {
  const errors: string[] = [];
  if (password.length < 8 || password.length > 64) errors.push('Usa da 8 a 64 caratteri.');
  if (!/[A-Z]/.test(password)) errors.push('Inserisci almeno una lettera maiuscola.');
  if (!/[a-z]/.test(password)) errors.push('Inserisci almeno una lettera minuscola.');
  if (!/[0-9]/.test(password)) errors.push('Inserisci almeno un numero.');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Inserisci almeno un carattere speciale.');
  if (/\s/.test(password)) errors.push('Non inserire spazi.');
  return errors;
}
