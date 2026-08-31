import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const BREVO_LIST_ID = 5;
const BREVO_SENDER_ID = 2;
const BREVO_TEMPLATE_ID = 38;

export async function POST(
  _request: Request,
  context: RouteContext
) {
  const { id } = await context.params;

  const apiKey =
    process.env.BREVO_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        message:
          "La clé API Brevo n'est pas configurée.",
      },
      {
        status: 500,
      }
    );
  }

  try {
    const {
      data: publication,
      error: publicationError,
    } = await supabaseAdmin
      .from("publications")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (publicationError) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Impossible de charger la publication.",
          error:
            publicationError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!publication) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Publication introuvable.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      publication.channel !== "brevo"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cette publication n'est pas une newsletter Brevo.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      publication.brevo_campaign_id
    ) {
      return NextResponse.json(
        {
          success: true,
          alreadyExists: true,
          message:
            "Un brouillon Brevo existe déjà pour cette newsletter.",
          brevo_campaign_id:
            publication.brevo_campaign_id,
          publication,
        },
        {
          status: 200,
        }
      );
    }

    if (
      !publication.content?.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le contenu de la newsletter est vide.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !publication.subject?.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "L'objet de l'email est vide.",
        },
        {
          status: 400,
        }
      );
    }

    const campaignName =
      publication.title?.trim() ||
      publication.subject.trim();

    const formattedContent =
      buildTemplateContent(
        publication.content
      );

    const payload = {
      name: campaignName,

      subject:
        publication.subject.trim(),

      previewText:
        publication.preview_text?.trim() ||
        undefined,

      sender: {
        id: BREVO_SENDER_ID,
      },

      recipients: {
        listIds: [
          BREVO_LIST_ID,
        ],
      },

      templateId:
        BREVO_TEMPLATE_ID,

      params: {
        titre:
          publication.title?.trim() ||
          publication.subject.trim(),

        contenu:
          formattedContent,

        lien:
          publication.link_url?.trim() ||
          "https://lbmedia.fr/",

        image_url:
          publication.image_url?.trim() ||
          "",
      },
    };

    const response = await fetch(
      "https://api.brevo.com/v3/emailCampaigns",
      {
        method: "POST",
        headers: {
          accept:
            "application/json",
          "api-key": apiKey,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(
          payload
        ),
        cache: "no-store",
      }
    );

    const rawResponse =
      await response.text();

    let data: unknown = null;

    try {
      data = rawResponse
        ? JSON.parse(rawResponse)
        : null;
    } catch {
      data = rawResponse;
    }

    if (!response.ok) {
      console.error(
        "Brevo campaign creation failed",
        {
          status:
            response.status,
          data,
          payload,
        }
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Brevo a refusé la création de la campagne.",
          status:
            response.status,
          details: data,
        },
        {
          status:
            response.status,
        }
      );
    }

    const campaignData =
      data as {
        id?: number;
      } | null;

    const campaignId =
      campaignData?.id ?? null;

    if (!campaignId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Brevo a créé la campagne mais n'a retourné aucun identifiant.",
        },
        {
          status: 500,
        }
      );
    }

    const {
      data: updatedPublication,
      error: updateError,
    } = await supabaseAdmin
      .from("publications")
      .update({
        brevo_campaign_id:
          campaignId,
        brevo_send_approved_at:
          null,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le brouillon Brevo a été créé mais LBMedia Office n'a pas pu enregistrer son identifiant.",
          error:
            updateError.message,
          brevo_campaign_id:
            campaignId,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      alreadyExists: false,
      message:
        "Brouillon de campagne Brevo créé à partir du template LBMedia.",
      brevo_campaign_id:
        campaignId,
      brevo_list_id:
        BREVO_LIST_ID,
      brevo_sender_id:
        BREVO_SENDER_ID,
      brevo_template_id:
        BREVO_TEMPLATE_ID,
      publication:
        updatedPublication,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible de créer le brouillon Brevo.",
        error:
          error instanceof Error
            ? error.message
            : "Erreur inconnue",
      },
      {
        status: 500,
      }
    );
  }
}

function buildTemplateContent(
  content: string
) {
  return content
    .split("\n")
    .map((paragraph) =>
      paragraph.trim()
    )
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 18px;">${escapeHtml(
          paragraph
        )}</p>`
    )
    .join("");
}

function escapeHtml(
  value: string
) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}