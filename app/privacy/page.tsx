import type { Metadata } from 'next';
import PrivacyClient from './PrivacyClient';

export const metadata: Metadata = {
  title: 'Privacy policy · Cosmic Picnic',
  description:
    'How Cosmic Picnic handles your data on this website and in the iPhone beta.',
};

export default function PrivacyPage() {
  return <PrivacyClient />;
}
