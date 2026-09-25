import { TokenPrefix, UniversalEntityType } from "./mention";
import { GITHUB_TOKEN_PREFIX_MAP } from "./mention";
export function normalizeQuery(query: string) {
  return query.trim().toLowerCase();
}

export function normalizeExternalValue(value: string) {
  return value.trim().toLowerCase();
}
export function extractUniversalMentionTokens(content: string) {
  const matches = content.match(/(^|\s)@([a-zA-Z0-9._/-]{2,120})/g) ?? [];

  return Array.from(
    new Set(
      matches
        .map((token) => token.trim().slice(1))
        .map((token) => token.toLowerCase())
        .filter(Boolean)
    )
  );
}

export function parseUniversalMentionToken(token: string) {
  const normalized = normalizeQuery(token);
  const [prefix, ...rest] = normalized.split("/");

  if (!prefix || rest.length === 0) {
    return null;
  }

  if (!(prefix in GITHUB_TOKEN_PREFIX_MAP)) {
    return null;
  }

  const value = rest.join("/").trim();

  if (!value) {
    return null;
  }

  return {
    entityType: GITHUB_TOKEN_PREFIX_MAP[prefix as TokenPrefix] as UniversalEntityType,
    value,
  };
}
