import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type BrevoCampaignState = {
  id?: number;
  status?: string;
  scheduledAt?: string;
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

async function getBrevoCampaign(
  apiKey: string,
  campaignId: number | string
): Promise<{
  ok: boolean;
  status: number;
  data: BrevoCampaignState | unknown;
}> {
  const response = await fetch(
    `https://api.brevo.com/v3/emailCampaigns/${campaignId}`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
      },
      cache: "no-store",
    }
  );

  const data = await readBrevoResponse(response);

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
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

    const campaignId = publication.brevo_campaign_id;
    const now = new Date();
    const scheduledAt = publication.scheduled_at
      ? new Date(publication.scheduled_at)
      : null;

    const hasValidFutureSchedule =
      scheduledAt !== null &&
      !Number.isNaN(scheduledAt.getTime()) &&
      scheduledAt.getTime() > now.getTime();

    if (hasValidFutureSchedule) {
      const scheduledAtIso = scheduledAt.toISOString();

      const scheduleResponse = await fetch(
        `https://api.brevo.com/v3/emailCampaigns/${campaignId}`,
        {
          method: "PUT",
          headers: {
            accept: "application/json",
            "api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            scheduledAt: scheduledAtIso,
          }),
          cache: "no-store",
        }
      );

      const scheduleData =
        await readBrevoResponse(scheduleResponse);

      if (!scheduleResponse.ok) {
        console.error(
          "Brevo campaign scheduling failed",
          {
            status: scheduleResponse.status,
            data: scheduleData,
            campaignId,
            scheduledAt: scheduledAtIso,
          }
        );

        return NextResponse.json(
          {
            success: false,
            message: "Brevo a refusé la date de programmation de la campagne.",
            status: scheduleResponse.status,
            details: scheduleData,
          },
          {
            status: scheduleResponse.status,
          }
        );
      }

      const queueResponse = await fetch(
        `https://api.brevo.com/v3/emailCampaigns/${campaignId}/status`,
        {
          method: "PUT",
          headers: {
            accept: "application/json",
            "api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "queued",
          }),
          cache: "no-store",
        }
      );

      const queueData =
        await readBrevoResponse(queueResponse);

      if (!queueResponse.ok) {
        console.error(
          "Brevo campaign queue failed",
          {
            status: queueResponse.status,
            data: queueData,
            campaignId,
            scheduledAt: scheduledAtIso,
          }
        );

        return NextResponse.json(
          {
            success: false,
            message:
              "La date a été enregistrée dans Brevo, mais Brevo a refusé de mettre la campagne en file d'envoi.",
            status: queueResponse.status,
            details: queueData,
          },
          {
            status: queueResponse.status,
          }
        );
      }

      const verification =
        await getBrevoCampaign(
          apiKey,
          campaignId
        );

      if (!verification.ok) {
        console.error(
          "Brevo campaign verification failed",
          {
            status: verification.status,
            data: verification.data,
            campaignId,
          }
        );

        return NextResponse.json(
          {
            success: false,
            message:
              "La campagne a été transmise à Brevo, mais son état n'a pas pu être vérifié.",
            status: verification.status,
            details: verification.data,
          },
          {
            status: verification.status,
          }
        );
      }

      const brevoCampaign =
        verification.data as BrevoCampaignState;

      if (brevoCampaign.status !== "queued") {
        console.error(
          "Brevo campaign is not queued after scheduling",
          {
            campaignId,
            brevoStatus:
              brevoCampaign.status ?? null,
            brevoScheduledAt:
              brevoCampaign.scheduledAt ?? null,
            expectedScheduledAt:
              scheduledAtIso,
          }
        );

        return NextResponse.json(
          {
            success: false,
            message:
              "Brevo n'a pas confirmé la programmation de la campagne.",
            brevo_status:
              brevoCampaign.status ?? null,
            brevo_scheduled_at:
              brevoCampaign.scheduledAt ?? null,
            expected_scheduled_at:
              scheduledAtIso,
          },
          {
            status: 409,
          }
        );
      }

      const updatedAt =
        new Date().toISOString();

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
              "La campagne Brevo est bien programmée mais LBMedia Office n'a pas pu enregistrer son statut.",
            error: updateError.message,
            brevo_campaign_id: campaignId,
          },
          {
            status: 500,
          }
        );
      }

      return NextResponse.json({
        success: true,
        scheduled: true,
        message: "Campagne Brevo programmée et confirmée par Brevo.",
        brevo_campaign_id: campaignId,
        brevo_status:
          brevoCampaign.status,
        brevo_scheduled_at:
          brevoCampaign.scheduledAt ??
          scheduledAtIso,
        publication:
          updatedPublication,
      });
    }

    const response = await fetch(
      `https://api.brevo.com/v3/emailCampaigns/${campaignId}/sendNow`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": apiKey,
        },
        cache: "no-store",
      }
    );

    const data =
      await readBrevoResponse(response);

    if (!response.ok) {
      console.error(
        "Brevo campaign send failed",
        {
          status: response.status,
          data,
          campaignId,
        }
      );

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

    const publishedAt =
      new Date().toISOString();

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
          brevo_campaign_id: campaignId,
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
      brevo_campaign_id: campaignId,
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
