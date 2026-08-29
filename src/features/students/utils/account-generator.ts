import { randomInt } from "node:crypto";

const safeWords = [
  "sun", "moon", "star", "green", "rain", "wind",
  "bird", "fish", "panda", "tiger", "mango", "peach",
  "book", "pen", "kite", "drum", "happy", "brave", "smart", "kind",
];
const safeDigits = "23456789";

export function toAsciiSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 22);
}

export function buildUsernameCandidate(fullName: string, classroomName: string, suffix: string) {
  const namePart = toAsciiSlug(fullName) || "student";
  const classPart = toAsciiSlug(classroomName).slice(0, 8) || "class";
  return `${namePart}.${classPart}.${suffix}`.slice(0, 40);
}

export function generateTemporaryPassword() {
  const words = Array.from({ length: 3 }, () => safeWords[randomInt(safeWords.length)]);
  const digits = Array.from({ length: 3 }, () => safeDigits[randomInt(safeDigits.length)]).join("");
  return `${words.join("-")}-${digits}`;
}
