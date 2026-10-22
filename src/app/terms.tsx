import { LegalDocumentScreen } from '@/features/legal/components/legal-document-screen';
import { TERMS_OF_USE } from '@/features/legal/content';

/** The hosted terms in docs/legal/terms-of-use.html use the same text. */
export default function TermsScreen() {
  return <LegalDocumentScreen document={TERMS_OF_USE} />;
}
