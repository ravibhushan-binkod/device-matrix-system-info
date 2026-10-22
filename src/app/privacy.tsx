import { LegalDocumentScreen } from '@/features/legal/components/legal-document-screen';
import { PRIVACY_POLICY } from '@/features/legal/content';

/** The hosted policy in docs/legal/privacy-policy.html uses the same text. */
export default function PrivacyScreen() {
  return <LegalDocumentScreen document={PRIVACY_POLICY} />;
}
