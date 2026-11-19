export const AUTH_PASSWORD_MIN_LENGTH = 8;
export const AUTH_PASSWORD_MAX_LENGTH = 128;

// Matches the requirements shared by registration and password reset in the live API.
export function getAuthPasswordRequirements(password: string) {
  return [
    {
      label: "8 a 128 caracteres",
      met: password.length >= AUTH_PASSWORD_MIN_LENGTH && password.length <= AUTH_PASSWORD_MAX_LENGTH,
    },
    { label: "Maiúscula e minúscula", met: /[A-Z]/.test(password) && /[a-z]/.test(password) },
    { label: "Um número", met: /[0-9]/.test(password) },
    { label: "Um símbolo (!@#$…)", met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) },
  ];
}
