/** Prioritize new questions, then mistakes and due review. Not psychometric adaptivity. */
export function choosePractice<T extends {id: string}>(questions: T[], records: Record<string,{last_correct:boolean; review_due:string}>, mode: "learn"|"timed"|"review", today:string, offset:number): T[] {
  const available = questions.filter(q => mode !== "review" || (records[q.id] && (!records[q.id].last_correct || records[q.id].review_due <= today)));
  const rotated = available.length ? [...available.slice(offset % available.length), ...available.slice(0, offset % available.length)] : [];
  return rotated.sort((a,b) => {
    const priority = (q:T) => !records[q.id] ? 0 : !records[q.id].last_correct ? 1 : records[q.id].review_due <= today ? 2 : 3;
    return priority(a)-priority(b);
  }).slice(0,5);
}
