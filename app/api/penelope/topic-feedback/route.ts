import { NextResponse } from "next/server";

import {
  publicationChannels,
  type PublicationChannel,
} from "@/lib/news";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type TopicFeedback = "accepted" | "rejected";

type TopicFeedbackRequest = {
  title?: unknown;
  angle?: unknown;
  reason?: unknown;
  channel?: unknown;
  feedback?: unknown;
  rejection_reason?: unknown;
};

const maxLengths = {
  title: 250,
  angle: 3000,
  reason: 2000,
  rejection_reason: 500,
} as const;

function optionalText(value: unknown, maxLength: number): string | null | undefined {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const text = value.trim();
  if (text.length > maxLength) {
    return undefined;
  }

  return text || null;
}

function badRequest(message: string) {
  return NextResponse.json(
    { success: false, message },
    { status: 400 }
  );
}

export async function POST(request: Request) {
  let body: TopicFeedbackRequest;

  try {
    const value: unknown = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return badRequest("Les données envoyées sont invalides.");
    }
    body = value as TopicFeedbackRequest;
  } catch {
    return badRequest("Les données envoyées sont invalides.");
  }

  const title = optionalText(body.title, maxLengths.title);
  if (!title) {
    return badRequest("Le sujet est obligatoire (250 caractères maximum).");
  }

  const angle = optionalText(body.angle, maxLengths.angle);
  const reason = optionalText(body.reason, maxLengths.reason);
  const rejectionReason = optionalText(
    body.rejection_reason,
    maxLengths.rejection_reason
  );

  if (
    angle === undefined ||
    reason === undefined ||
    rejectionReason === undefined
  ) {
    return badRequest("Un ou plusieurs champs texte sont invalides ou trop longs.");
  }

  if (
    typeof body.channel !== "string" ||
    !publicationChannels.includes(body.channel as PublicationChannel)
  ) {
    return badRequest("Le support demandé est invalide.");
  }

  if (body.feedback !== "accepted" && body.feedback !== "rejected") {
    return badRequest("L'évaluation doit être accepted ou rejected.");
  }

  const feedback: TopicFeedback = body.feedback;

  const { data, error } = await supabaseAdmin
    .from("editorial_topic_feedback")
    .insert({
      title,
      angle,
      reason,
      channel: body.channel,
      feedback,
      rejection_reason: feedback === "rejected" ? rejectionReason : null,
    })
    .select("id, created_at")
    .single();

  if (error) {
    console.error("Topic feedback insert error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Impossible d'enregistrer ton évaluation éditoriale.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      message: "Évaluation éditoriale enregistrée.",
      feedback: { id: data.id, created_at: data.created_at },
    },
    { status: 201 }
  );
}
