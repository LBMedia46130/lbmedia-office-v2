"use client";

type DeletePublicationButtonProps = {
  action: () => Promise<void>;
};

export default function DeletePublicationButton({
  action,
}: DeletePublicationButtonProps) {
  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    const confirmed =
      window.confirm(
        "Supprimer définitivement ce post ? Cette action est irréversible."
      );

    if (!confirmed) {
      event.preventDefault();
    }
  }

  return (
    <form
      action={action}
      onSubmit={handleSubmit}
    >
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
      >
        Supprimer le post
      </button>
    </form>
  );
}