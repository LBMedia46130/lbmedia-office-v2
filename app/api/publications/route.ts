import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import {
  publicationChannels,
  type PublicationChannel,
} from "@/lib/news";

import { supabaseAdmin } from "@/lib/supabase-admin";

type CreateStandalonePublicationInput = {
  // Ancien format, conserve pour les formulaires deja en production.
  channel?: PublicationChannel;
  // Nouveau format : un ou plusieurs supports.
  channels?: PublicationChannel[];
  title?: string;
  content?: string;
  brief?: string;
};

const standaloneChannels: PublicationChannel[] = [
  "linkedin",
  "facebook",
  "google_business",
  "brevo",
];

const multiChannelOptions: PublicationChannel[] = [
  "linkedin",
  "facebook",
  "google_business",
];

export async function POST(request: Request) {
  let body: CreateStandalonePublicationInput;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Les donnees envoyees sont invalides.",
      },
      { status: 400 }
    );
  }

  const usesMultipleChannels = body.channels !== undefined;
  const requestedChannels: unknown = usesMultipleChannels
    ? body.channels
    : body.channel !== undefined
      ? [body.channel]
      : [];

  if (
    !Array.isArray(requestedChannels) ||
    requestedChannels.length === 0 ||
    requestedChannels.some(
      (channel) =>
        typeof channel !== "string" ||
        !publicationChannels.includes(channel as PublicationChannel)
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Le support de publication est invalide.",
      },
      { status: 400 }
    );
  }

  const channels = requestedChannels as PublicationChannel[];

  if (new Set(channels).size !== channels.length) {
    return NextResponse.json(
      {
        success: false,
        message: "Un support ne peut etre selectionne qu'une seule fois.",
      },
      { status: 400 }
    );
  }

  if (channels.some((channel) => !standaloneChannels.includes(channel))) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Ce support ne peut pas etre utilise pour une publication independante.",
      },
      { status: 400 }
    );
  }

  if (
    channels.length > 1 &&
    channels.some((channel) => !multiChannelOptions.includes(channel))
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "La selection multiple est disponible uniquement pour LinkedIn, Facebook et Google Business.",
      },
      { status: 400 }
    );
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";

  if (!title) {
    return NextResponse.json(
      {
        success: false,
        message: "Le sujet est obligatoire.",
      },
      { status: 400 }
    );
  }

  // Le nouveau formulaire envoie `channels` et utilise encore `content`
  // pour les consignes. Stocker ces consignes dans `brief` et laisser le
  // texte final vide jusqu'à la génération IA.
  // Les anciens clients qui envoient `channel` conservent leur comportement.
  const incomingContent =
    typeof body.content === "string" ? body.content.trim() : "";
  const incomingBrief =
    typeof body.brief === "string" ? body.brief.trim() : "";
  const brief = usesMultipleChannels
    ? incomingBrief || incomingContent
    : incomingBrief;
  const content = usesMultipleChannels ? "" : incomingContent;
  const now = new Date().toISOString();
  const groupId = channels.length > 1 ? randomUUID() : null;

  // Un seul INSERT pour creer ensemble les brouillons :
  // pas de publication orpheline si l'operation echoue.
  const rows = channels.map((channel) => ({
    news_id: null,
    group_id: groupId,
    channel,
    title,
    content,
    brief: brief || null,
    status: "draft" as const,
    updated_at: now,
  }));

  const { data, error } = await supabaseAdmin
    .from("publications")
    .insert(rows)
    .select("*");

  if (error || !data || data.length !== channels.length) {
    return NextResponse.json(
      {
        success: false,
        message: "Impossible de creer la publication.",
        ...(error ? { error: error.message } : {}),
      },
      { status: 500 }
    );
  }

  // Compatibilite avec les ecrans existants : publication reste disponible.
  return NextResponse.json({
    success: true,
    publication: data.find((item) => item.channel === channels[0]) ?? data[0],
    publications: data,
    group_id: groupId,
  });
}
