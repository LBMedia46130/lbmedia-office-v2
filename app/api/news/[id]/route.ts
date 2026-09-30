import { NextResponse } from "next/server";

import {
  newsStatuses,
  type UpdateNewsInput,
} from "@/lib/news";

import { supabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  const { id } = await context.params;

  const { data, error } =
    await supabaseAdmin
      .from("news")
      .select(`
        *,
        publications (*)
      `)
      .eq("id", id)
      .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible de récupérer l’actualité.",
        error: error.message,
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
          "Actualité introuvable.",
      },
      {
        status: 404,
      }
    );
  }

  return NextResponse.json({
    success: true,
    news: data,
  });
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  const { id } = await context.params;

  let body: UpdateNewsInput;

  try {
    body = await request.json();
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
    !newsStatuses.includes(
      body.status
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Le statut de l’actualité est invalide.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    body.title !== undefined &&
    !body.title.trim()
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Le titre de l’actualité ne peut pas être vide.",
      },
      {
        status: 400,
      }
    );
  }

  const {
    data: currentNews,
    error: currentNewsError,
  } = await supabaseAdmin
    .from("news")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (currentNewsError) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible de charger l’actualité.",
        error:
          currentNewsError.message,
      },
      {
        status: 500,
      }
    );
  }

  if (!currentNews) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Actualité introuvable.",
      },
      {
        status: 404,
      }
    );
  }

  const {
    data: websitePublication,
    error: websiteError,
  } = await supabaseAdmin
    .from("publications")
    .select(
      "id, status, scheduled_at, published_at"
    )
    .eq("news_id", id)
    .eq("channel", "website")
    .maybeSingle();

  if (websiteError) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible de charger la publication WordPress associée.",
        error:
          websiteError.message,
      },
      {
        status: 500,
      }
    );
  }

  if (
    body.status === "scheduled" &&
    !websitePublication?.scheduled_at
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Choisis une date et une heure avant de planifier l’actualité.",
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

  if (body.title !== undefined) {
    updateData.title =
      body.title.trim();
  }

  if (body.content !== undefined) {
    updateData.content =
      body.content.trim();
  }

  if (body.status !== undefined) {
    updateData.status =
      body.status;
  }

  if (
    body.image_url !== undefined
  ) {
    updateData.image_url =
      body.image_url?.trim() ||
      null;
  }

  if (
    body.source_url !== undefined
  ) {
    updateData.source_url =
      body.source_url?.trim() ||
      null;
  }

  const {
    data: updatedNews,
    error: updateNewsError,
  } = await supabaseAdmin
    .from("news")
    .update(updateData)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (updateNewsError) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible de modifier l’actualité.",
        error:
          updateNewsError.message,
      },
      {
        status: 500,
      }
    );
  }

  if (!updatedNews) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Actualité introuvable.",
      },
      {
        status: 404,
      }
    );
  }

  if (
    body.status !== undefined &&
    websitePublication
  ) {
    const websiteUpdate: Record<
      string,
      string | null
    > = {
      status: body.status,
      updated_at: now,
    };

    if (
      body.status === "published"
    ) {
      websiteUpdate.published_at =
        websitePublication.published_at ??
        now;
    } else if (
      websitePublication.status ===
      "published"
    ) {
      websiteUpdate.published_at =
        null;
    }

    if (
      body.status === "draft" ||
      body.status === "ready"
    ) {
      websiteUpdate.scheduled_at =
        null;
    }

    const {
      error:
        websiteUpdateError,
    } = await supabaseAdmin
      .from("publications")
      .update(websiteUpdate)
      .eq(
        "id",
        websitePublication.id
      );

    if (websiteUpdateError) {
      return NextResponse.json(
        {
          success: false,
          message:
            "L’actualité a été enregistrée, mais son statut WordPress n’a pas pu être synchronisé.",
          error:
            websiteUpdateError.message,
        },
        {
          status: 500,
        }
      );
    }
  }

  return NextResponse.json({
    success: true,
    news: updatedNews,
  });
}

export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  const { id } = await context.params;

  const {
    data: currentNews,
    error: currentNewsError,
  } = await supabaseAdmin
    .from("news")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (currentNewsError) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible de charger l’actualité.",
        error: currentNewsError.message,
      },
      {
        status: 500,
      }
    );
  }

  if (!currentNews) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Actualité introuvable.",
      },
      {
        status: 404,
      }
    );
  }

  if (currentNews.status === "published") {
    return NextResponse.json(
      {
        success: false,
        message:
          "Une actualité publiée ne peut pas être supprimée depuis LBMedia Office.",
      },
      {
        status: 409,
      }
    );
  }

  const { error: publicationsError } =
    await supabaseAdmin
      .from("publications")
      .delete()
      .eq("news_id", id);

  if (publicationsError) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible de supprimer les déclinaisons associées.",
        error: publicationsError.message,
      },
      {
        status: 500,
      }
    );
  }

  const { data, error } =
    await supabaseAdmin
      .from("news")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible de supprimer l’actualité.",
        error: error.message,
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
          "Actualité introuvable.",
      },
      {
        status: 404,
      }
    );
  }

  return NextResponse.json({
    success: true,
  });
}
