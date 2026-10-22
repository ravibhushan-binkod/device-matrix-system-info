import { LegalDocumentScreen } from '@/features/legal/components/legal-document-screen';
import { DISCLAIMER } from '@/features/legal/content';

/** The hosted disclaimer in docs/legal/disclaimer.html uses the same text. */
export default function DisclaimerScreen() {
  return <LegalDocumentScreen document={DISCLAIMER} />;
}
