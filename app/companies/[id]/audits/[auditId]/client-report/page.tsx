import Link from "next/link";
import { notFound } from "next/navigation";
import AuditPrintButton from "@/components/companies/AuditPrintButton";
import { getCompanyById } from "@/lib/companies";
import { getWebsiteAuditById, getWebsiteAuditCommercialDiagnosis } from "@/lib/website-audits";

export const dynamic = "force-dynamic";

type ClientReportPageProps = { params: Promise<{ id: string; auditId: string }> };

export default async function ClientReportPage({ params }: ClientReportPageProps) {
  const { id, auditId } = await params;
  const [company, audit] = await Promise.all([getCompanyById(id), getWebsiteAuditById(auditId)]);
  if (!company || !audit || String(audit.company_id ?? "") !== String(company.id)) notFound();

  const diagnosis = getWebsiteAuditCommercialDiagnosis(audit);
  const clientSummary = toClientSummary(audit.summary);
  const strengths = audit.strengths.slice(0, 4).map(toClientLanguage);
  const improvements = audit.weaknesses.slice(0, 5).map(toClientLanguage);
  const priorities = audit.priorities.slice(0, 3).map(toClientLanguage);
  const visibilityIssues = diagnosis.weaknesses.visibility.slice(0, 4).map(toClientLanguage);
  const websiteIssues = diagnosis.weaknesses.website.slice(0, 4).map(toClientLanguage);

  return (
    <main className="client-report-root min-h-screen bg-slate-100">
      <style>{`@media print{@page{size:A4;margin:12mm}html,body{background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.client-report-root{min-height:auto!important;background:#fff!important}.client-report-container{max-width:none!important;padding:0!important}.print-hide{display:none!important}.shadow-sm{box-shadow:none!important}h1,h2,h3,h4{break-after:avoid-page;page-break-after:avoid}li,.print-avoid{break-inside:avoid-page;page-break-inside:avoid}a{color:inherit!important;text-decoration:none!important}}`}</style>
      <div className="client-report-container mx-auto max-w-5xl px-6 py-10">
        <div className="print-hide mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href={`/companies/${company.id}/audits/${audit.id}`} className="text-sm font-semibold text-slate-500 transition hover:text-slate-950">← Retour à l’audit</Link>
 <AuditPrintButton />       </div>

        <header className="print-avoid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-7 py-7 sm:px-9">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">LBMedia</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Audit de visibilité digitale</h1><p className="mt-3 text-base text-slate-600">Compte rendu pour <strong>{company.name}</strong></p></div>
              {company.logo_url ? <div className="flex h-20 w-32 items-center justify-center rounded-2xl border border-slate-200 bg-white p-3"><img src={company.logo_url} alt={`Logo ${company.name}`} className="max-h-full max-w-full object-contain" /></div> : null}
            </div>
          </div>
          <div className="grid gap-4 bg-slate-50 px-7 py-5 text-sm text-slate-600 sm:grid-cols-3 sm:px-9">
            <InfoItem label="Site analysé" value={audit.website_url} />
            <InfoItem label="Date de l’audit" value={formatDate(audit.created_at)} />
            <InfoItem label="Périmètre" value={`${audit.pages_analyzed} ${audit.pages_analyzed > 1 ? "pages analysées" : "page analysée"}`} />
          </div>
        </header>

        <section className="print-avoid mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-7 sm:p-9">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Votre site aujourd’hui</p><h2 className="mt-2 text-2xl font-bold text-slate-950">Une vue d’ensemble de son efficacité et de sa visibilité</h2><p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">{clientSummary}</p></div><div className="shrink-0 rounded-2xl border border-blue-200 bg-white px-7 py-5 text-center"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Score global</p><p className="mt-1 text-4xl font-bold text-slate-950">{audit.global_score}<span className="ml-1 text-sm font-medium text-slate-400">/100</span></p></div></div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <ClientScoreCard label="Positionnement" score={audit.positioning_score} description="Clarté de l’offre et compréhension de l’activité." />
          <ClientScoreCard label="Conversion" score={audit.conversion_score} description="Capacité du site à favoriser la prise de contact." />
          <ClientScoreCard label="SEO" score={audit.seo_score} description="Fondamentaux de visibilité dans les moteurs de recherche." />
          <ClientScoreCard label="SEO local" score={audit.local_seo_score} description="Présence sur les recherches liées à une zone géographique." />
          <ClientScoreCard label="GEO / IA" score={audit.geo_score} description="Compréhension de l’activité par les moteurs et assistants IA." />
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <ClientList eyebrow="Les acquis" title="Ce qui fonctionne bien" items={strengths} emptyText="Aucun point fort spécifique n’a été isolé lors de cette analyse." />
          <ClientList eyebrow="Les opportunités" title="Ce qui mérite d’être amélioré" items={improvements} emptyText="Aucun point d’amélioration prioritaire n’a été identifié." />
        </div>

        <section className="print-avoid mt-6 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Visibilité Google & IA</p><h2 className="mt-2 text-2xl font-bold text-slate-950">Être trouvé, compris et identifié au bon moment</h2>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600">La visibilité d’un site ne dépend plus uniquement de son référencement classique. Les moteurs de recherche, les résultats locaux et les assistants utilisant l’intelligence artificielle s’appuient sur la qualité, la précision et la structure des informations disponibles pour comprendre une entreprise, ses prestations et sa zone d’intervention.</p>
          <div className="mt-6 grid gap-5 lg:grid-cols-2"><VisibilityBlock title="Visibilité & acquisition" items={visibilityIssues} fallback="Les fondamentaux de visibilité relevés lors de l’audit sont globalement satisfaisants." /><VisibilityBlock title="Site & parcours" items={websiteIssues} fallback="Aucun frein majeur lié au parcours du site n’a été isolé dans cette analyse." /></div>
          <p className="mt-6 rounded-2xl bg-slate-50 px-5 py-4 text-xs leading-6 text-slate-500">Le score GEO / IA évalue ici les signaux présents sur le site qui facilitent la compréhension de l’entreprise par les moteurs et assistants IA. Il ne constitue pas une mesure de présence effective dans toutes les réponses générées par ces services.</p>
        </section>

        <section className="print-avoid mt-6 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Priorités</p><h2 className="mt-2 text-2xl font-bold text-slate-950">Les actions à privilégier</h2>
          {priorities.length > 0 ? <ol className="mt-6 space-y-4">{priorities.map((priority,index)=><li key={`${priority}-${index}`} className="print-avoid flex gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">{index+1}</div><p className="pt-1 text-sm leading-6 text-slate-700">{priority}</p></li>)}</ol> : <p className="mt-5 text-sm italic text-slate-400">Aucune priorité spécifique n’a été enregistrée pour cet audit.</p>}
        </section>

        <section className="print-avoid mt-6 rounded-3xl border border-blue-200 bg-slate-950 p-7 text-white sm:p-9"><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">Et maintenant ?</p><h2 className="mt-2 text-2xl font-bold">Transformer le diagnostic en actions concrètes</h2><p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">Cet audit permet d’identifier les principaux leviers d’amélioration du site. LBMedia peut vous accompagner pour définir les actions les plus adaptées à vos objectifs : optimisation du site, amélioration du référencement et de la visibilité locale, renforcement de la présence dans les environnements de recherche et d’IA, ou évolution plus globale du site lorsque cela est pertinent.</p><div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm"><span className="font-semibold">LBMedia</span><span>Sites internet · SEO · GEO / IA</span></div></section>

        <footer className="mt-7 pb-8 text-center text-xs leading-5 text-slate-400"><p>Audit réalisé à partir des éléments accessibles sur le site au moment de l’analyse.</p><p className="mt-1">Certaines données externes ou privées peuvent nécessiter des vérifications complémentaires.</p></footer>
      </div>
    </main>
  );
}


