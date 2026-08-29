import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type WordPressPost = {
  id?: number | string;
  link?: string;
  meta?: Record<string, unknown>;
};

type ElementorNode = {
  id?: string;
  elType?: string;
  widgetType?: string;
  settings?: Record<string, unknown>;
  elements?: ElementorNode[];
};

const ELEMENTOR_TEMPLATE_POST_ID = 2468;

const TITLE_MARKER =
  "TITRE_ARTICLE_LBMEDIA";

const CONTENT_MARKER =
  "CONTENU_ARTICLE_LBMEDIA";

const IMAGE_MARKER =
  "image_article_lbmedia";

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
    wordpressUrl:
      wordpressUrl.replace(/\/+$/, ""),
    username,
    appPassword,
  };
}

function getAuthorization(
  username: string,
  appPassword: string
) {
  return `Basic ${Buffer.from(
    `${username}:${appPassword}`
  ).toString("base64")}`;
}

function deepClone<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value)
  ) as T;
}

function normalizeElementorData(
  value: unknown
): ElementorNode[] {
  if (Array.isArray(value)) {
    return value as ElementorNode[];
  }

  if (
    typeof value === "string" &&
    value.trim()
  ) {
    const parsed =
      JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parsed as ElementorNode[];
    }
  }

  throw new Error(
    "Les données Elementor du modèle sont introuvables ou invalides."
  );
}

function objectContainsValue(
  value: unknown,
  expected: string
): boolean {
  if (typeof value === "string") {
    return value.includes(
      expected
    );
  }

  if (Array.isArray(value)) {
    return value.some((item) =>
      objectContainsValue(
        item,
        expected
      )
    );
  }

  if (
    value &&
    typeof value === "object"
  ) {
    return Object.values(
      value as Record<string, unknown>
    ).some((item) =>
      objectContainsValue(
        item,
        expected
      )
    );
  }

  return false;
}

function findNodeByMarker(
  nodes: ElementorNode[],
  marker: string
): ElementorNode | null {
  for (const node of nodes) {
    if (
      node.settings &&
      objectContainsValue(
        node.settings,
        marker
      )
    ) {
      return node;
    }

    if (Array.isArray(node.elements)) {
      const child =
        findNodeByMarker(
          node.elements,
          marker
        );

      if (child) {
        return child;
      }
    }
  }

  return null;
}

function findNodeById(
  nodes: ElementorNode[],
  id: string
): ElementorNode | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }

    if (Array.isArray(node.elements)) {
      const child =
        findNodeById(
          node.elements,
          id
        );

      if (child) {
        return child;
      }
    }
  }

  return null;
}

function getMarkerNodeIds(
  templateNodes: ElementorNode[]
) {
  const titleNode =
    findNodeByMarker(
      templateNodes,
      TITLE_MARKER
    );

  const contentNode =
    findNodeByMarker(
      templateNodes,
      CONTENT_MARKER
    );

  const imageNode =
    findNodeByMarker(
      templateNodes,
      IMAGE_MARKER
    );

  if (!titleNode?.id) {
    throw new Error(
      `Le marqueur ${TITLE_MARKER} est introuvable dans le modèle Elementor ${ELEMENTOR_TEMPLATE_POST_ID}.`
    );
  }

  if (!contentNode?.id) {
    throw new Error(
      `Le marqueur ${CONTENT_MARKER} est introuvable dans le modèle Elementor ${ELEMENTOR_TEMPLATE_POST_ID}.`
    );
  }

  if (!imageNode?.id) {
    throw new Error(
      `Le repère image ${IMAGE_MARKER} est introuvable dans le modèle Elementor ${ELEMENTOR_TEMPLATE_POST_ID}.`
    );
  }

  return {
    titleNodeId:
      titleNode.id,
    contentNodeId:
      contentNode.id,
    imageNodeId:
      imageNode.id,
  };
}

