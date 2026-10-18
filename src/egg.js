// Console easter egg. Social links live here instead of on the page, so
// someone reading the plate in traffic can't click through to a profile.
const GITHUB = 'https://github.com/n3k0lai';
// TODO(nicholai): X/Twitter handle wasn't anywhere in the repo or site.
// Set it here (without the @) to enable the line below.
const X_HANDLE = 'n3k0lai';

export function easterEgg() {
    const big = 'font: 900 28px system-ui, sans-serif; color: #fff; background: linear-gradient(90deg,#ff0000,#ffd700); padding: 6px 14px; border-radius: 4px;';
    const txt = 'font: 13px ui-monospace, monospace; color: #ffd700; background: #000; padding: 2px 6px;';
    console.log('%cbruh XD', big);
    console.log('%cyou have seen my car. now see my code:', txt);
    console.log(`%cgithub  ${GITHUB}`, txt);
    if (X_HANDLE) console.log(`%cx       https://x.com/${X_HANDLE}`, txt);
}
