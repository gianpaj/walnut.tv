import Script from "next/script";

const GA_MEASUREMENT_ID = "G-LJ7B0PVNZL";

// Ported verbatim from the live site's index.html. These values are public web
// config, not secrets. Firebase Analytics reports to a second GA4 property, so
// it duplicates the gtag tracking above it and is a candidate for removal once
// someone confirms which property is actually being read.
const FIREBASE_SNIPPET = `
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-analytics.js';

const app = initializeApp({
  apiKey: 'AIzaSyA1-GsxvQht3kdP_b7fD9fNWEd2m4RdPu8',
  authDomain: 'ucutv-219215.firebaseapp.com',
  databaseURL: 'https://ucutv-219215.firebaseio.com',
  projectId: 'ucutv-219215',
  storageBucket: 'ucutv-219215.appspot.com',
  messagingSenderId: '467558405283',
  appId: '1:467558405283:web:69f44f22258fde52ccdb16',
  measurementId: 'G-Z6V9TW1R8F',
});
getAnalytics(app);
`;

/**
 * GA4 tracks client-side route changes through its own history listener, which
 * is what the live site relies on too, so no per-navigation pageview call here.
 */
export default function Analytics() {
  // Not in development: local page views should not land in the real property.
  if (process.env.NODE_ENV !== "production") return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`}
      </Script>
      <script
        type="module"
        dangerouslySetInnerHTML={{ __html: FIREBASE_SNIPPET }}
      />
    </>
  );
}
