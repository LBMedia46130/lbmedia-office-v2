import {
  NextResponse,
} from "next/server";

import {
  generateLbmediaRadioPresentation,
  getGammaGeneration,
} from "@/lib/gamma";

import {
  getZohoEstimate,
  type ZohoEstimate,
} from "@/lib/zoho-books";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  60;

type RouteContext = {
  params: Promise<{
    estimateId: string;
  }>;
};

function formatCurrency(
  value: number | undefined,
  currency = "EUR"
) {
  return new Intl.NumberFormat(
    "fr-FR",
    {
      style: "currency",
      currency,
    }
  ).format(Number(value) || 0);
}

function formatDate(
  value?: string
) {
  if (!value) {
    return "Non précisée";
  }

  const date =
    new Date(
      `${value}T00:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "fr-FR"
  ).format(date);
}

function formatDiscount(
  discount:
    | string
    | number
    | undefined,
  discountAmount:
    | number
    | undefined,
  currency: string
) {
  if (
    typeof discount ===
      "string" &&
    discount.trim()
  ) {
    return discount.trim();
  }

  if (
    typeof discount ===
      "number" &&
    Number.isFinite(
      discount
    ) &&
    discount > 0
  ) {
    return `${discount} %`;
  }

  if (
    Number(
      discountAmount
    ) > 0
  ) {
    return formatCurrency(
      discountAmount,
      currency
    );
  }

  return "Aucune";
}

function buildGammaPrompt(
  estimate: ZohoEstimate
) {
  const currency =
    estimate.currency_code ||
    "EUR";

  const lineItems =
    estimate.line_items ?? [];

  const prestations =
    lineItems.length > 0
      ? lineItems
          .map(
            (
              line,
              index
            ) => {
              const description =
                line.description
                  ?.trim();

              return [
                `Prestation ${
                  index + 1
                } :`,
                `- Intitulé : ${
                  line.name
                }`,
                description
                  ? `- Description : ${description}`
                  : null,
                `- Quantité : ${
                  line.quantity
                }${
                  line.unit
                    ? ` ${line.unit}`
                    : ""
                }`,
                `- Prix unitaire HT : ${formatCurrency(
                  line.rate,
                  currency
                )}`,
                `- Remise : ${formatDiscount(
                  line.discount,
                  line.discount_amount,
                  currency
                )}`,
                `- Total HT de la ligne : ${formatCurrency(
                  line.item_total,
                  currency
                )}`,
              ]
                .filter(
                  Boolean
                )
                .join("\n");
            }
          )
          .join(
            "\n\n"
          )
      : "Aucune prestation détaillée.";

  return `
Créer une proposition commerciale Radio LBMedia à partir du template existant.

IMPORTANT :
- Conserver le design, l'identité visuelle, la structure générale et le logo LBMedia du template.
- Adapter uniquement les contenus commerciaux aux informations du devis ci-dessous.
- Ne pas inventer d'informations absentes du devis.
- Présenter les informations de manière claire, commerciale et professionnelle.
- Conserver les informations générales RFM Lot et les audiences déjà présentes dans le template lorsqu'elles ne dépendent pas du client.
- Ne pas ajouter de compte rendu après diffusion.
- Ne pas modifier les données d'audience RFM Lot présentes dans le template.
- Ne pas transformer cette présentation en facture ou en simple reproduction du devis.
- La présentation doit accompagner le devis et valoriser la proposition commerciale.

CLIENT
Nom : ${estimate.customer_name}

DEVIS
Numéro : ${estimate.estimate_number}
Référence : ${
    estimate.reference_number ||
    "Non précisée"
  }
Date : ${formatDate(
    estimate.date
  )}
Validité : ${formatDate(
    estimate.expiry_date
  )}
Commercial : ${
    estimate.salesperson_name ||
    "Non précisé"
  }

PRESTATIONS

${prestations}

MONTANTS
Sous-total HT : ${formatCurrency(
    estimate.sub_total,
    currency
  )}
TVA : ${formatCurrency(
    estimate.tax_total,
    currency
  )}
Total TTC : ${formatCurrency(
    estimate.total,
    currency
  )}

NOTES DU DEVIS
${
  estimate.notes?.trim() ||
  "Aucune note particulière."
}

CONSIGNES FINALES
Créer une présentation commerciale personnalisée pour ${estimate.customer_name}, cohérente avec le devis ${estimate.estimate_number}.
Le document doit pouvoir être envoyé directement au client avec le devis Zoho Books.
`.trim();
}

function wait(
  milliseconds: number
) {
  return new Promise<void>(
    (resolve) => {
      setTimeout(
        resolve,
        milliseconds
      );
    }
  );
}

export async function POST(
  _request: Request,
  context: RouteContext
) {
  try {
    const {
      estimateId,
    } = await context.params;

    const normalizedEstimateId =
      estimateId?.trim();

    if (
      !normalizedEstimateId
    ) {
      return NextResponse.json(
        {
          error:
            "Identifiant de devis Zoho manquant.",
        },
        {
          status: 400,
        }
      );
    }

    const estimate =
      await getZohoEstimate(
        normalizedEstimateId
      );

    const prompt =
      buildGammaPrompt(
        estimate
      );

    const generation =
      await generateLbmediaRadioPresentation(
        prompt
      );

    const generationId =
      generation.generationId;

    /*
     * Gamma travaille de manière asynchrone.
     * On attend ici la fin de la génération
     * pour que le bouton puisse recevoir
     * directement les liens Gamma et PDF.
     *
     * 20 tentatives x 2 secondes =
     * environ 40 secondes maximum.
     */
    for (
      let attempt = 0;
      attempt < 20;
      attempt += 1
    ) {
      await wait(2000);

      const status =
        await getGammaGeneration(
          generationId
        );

      if (
        status.status ===
        "completed"
      ) {
        if (
          !status.gammaUrl &&
          !status.exportUrl
        ) {
          throw new Error(
            "Gamma indique que la génération est terminée mais n'a retourné aucun lien."
          );
        }

        return NextResponse.json(
          {
            generationId,
            gammaUrl:
              status.gammaUrl ??
              null,
            exportUrl:
              status.exportUrl ??
              null,
          }
        );
      }

      if (
        status.status ===
        "failed"
      ) {
        throw new Error(
          status.error ||
            "La génération Gamma a échoué."
        );
      }
    }

    return NextResponse.json(
      {
        error:
          "La présentation est toujours en cours de génération. Gamma a dépassé le délai d'attente d'Office.",
        generationId,
      },
      {
        status: 504,
      }
    );
  } catch (error) {
    console.error(
      "Erreur génération Gamma depuis devis Zoho :",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de générer la présentation Gamma.",
      },
      {
        status: 500,
      }
    );
  }
}