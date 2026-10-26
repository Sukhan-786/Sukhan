// Public container ID supplied by the Sukhan site owner; this is not a secret.
export const googleTagManagerId = "GTM-MWXQC8X9";
export function analyticsHostEnabled(host: string) {
  return [
    "sukhan.co.in",
    "www.sukhan.co.in",
    "sukhan-blush.vercel.app",
  ].includes(host.toLowerCase().split(":")[0]);
}
export function analyticsPathEnabled(path: string) {
  return !/^\/(admin|login|auth|account|profile|reset-password|set-password)(\/|$)/.test(
    path,
  );
}
export const googleTagManagerBootstrap = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${googleTagManagerId}');`;
