// Сообщения Supabase Auth → понятный русский текст.
const MESSAGES: [RegExp, string][] = [
  [/invalid login credentials/i, "Неверный email или пароль"],
  [/already registered|already exists/i, "Этот email уже зарегистрирован — войдите"],
  [/email not confirmed/i, "Подтвердите email по ссылке из письма"],
  [/password should be at least|weak password/i, "Пароль слишком простой: минимум 8 символов"],
  [/rate limit|too many/i, "Слишком много попыток. Подождите минуту"],
  [/signups not allowed|signup is disabled/i, "Регистрация закрыта. Попросите партнёра открыть её в Supabase"],
  [/invalid email|unable to validate email/i, "Проверьте адрес email"],
];

export function translateAuthError(message: string): string {
  return MESSAGES.find(([re]) => re.test(message))?.[1] ?? `Не получилось: ${message}`;
}
