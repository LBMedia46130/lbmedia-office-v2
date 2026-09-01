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
  sentDate?: string;
};

async function readBrevoResponse(
  response: Response
) {
  const rawResponse =
    await response.text();

  if (!rawResponse) {
    return null;
  }

  try {
    return JSON.parse(
      rawResponse
    ) as unknown;
  } catch {
    return rawResponse;
  }
}

const BREVO_LIST_ID = 5;
const BREVO_SENDER_ID = 2;
const LBMEDIA_LOGO_URL =
  "https://img.mailinblue.com/8095474/images/content_library/original/66f6bc4820e29b180f3403c2.png";
const FACEBOOK_URL =
  "https://www.facebook.com/lbmedia46";
const LINKEDIN_URL =
  "https://www.linkedin.com/company/lbmedia46/";
const FACEBOOK_ICON_URL =
  "https://creative-assets.mailinblue.com/editor/social-icons/rounded_colored/facebook_32px.png";
const LINKEDIN_ICON_URL =
  "https://creative-assets.mailinblue.com/editor/social-icons/rounded_colored/linkedin_32px.png";
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
      const existingCampaignId =
        publication.brevo_campaign_id;

      const existingResponse =
        await fetch(
          `https://api.brevo.com/v3/emailCampaigns/${existingCampaignId}`,
          {
            method: "GET",
            headers: {
              accept:
                "application/json",
              "api-key":
                apiKey,
            },
            cache: "no-store",
          }
        );

      const existingData =
        await readBrevoResponse(
          existingResponse
        );

      if (
        existingResponse.status === 404
      ) {
        const {
          error:
            clearExistingCampaignError,
        } = await supabaseAdmin
          .from("publications")
          .update({
            brevo_campaign_id:
              null,
            brevo_send_approved_at:
              null,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", id);

        if (
          clearExistingCampaignError
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                "La campagne Brevo enregistrée dans Office n'existe plus, mais son identifiant n'a pas pu être réinitialisé.",
              error:
                clearExistingCampaignError.message,
              brevo_campaign_id:
                existingCampaignId,
            },
            {
              status: 500,
            }
          );
        }
      } else if (!existingResponse.ok) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Impossible de vérifier l'état de la campagne Brevo existante.",
            status:
              existingResponse.status,
            details:
              existingData,
            brevo_campaign_id:
              existingCampaignId,
          },
          {
            status:
              existingResponse.status,
          }
        );
      } else {
        const existingCampaign =
          existingData as
            | BrevoCampaignState
            | null;

        const brevoStatus =
          existingCampaign?.status
            ?.toLowerCase()
            .trim() ?? "";

        if (brevoStatus === "draft") {
          return NextResponse.json(
            {
              success: true,
              alreadyExists: true,
              message:
                "Un brouillon Brevo existe déjà pour cette newsletter.",
              brevo_campaign_id:
                existingCampaignId,
              brevo_status:
                brevoStatus,
              publication,
            },
            {
              status: 200,
            }
          );
        }

        if (
          brevoStatus === "queued" ||
          brevoStatus === "scheduled"
        ) {
          const synchronizedAt =
            new Date().toISOString();

          const {
            data:
              synchronizedPublication,
            error:
              synchronizationError,
          } = await supabaseAdmin
            .from("publications")
            .update({
              status:
                "scheduled",
              scheduled_at:
                existingCampaign
                  ?.scheduledAt ??
                publication.scheduled_at,
              published_at:
                null,
              updated_at:
                synchronizedAt,
            })
            .eq("id", id)
            .select("*")
            .single();

          if (synchronizationError) {
            return NextResponse.json(
              {
                success: false,
                message:
                  "La campagne est programmée dans Brevo, mais Office n'a pas pu synchroniser son statut.",
                error:
                  synchronizationError.message,
                brevo_campaign_id:
                  existingCampaignId,
                brevo_status:
                  brevoStatus,
              },
              {
                status: 500,
              }
            );
          }

          return NextResponse.json(
            {
              success: true,
              alreadyExists: true,
              synchronized: true,
              message:
                "Cette campagne est déjà programmée dans Brevo.",
              brevo_campaign_id:
                existingCampaignId,
              brevo_status:
                brevoStatus,
              publication:
                synchronizedPublication,
            },
            {
              status: 200,
            }
          );
        }

        if (brevoStatus === "sent") {
          const publishedAt =
            existingCampaign?.sentDate
              ? new Date(
                  existingCampaign.sentDate
                ).toISOString()
              : new Date().toISOString();

          const {
            data:
              synchronizedPublication,
            error:
              synchronizationError,
          } = await supabaseAdmin
            .from("publications")
            .update({
              status:
                "published",
              scheduled_at:
                null,
              published_at:
                publishedAt,
              brevo_send_approved_at:
                null,
              updated_at:
                new Date().toISOString(),
            })
            .eq("id", id)
            .select("*")
            .single();

          if (synchronizationError) {
            return NextResponse.json(
              {
                success: false,
                message:
                  "La campagne a déjà été envoyée par Brevo, mais Office n'a pas pu synchroniser son statut.",
                error:
                  synchronizationError.message,
                brevo_campaign_id:
                  existingCampaignId,
                brevo_status:
                  brevoStatus,
              },
              {
                status: 500,
              }
            );
          }

          return NextResponse.json(
            {
              success: true,
              alreadyExists: true,
              synchronized: true,
              message:
                "Cette campagne a déjà été envoyée par Brevo. Office a été synchronisé.",
              brevo_campaign_id:
                existingCampaignId,
              brevo_status:
                brevoStatus,
              publication:
                synchronizedPublication,
            },
            {
              status: 200,
            }
          );
        }

        return NextResponse.json(
          {
            success: false,
            message:
              "La campagne Brevo existante n'est plus un brouillon réutilisable. Aucun nouveau brouillon n'a été créé par sécurité.",
            brevo_campaign_id:
              existingCampaignId,
            brevo_status:
              brevoStatus || null,
            details:
              existingData,
          },
          {
            status: 409,
          }
        );
      }
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
    let articleImageUrl:
      string | null = null;
    if (publication.news_id) {
      const {
        data: news,
        error: newsError,
      } = await supabaseAdmin
        .from("news")
        .select("image_url")
        .eq(
          "id",
          publication.news_id
        )
        .maybeSingle();
      if (newsError) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Impossible de charger le visuel de l'actualité.",
            error:
              newsError.message,
          },
          {
            status: 500,
          }
        );
      }
      articleImageUrl =
        news?.image_url?.trim() ||
        null;
    }
    const campaignName =
      publication.title?.trim() ||
      publication.subject.trim();
    const htmlContent =
      buildNewsletterHtml({
        title:
          publication.title?.trim() ||
          publication.subject.trim(),
        content:
          publication.content,
        imageUrl:
          articleImageUrl,
        linkUrl:
          publication.link_url?.trim() ||
          null,
      });
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
      htmlContent,
    };
    const response = await fetch(
      "https://api.brevo.com/v3/emailCampaigns",
      {
        method: "POST",
        headers: {
          accept:
            "application/json",
          "api-key":
            apiKey,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(
          payload
        ),
        cache: "no-store",
      }
    );
    const data =
      await readBrevoResponse(
        response
      );
    if (!response.ok) {
      console.error(
        "Brevo campaign creation failed",
        {
          status:
            response.status,
          data,
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
        "Brouillon Brevo créé avec le modèle LBMedia.",
      brevo_campaign_id:
        campaignId,
      brevo_list_id:
        BREVO_LIST_ID,
      brevo_sender_id:
        BREVO_SENDER_ID,
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
function buildNewsletterHtml({
  title,
  content,
  imageUrl,
  linkUrl,
}: {
  title: string;
  content: string;
  imageUrl: string | null;
  linkUrl: string | null;
}) {
  const titleHtml =
    escapeHtml(title);
  const contentHtml =
    buildContentHtml(
      content
    );
  const imageBlock =
    imageUrl
      ? `
        <tr>
          <td
            align="center"
            style="
              padding: 0 30px 24px;
            "
          >
            <img
              src="${escapeHtml(
                imageUrl
              )}"
              alt="${titleHtml}"
              width="420"
              style="
                display:block;
                width:100%;
                max-width:420px;
                height:auto;
                border:0;
                outline:none;
                text-decoration:none;
              "
            />
          </td>
        </tr>
      `
      : "";
  const ctaBlock =
    linkUrl
      ? `
        <tr>
          <td
            align="center"
            style="
              padding: 12px 0 30px;
            "
          >
            <a
              href="${escapeHtml(
                linkUrl
              )}"
              style="
                display:inline-block;
                min-width:220px;
                padding:14px 24px;
                background:#0092ff;
                border-radius:4px;
                color:#ffffff;
                font-family:Arial,Helvetica,sans-serif;
                font-size:16px;
                font-weight:600;
                line-height:1.2;
                text-align:center;
                text-decoration:none;
              "
            >
              Lire l'article complet
            </a>
          </td>
        </tr>
      `
      : "";
  return `
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  >
  <title>${titleHtml}</title>
</head>
<body
  style="
    margin:0;
    padding:0;
    background:#ffffff;
  "
>
  <table
    role="presentation"
    width="100%"
    cellspacing="0"
    cellpadding="0"
    border="0"
    style="
      width:100%;
      background:#ffffff;
    "
  >
    <tr>
      <td
        align="center"
        style="
          padding:0;
        "
      >
        <table
          role="presentation"
          width="600"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="
            width:100%;
            max-width:600px;
            margin:0 auto;
          "
        >
          <tr>
            <td
              align="center"
              style="
                padding:28px 20px 22px;
              "
            >
              <img
                src="${LBMEDIA_LOGO_URL}"
                alt="LBMedia"
                width="200"
                style="
                  display:block;
                  width:200px;
                  max-width:100%;
                  height:auto;
                  border:0;
                "
              />
            </td>
          </tr>
          <tr>
            <td
              style="
                padding:0 30px 18px;
                font-family:Arial,Helvetica,sans-serif;
                color:#1f2d3d;
              "
            >
              <h1
                style="
                  margin:0;
                  font-size:30px;
                  line-height:1.25;
                  font-weight:400;
                  color:#1f2d3d;
                "
              >
                ${titleHtml}
              </h1>
            </td>
          </tr>
          ${imageBlock}
          <tr>
            <td
              style="
                padding:0 30px 10px;
                font-family:Arial,Helvetica,sans-serif;
                font-size:16px;
                line-height:1.6;
                color:#3b3f44;
              "
            >
              ${contentHtml}
            </td>
          </tr>
          ${ctaBlock}
          <tr>
            <td
              style="
                padding:24px 30px;
                background:#eff2f7;
                font-family:Arial,Helvetica,sans-serif;
                color:#3b3f44;
                text-align:center;
              "
            >
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
              >
                <tr>
                  <td
                    align="center"
                    style="
                      padding:0 0 16px;
                    "
                  >
                    <a
                      href="${FACEBOOK_URL}"
                      style="
                        display:inline-block;
                        margin:0 4px;
                        text-decoration:none;
                      "
                    >
                      <img
                        src="${FACEBOOK_ICON_URL}"
                        alt="Facebook LBMedia"
                        width="32"
                        height="32"
                        style="
                          display:block;
                          border:0;
                        "
                      />
                    </a>
                    <a
                      href="${LINKEDIN_URL}"
                      style="
                        display:inline-block;
                        margin:0 4px;
                        text-decoration:none;
                      "
                    >
                      <img
                        src="${LINKEDIN_ICON_URL}"
                        alt="LinkedIn LBMedia"
                        width="32"
                        height="32"
                        style="
                          display:block;
                          border:0;
                        "
                      />
                    </a>
                  </td>
                </tr>
                <tr>
                  <td
                    align="center"
                    style="
                      padding:0 0 14px;
                      font-size:16px;
                      line-height:1.5;
                    "
                  >
                    <strong>LBMedia</strong><br>
                    19 rue de l'hôtel de ville<br>
                    46400 Saint-Céré
                  </td>
                </tr>
                <tr>
                  <td
                    align="center"
                    style="
                      padding:0 0 14px;
                      font-size:14px;
                      line-height:1.5;
                    "
                  >
                    Vous avez reçu cet email car vous êtes inscrit à notre newsletter.
                  </td>
                </tr>
                <tr>
                  <td
                    align="center"
                    style="
                      font-size:14px;
                      line-height:1.5;
                    "
                  >
                    <a
                      href="{{ unsubscribe }}"
                      style="
                        color:#0092ff;
                        text-decoration:underline;
                      "
                    >
                      Se désinscrire
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
function buildContentHtml(
  content: string
) {
  return content
    .split(/\n{2,}/)
    .map((block) =>
      block.trim()
    )
    .filter(Boolean)
    .map((block) => {
      const lines =
        block
          .split("\n")
          .map((line) =>
            line.trim()
          )
          .filter(Boolean);
      const bulletLines =
        lines.filter((line) =>
          /^[-*]\s+/.test(line)
        );
      if (
        bulletLines.length ===
          lines.length &&
        lines.length > 0
      ) {
        return `
          <ul
            style="
              margin:0 0 18px;
              padding-left:22px;
            "
          >
            ${lines
              .map(
                (line) => `
                  <li
                    style="
                      margin:0 0 8px;
                    "
                  >
                    ${escapeHtml(
                      line.replace(
                        /^[-*]\s+/,
                        ""
                      )
                    )}
                  </li>
                `
              )
              .join("")}
          </ul>
        `;
      }
      return `
        <p
          style="
            margin:0 0 18px;
          "
        >
          ${lines
            .map((line) =>
              escapeHtml(line)
            )
            .join("<br>")}
        </p>
      `;
    })
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
