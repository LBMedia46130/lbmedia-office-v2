import { NextResponse } from "next/server";

import {
  publicationStatuses,
  type UpdatePublicationInput,
} from "@/lib/news";

import { supabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function hasBrevoContentChange(
  body: UpdatePublicationInput
) {
  return (
    body.title !== undefined ||
    body.content !== undefined ||
    body.subject !== undefined ||
    body.preview_text !== undefined ||
    body.link_url !== undefined
  );
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  const { id } =
    await context.params;

  let body: UpdatePublicationInput;

  try {
    body =
      await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message:
          "Les données envoyées sont invalides.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    body.status &&
    !publicationStatuses.includes(
      body.status
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Le statut est invalide.",
      },
      {
        status: 400,
      }
    );
  }

  const {
    data: currentPublication,
    error:
      currentPublicationError,
  } = await supabaseAdmin
    .from("publications")
    .select(`
      id,
      channel,
      status,
      scheduled_at,
      published_at,
      brevo_send_approved_at
    `)
    .eq("id", id)
    .maybeSingle();

  if (
    currentPublicationError
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible de charger la déclinaison.",
        error:
          currentPublicationError.message,
      },
      {
        status: 500,
      }
    );
  }

  if (!currentPublication) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Déclinaison introuvable.",
      },
      {
        status: 404,
      }
    );
  }

  const nextStatus =
    body.status ??
    currentPublication.status;

  const nextScheduledAt =
    body.scheduled_at !==
    undefined
      ? body.scheduled_at
      : currentPublication.scheduled_at;

  if (
    nextStatus ===
      "scheduled" &&
    !nextScheduledAt
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Une publication planifiée doit avoir une date et une heure de publication.",
      },
      {
        status: 400,
      }
    );
  }

  const now =
    new Date().toISOString();

  const updateData: Record<
    string,
    string | null
  > = {
    updated_at: now,
  };

  if (
    body.title !== undefined
  ) {
    updateData.title =
      body.title?.trim() ||
      null;
  }

  if (
    body.content !== undefined
  ) {
    updateData.content =
      body.content.trim();
  }

  if (
    body.status !== undefined
  ) {
    updateData.status =
      body.status;

    if (
      body.status ===
      "published"
    ) {
      updateData.published_at =
        currentPublication.published_at ??
        now;
    } else if (
      currentPublication.status ===
      "published"
    ) {
      updateData.published_at =
        null;
    }

    if (
      body.status !==
        "scheduled" &&
      body.status !==
        "published"
    ) {
      updateData.scheduled_at =
        null;
    }

    if (
      currentPublication.channel ===
        "brevo" &&
      body.status !==
        "scheduled"
    ) {
      updateData.brevo_send_approved_at =
        null;
    }
  }

  if (
    body.slug !== undefined
  ) {
    updateData.slug =
      body.slug?.trim() ||
      null;
  }

  if (
    body.seo_title !==
    undefined
  ) {
    updateData.seo_title =
      body.seo_title?.trim() ||
      null;
  }

  if (
    body.meta_description !==
    undefined
  ) {
    updateData.meta_description =
      body.meta_description?.trim() ||
      null;
  }

  if (
    body.focus_keyword !==
    undefined
  ) {
    updateData.focus_keyword =
      body.focus_keyword?.trim() ||
      null;
  }

  if (
    body.secondary_keywords !==
    undefined
  ) {
    updateData.secondary_keywords =
      body.secondary_keywords?.trim() ||
      null;
  }

  if (
    body.image_alt !==
    undefined
  ) {
    updateData.image_alt =
      body.image_alt?.trim() ||
      null;
  }

  if (
    body.image_url !==
    undefined
  ) {
    updateData.image_url =
      body.image_url?.trim() ||
      null;
  }

  if (
    body.subject !== undefined
  ) {
    updateData.subject =
      body.subject?.trim() ||
      null;
  }

  if (
    body.preview_text !==
    undefined
  ) {
    updateData.preview_text =
      body.preview_text?.trim() ||
      null;
  }

  if (
    body.call_to_action !==
    undefined
  ) {
    updateData.call_to_action =
      body.call_to_action?.trim() ||
      null;
  }

  if (
    body.link_url !== undefined
  ) {
    updateData.link_url =
      body.link_url?.trim() ||
      null;
  }

  if (
    body.hashtags !== undefined
  ) {
    updateData.hashtags =
      body.hashtags?.trim() ||
      null;
  }

  if (
    body.follow_up_text !==
    undefined
  ) {
    updateData.follow_up_text =
      body.follow_up_text?.trim() ||
      null;
  }

  if (
    body.scheduled_at !==
    undefined
  ) {
    updateData.scheduled_at =
      nextStatus ===
        "scheduled" ||
      nextStatus ===
        "published"
        ? body.scheduled_at
        : null;
  }

  if (
    currentPublication.channel ===
      "brevo" &&
    hasBrevoContentChange(body)
  ) {
    updateData.brevo_send_approved_at =
      null;
  }

  if (
    body.brevo_send_approved_at !==
    undefined
  ) {
    updateData.brevo_send_approved_at =
      body.brevo_send_approved_at;
  }

  const {
    data,
    error,
  } = await supabaseAdmin
    .from("publications")
    .update(updateData)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible d’enregistrer la déclinaison.",
        error:
          error.message,
      },
      {
        status: 500,
      }
    );
  }

  if (!data) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Déclinaison introuvable.",
      },
      {
        status: 404,
      }
    );
  }

  return NextResponse.json({
    success: true,
    publication: data,
  });
}