function replaceMarkerInSettings(
  settings: Record<string, unknown>,
  marker: string,
  replacement: string
) {
  for (
    const [key, value]
    of Object.entries(settings)
  ) {
    if (
      typeof value === "string" &&
      value.includes(
        marker
      )
    ) {
      settings[key] =
        value.replace(
          marker,
          replacement
        );

      return true;
    }
  }

  return false;
}

function escapeHtml(
  value: string
) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function applyInlineMarkdown(
  value: string
) {
  return value
    .replace(
      /\*\*([^*]+)\*\*/g,
      "<strong>$1</strong>"
    )
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
      '<a href="$2">$1</a>'
    );
}

function articleContentToHtml(
  content: string
) {
  const trimmed =
    content.trim();

  if (!trimmed) {
    return "";
  }

  if (
    /<\/?(p|h[1-6]|ul|ol|li|blockquote|strong|a)\b/i.test(
      trimmed
    )
  ) {
    return trimmed;
  }

  const lines =
    trimmed
      .replace(/\r\n/g, "\n")
      .split("\n");

  const html: string[] = [];

  let paragraph: string[] =
    [];

  let listType:
    "ul" | "ol" | null =
    null;

  function flushParagraph() {
    if (
      paragraph.length === 0
    ) {
      return;
    }

    const value =
      paragraph
        .join(" ")
        .trim();

    if (value) {
      html.push(
        `<p>${applyInlineMarkdown(
          escapeHtml(value)
        )}</p>`
      );
    }

    paragraph = [];
  }

  function closeList() {
    if (!listType) {
      return;
    }

    html.push(
      `</${listType}>`
    );

    listType = null;
  }

  function getNextNonEmptyLine(
    fromIndex: number
  ) {
    for (
      let index =
        fromIndex;
      index <
        lines.length;
      index += 1
    ) {
      const candidate =
        lines[index].trim();

      if (candidate) {
        return candidate;
      }
    }

    return null;
  }

  for (
    let index = 0;
    index < lines.length;
    index += 1
  ) {
    const line =
      lines[index].trim();

    if (!line) {
      flushParagraph();

      if (listType) {
        const nextLine =
          getNextNonEmptyLine(
            index + 1
          );

        const nextIsSameListType =
          listType === "ul"
            ? Boolean(
                nextLine?.match(
                  /^[-*]\s+(.+)$/
                )
              )
            : Boolean(
                nextLine?.match(
                  /^\d+[.)]\s+(.+)$/
                )
              );

        if (
          !nextIsSameListType
        ) {
          closeList();
        }
      }

      continue;
    }

    const headingMatch =
      line.match(
        /^(#{2,4})\s+(.+)$/
      );

    if (headingMatch) {
      flushParagraph();
      closeList();

      const level =
        headingMatch[1].length;

      html.push(
        `<h${level}>${applyInlineMarkdown(
          escapeHtml(
            headingMatch[2]
          )
        )}</h${level}>`
      );

      continue;
    }

    const bulletMatch =
      line.match(
        /^[-*]\s+(.+)$/
      );

    if (bulletMatch) {
      flushParagraph();

      if (
        listType !== "ul"
      ) {
        closeList();

        listType = "ul";

        html.push("<ul>");
      }

      html.push(
        `<li>${applyInlineMarkdown(
          escapeHtml(
            bulletMatch[1]
          )
        )}</li>`
      );

      continue;
    }

    const numberedMatch =
      line.match(
        /^\d+[.)]\s+(.+)$/
      );

    if (numberedMatch) {
      flushParagraph();

      if (
        listType !== "ol"
      ) {
        closeList();

        listType = "ol";

        html.push("<ol>");
      }

      html.push(
        `<li>${applyInlineMarkdown(
          escapeHtml(
            numberedMatch[1]
          )
        )}</li>`
      );

      continue;
    }

    closeList();

    paragraph.push(line);
  }

  flushParagraph();
  closeList();

  return html.join("\n");
}

