type PageBannerProps = {
  eyebrow: string;
  title: string;
  description?: string;
};

export default function PageBanner({
  eyebrow,
  title,
  description,
}: PageBannerProps) {
  return (
    <section className="rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 px-6 py-6 text-white shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-2xl font-bold tracking-tight">
        {title}
      </h2>

      {description ? (
        <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-50/90">
          {description}
        </p>
      ) : null}
    </section>
  );
}