function toClientSummary(value:string){
  return toClientLanguage(value)
    .replace(/\s+/g," ")
    .trim();
}

function toClientLanguage(value:string){
  let text=value;

  const replacements:[RegExp,string][]=[
    [/\baucune meta description repérée dans l['’]échantillon\b/gi,"Les pages analysées ne présentent pas toujours un résumé suffisamment clair pour les résultats de recherche"],
    [/\bmeta descriptions?\b/gi,"résumés affichés dans les résultats de recherche"],
    [/\baucun H1 détecté sur les pages analysées\b/gi,"La structure des pages peut être mieux organisée pour aider les moteurs à identifier immédiatement leur sujet principal"],
    [/\bH1\b/gi,"titre principal de page"],
    [/\bdonnées structurées JSON-LD non détectées\b/gi,"Le site fournit encore peu d’informations structurées permettant aux moteurs et assistants IA d’identifier précisément l’entreprise et ses services"],
    [/\bdonnées structurées JSON-LD\b/gi,"informations structurées destinées aux moteurs et assistants IA"],
    [/\bJSON-LD\b/gi,"informations structurées"],
    [/\bLocalBusiness\b/gi,"informations sur l’entreprise locale"],
    [/\bService\b/g,"informations sur les services"],
    [/\bReview\b/g,"avis clients"],
    [/\bbalises Open Graph non détectées\b/gi,"Le partage du site sur les réseaux sociaux peut être mieux valorisé"],
    [/\bbalises Open Graph\b/gi,"informations de présentation pour les réseaux sociaux"],
    [/\bOpen Graph\b/gi,"présentation lors des partages sur les réseaux sociaux"],
    [/\bbalises canoniques\b/gi,"indications permettant aux moteurs d’identifier la version principale d’une page"],
    [/\bcanonical(?:es)?\b/gi,"version principale d’une page"],
    [/\bCTA\b/g,"appels à l’action"],
    [/\bSERP\b/gi,"résultats de recherche"],
    [/\bmaillage interne\b/gi,"liens entre les différentes pages du site"],
    [/\bindexation\b/gi,"prise en compte des pages par les moteurs de recherche"],
    [/\bcrawl(?:abilité|able|ing)?\b/gi,"capacité des moteurs à parcourir le site"],
    [/\brobots\.txt\b/gi,"instructions données aux moteurs de recherche"],
    [/\bsitemap(?:\.xml)?\b/gi,"plan du site destiné aux moteurs de recherche"],
    [/\bSchema(?:\.org)?\b/gi,"informations structurées destinées aux moteurs"],
    [/\bFAQ schema\b/gi,"questions-réponses structurées pour les moteurs"],
    [/\balt\b/gi,"description des images"],
  ];

  for(const [pattern,replacement] of replacements){
    text=text.replace(pattern,replacement);
  }

  text=text
    .replace(/\s+—\s+/g," — ")
    .replace(/\s{2,}/g," ")
    .trim();

  return text;
}

function InfoItem({label,value}:{label:string;value:string}){return <div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 break-words font-medium text-slate-700">{value}</p></div>}
function ClientScoreCard({label,score,description}:{label:string;score:number;description:string}){return <div className="print-avoid rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="text-lg font-bold text-slate-950">{score}<span className="ml-0.5 text-[10px] font-medium text-slate-400">/100</span></p></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{width:`${Math.max(0,Math.min(100,score))}%`}} /></div><p className="mt-3 text-xs leading-5 text-slate-500">{description}</p></div>}
function ClientList({eyebrow,title,items,emptyText}:{eyebrow:string;title:string;items:string[];emptyText:string}){return <section className="print-avoid rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">{eyebrow}</p><h2 className="mt-2 text-xl font-bold text-slate-950">{title}</h2>{items.length>0?<ul className="mt-5 space-y-3">{items.map((item,index)=><li key={`${item}-${index}`} className="flex gap-3 text-sm leading-6 text-slate-700"><span className="font-bold text-blue-600">•</span><span>{item}</span></li>)}</ul>:<p className="mt-5 text-sm italic text-slate-400">{emptyText}</p>}</section>}
function VisibilityBlock({title,items,fallback}:{title:string;items:string[];fallback:string}){return <div className="print-avoid rounded-2xl border border-slate-200 bg-slate-50 p-5"><h3 className="font-bold text-slate-900">{title}</h3>{items.length>0?<ul className="mt-4 space-y-3">{items.map((item,index)=><li key={`${item}-${index}`} className="flex gap-3 text-sm leading-6 text-slate-700"><span className="font-bold text-indigo-600">•</span><span>{item}</span></li>)}</ul>:<p className="mt-4 text-sm leading-6 text-slate-600">{fallback}</p>}</div>}
function formatDate(value:string){const date=new Date(value);if(Number.isNaN(date.getTime()))return value;return new Intl.DateTimeFormat("fr-FR",{dateStyle:"long",timeZone:"Europe/Paris"}).format(date)}
