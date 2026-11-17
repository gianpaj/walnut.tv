import Script from "next/script";

/** GA4 property 372022725, "walnut.tv - GA4". */
const GA_MEASUREMENT_ID = "G-LJ7B0PVNZL";

// Loads only on walnut.tv, so vercel.app deployments and local builds stay out
// of the reports. Enhanced measurement records client-side route changes from
// history events, so there is no per-navigation pageview call.
const GTAG_SNIPPET = `if (location.hostname === "walnut.tv") {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { dataLayer.push(arguments); };
  gtag("js", new Date());
  gtag("config", "${GA_MEASUREMENT_ID}");
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}";
  document.head.appendChild(script);
}`;

export default function Analytics() {
  return (
    <Script id="gtag" strategy="afterInteractive">
      {GTAG_SNIPPET}
    </Script>
  );
}