function injectArticleIntoElementor(
  sourceNodes: ElementorNode[],
  markerNodeIds: {
    titleNodeId: string;
    contentNodeId: string;
    imageNodeId: string;
  },
  values: {
    title: string;
    contentHtml: string;
    imageUrl: string | null;
  }
) {
  const nodes =
    deepClone(
      sourceNodes
    );

  const titleNode =
    findNodeById(
      nodes,
      markerNodeIds.titleNodeId
    );

  const contentNode =
    findNodeById(
      nodes,
      markerNodeIds.contentNodeId
    );

  const imageNode =
    findNodeById(
      nodes,
      markerNodeIds.imageNodeId
    );

  if (!titleNode?.settings) {
    throw new Error(
      "Le widget titre du modèle Elementor est introuvable."
    );
  }

  if (!contentNode?.settings) {
    throw new Error(
      "Le widget contenu du modèle Elementor est introuvable."
    );
  }

  if (!imageNode?.settings) {
    throw new Error(
      "Le widget image du modèle Elementor est introuvable."
    );
  }

  if (
    !replaceMarkerInSettings(
      titleNode.settings,
      TITLE_MARKER,
      values.title
    )
  ) {
    if (
      typeof titleNode.settings
        .title === "string"
    ) {
      titleNode.settings.title =
        values.title;
    } else {
      throw new Error(
        "Le champ titre du widget Elementor n’a pas pu être identifié."
      );
    }
  }

  if (
    !replaceMarkerInSettings(
      contentNode.settings,
      CONTENT_MARKER,
      values.contentHtml
    )
  ) {
    if (
      typeof contentNode.settings
        .editor === "string"
    ) {
      contentNode.settings.editor =
        values.contentHtml;
    } else {
      throw new Error(
        "Le champ contenu du widget Elementor n’a pas pu être identifié."
      );
    }
  }

  const currentImage =
    imageNode.settings.image;

  const currentImageObject =
    currentImage &&
    typeof currentImage === "object" &&
    !Array.isArray(currentImage)
      ? deepClone(
          currentImage as Record<string, unknown>
        )
      : {};

  imageNode.settings.image = {
    ...currentImageObject,
    id: "",
    url:
      values.imageUrl ?? "",
  };

  return nodes;
}

async function getWordPressPost(
  wordpressUrl: string,
  authorization: string,
  postId: number
) {
  const response =
    await fetch(
      `${wordpressUrl}/wp-json/wp/v2/posts/${postId}?context=edit`,
      {
        method: "GET",
        headers: {
          Authorization:
            authorization,
          Accept:
            "application/json",
        },
        cache:
          "no-store",
      }
    );

  const data =
    (await response.json()) as
      WordPressPost;

  if (!response.ok) {
    throw new Error(
      `Impossible de charger le contenu WordPress ${postId}.`
    );
  }

  return data;
}

function getElementorMeta(
  post: WordPressPost
) {
  return post.meta &&
    typeof post.meta === "object"
    ? post.meta
    : {};
}

function copyElementorMeta(
  meta: Record<string, unknown>
) {
  const result:
    Record<string, unknown> =
    {};

  for (
    const [key, value]
    of Object.entries(meta)
  ) {
    if (
      key
        .toLowerCase()
        .includes("elementor")
    ) {
      result[key] =
        deepClone(value);
    }
  }

  return result;
}

