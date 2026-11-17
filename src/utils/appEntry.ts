/** Keep demo navigation under its own basename, without mounting real profile providers. */
export function appEntry(pathname: string, hash: string, hashRouting: boolean, base = "/") {
  const relative=pathname.startsWith(base)?"/"+pathname.slice(base.length):pathname;
  const route=hashRouting ? hash.replace(/^#/,"") || relative : relative;
  const demo=/^\/demo(?:\/|$)/.test(route);
  const direct=hashRouting&&!hash&&/^\/(demo|admin)(?:\/|$)/.test(relative);
  return {demo,basename:demo?"/demo":undefined,redirect:direct?base+"#"+relative:undefined};
}
