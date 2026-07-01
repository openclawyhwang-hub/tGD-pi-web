"use client";

import { DiffView } from "../DiffView";

interface Props {
  oldContent: string;
  newContent: string;
  language: string;
}

export function DiffViewMode({ oldContent, newContent, language }: Props) {
  return <DiffView oldContent={oldContent} newContent={newContent} language={language} />;
}
