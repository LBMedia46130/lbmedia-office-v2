import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function readBrevoResponse(response: Response) {
  const rawResponse = await response.text();

  if (!rawResponse) {
    return null;
  }

  try {
    return JSON.parse(rawResponse) as unknown;
  } catch {
    return rawResponse;
  }
}

export async function POST(
  _request: Request,
  context: RouteContext
) {
  const { id } = await context.params;
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        message: "La clé API Brevo n'est pas configurée.",
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
          message: "Impossible de charger la newsletter.",
          error: publicationError.message,
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
          message: "Publication introuvable.",
        },
        {
          status: 404,
        }
      );
    }

    if (publication.channel !== "brevo") {
      return NextResponse.json(
        {
          success: false,
          message: "Cette publication n'est pas une newsletter Brevo.",
        },
        {
          status: 400,
        }
      );
    }

    if (publication.status === "published") {
      return NextResponse.json(
        {
          success: false,
          message: "Cette campagne Brevo est déjà marquée comme envoyée.",
        },
        {
          status: 400,
        }
      );
    }

    if (!publication.brevo_campaign_id) {
      return NextResponse.json(
        {
          success: false,
          message: "Aucun brouillon Brevo n'existe encore pour cette newsletter.",
        },
        {
          status: 400,
        }
      );
    }

    if (!publication.brevo_send_approved_at) {
      return NextResponse.json(
        {
          success: false,
          message: "L'envoi Brevo n'a pas encore été explicitement autorisé.",
        },
        {
          status: 400,
        }
      );
    }

    const now = new Date();
    const scheduledAt = publication.scheduled_at
      ? new Date(publication.scheduled_at)
      : null;
    const hasValidFutureSchedule =
      scheduledAt !== null &&
      !Number.isNaN(scheduledAt.getTime()) &&
      scheduledAt.getTime() > now.getTime();

    if (hasValidFutureSchedule) {
      const response = await fetch(
        `https://api.brevo.com/v3/emailCampaigns/${publication.brevo_campaign_id}`,
        {
          method: "PUT",
          headers: {
            accept: "application/json",
            "api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            scheduledAt: scheduledAt.toISOString(),
          }),
          cache: "no-store",
        }
      );

      const data = await readBrevoResponse(response);

      if (!response.ok) {
        console.error("Brevo campaign scheduling failed", {
          status: response.status,
          data,
          campaignId: publication.brevo_campaign_id,
          scheduledAt: scheduledAt.toISOString(),
        });

        return NextResponse.json(
          {
            success: false,
            message: "Brevo a refusé la programmation de la campagne.",
            status: response.status,
            details: data,
          },
          {
            status: response.status,
          }
        );
      }

      const updatedAt = new Date().toISOString();
      const {
        data: updatedPublication,
        error: updateError,
      } = await supabaseAdmin
        .from("publications")
        .update({
          status: "scheduled",
          published_at: null,
          updated_at: updatedAt,
        })
        .eq("id", id)
        .select("*")
        .single();

      if (updateError) {
        return NextResponse.json(
          {
            success: false,
            message:
              "La campagne Brevo a été programmée mais LBMedia Office n'a pas pu enregistrer son statut.",
            error: updateError.message,
            brevo_campaign_id: publication.brevo_campaign_id,
          },
          {
            status: 500,
          }
        );
      }

      return NextResponse.json({
        success: true,
        scheduled: true,
        message: "Campagne Brevo programmée.",
        brevo_campaign_id: publication.brevo_campaign_id,
        scheduled_at: scheduledAt.toISOString(),
        publication: updatedPublication,
      });
    }

    const response = await fetch(
      `https://api.brevo.com/v3/emailCampaigns/${publication.brevo_campaign_id}/sendNow`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": apiKey,
        },
        cache: "no-store",
      }
    );

    const data = await readBrevoResponse(response);

    if (!response.ok) {
      console.error("Brevo campaign send failed", {
        status: response.status,
        data,
        campaignId: publication.brevo_campaign_id,
      });

      return NextResponse.json(
        {
          success: false,
          message: "Brevo a refusé l'envoi de la campagne.",
          status: response.status,
          details: data,
        },
        {
          status: response.status,
        }
      );
    }

    const publishedAt = new Date().toISOString();
    const {
      data: updatedPublication,
      error: updateError,
    } = await supabaseAdmin
      .from("publications")
      .update({
        status: "published",
        published_at: publishedAt,
        updated_at: publishedAt,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La campagne Brevo a été envoyée mais LBMedia Office n'a pas pu enregistrer son statut.",
          error: updateError.message,
          brevo_campaign_id: publication.brevo_campaign_id,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      scheduled: false,
      message: "Campagne Brevo envoyée.",
      brevo_campaign_id: publication.brevo_campaign_id,
      publication: updatedPublication,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Impossible de traiter la campagne Brevo.",
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
