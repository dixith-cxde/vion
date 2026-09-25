"use client";

export function Avatar({
    name,
    imageUrl,
    size = 32,
}: {
    name: string | null | undefined;

    imageUrl: string | null | undefined;

    size?: number;
}) {
    const initials = name
        ? name
              .split(" ")
              .slice(0, 2)
              .map((w) => w[0])
              .join("")
              .toUpperCase()
        : "?";

    return (
        <div
            className="relative shrink-0 overflow-hidden rounded-full"
            style={{
                width: size,
                height: size,
            }}
        >
            {imageUrl ? (
                <img
                    src={imageUrl}
                    alt={name ?? ""}
                    className="h-full w-full rounded-full object-cover"
                />
            ) : (
                <div
                    className="flex h-full w-full items-center justify-center rounded-full bg-muted font-medium text-muted-foreground"
                    style={{
                        fontSize: Math.round(size * 0.34),
                    }}
                >
                    {initials}
                </div>
            )}
        </div>
    );
}
