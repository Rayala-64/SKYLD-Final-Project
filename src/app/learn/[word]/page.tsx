import { getWordCardByText } from "@/app/actions/daily_ritual";
import { LearnWizard } from "./LearnWizard";
import { notFound } from "next/navigation";

export default async function LearnWordPage({ params }: { params: { word: string } }) {
  const wordData = await getWordCardByText(params.word);
  
  return <LearnWizard wordData={wordData} wordText={params.word} />;
}
