export const PASSWORD_POLICY_TEXT =
  'Use at least 8 characters with uppercase, lowercase, number, and special character.';

export const getPasswordStrengthError = (password) => {
  if (!password || password.length < 8) {
    return PASSWORD_POLICY_TEXT;
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
    return PASSWORD_POLICY_TEXT;
  }

  return '';
};
