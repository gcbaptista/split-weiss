import { randomUUID } from "crypto";

function buildParticipantEmail() {
  return `participant-${randomUUID()}@split-weiss.local`;
}

export function buildParticipantData(name: string) {
  return {
    name: name.trim(),
    email: buildParticipantEmail(),
  };
}