export async function POST(
  _request: Request,
  context: RouteContext
) {
  const { id } =
    await context.params;

  try {
    const {
      wordpressUrl,
      username,
      appPassword,
    } = getWordPressConfig();

    const authorization =
      getAuthorization(
        username,
        appPassword
      );

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
      publication.channel !== "website"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cette publication n’est pas destinée au site web.",
        },
        {
          status: 400,
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
            "Le contenu de l’article est vide.",
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
        throw new Error(
          `Impossible de charger le visuel de l’actualité : ${newsError.message}`
        );
      }

      articleImageUrl =
        news?.image_url?.trim() ??
        null;
    }

    const templatePost =
      await getWordPressPost(
        wordpressUrl,
        authorization,
        ELEMENTOR_TEMPLATE_POST_ID
      );

    const templateMeta =
      getElementorMeta(
        templatePost
      );

    const templateElementorData =
      normalizeElementorData(
        templateMeta._elementor_data
      );

    const markerNodeIds =
      getMarkerNodeIds(
        templateElementorData
      );

    const hasExistingWordPressPost =
      typeof publication.wordpress_post_id ===
        "number" &&
      publication.wordpress_post_id > 0;

    let sourceElementorData =
      templateElementorData;

    let sourceElementorMeta =
      copyElementorMeta(
        templateMeta
      );

    if (hasExistingWordPressPost) {
      try {
        const existingPost =
          await getWordPressPost(
            wordpressUrl,
            authorization,
            publication.wordpress_post_id
          );

        const existingMeta =
          getElementorMeta(
            existingPost
          );

        if (
          existingMeta._elementor_data
        ) {
          const existingData =
            normalizeElementorData(
              existingMeta._elementor_data
            );

          const hasExpectedTitleNode =
            Boolean(
              findNodeById(
                existingData,
                markerNodeIds.titleNodeId
              )
            );

          const hasExpectedContentNode =
            Boolean(
              findNodeById(
                existingData,
                markerNodeIds.contentNodeId
              )
            );

          const hasExpectedImageNode =
            Boolean(
              findNodeById(
                existingData,
                markerNodeIds.imageNodeId
              )
            );

          if (
            hasExpectedTitleNode &&
            hasExpectedContentNode &&
            hasExpectedImageNode
          ) {
            sourceElementorData =
              existingData;

            sourceElementorMeta = {
              ...sourceElementorMeta,
              ...copyElementorMeta(
                existingMeta
              ),
            };
          }
        }
      } catch {
        sourceElementorData =
          templateElementorData;

        sourceElementorMeta =
          copyElementorMeta(
            templateMeta
          );
      }
    }

    const articleTitle =
      publication.title?.trim() ||
      "Actualité LBMedia";

    const articleContentHtml =
      articleContentToHtml(
        publication.content
      );

    const finalElementorData =
      injectArticleIntoElementor(
        sourceElementorData,
        markerNodeIds,
        {
          title:
            articleTitle,
          contentHtml:
            articleContentHtml,
          imageUrl:
            articleImageUrl,
        }
      );

    const elementorMeta = {
      ...sourceElementorMeta,
      _elementor_edit_mode:
        "builder",
      _elementor_template_type:
        "wp-post",
      _elementor_data:
        JSON.stringify(
          finalElementorData
        ),
    };

    const rankMathMeta = {
      rank_math_focus_keyword:
        publication.focus_keyword?.trim() ||
        "",
      rank_math_title:
        publication.seo_title?.trim() ||
        "",
      rank_math_description:
        publication.meta_description?.trim() ||
        "",
    };

    const payload = {
      title:
        articleTitle,
      content:
        articleContentHtml,
      slug:
        publication.slug ||
        undefined,
      excerpt:
        publication.meta_description ||
        undefined,
      status: "draft",
      meta: {
        ...elementorMeta,
        ...rankMathMeta,
      },
    };

    const endpoint =
      hasExistingWordPressPost
        ? `${wordpressUrl}/wp-json/wp/v2/posts/${publication.wordpress_post_id}`
        : `${wordpressUrl}/wp-json/wp/v2/posts`;

    const wordpressResponse =
      await fetch(
        endpoint,
        {
          method: "POST",
          headers: {
            Authorization:
              authorization,
            "Content-Type":
              "application/json",
          },
          body:
            JSON.stringify(payload),
          cache:
            "no-store",
        }
      );

    const wordpressData =
      (await wordpressResponse.json()) as
        WordPressPost & {
          code?: string;
          message?: string;
        };

    if (!wordpressResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            hasExistingWordPressPost
              ? "WordPress a refusé la mise à jour du brouillon Elementor."
              : "WordPress a refusé la création du brouillon Elementor.",
          status:
            wordpressResponse.status,
          details:
            wordpressData,
        },
        {
          status:
            wordpressResponse.status,
        }
      );
    }

    const wordpressPostId =
      typeof wordpressData.id === "number"
        ? wordpressData.id
        : Number(wordpressData.id);

    const wordpressUrlValue =
      typeof wordpressData.link === "string"
        ? wordpressData.link.trim()
        : "";

    if (
      !Number.isFinite(
        wordpressPostId
      ) ||
      wordpressPostId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "WordPress a traité le brouillon Elementor mais n’a pas retourné d’identifiant exploitable.",
        },
        {
          status: 502,
        }
      );
    }

    if (!wordpressUrlValue) {
      return NextResponse.json(
        {
          success: false,
          message:
            "WordPress a traité le brouillon Elementor mais n’a pas retourné son URL.",
          wordpress_post_id:
            wordpressPostId,
        },
        {
          status: 502,
        }
      );
    }

    const now =
      new Date().toISOString();

    const {
      data: updatedPublication,
      error: updateError,
    } = await supabaseAdmin
      .from("publications")
      .update({
        wordpress_post_id:
          wordpressPostId,
        published_url:
          wordpressUrlValue,
        updated_at:
          now,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le brouillon Elementor a été traité mais LBMedia Office n’a pas pu enregistrer ses informations.",
          error:
            updateError.message,
          wordpress_post_id:
            wordpressPostId,
          wordpress_url:
            wordpressUrlValue,
        },
        {
          status: 500,
        }
      );
    }

    let linkedPublicationsUpdated =
      0;

    if (publication.news_id) {
      const {
        data: linkedPublications,
        error: linkedUpdateError,
      } = await supabaseAdmin
        .from("publications")
        .update({
          link_url:
            wordpressUrlValue,
          updated_at:
            now,
        })
        .eq(
          "news_id",
          publication.news_id
        )
        .neq(
          "channel",
          "website"
        )
        .select("id");

      if (linkedUpdateError) {
        return NextResponse.json(
          {
            success: false,
            warning: true,
            message:
              "Le brouillon Elementor a bien été créé et son URL enregistrée, mais Office n’a pas pu transmettre ce lien aux déclinaisons.",
            error:
              linkedUpdateError.message,
            wordpress_post_id:
              wordpressPostId,
            wordpress_url:
              wordpressUrlValue,
            publication:
              updatedPublication,
          },
          {
            status: 500,
          }
        );
      }

      linkedPublicationsUpdated =
        linkedPublications?.length ??
        0;

      const {
        error:
          googleBusinessCtaError,
      } = await supabaseAdmin
        .from("publications")
        .update({
          call_to_action:
            "En savoir plus",
          updated_at:
            now,
        })
        .eq(
          "news_id",
          publication.news_id
        )
        .eq(
          "channel",
          "google_business"
        );

      if (
        googleBusinessCtaError
      ) {
        return NextResponse.json(
          {
            success: false,
            warning: true,
            message:
              "Le lien WordPress a bien été synchronisé avec les déclinaisons, mais Office n’a pas pu mettre à jour le CTA Google Business.",
            error:
              googleBusinessCtaError.message,
            wordpress_post_id:
              wordpressPostId,
            wordpress_url:
              wordpressUrlValue,
            publication:
              updatedPublication,
          },
          {
            status: 500,
          }
        );
      }
    }

    return NextResponse.json({
      success: true,
      action:
        hasExistingWordPressPost
          ? "updated"
          : "created",
      elementor: true,
      elementor_template_post_id:
        ELEMENTOR_TEMPLATE_POST_ID,
      message:
        hasExistingWordPressPost
          ? "Brouillon Elementor mis à jour et lien synchronisé avec les déclinaisons."
          : "Brouillon Elementor créé et lien synchronisé avec les déclinaisons.",
      wordpress_post_id:
        wordpressPostId,
      wordpress_url:
        wordpressUrlValue,
      linked_publications_updated:
        linkedPublicationsUpdated,
      publication:
        updatedPublication,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible de traiter le brouillon Elementor WordPress.",
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
