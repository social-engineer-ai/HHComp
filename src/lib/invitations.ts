import { randomInt } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // omit confusables 0,O,1,I
const CODE_LEN = 6;
const INVITATION_TTL_HOURS = 72;

export function generateInvitationCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LEN; i++) {
    out += ALPHABET[randomInt(0, ALPHABET.length)];
  }
  return out;
}

export function invitationExpiryFromNow(): Date {
  return new Date(Date.now() + INVITATION_TTL_HOURS * 60 * 60 * 1000);
}
