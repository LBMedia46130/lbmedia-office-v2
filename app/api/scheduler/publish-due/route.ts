import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
type ScheduledPublication = {
  id: string;
  channel: string;
  title: string | null;
  content: string;
  slug: string | null;
  meta_description: string | null;
  subject: string | null;
  preview_text: string | null;
  link_url: string | null;
  wordpress_post_id: number | null;
  brevo_campaign_id: number | null;
  brevo_send_approved_at: string | null;
  scheduled_at: string | null;
};
type PublicationResult = {
  id: string;
  channel: string;
  success: boolean;
  blocked?: boolean;
  message: string;
};
function wordpressPublishingIsAllowed() {
  return (
    process.env.ALLOW_WORDPRESS_PUBLISHING ===
    "true"
  );
}
function facebookPublishingIsAllowed() {
  return (
    process.env.ALLOW_FACEBOOK_PUBLISHING ===
    "true"
  );
}
function brevoPublishingIsAllowed() {
  return (
    process.env.ALLOW_BREVO_PUBLISHING ===
    "true"
  );
}
function channelPublishingIsAllowed(
  channel: string
) {
  switch (channel) {
    case "website":
      return wordpressPublishingIsAllowed();
    case "facebook":
      return facebookPublishingIsAllowed();
    case "brevo":
      return brevoPublishingIsAllowed();
    default:
      return false;
  }
}
function getBlockedMessage(
  channel: string
) {
  switch (channel) {
    case "website":
      return "Publication WordPress bloquée par sécurité. ALLOW_WORDPRESS_PUBLISHING doit être défini à true.";
    case "facebook":
      return "Publication Facebook bloquée par sécurité. ALLOW_FACEBOOK_PUBLISHING doit être défini à true.";
    case "brevo":
      return "Envoi Brevo bloqué par sécurité. ALLOW_BREVO_PUBLISHING doit être défini à true.";
    default:
      return "Publication externe bloquée par sécurité.";
  }
}
function getWordPressConfig() {
  const wordpressUrl =
    process.env.WORDPRESS_URL;
  const username =
    process.env.WORDPRESS_USERNAME;
  const appPassword =
    process.env.WORDPRESS_APP_PASSWORD;
  if (
    !wordpressUrl ||
    !username ||
    !appPassword
  ) {
    throw new Error(
      "Configuration WordPress incomplète."
    );
  }
  return {
    wordpressUrl,
    username,
    appPassword,
  };
}
function formatExternalError(
  data: unknown
) {
  if (typeof data === "string") {
    return data;
  }
  try {
    return JSON.stringify(data);
  } catch {
    return "Réponse externe illisible.";
  }
}
async function publishWordPress(
  publication: ScheduledPublication
): Promise<PublicationResult> {
  if (
    publication.channel !== "website"
  ) {
    return {
      id: publication.id,
      channel: publication.channel,
      success: false,
      message:
        "Canal WordPress invalide.",
    };
  }
  if (
    !publication.wordpress_post_id
  ) {
    throw new Error(
      "Aucun brouillon WordPress n’existe pour cette actualité."
    );
  }
  if (!publication.content?.trim()) {
    throw new Error(
      "Le contenu WordPress est vide."
    );
  }
  const {
    wordpressUrl,
    username,
    appPassword,
  } = getWordPressConfig();
  const authorization =
    Buffer.from(
      `${username}:${appPassword}`
    ).toString("base64");
  const response = await fetch(
    `${wordpressUrl}/wp-json/wp/v2/posts/${publication.wordpress_post_id}`,
    {
      method: "POST",
      headers: {
        Authorization:
          `Basic ${authorization}`,
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        title:
          publication.title ||
          "Actualité LBMedia",
        content:
          publication.content,
        slug:
          publication.slug ||
          undefined,
        excerpt:
          publication.meta_description ||
          undefined,
        status: "publish",
      }),
      cache: "no-store",
    }
  );
  const rawResponse =
    await response.text();
  let wordpressData: unknown = null;
  try {
    wordpressData = rawResponse
      ? JSON.parse(rawResponse)
      : null;
  } catch {
    wordpressData = rawResponse;
  }
  if (!response.ok) {
    throw new Error(
      `WordPress a refusé la publication (${response.status}) : ${formatExternalError(
        wordpressData
      )}`
    );
  }
  const data =
    wordpressData as {
      id?: number;
      link?: string;
      date_gmt?: string;
    } | null;
  const publishedAt =
    data?.date_gmt
      ? new Date(
          `${data.date_gmt}Z`
        ).toISOString()
      : new Date().toISOString();
  const {
    error: updateError,
  } = await supabaseAdmin
    .from("publications")
    .update({
      status: "published",
      published_at:
        publishedAt,
      published_url:
        data?.link ?? null,
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", publication.id);
  if (updateError) {
    throw new Error(
      `Publication WordPress effectuée, mais statut LBMedia Office non enregistré : ${updateError.message}`
    );
  }
  const newsId =
    await getNewsId(
      publication.id
    );
  const {
    error: newsUpdateError,
  } = await supabaseAdmin
    .from("news")
    .update({
      status: "published",
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", newsId);
  if (newsUpdateError) {
    throw new Error(
      `Article publié, mais statut de l’actualité non synchronisé : ${newsUpdateError.message}`
    );
  }
  return {
    id: publication.id,
    channel: "website",
    success: true,
    message:
      "Actualité publiée sur WordPress.",
  };
}
async function publishFacebook(
  publication: ScheduledPublication
): Promise<PublicationResult> {
  if (!publication.content?.trim()) {
    throw new Error(
      "Le contenu Facebook est vide."
    );
  }
  const pageId =
    process.env.META_PAGE_ID;
  const accessToken =
    process.env.META_PAGE_ACCESS_TOKEN;
  if (!pageId || !accessToken) {
    throw new Error(
      "Configuration Meta incomplète."
    );
  }
  const messageParts = [
    publication.content.trim(),
  ];
  if (publication.link_url?.trim()) {
    messageParts.push(
      publication.link_url.trim()
    );
  }
  const body =
    new URLSearchParams();
  body.set(
    "message",
    messageParts.join("\n\n")
  );
  body.set(
    "access_token",
    accessToken
  );
  const response = await fetch(
    `https://graph.facebook.com/v26.0/${pageId}/feed`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      cache: "no-store",
    }
  );
  const rawResponse =
    await response.text();
  let metaData: unknown = null;
  try {
    metaData = rawResponse
      ? JSON.parse(rawResponse)
      : null;
  } catch {
    metaData = rawResponse;
  }
  if (!response.ok) {
    throw new Error(
      `Meta a refusé la publication Facebook (${response.status}) : ${formatExternalError(
        metaData
      )}`
    );
  }
  const data =
    metaData as {
      id?: string;
    } | null;
  const facebookPostId =
    typeof data?.id === "string"
      ? data.id
      : null;
  const publishedUrl =
    facebookPostId
      ? `https://www.facebook.com/${facebookPostId.replace(
          "_",
          "/posts/"
        )}`
      : null;
  const publishedAt =
    new Date().toISOString();
  const {
    error: updateError,
  } = await supabaseAdmin
    .from("publications")
    .update({
      status: "published",
      published_at:
        publishedAt,
      published_url:
        publishedUrl,
      updated_at:
        publishedAt,
    })
    .eq("id", publication.id);
  if (updateError) {
    throw new Error(
      `Facebook publié, mais statut LBMedia Office non enregistré : ${updateError.message}`
    );
  }
  return {
    id: publication.id,
    channel: "facebook",
    success: true,
    message:
      "Publication Facebook effectuée.",
  };
}
async function sendBrevo(
  publication: ScheduledPublication
): Promise<PublicationResult> {
  if (
    publication.channel !== "brevo"
  ) {
    return {
      id: publication.id,
      channel: publication.channel,
      success: false,
      message:
        "Canal Brevo invalide.",
    };
  }
  if (
    !publication.brevo_send_approved_at
  ) {
    return {
      id: publication.id,
      channel: "brevo",
      success: false,
      blocked: true,
      message:
        "Envoi Brevo bloqué : cette newsletter n’a pas reçu d’autorisation explicite d’envoi.",
    };
  }
  const apiKey =
    process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error(
      "La clé API Brevo n'est pas configurée."
    );
  }
  if (
    !publication.brevo_campaign_id
  ) {
    throw new Error(
      "Aucun brouillon Brevo n'existe encore pour cette newsletter."
    );
  }
  const response = await fetch(
    `https://api.brevo.com/v3/emailCampaigns/${publication.brevo_campaign_id}/sendNow`,
    {
      method: "POST",
      headers: {
        accept:
          "application/json",
        "api-key":
          apiKey,
      },
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
    throw new Error(
      `Brevo a refusé l'envoi (${response.status}) : ${formatExternalError(
        data
      )}`
    );
  }
  const publishedAt =
    new Date().toISOString();
  const {
    error: updateError,
  } = await supabaseAdmin
    .from("publications")
    .update({
      status: "published",
      published_at:
        publishedAt,
      updated_at:
        publishedAt,
    })
    .eq("id", publication.id);
  if (updateError) {
    throw new Error(
      `Campagne Brevo envoyée, mais statut LBMedia Office non enregistré : ${updateError.message}`
    );
  }
  return {
    id: publication.id,
    channel: "brevo",
    success: true,
    message:
      "Campagne Brevo envoyée.",
  };
}
async function getNewsId(
  publicationId: string
) {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("publications")
    .select("news_id")
    .eq("id", publicationId)
    .single();
  if (error || !data) {
    throw new Error(
      "Impossible de retrouver l’actualité associée."
    );
  }
  return data.news_id;
}
async function markFailed(
  publicationId: string,
  errorMessage: string
) {
  const now =
    new Date().toISOString();
  const {
    error,
  } = await supabaseAdmin
    .from("publications")
    .update({
      status: "failed",
      updated_at: now,
    })
    .eq("id", publicationId);
  if (error) {
    console.error(
      "Unable to mark scheduled publication as failed",
      {
        publicationId,
        error:
          error.message,
      }
    );
  }
  console.error(
    "Scheduled publication failed",
    {
      publicationId,
      errorMessage,
    }
  );
}
async function handleScheduler(
  request: Request
) {
  const cronSecret =
    process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      {
        success: false,
        message:
          "CRON_SECRET n'est pas configuré.",
      },
      {
        status: 500,
      }
    );
  }
  const authorization =
    request.headers.get(
      "authorization"
    );
  if (
    authorization !==
    `Bearer ${cronSecret}`
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Accès non autorisé.",
      },
      {
        status: 401,
      }
    );
  }
  const now =
    new Date().toISOString();
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("publications")
    .select(`
      id,
      channel,
      title,
      content,
      slug,
      meta_description,
      subject,
      preview_text,
      link_url,
      wordpress_post_id,
      brevo_campaign_id,
      brevo_send_approved_at,
      scheduled_at
    `)
    .eq(
      "status",
      "scheduled"
    )
    .lte(
      "scheduled_at",
      now
    )
    .in(
      "channel",
      [
        "website",
        "facebook",
        "brevo",
      ]
    )
    .order(
      "scheduled_at",
      {
        ascending: true,
      }
    );
  if (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible de charger les publications à traiter.",
        error:
          error.message,
      },
      {
        status: 500,
      }
    );
  }
  const publications =
    (data ??
      []) as ScheduledPublication[];
  const results:
    PublicationResult[] = [];
  for (
    const publication
    of publications
  ) {
    if (
      !channelPublishingIsAllowed(
        publication.channel
      )
    ) {
      results.push({
        id: publication.id,
        channel:
          publication.channel,
        success: false,
        blocked: true,
        message:
          getBlockedMessage(
            publication.channel
          ),
      });
      continue;
    }
    try {
      if (
        publication.channel ===
        "website"
      ) {
        results.push(
          await publishWordPress(
            publication
          )
        );
        continue;
      }
      if (
        publication.channel ===
        "facebook"
      ) {
        results.push(
          await publishFacebook(
            publication
          )
        );
        continue;
      }
      if (
        publication.channel ===
        "brevo"
      ) {
        results.push(
          await sendBrevo(
            publication
          )
        );
      }
    } catch (publicationError) {
      const message =
        publicationError instanceof
        Error
          ? publicationError.message
          : "Erreur inconnue";
      await markFailed(
        publication.id,
        message
      );
      results.push({
        id: publication.id,
        channel:
          publication.channel,
        success: false,
        message,
      });
    }
  }
  const published =
    results.filter(
      (result) =>
        result.success
    ).length;
  const blocked =
    results.filter(
      (result) =>
        result.blocked
    ).length;
  const failed =
    results.filter(
      (result) =>
        !result.success &&
        !result.blocked
    ).length;
  return NextResponse.json({
    success: true,
    checked_at: now,
    processed:
      publications.length,
    published,
    blocked,
    failed,
    results,
  });
}
export async function GET(request: Request) {
  return handleScheduler(request);
}
export async function POST(request: Request) {
  return handleScheduler(request);
}
