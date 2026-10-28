export function generateReservationCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "RES-";
  for (let index = 0; index < 5; index++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}
