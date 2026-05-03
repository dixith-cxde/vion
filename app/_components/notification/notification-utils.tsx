export function parseMentionText(message: string) {
  const regex = /@#\{(.+?)\}/;
  const match = message.match(regex);

  if (!match) {
    return { before: message, mention: null, after: "" };
  }

  return {
    before: message.slice(0, match.index),
    mention: match[1], // document name
    after: message.slice((match.index ?? 0) + match[0].length),
  };
}

export function parseMention(message: string) {
  const regex = /@#\{(.+?)\}/g;

  const parts: {
    type: "text" | "mention";
    value: string;
  }[] = [];

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(message)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        value: message.slice(lastIndex, match.index),
      });
    }

    parts.push({
      type: "mention",
      value: match[1],
    });

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < message.length) {
    parts.push({
      type: "text",
      value: message.slice(lastIndex),
    });
  }

  return parts;
}
export function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatNotificationDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
