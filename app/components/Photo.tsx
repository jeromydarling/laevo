import { PHOTOS, type PhotoKey } from "~/content/photos";

/**
 * A photograph, served at the smallest size that will do.
 *
 * WebP at two widths with a JPEG fallback, because "works on an old phone"
 * has to survive contact with an actually old phone. Width and height are
 * always set so the text below an image never jumps down the page while it
 * loads — which on a slow connection is the difference between reading a
 * sentence and losing your place in it.
 *
 * Everything is lazy except a photograph above the fold, which should be
 * marked `priority` so it is not deferred behind the rest of the page.
 */
export function Photo({
  photo,
  className,
  priority = false,
  sizes = "(min-width: 900px) 800px, 100vw",
  rounded = true,
}: {
  photo: PhotoKey;
  className?: string;
  priority?: boolean;
  sizes?: string;
  rounded?: boolean;
}) {
  const p = PHOTOS[photo];
  const [small, large] = p.widths;

  return (
    <picture>
      <source
        type="image/webp"
        srcSet={`/photos/${p.name}-${small}.webp ${small}w, /photos/${p.name}-${large}.webp ${large}w`}
        sizes={sizes}
      />
      <img
        src={`/photos/${p.name}-${large}.jpg`}
        alt={p.alt}
        width={p.width}
        height={p.height}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
        className={[rounded ? "photo" : "photo photo-square", className]
          .filter(Boolean)
          .join(" ")}
      />
    </picture>
  );
}
