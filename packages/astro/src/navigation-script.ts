/**
 * Builds the tiny script that carries Themvora's resolved state across an
 * Astro client-side navigation (`<ClientRouter />`).
 *
 * A client navigation is not a hard reload: Astro parses the next page into a
 * detached document and then copies that document's `<html>` attributes over
 * the live root. Because the pre-paint bootstrap is byte-identical on every
 * page, Astro's script de-duplication marks it as already-executed, so it does
 * **not** run again — and the live root's theme state (the `dark` /
 * `tv-scrollbar` classes, the inline theme variables and the `data-theme*`
 * attributes written by the bootstrap or the runtime) would be replaced by
 * whatever that page was built with.
 *
 * This script listens for `astro:before-swap` — which Astro dispatches *before*
 * `swapRootAttributes()` reads the new document — and re-applies the live
 * state onto the incoming document, so the browser paints the correct theme
 * immediately instead of reverting until the island re-hydrates.
 *
 * It also carries the parts of the state that live *inside* the swapped body
 * rather than on `<html>`, because Astro replaces the body wholesale and those
 * nodes are rebuilt from the destination page's server render:
 *
 * | Node | Live value carried over |
 * | ---- | ----------------------- |
 * | `[data-tv-readout]` | its `textContent`, matched by readout kind |
 * | `[data-tv-select]` | its selected `<option>`, from `data-theme-selection-*` |
 *
 * Without that, a navigation leaves the visible state describing the page that
 * was built rather than the theme that is applied — the readouts go back to
 * their server fallbacks and a selection control shows the first option while
 * the page is painted with another family.
 *
 * It is framework-free, registers a single listener, and never touches the
 * runtime. Sites without `<ClientRouter />` never fire the event, so the
 * listener stays inert.
 *
 * @returns The inline script string to emit in the document `<head>`.
 *
 * @see {@link themvora}
 * @see `createBlockingScript`
 */
export function createNavigationScript(): string {
  return (
    "(function(){try{" +
    "document.addEventListener('astro:before-swap',function(e){" +
    "var nd=e&&e.newDocument;" +
    "if(!nd||!nd.documentElement||!nd.head)return;" +
    "var src=document.documentElement,dst=nd.documentElement;" +
    "var cls=src.classList;" +
    "if(cls.contains('dark')){dst.classList.add('dark');}else{dst.classList.remove('dark');}" +
    "if(cls.contains('tv-scrollbar')){dst.classList.add('tv-scrollbar');" +
    "var st=document.getElementById('tv-scrollbar-style');" +
    "if(st&&!nd.getElementById('tv-scrollbar-style')){" +
    "nd.head.appendChild(nd.importNode(st,true));}}" +
    // The selection attributes travel with the resolved ones: the theme name is
    // derived from them, and a control bound to `data-tv-select` reads the
    // selection, not the resolved theme.
    "var attrs=['data-theme','data-theme-family','data-theme-mode'," +
    "'data-theme-selection-mode','data-theme-selection-family'];" +
    "for(var i=0;i<attrs.length;i++){" +
    "var v=src.getAttribute(attrs[i]);" +
    "if(v!==null){dst.setAttribute(attrs[i],v);}}" +
    "var style=src.getAttribute('style');" +
    "if(style!==null){dst.setAttribute('style',style);}" +
    // Readouts are matched by kind, not by position: the destination page can
    // render a different number of them, and an index would pair the wrong two.
    // Comparing attributes beats building a selector from the value — a readout
    // kind is app-supplied text, and it is not escaped for a selector.
    "var live=document.querySelectorAll('[data-tv-readout]');" +
    "var next=nd.querySelectorAll('[data-tv-readout]');" +
    // Same single-text-node write the readout scripts use: the destination
    // page's readouts may sit inside an island, and replacing the node they
    // were parsed with is what makes a later unmount throw.
    "function w(el,v){var c=el.firstChild;" +
    "if(c&&c.nodeType===3&&!c.nextSibling){if(c.nodeValue!==v){c.nodeValue=v;}return;}" +
    "el.textContent=v;}" +
    "for(var r=0;r<next.length;r++){" +
    "var k=next[r].getAttribute('data-tv-readout');" +
    "for(var l=0;l<live.length;l++){" +
    "if(live[l].getAttribute('data-tv-readout')!==k)continue;" +
    "if(next[r].textContent!==live[l].textContent){w(next[r],live[l].textContent);}" +
    "break;}}" +
    "var fam=src.getAttribute('data-theme-selection-family');" +
    "var md=src.getAttribute('data-theme-selection-mode');" +
    "var sels=nd.querySelectorAll('[data-tv-select]');" +
    "for(var s=0;s<sels.length;s++){" +
    "var kind=sels[s].getAttribute('data-tv-select');" +
    "var want=kind==='family'?fam:(kind==='mode'?md:null);" +
    "if(want==null)continue;" +
    "var opts=sels[s].options||[];" +
    "for(var o=0;o<opts.length;o++){" +
    "if(opts[o].value===want){sels[s].value=want;break;}}}" +
    "});" +
    "}catch(e){}})()"
  );
}
